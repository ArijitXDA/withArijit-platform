import { NextRequest, NextResponse } from 'next/server'
import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * POST /api/enrollment/record-balance
 *
 * Called after Razorpay succeeds for a balance / second-instalment payment.
 * 1. Verifies Razorpay signature
 * 2. Re-reads balance_due from DB (authoritative — never trusted from client)
 * 3. Sets balance_due = 0 on the enrolment
 * 4. Creates a payment_transactions invoice row via existing RPC
 * 5. Fires payment_confirmed comms (non-blocking background)
 */
export async function POST(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const supabaseAuth = await createClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      enrolment_id,
      payment_type     = 'balance_clearance',
      instalment_number = 2,
      total_instalments = 2,
    } = body

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !enrolment_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ── Verify Razorpay signature ─────────────────────────────────────────
    const crypto = await import('crypto')
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expectedSig !== razorpay_signature) {
      return NextResponse.json({ error: 'Payment signature verification failed' }, { status: 400 })
    }

    const service = createServiceClient()
    const today   = new Date().toISOString().split('T')[0]

    // ── Re-fetch enrolment: balance_due is authoritative ──────────────────
    const { data: enrolment, error: enrolErr } = await service
      .from('student_enrolments')
      .select('id, student_email, course_id, balance_due, partner_id')
      .eq('id', enrolment_id)
      .eq('student_email', user.email!.toLowerCase())
      .eq('is_active', true)
      .single()

    if (enrolErr || !enrolment) {
      return NextResponse.json({ error: 'Enrolment not found' }, { status: 404 })
    }

    const balance = Number(enrolment.balance_due ?? 0)
    if (balance <= 0) {
      return NextResponse.json({ error: 'No balance outstanding on this enrolment' }, { status: 400 })
    }

    // ── 1. Zero out balance_due ───────────────────────────────────────────
    await service
      .from('student_enrolments')
      .update({ balance_due: 0 })
      .eq('id', enrolment_id)

    // ── 2. Resolve partner code for invoice ───────────────────────────────
    let partnerCode: string | null = null
    if (enrolment.partner_id) {
      const { data: partner } = await service
        .from('partners')
        .select('partner_code')
        .eq('id', enrolment.partner_id)
        .maybeSingle()
      partnerCode = partner?.partner_code ?? null
    }

    // ── 3. Create payment_transactions invoice (uses existing RPC) ─────────
    let invoiceNumber = ''
    try {
      const { data: inv } = await service.rpc('create_payment_transaction', {
        p_enrolment_id:      enrolment_id,
        p_payment_type:      payment_type,
        p_instalment_number: instalment_number,
        p_total_instalments: total_instalments,
        p_amount_paid:       balance,
        p_payment_mode:      'upi',
        p_payment_date:      today,
        p_payment_reference: razorpay_payment_id,
        p_razorpay_order_id: razorpay_order_id,
        p_partner_code:      partnerCode,
      })
      invoiceNumber = inv ?? ''
    } catch (e: any) {
      console.warn('[record-balance] invoice creation failed (non-fatal):', e.message)
    }

    // ── 4. Fire comms — non-blocking ──────────────────────────────────────
    void (async () => {
      try {
        const { sendStudentComm } = await import('@/lib/comms')
        await sendStudentComm({
          event_type:   'payment_confirmed',
          enrolment_id: enrolment_id,
          triggered_by: 'system',
        })
      } catch (e: any) {
        console.warn('[record-balance] comms failed (non-fatal):', e.message)
      }
    })()

    return NextResponse.json({
      success:        true,
      invoice_number: invoiceNumber,
      amount_paid:    balance,
    })

  } catch (err: any) {
    console.error('[record-balance] unhandled error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
