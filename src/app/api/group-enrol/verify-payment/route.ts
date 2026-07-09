import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyPaymentSignature } from '@/lib/razorpay'

// ── POST /api/group-enrol/verify-payment ──────────────────────────────────────
// Called by the client after Razorpay payment handler fires.
// 1. Verifies the Razorpay signature (tamper-proof)
// 2. Marks group_enrolments row as paid
// 3. Increments discount code uses_count (once, not per seat)
// 4. Writes a payment_transactions record for the purchaser
// 5. Sends confirmation email to the purchaser via Resend
// 6. Returns the manage_token so client redirects to seat-fill page

export async function POST(req: NextRequest) {
  let body: any = null
  try {
    body = await req.json()

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      group_enrolment_id,
    } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !group_enrolment_id)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    // ── 1. Verify signature ──────────────────────────────────────────────────
    const valid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    if (!valid)
      return NextResponse.json({ error: 'Invalid payment signature — possible tampering' }, { status: 400 })

    const supabase = createServiceClient()

    // ── 2. Fetch the pending group enrolment — idempotency check ─────────────
    const { data: ge, error: fetchErr } = await supabase
      .from('group_enrolments')
      .select('*')
      .eq('id', group_enrolment_id)
      .single()

    if (fetchErr || !ge)
      return NextResponse.json({ error: 'Group enrolment record not found' }, { status: 404 })

    // Idempotency: if already paid (e.g. webhook fired first), return success
    if (ge.payment_status === 'paid') {
      return NextResponse.json({
        success:      true,
        already_paid: true,
        manage_token: ge.manage_token,
        group_enrolment_id: ge.id,
      })
    }

    if (ge.payment_status !== 'pending')
      return NextResponse.json({ error: `Unexpected payment status: ${ge.payment_status}` }, { status: 400 })

    // Verify order ID matches what we stored (prevents order substitution)
    if (ge.razorpay_order_id !== razorpay_order_id)
      return NextResponse.json({ error: 'Order ID mismatch' }, { status: 400 })

    // ── 3. Mark as paid ──────────────────────────────────────────────────────
    const { error: updateErr } = await supabase
      .from('group_enrolments')
      .update({
        razorpay_payment_id,
        payment_status: 'paid',
        paid_at:        new Date().toISOString(),
      })
      .eq('id', group_enrolment_id)
      .eq('payment_status', 'pending')   // extra guard

    if (updateErr)
      return NextResponse.json({ error: `Failed to update payment status: ${updateErr.message}` }, { status: 500 })

    // ── Background work (non-blocking — fires after response) ─────────────────
    void runBackgroundWork({ supabase, ge, razorpay_payment_id, razorpay_order_id })

    // ── 4. Return success immediately ────────────────────────────────────────
    return NextResponse.json({
      success:            true,
      manage_token:       ge.manage_token,
      group_enrolment_id: ge.id,
    })

  } catch (err: any) {
    console.error('[group-enrol/verify-payment] unhandled:', err.message)
    return NextResponse.json({ error: `Payment verification failed: ${err.message}` }, { status: 500 })
  }
}

