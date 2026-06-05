import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, mobile, enquiry_type, message,
            course_interest, batch_preference,
            company_name, team_size, training_topic,
            org_type, city, organisation, brief,
            _honey } = body

    // Honeypot check
    if (_honey) return NextResponse.json({ success: true })

    // Basic validation
    if (!name?.trim() || !email?.trim() || !enquiry_type)
      return NextResponse.json({ error: 'Name, email and enquiry type are required' }, { status: 400 })

    // Insert into DB
    const { error: dbErr } = await admin.from('contact_enquiries').insert({
      name: name.trim(), email: email.trim().toLowerCase(), mobile: mobile?.trim() || null,
      enquiry_type, message: message?.trim() || null,
      course_interest: course_interest || null, batch_preference: batch_preference || null,
      company_name: company_name || null, team_size: team_size || null, training_topic: training_topic || null,
      org_type: org_type || null, city: city || null,
      organisation: organisation || null, brief: brief || null,
    })
    if (dbErr) throw new Error(dbErr.message)

    // Send confirmation email to enquirer via Resend
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const confirmHtml = `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f6f8;margin:0;padding:24px 0;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;padding:32px;margin:0 auto;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
<tr><td><img src="https://www.ostaran.com/ostaran-logo.png" alt="oStaran" style="height:36px;margin-bottom:24px;background:#000;padding:4px 10px;border-radius:6px;display:block;" /></td></tr>
<tr><td style="font-size:20px;font-weight:bold;color:#111827;padding-bottom:12px;">We've received your message, ${name}!</td></tr>
<tr><td style="font-size:14px;color:#374151;line-height:1.6;padding-bottom:20px;">
  Thank you for reaching out to oStaran. Our team will get back to you within <strong>1 business day</strong>.<br/><br/>
  <strong>Your enquiry:</strong> ${ENQUIRY_LABELS[enquiry_type] || enquiry_type}
  ${message ? `<br/><br/><strong>Your message:</strong><br/>${message}` : ''}
</td></tr>
<tr><td style="background:#f8fafc;border-left:4px solid #4f46e5;padding:16px;border-radius:4px;font-size:14px;color:#374151;line-height:1.6;margin-bottom:20px;">
  💡 While you wait, get AI certified this Sunday — <a href="https://www.ostaran.com/masterclass" style="color:#4f46e5;font-weight:bold;">Register for the AI Certification Session</a>.
  90 minutes, live, globally recognised certificate.
</td></tr>
<tr><td style="font-size:13px;color:#6b7280;padding-top:20px;border-top:1px solid #e5e7eb;">
  Star Analytix Pvt Ltd · Mira Road East, Mumbai, Maharashtra · <a href="mailto:ai@ostaran.com" style="color:#4f46e5;">ai@ostaran.com</a>
</td></tr>
</table></body></html>`

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'oStaran AI Education <ai@ostaran.com>',
          to: [email.trim()],
          subject: `We've received your message — oStaran`,
          html: confirmHtml,
        }),
      })

      // Notify admin
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'oStaran Ops <ai@ostaran.com>',
          to: ['ai@ostaran.com'],
          subject: `New Contact: ${ENQUIRY_LABELS[enquiry_type] || enquiry_type} — ${name}`,
          html: `<p><strong>Name:</strong> ${name}</p>
                 <p><strong>Email:</strong> ${email}</p>
                 <p><strong>Mobile:</strong> ${mobile || 'Not provided'}</p>
                 <p><strong>Type:</strong> ${ENQUIRY_LABELS[enquiry_type] || enquiry_type}</p>
                 <p><strong>Message:</strong> ${message || 'None'}</p>
                 <p><strong>Extra:</strong> ${JSON.stringify({ course_interest, batch_preference, company_name, team_size, training_topic, org_type, city, organisation, brief })}</p>`,
        }),
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[contact API]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

const ENQUIRY_LABELS: Record<string, string> = {
  student:   'Student / Course Enquiry',
  corporate: 'Corporate Training',
  partner:   'Partnership Enquiry',
  investor:  'Investor Relations',
  media:     'Media & Press',
  support:   'Technical Support',
  career:    'Career at oStaran',
  other:     'General Enquiry',
}
