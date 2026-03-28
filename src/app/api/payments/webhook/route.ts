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
 *   https://www.witharijit.com/api/payments/webhook
 *   (or https://with-arijit-platform.vercel.app/api/payments/webhook)
 *
 * Events to subscribe: payment.captured
 * Secret: set RAZORPAY_WEBHOOK_SECRET in env
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

  const courseId        = notes.course_id
  const name            = notes.name
  const email           = notes.email
  const mobile          = notes.mobile
  const paymentFreq     = notes.payment_frequency ?? 'full'
  const partnerCode     = notes.partner_code ?? null
  const amount          = amountRaw / 100   // convert paise → ₹

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
    const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.witharijit.com'
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
        partner_code:   partnerCode,
        enrolment_type: paymentFreq === 'full' ? 'full_course' : 'monthly',
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