// ── Background work ────────────────────────────────────────────────────────────
async function runBackgroundWork(params: {
  supabase:            ReturnType<typeof createServiceClient>
  ge:                  any
  razorpay_payment_id: string
  razorpay_order_id:   string
}) {
  const { supabase, ge, razorpay_payment_id, razorpay_order_id } = params

  // ── 1. Increment discount code uses_count by 1 (one group purchase = one use)
  if (ge.discount_code) {
    try {
      await supabase.rpc('increment_discount_uses', { p_code: ge.discount_code })
    } catch (e: any) {
      console.warn('[group-enrol verify bg] discount increment failed (non-fatal):', e.message)
    }
  }

  // ── 2. Write payment_transactions for the purchaser ──────────────────────
  // One row for the whole group purchase — NOT per seat
  try {
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('payment_transactions').insert({
      student_email:       ge.purchaser_email,
      student_name:        ge.purchaser_name,
      course_id:           ge.course_id,
      course_name:         ge.course_name,
      payment_type:        'full',
      instalment_number:   1,
      total_instalments:   1,
      amount_paid:         ge.total_payable,
      payment_mode:        'upi',
      payment_date:        today,
      payment_reference:   razorpay_payment_id,
      razorpay_order_id,
      net_taxable:         Number((ge.total_payable / 1.18).toFixed(2)),
      gst_amount:          ge.gst_amount,
      gst_pct:             0.18,
      gst_mode:            'igst',
      group_purchase:      true,
      group_enrolment_id:  ge.id,
      notes:               `Group enrolment — ${ge.quantity} seats`,
      // Charge-currency snapshot so the invoice renders the currency actually
      // charged. Read from the group_enrolments row (server-authoritative — set at
      // create-order, never trusts a client-sent amount). INR keeps the column
      // defaults (currency 'INR', fx_rate 1, amount_charged null) — byte-identical.
      ...((ge.currency === 'USD' || ge.currency === 'EUR')
        ? {
            currency:       ge.currency,
            fx_rate:        Number(ge.fx_rate) > 0 ? Number(ge.fx_rate) : 1,
            amount_charged: Number.isFinite(Number(ge.amount_charged)) ? Number(ge.amount_charged) : ge.total_payable,
          }
        : {}),
    })
  } catch (e: any) {
    console.warn('[group-enrol verify bg] payment_transactions insert failed (non-fatal):', e.message)
  }

  // ── 3. Send confirmation email to purchaser ───────────────────────────────
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  try {
    const fmt  = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.ostaran.com'
    const manageUrl = `${appUrl}/group-enrol/manage/${ge.manage_token}`

    const html = `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f6f8;margin:0;padding:24px 0;">
<table width="600" cellpadding="0" cellspacing="0"
  style="background:#fff;border-radius:8px;padding:32px;margin:0 auto;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
<tr><td>
  <div style="background:#000;padding:4px 12px;border-radius:6px;display:inline-block;margin-bottom:24px;">
    <img src="https://www.ostaran.com/ostaran-logo.png" alt="oStaran" style="height:32px;display:block;" />
  </div>
</td></tr>

<tr><td style="font-size:22px;font-weight:bold;color:#111827;padding-bottom:12px;">
  Payment Confirmed! 🎉
</td></tr>

<tr><td style="font-size:14px;color:#374151;line-height:1.7;padding-bottom:20px;">
  Hi <strong>${ge.purchaser_name.split(' ')[0]}</strong>,<br/><br/>
  Your group enrolment payment has been received. Here's a summary:
</td></tr>

<tr><td style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px;font-size:14px;color:#374151;line-height:1.8;">
  <strong>Course:</strong> ${ge.course_name}<br/>
  <strong>Seats purchased:</strong> ${ge.quantity}<br/>
  <strong>Total paid:</strong> ${fmt(ge.total_payable)}${ge.total_discount > 0 ? ` (saved ${fmt(ge.total_discount)})` : ''}<br/>
  <strong>Payment ID:</strong> <span style="font-family:monospace;font-size:12px;">${razorpay_payment_id}</span>
</td></tr>

<tr><td style="font-size:14px;color:#374151;line-height:1.7;padding-bottom:16px;">
  <strong>Next step:</strong> Tell us who you'd like to enrol.
  Click the button below to add the names, emails and mobile numbers of your ${ge.quantity} students.
  Each student will receive a personal invitation link to activate their seat.
</td></tr>

<tr><td style="padding-bottom:24px;">
  <a href="${manageUrl}"
    style="display:inline-block;padding:14px 28px;background:#4f46e5;color:#fff;border-radius:8px;
           font-weight:bold;font-size:15px;text-decoration:none;">
    Add Students Now →
  </a>
</td></tr>

<tr><td style="font-size:12px;color:#9ca3af;padding-top:4px;">
  This link is unique to your purchase. Bookmark it — you can return anytime to check how many students
  have activated their seats.
</td></tr>

<tr><td style="font-size:13px;color:#6b7280;padding-top:20px;border-top:1px solid #e5e7eb;margin-top:24px;">
  Star Analytix Pvt Ltd · Mira Road East, Mumbai ·
  <a href="mailto:ai@ostaran.com" style="color:#4f46e5;">ai@ostaran.com</a>
</td></tr>
</table>
</body></html>`

    await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'oStaran Accounts <ai@ostaran.com>',
        to:      [ge.purchaser_email],
        bcc:     ['ai@ostaran.com'],
        subject: `✅ Payment confirmed — ${ge.quantity} seats for ${ge.course_name}`,
        html,
      }),
    })
  } catch (e: any) {
    console.warn('[group-enrol verify bg] confirmation email failed (non-fatal):', e.message)
  }
}
