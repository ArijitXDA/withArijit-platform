import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyPaymentSignature } from '@/lib/razorpay'
import { todayISO } from '@/lib/sessionSchedule'

// POST /api/consultation/confirm — the idempotent post-payment writer for an Expert
// Consultation booking. Verifies the payment, creates the paid enrolment + payment record,
// and mints a schedule token that sends the buyer to the slot picker (batch + Teams are
// created THERE, once a slot/start_date exists). Called by BOTH the client handler and the
// webhook backstop; the atomic claim on razorpay_payment_id makes it exactly-once.

const CONSULT_SLUG = 'expert-consultation'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const orderId = String(body?.razorpay_order_id ?? '')
    const paymentId = String(body?.razorpay_payment_id ?? '')
    const signature = String(body?.razorpay_signature ?? '')

    // Auth: the client path proves the payment with the Razorpay checkout signature; the
    // webhook backstop (which has already HMAC-verified the Razorpay event) instead presents
    // the shared webhook secret and has no checkout signature.
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    const fromWebhook =
      !!webhookSecret && req.headers.get('x-webhook-secret') === webhookSecret

    if (!orderId || !paymentId) {
      return NextResponse.json({ error: 'Missing payment fields.' }, { status: 400 })
    }
    if (!fromWebhook) {
      if (!signature || !verifyPaymentSignature(orderId, paymentId, signature)) {
        return NextResponse.json({ error: 'Payment verification failed.' }, { status: 400 })
      }
    }

    const supabase = createServiceClient()
    const now = new Date().toISOString()
    const today = todayISO() // IST business day (Vercel runs UTC; toISOString would shift the day)
    const scheduleToken = randomUUID()

    // ── Atomic idempotency claim ─────────────────────────────────────────────
    // Only one caller (client OR webhook) wins the right to fulfil, by being the one to set
    // razorpay_payment_id while it is still null. The schedule_token is set here too so it is
    // always present once claimed.
    const { data: claim } = await supabase
      .from('consultation_orders')
      .update({ razorpay_payment_id: paymentId, schedule_token: scheduleToken, updated_at: now })
      .eq('razorpay_order_id', orderId)
      .is('razorpay_payment_id', null)
      .select('*')
      .maybeSingle()

    if (!claim) {
      // Already claimed/fulfilled by the other path — return the existing token idempotently.
      const { data: existing } = await supabase
        .from('consultation_orders')
        .select('id, schedule_token, status')
        .eq('razorpay_order_id', orderId)
        .maybeSingle()
      if (!existing) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
      // Heal a lagging finalise: the payment was claimed and the enrolment created, but the
      // final status flip never committed, leaving the order stuck at 'pending'. Re-run it
      // from the enrolment matched on this payment so scheduling isn't permanently blocked.
      if (existing.status === 'pending') {
        const { data: enrol } = await supabase
          .from('student_enrolments')
          .select('id')
          .eq('payment_reference', paymentId)
          .maybeSingle()
        if (enrol) {
          await supabase
            .from('consultation_orders')
            .update({ status: 'paid', enrolment_id: enrol.id, updated_at: now })
            .eq('id', existing.id)
        }
      }
      return NextResponse.json({ success: true, scheduleToken: existing.schedule_token })
    }

    // ── Consultation course ──────────────────────────────────────────────────
    const { data: course } = await supabase
      .from('awa_courses')
      .select('id, name')
      .eq('slug', CONSULT_SLUG)
      .maybeSingle()
    if (!course) {
      await releaseClaim(supabase, claim.id)
      return NextResponse.json({ error: 'Consultation product missing.' }, { status: 500 })
    }

    const email = String(claim.buyer_email).toLowerCase()
    const inrAmount = Number(claim.inr_amount) // INR-equivalent for the internal books
    const usdTotal = Number(claim.total_usd)
    const fxRate = Number(claim.fx_rate) > 0 ? Number(claim.fx_rate) : 1

    // enrolment sequence for this buyer+course
    const { count: existingCount } = await supabase
      .from('student_enrolments')
      .select('*', { count: 'exact', head: true })
      .eq('student_email', email)
      .eq('course_id', course.id)
    const enrolmentSeq = (existingCount ?? 0) + 1

    // ── Create the paid enrolment (batch assigned later, at scheduling) ──────
    // Money-column convention: INR columns hold the INR-equivalent (like the rest of the
    // stack); currency/amount_charged/fx_rate are the USD display overlay. GST + commission
    // are zero (consultation is zero-rated pending CA sign-off; partner_pool_percent=0).
    const { data: enrolmentRow, error: enrolErr } = await supabase
      .from('student_enrolments')
      .insert({
        partner_id: null,
        student_name: claim.buyer_name,
        student_email: email,
        student_mobile: claim.buyer_mobile,
        course_name: course.name,
        course_id: course.id,
        enrolment_type: 'full_course',
        mrp: inrAmount,
        discount_pct: 0,
        discount_amount: 0,
        net_after_discount: inrAmount,
        gst_pct: 0,
        gst_amount: 0,
        net_taxable: inrAmount,
        amount_paid: inrAmount,
        currency: 'USD',
        amount_charged: usdTotal,
        fx_rate: fxRate,
        balance_due: 0,
        payment_mode: 'card',
        payment_date: today,
        payment_reference: paymentId,
        commission_pct: 0,
        commission_amount: 0,
        oi_amount: inrAmount,
        is_active: true,
        enrolment_seq: enrolmentSeq,
        enrolment_status: 'active',
        batch_id: null, // assigned when the buyer picks a slot
      })
      .select('id')
      .single()

    if (enrolErr || !enrolmentRow) {
      console.error('[consultation confirm] enrolment insert failed:', enrolErr?.message)
      // Release the claim so the webhook backstop can retry the full fulfilment.
      await releaseClaim(supabase, claim.id)
      try {
        await supabase.from('payment_recovery_log').insert({
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          student_name: claim.buyer_name,
          student_email: email,
          student_mobile: claim.buyer_mobile,
          course_id: course.id,
          course_name: course.name,
          amount: inrAmount,
          failure_stage: 'consultation_enrolment_insert',
          failure_reason: enrolErr?.message ?? 'unknown',
        })
      } catch { /* recovery log failure non-fatal */ }
      return NextResponse.json({ error: 'Could not complete your booking. Our team has been alerted.' }, { status: 500 })
    }

    const enrolmentId = enrolmentRow.id

    // ── Payment transaction (invoice the dashboard reads) ────────────────────
    try {
      await supabase.rpc('create_payment_transaction', {
        p_enrolment_id: enrolmentId,
        p_payment_type: 'full',
        p_instalment_number: 1,
        p_total_instalments: 1,
        p_amount_paid: inrAmount,
        p_payment_mode: 'card',
        p_payment_date: today,
        p_payment_reference: paymentId,
        p_razorpay_order_id: orderId,
        p_partner_code: null,
      })
      await supabase
        .from('payment_transactions')
        .update({ currency: 'USD', fx_rate: fxRate, amount_charged: usdTotal })
        .eq('enrolment_id', enrolmentId)
    } catch (e: any) {
      console.warn('[consultation confirm] payment_transaction failed (non-fatal):', e?.message)
      try {
        await supabase.from('payment_recovery_log').insert({
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          student_email: email,
          course_id: course.id,
          amount: inrAmount,
          failure_stage: 'consultation_payment_transaction',
          failure_reason: e?.message ?? 'unknown',
        })
      } catch { /* non-fatal */ }
    }

    // ── Consume the Type-4 quote + discount FIRST (before the finalise) ───────
    // Done before the order-status flip so that even if the finalise below fails, the quote
    // can't be paid a second time via its pay-link and the code isn't double-redeemable.
    if (claim.quote_id) {
      await supabase
        .from('consultation_quotes')
        .update({ status: 'booked', pay_token: null, updated_at: now })
        .eq('id', claim.quote_id)
    }
    if (claim.discount_code) {
      try {
        await supabase.rpc('increment_discount_uses', { p_code: String(claim.discount_code) })
      } catch (e: any) {
        console.warn('[consultation confirm] discount increment failed (non-fatal):', e?.message)
      }
    }

    // ── Finalise the order (status → paid, attach enrolment) ─────────────────
    const { error: finalErr } = await supabase
      .from('consultation_orders')
      .update({ status: 'paid', enrolment_id: enrolmentId, updated_at: now })
      .eq('id', claim.id)
    if (finalErr) {
      // Payment + enrolment already exist; the order just didn't flip to 'paid'. Log for
      // recovery and DON'T report success — the webhook backstop heals this via the
      // already-claimed branch (matches the enrolment by payment_reference).
      console.error('[consultation confirm] order finalise failed:', finalErr.message)
      try {
        await supabase.from('payment_recovery_log').insert({
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          student_email: email,
          course_id: course.id,
          amount: inrAmount,
          failure_stage: 'consultation_order_finalise',
          failure_reason: finalErr.message,
        })
      } catch { /* non-fatal */ }
      return NextResponse.json(
        { error: 'Your payment is recorded and we are finalising your booking. Please refresh in a moment.' },
        { status: 500 },
      )
    }

    // ── Confirmation email with the scheduling link (best-effort) ────────────
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const scheduleUrl = `https://www.ostaran.com/consultation/schedule/${scheduleToken}`
      const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'oStaran AI Education <ai@ostaran.com>',
          to: [email],
          subject: 'Payment received — pick your consultation slot',
          html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f6f8;padding:24px 0;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;padding:32px;margin:0 auto;">
