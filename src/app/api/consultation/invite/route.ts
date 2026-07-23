import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// POST /api/consultation/invite — the buyer invites additional attendees to their paid
// consultation. Gated by the order's schedule_token (which only the buyer has). The paid
// attendee count caps the number of invites (buyer + invitees ≤ attendees). Each invitee is
// emailed a claim link; claiming enrols them (zero amount) on the same batch.

const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const token = String(body?.schedule_token ?? '').trim()
    const rawEmails: any[] = Array.isArray(body?.emails) ? body.emails : []
    if (!token) return NextResponse.json({ error: 'Missing booking token.' }, { status: 400 })

    const supabase = createServiceClient()

    const { data: order } = await supabase
      .from('consultation_orders')
      .select('id, status, attendees, buyer_name')
      .eq('schedule_token', token)
      .maybeSingle()
    if (!order) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    if (order.status !== 'paid' && order.status !== 'scheduled') {
      return NextResponse.json({ error: 'This booking is not ready for invites.' }, { status: 400 })
    }

    // Normalise + validate the submitted emails.
    const clean = rawEmails
      .map((e: any) => ({
        email: String(e?.email ?? '').trim().toLowerCase().slice(0, 320),
        name: String(e?.name ?? '').trim().slice(0, 200) || null,
      }))
      .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.email))
    // De-dupe within the request.
    const seen = new Set<string>()
    const emails = clean.filter((e) => (seen.has(e.email) ? false : (seen.add(e.email), true)))
    if (!emails.length) return NextResponse.json({ error: 'Add at least one valid email.' }, { status: 400 })

    const maxInvites = Math.max(0, (Number(order.attendees) || 1) - 1)
    const { count: existing } = await supabase
      .from('consultation_invites')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', order.id)
    if ((existing ?? 0) + emails.length > maxInvites) {
      return NextResponse.json(
        { error: `You can invite up to ${maxInvites} attendee${maxInvites === 1 ? '' : 's'} on this booking.` },
        { status: 400 },
      )
    }

    // Insert atomically under a row lock on the order (the RPC enforces the attendee cap so a
    // concurrent burst can't slip past the count-then-insert check above), then email the fresh ones.
    const { data: inserted } = await supabase.rpc('consultation_add_invites', {
      p_order_id: order.id,
      p_emails: emails,
    })

    // The buyer gets these links back so they can share them directly (Slack/WhatsApp/
    // their own email) — the emailed invite is a convenience, never the only channel.
    const links = (inserted ?? []).map((inv: any) => ({
      email: inv.invitee_email as string,
      url: `https://www.ostaran.com/consultation/join/${inv.invite_token}`,
    }))

    const resendKey = process.env.RESEND_API_KEY
    if (resendKey && inserted?.length) {
      await Promise.all(
        inserted.map(async (inv: any) => {
          const joinUrl = `https://www.ostaran.com/consultation/join/${inv.invite_token}`
          try {
            const r = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: 'oStaran AI Education <ai@ostaran.com>',
                to: [inv.invitee_email],
                subject: `${esc(order.buyer_name) || 'A colleague'} invited you to an Expert Consultation`,
                html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f6f8;padding:24px 0;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;padding:32px;margin:0 auto;">
<tr><td style="font-size:20px;font-weight:bold;color:#111827;padding-bottom:12px;">You&apos;re invited to a consultation session</td></tr>
<tr><td style="font-size:14px;color:#374151;line-height:1.6;padding-bottom:20px;">
  ${esc(order.buyer_name) || 'A colleague'} has added you to an Expert Consultation with an industrial Agentic&nbsp;AI expert. Accept your seat to get the session times, the Teams join link and the recordings afterwards:
  <br/><br/>
  <a href="${joinUrl}" style="display:inline-block;background:#4f46e5;color:#fff;font-weight:bold;padding:12px 22px;border-radius:8px;text-decoration:none;">Accept your seat →</a>
</td></tr>
<tr><td style="font-size:13px;color:#6b7280;padding-top:20px;border-top:1px solid #e5e7eb;">Star Analytix Pvt Ltd · Mumbai · <a href="mailto:ai@ostaran.com" style="color:#4f46e5;">ai@ostaran.com</a></td></tr>
</table></body></html>`,
              }),
            })
            // Resend returns 4xx WITHOUT throwing, so an un-checked fetch would swallow a
            // rejected send. Surface it (the buyer still has the shareable link regardless).
            if (!r.ok) console.warn('[consultation invite] resend rejected:', r.status, await r.text().catch(() => ''))
          } catch (e: any) {
            console.warn('[consultation invite] email send error:', e?.message)
          }
        }),
      )
    }

    return NextResponse.json({ success: true, invited: inserted?.length ?? 0, links })
  } catch (err: any) {
    console.error('[consultation invite]', err?.message)
    return NextResponse.json({ error: 'Could not send invites. Please try again.' }, { status: 500 })
  }
}
