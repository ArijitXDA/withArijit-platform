import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyPaymentSignature } from '@/lib/razorpay'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, registration_id } = await req.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !registration_id)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    // 1. Verify Razorpay signature
    const valid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    if (!valid)
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })

    // 2. Update registration to paid
    const { error: updateErr } = await admin
      .from('qr_landing_registrations')
      .update({
        razorpay_payment_id,
        payment_status: 'paid',
        paid_at:        new Date().toISOString(),
      })
      .eq('id', registration_id)
      .eq('registration_type', 'masterclass')

    if (updateErr) throw new Error(updateErr.message)

    // 3. Increment campaign uses_count if applicable
    const { data: reg } = await admin
      .from('qr_landing_registrations')
      .select('masterclass_campaign_id')
      .eq('id', registration_id)
      .single()

    if (reg?.masterclass_campaign_id) {
      try {
        // Fetch current count then increment — avoids needing a custom RPC
        const { data: camp } = await admin
          .from('masterclass_campaigns')
          .select('uses_count')
          .eq('id', reg.masterclass_campaign_id)
          .single()
        if (camp) {
          await admin
            .from('masterclass_campaigns')
            .update({ uses_count: (camp.uses_count ?? 0) + 1 })
            .eq('id', reg.masterclass_campaign_id)
        }
      } catch {
        // Non-critical — log only
        console.warn('[masterclass verify] Could not increment uses_count')
      }
    }

    // 4. Send confirmation email via Resend
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const { data: regData } = await admin
        .from('qr_landing_registrations')
        .select('full_name, email, masterclass_final_price')
        .eq('id', registration_id)
        .single()

      if (regData) {
        const price = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(Number(regData.masterclass_final_price ?? 0))
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from:    'oStaran Team <ai@ostaran.com>',
            to:      [regData.email],
            bcc:     ['ai@ostaran.com'],
            subject: 'Welcome to the oStaran AI Masterclass!',
            html: `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f6f8;margin:0;padding:24px 0;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;padding:32px;margin:0 auto;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
<tr><td><div style="background:#000;padding:4px 12px;border-radius:6px;display:inline-block;margin-bottom:24px;">
  <img src="https://www.ostaran.com/ostaran-logo.png" alt="oStaran" style="height:32px;display:block;" />
</div></td></tr>
<tr><td style="font-size:22px;font-weight:bold;color:#111827;padding-bottom:12px;">Welcome to AI Masterclass, ${regData.full_name?.split(' ')[0]}! 🎉</td></tr>
<tr><td style="font-size:14px;color:#374151;line-height:1.7;padding-bottom:20px;">
  Your payment of <strong>${price}</strong> has been confirmed. You are now enrolled in the <strong>oStaran AI Masterclass</strong>.<br/><br/>
  Our team will reach out within 24 hours with your batch details, schedule and orientation materials.
</td></tr>
<tr><td style="background:#f8fafc;border-left:4px solid #4f46e5;padding:16px;border-radius:4px;font-size:14px;color:#374151;line-height:1.6;margin-bottom:20px;">
  <strong>Payment ID:</strong> ${razorpay_payment_id}<br/>
  <strong>Amount Paid:</strong> ${price}
</td></tr>
<tr><td style="font-size:13px;color:#6b7280;padding-top:20px;border-top:1px solid #e5e7eb;">
  oStaran Edu Pvt Ltd · Mira Road East, Mumbai · <a href="mailto:ai@ostaran.com" style="color:#4f46e5;">ai@ostaran.com</a>
</td></tr>
</table></body></html>`,
          }),
        })
      }
    }

    return NextResponse.json({ success: true, payment_id: razorpay_payment_id })

  } catch (err: any) {
    console.error('[masterclass/verify-payment]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
