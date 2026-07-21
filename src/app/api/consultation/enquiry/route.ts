import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createTicket } from '@/lib/tickets'

// Lead-capture for the public Expert Consultation page. A corporate/CXO visitor submits
// an enquiry; there is no checkout in Phase 2, so we (a) store it (service-role, RLS-locked
// table), (b) raise an admin ticket so it lands in the notification centre, and (c) email
// both the visitor (confirmation) and the expert (alert). Mirrors /api/contact.

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const TYPE_LABELS: Record<string, string> = {
  type1: 'Agentic AI, Vibe Coding, System Design & Governance',
  type2: 'Quantum AI, SLM/LLM, Data-centre & AI Defence',
  type3: 'Business Intelligence, Data Insights & Strategy',
  type4: 'Other (custom project)',
}

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const {
      name,
      work_email,
      company,
      project_type_code,
      project_detail,
      message,
      buyer_country,
      buyer_timezone,
      _honey,
    } = body ?? {}

    // Honeypot — silently accept so bots get no signal.
    if (_honey) return NextResponse.json({ success: true })

    // Cap every field before it touches the DB or the outbound emails, so an oversized
    // payload can't bloat a row or a mail (mirrors the createTicket length caps).
    const cap = (v: unknown, n: number) => {
      const s = String(v ?? '').trim().slice(0, n)
      return s || null
    }
    const cleanName = String(name ?? '').trim().slice(0, 200)
    const cleanEmail = String(work_email ?? '').trim().toLowerCase().slice(0, 320)
    if (!cleanName || !cleanEmail) {
      return NextResponse.json({ error: 'Name and work email are required.' }, { status: 400 })
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const cleanCompany = cap(company, 200)
    const cleanDetail = cap(project_detail, 5000)
    const cleanMessage = cap(message, 5000)
    const cleanCountry = cap(buyer_country, 100)
    const cleanTimezone = cap(buyer_timezone, 100)

    const typeCode = ['type1', 'type2', 'type3', 'type4'].includes(project_type_code)
      ? project_type_code
      : null

    const { error: dbErr } = await admin.from('consultation_enquiries').insert({
      name: cleanName,
      work_email: cleanEmail,
      company: cleanCompany,
      project_type_code: typeCode,
      project_detail: cleanDetail,
      message: cleanMessage,
      buyer_country: cleanCountry,
      buyer_timezone: cleanTimezone,
    })
    if (dbErr) {
      console.error('[consultation enquiry] insert failed:', dbErr.message)
      // Do not surface the raw DB error to the anonymous caller (CWE-209).
      return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
    }

    const typeLabel = typeCode ? TYPE_LABELS[typeCode] : 'Not specified'

    // Raise an admin ticket so the enquiry surfaces in the admin notification centre.
    try {
      const detail = [
        `Work email: ${cleanEmail}`,
        cleanCompany ? `Company: ${cleanCompany}` : '',
        `Project type: ${typeLabel}`,
        cleanDetail ? `\nProject detail:\n${cleanDetail}` : '',
        cleanMessage ? `\nMessage:\n${cleanMessage}` : '',
        cleanCountry || cleanTimezone
          ? `\nVisitor context: ${[cleanCountry, cleanTimezone].filter(Boolean).join(' · ')}`
          : '',
        `\n(Expert Consultation enquiry — reply to ${cleanEmail}.)`,
      ]
        .filter(Boolean)
        .join('\n')
      await createTicket({
        by: { type: 'contact', id: cleanEmail, name: cleanName },
        category: 'service_request',
        subject: `Expert Consultation enquiry — ${cleanName}`,
        body: detail,
        recipients: [{ type: 'admin', id: '*', name: 'oStaran Admin / Support' }],
      })
    } catch (e: any) {
      console.warn('[consultation enquiry] ticket creation failed (non-fatal):', e?.message)
    }

    // Notify the expert + confirm to the visitor. Expert address is the admin-configurable
    // escalation email (falls back to ops).
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      let expertEmail = 'ai@ostaran.com'
      try {
        const { data: cfg } = await admin
          .from('consultation_config')
          .select('type4_escalation_email')
          .eq('id', 1)
          .maybeSingle()
        if (cfg?.type4_escalation_email) expertEmail = cfg.type4_escalation_email
      } catch {
        /* keep the ops fallback */
      }

      const confirmHtml = `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f6f8;margin:0;padding:24px 0;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;padding:32px;margin:0 auto;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
<tr><td style="font-size:20px;font-weight:bold;color:#111827;padding-bottom:12px;">Thank you, ${esc(cleanName)} — your consultation request is in.</td></tr>
<tr><td style="font-size:14px;color:#374151;line-height:1.6;padding-bottom:20px;">
  Thanks for your interest in an <strong>Expert Consultation on AI projects</strong>. Our expert will review your request and get back to you within <strong>1 business day</strong> to confirm a slot in your timezone.
  <br/><br/>
  <strong>Project area:</strong> ${esc(typeLabel)}
  ${cleanDetail ? `<br/><strong>Your note:</strong> ${esc(cleanDetail)}` : ''}
</td></tr>
<tr><td style="font-size:13px;color:#6b7280;padding-top:20px;border-top:1px solid #e5e7eb;">
  Star Analytix Pvt Ltd · Mumbai, Maharashtra · <a href="mailto:ai@ostaran.com" style="color:#4f46e5;">ai@ostaran.com</a>
</td></tr>
</table></body></html>`

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'oStaran AI Education <ai@ostaran.com>',
          to: [cleanEmail],
          subject: 'We’ve received your Expert Consultation request — oStaran',
          html: confirmHtml,
        }),
      }).catch((e) => console.warn('[consultation enquiry] confirm email failed:', e?.message))

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'oStaran Ops <ai@ostaran.com>',
          to: [expertEmail],
          subject: `New Expert Consultation enquiry — ${cleanName}`,
          html: `<p><strong>Name:</strong> ${esc(cleanName)}</p>
                 <p><strong>Work email:</strong> ${esc(cleanEmail)}</p>
                 <p><strong>Company:</strong> ${esc(cleanCompany) || 'Not provided'}</p>
                 <p><strong>Project type:</strong> ${esc(typeLabel)}</p>
                 <p><strong>Project detail:</strong> ${esc(cleanDetail) || 'None'}</p>
                 <p><strong>Message:</strong> ${esc(cleanMessage) || 'None'}</p>
                 <p><strong>Visitor context:</strong> ${esc([cleanCountry, cleanTimezone].filter(Boolean).join(' · ')) || 'Unknown'}</p>`,
        }),
      }).catch((e) => console.warn('[consultation enquiry] notify email failed:', e?.message))
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[consultation enquiry API]', err?.message)
    // Generic message only — never echo internal/DB detail to the anonymous caller (CWE-209).
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