<tr><td style="font-size:20px;font-weight:bold;color:#111827;padding-bottom:12px;">Thank you, ${esc(claim.buyer_name)} — payment received.</td></tr>
<tr><td style="font-size:14px;color:#374151;line-height:1.6;padding-bottom:20px;">
  Your Expert Consultation is booked (US$${esc(usdTotal)}). One last step — choose the time(s) that suit you:
  <br/><br/>
  <a href="${scheduleUrl}" style="display:inline-block;background:#4f46e5;color:#fff;font-weight:bold;padding:12px 22px;border-radius:8px;text-decoration:none;">Pick your slot →</a>
</td></tr>
<tr><td style="font-size:13px;color:#6b7280;padding-top:20px;border-top:1px solid #e5e7eb;">Star Analytix Pvt Ltd · Mumbai · <a href="mailto:ai@ostaran.com" style="color:#4f46e5;">ai@ostaran.com</a></td></tr>
</table></body></html>`,
        }),
      }).catch((e) => console.warn('[consultation confirm] email failed:', e?.message))
    }

    return NextResponse.json({ success: true, scheduleToken })
  } catch (err: any) {
    console.error('[consultation confirm]', err?.message)
    return NextResponse.json({ error: 'Could not complete your booking. Please contact support.' }, { status: 500 })
  }
}

// Release an idempotency claim so a retry (the webhook backstop) can re-attempt fulfilment.
async function releaseClaim(supabase: ReturnType<typeof createServiceClient>, orderRowId: string) {
  try {
    await supabase
      .from('consultation_orders')
      .update({ razorpay_payment_id: null, status: 'pending' })
      .eq('id', orderRowId)
  } catch {
    /* best-effort */
  }
}
