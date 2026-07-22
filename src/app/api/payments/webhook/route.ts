/**
 * POST /api/payments/webhook
 *
 * Razorpay webhook receiver — fires after every payment event.
 * This is the RELIABLE backup path for enrolment recording:
 *
 * Flow:
 *   Razorpay → POST /api/payments/webhook
 *     → verify HMAC signature
 *     → on payment.captured: call /api/enrollment/self internally
 *
 * Why needed: The PaymentModal handler fires client-side after Razorpay checkout
 * closes. If the user closes the tab or loses connectivity before the handler runs,
 * this webhook ensures the enrolment is still recorded.
 *
 * Register this URL in Razorpay Dashboard → Settings → Webhooks:
 *   https://www.ostaran.com/api/payments/webhook
 *
 * Events to subscribe: payment.captured
 * Secret: set RAZORPAY_WEBHOOK_SECRET in env (must match the dashboard secret)
 * Also ensure NEXT_PUBLIC_APP_URL=https://www.ostaran.com so the internal
 * enrolment call below resolves to the live host.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/razorpay'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  const body      = await request.text()
  const signature = request.headers.get('x-razorpay-signature') ?? ''

  // ── 1. Verify HMAC signature ──────────────────────────────────────────────
  if (!verifyWebhookSignature(body, signature)) {
    console.error('[webhook] Invalid Razorpay signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: any
  try { event = JSON.parse(body) }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  // ── 2. Only handle payment.captured ──────────────────────────────────────
  if (event.event !== 'payment.captured') {
    return NextResponse.json({ received: true, skipped: event.event })
  }

  const payment = event.payload?.payment?.entity
  if (!payment) return NextResponse.json({ error: 'No payment entity' }, { status: 400 })

  const paymentId = payment.id
  const orderId   = payment.order_id
  const amountRaw = payment.amount   // paise
  const notes     = payment.notes ?? {}

  // ── Expert Consultation orders take a different fulfilment path ────────────
  // (USD-native; builds enrolment + batch/session, not a course enrolment). Route them to
  // /api/consultation/confirm, authenticated by the shared webhook secret. That route is
  // idempotent on razorpay_payment_id, so this backstop is safe alongside the client path.
  if (notes.product === 'consultation') {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.ostaran.com'
      const res = await fetch(`${appUrl}/api/consultation/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
        },
        body: JSON.stringify({ razorpay_order_id: orderId, razorpay_payment_id: paymentId }),
      })
      const r = await res.json().catch(() => ({}))
      if (!res.ok) console.error('[webhook] consultation confirm failed:', r?.error)
      return NextResponse.json({ received: true, consultation: res.ok })
    } catch (err: any) {
      console.error('[webhook] consultation confirm error:', err?.message)
      return NextResponse.json({ received: true, error: err?.message }, { status: 200 })
    }
  }

  const courseId        = notes.course_id
  const name            = notes.name
  const email           = notes.email
  const mobile          = notes.mobile
  const paymentFreq     = notes.payment_frequency ?? 'full'
  const partnerCode     = notes.partner_code ?? null
  // Use the INR-equivalent stamped by create-order (notes.inr_amount) for internal
  // accounting — NOT amountRaw/100, which for a USD/EUR order is the FOREIGN major
  // unit (cents/100 = dollars) and would record the sale at ~1/rate of its value.
  const inrFromNotes    = Number(notes.inr_amount)
  const amount          = Number.isFinite(inrFromNotes) && inrFromNotes > 0 ? inrFromNotes : amountRaw / 100
  const currency        = (notes.currency === 'USD' || notes.currency === 'EUR') ? notes.currency : 'INR'
  const amountCharged   = Number(notes.charged_amount)
  const fxRate          = Number(notes.fx_rate)

  if (!courseId || !email) {
    console.warn('[webhook] Missing course_id or email in notes — skipping enrolment')
    return NextResponse.json({ received: true, skipped: 'missing_notes' })
  }

  // ── 3. Idempotency — check if already enrolled from this payment ──────────
  const supabase = createServiceClient()
  const { data: existing } = await supabase
    .from('student_enrolments')
    .select('id')
    .eq('payment_reference', paymentId)
    .maybeSingle()

  if (existing) {
    console.log(`[webhook] Enrolment already exists for payment ${paymentId} — skipping duplicate`)
    return NextResponse.json({ received: true, skipped: 'already_enrolled' })
  }

  // ── 4. Call the enrolment API internally ─────────────────────────────────
  // We call the existing /api/enrollment/self logic by importing the handler directly
  // rather than making an HTTP call, to avoid network overhead.
  try {
    const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.ostaran.com'
    const enrolRes   = await fetch(`${appUrl}/api/enrollment/self`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-source': 'razorpay' },
      body: JSON.stringify({
        payment_id:     paymentId,
        order_id:       orderId,
        course_id:      courseId,
        name:           name ?? 'Student',
        email,
        mobile:         mobile ?? '',
        amount,
        // For a 50-50 plan the paid amount is the first instalment; the full price is
        // 2× so net_after_discount/balance_due record correctly if the webhook is the
        // writer (the client sends this too).
        full_discounted_price: paymentFreq === 'half' ? amount * 2 : amount,
        partner_code:   partnerCode,
        enrolment_type: paymentFreq === 'full' ? 'full_course' : 'monthly',
        currency,
        amount_charged: Number.isFinite(amountCharged) && amountCharged > 0 ? amountCharged : amount,
        fx_rate:        Number.isFinite(fxRate) && fxRate > 0 ? fxRate : 1,
      }),
    })

    const result = await enrolRes.json().catch(() => ({}))

    if (!enrolRes.ok) {
      console.error('[webhook] Enrolment API failed:', result)
      // Return 200 to Razorpay so it doesn't retry — log for manual follow-up
      return NextResponse.json({ received: true, enrolment_error: result.error }, { status: 200 })
    }

    console.log(`[webhook] Enrolment created via webhook for ${email} — ${result.enrolment_id}`)
    return NextResponse.json({ received: true, enrolment_id: result.enrolment_id })

  } catch (err: any) {
    console.error('[webhook] Internal error:', err.message)
    return NextResponse.json({ received: true, error: err.message }, { status: 200 })
  }
}
