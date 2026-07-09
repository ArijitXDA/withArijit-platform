import { NextRequest, NextResponse } from 'next/server'
import { getRazorpay }         from '@/lib/razorpay'
import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { toOrderAmount }       from '@/lib/orderCurrency'
import { isCurrency, type FxRates } from '@/lib/currency-config'

/**
 * POST /api/payments/create-order-balance
 *
 * Creates a Razorpay order for the remaining balance on an enrolment.
 * The amount is ALWAYS read from student_enrolments.balance_due — never trusted from the client.
 *
 * Body: { enrolment_id: string }
 */
export async function POST(req: NextRequest) {
  try {
    // ── Auth: must be signed in ───────────────────────────────────────────
    const supabaseAuth = await createClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { enrolment_id } = await req.json()
    if (!enrolment_id) {
      return NextResponse.json({ error: 'enrolment_id is required' }, { status: 400 })
    }

    const service = createServiceClient()

    // ── Fetch enrolment — verify it belongs to this student ───────────────
    const { data: enrolment, error: enrolErr } = await service
      .from('student_enrolments')
      .select(`
        id, student_email, student_name, student_mobile,
        course_id, course_name, enrolment_type,
        mrp, amount_paid, balance_due,
        currency, fx_rate,
        partner_id
      `)
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

    // ── Determine instalment context from existing payment_transactions ────
    const { data: existingPayments } = await service
      .from('payment_transactions')
      .select('payment_type, instalment_number, total_instalments, amount_paid')
      .eq('enrolment_id', enrolment_id)
      .order('instalment_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastInstalment = existingPayments?.instalment_number ?? 1
    const totalInstalments = existingPayments?.total_instalments ?? 2
    const nextInstalment = lastInstalment + 1

    // Determine payment_type for this balance payment
    let paymentType = 'balance_clearance'
    if (totalInstalments === 2 && nextInstalment === 2) {
      paymentType = 'second_instalment'
    } else if (totalInstalments > 2) {
      paymentType = 'monthly_emi'
    }

    // ── Resolve partner code for notes ────────────────────────────────────
    let partnerCode = ''
    if (enrolment.partner_id) {
      const { data: partner } = await service
        .from('partners')
        .select('partner_code')
        .eq('id', enrolment.partner_id)
        .maybeSingle()
      partnerCode = partner?.partner_code ?? ''
    }

    // ── Currency snapshot: charge the balance in the SAME currency at the SAME
    // rate as the first instalment (honour the original deal). The student
    // dashboard has NO currency selector — currency + fx_rate come from the
    // enrolment row, NOT from the current admin FX rate. INR stays byte-identical
    // (whole-paise from the DB balance); USD/EUR re-charge the same INR balance
    // at the snapshotted rate. Non-INR requires Razorpay International.
    const enrolCurrency = isCurrency(enrolment.currency) ? enrolment.currency : 'INR'
    const snapRate      = Number(enrolment.fx_rate) > 0 ? Number(enrolment.fx_rate) : 1

    // Guard: a USD/EUR enrolment MUST carry a positive snapshot rate — refuse rather
    // than fall back to 1:1 (which would ~100× overcharge the foreign balance).
    if (enrolCurrency !== 'INR' && !(Number(enrolment.fx_rate) > 0)) {
      return NextResponse.json(
        { error: 'This enrolment is missing a valid exchange-rate snapshot — please contact support to pay the balance.' },
        { status: 409 },
      )
    }

    let orderAmount   = Math.round(balance * 100)      // paise — unchanged INR path
    let orderCurrency: 'INR' | 'USD' | 'EUR' = 'INR'
    let chargedAmount = balance                         // major units actually charged
    let fxRate        = 1

    if (enrolCurrency === 'USD' || enrolCurrency === 'EUR') {
      // Build the rates from the SNAPSHOT so the same rate applies to both instalments.
      const snapRates: FxRates = { usd_inr: snapRate, eur_inr: snapRate }
      const oa = toOrderAmount(balance, enrolCurrency, snapRates)
      orderAmount   = oa.amount          // cents at the snapshotted rate
      orderCurrency = oa.currency
      chargedAmount = oa.chargedAmount
      fxRate        = oa.fxRate
    }

    // ── Create Razorpay order for exact balance_due amount ─────────────────
    const order = await getRazorpay().orders.create({
      amount:   orderAmount,                 // smallest unit — always from DB, never from client
      currency: orderCurrency,
      receipt:  `bal_${Date.now()}`,
      notes: {
        enrolment_id,
        course_id:         enrolment.course_id ?? '',
        course_name:       enrolment.course_name,
        student_email:     enrolment.student_email,
        payment_type:      paymentType,
        instalment_number: String(nextInstalment),
        total_instalments: String(totalInstalments),
        partner_code:      partnerCode,
        currency:          orderCurrency,
        fx_rate:           String(fxRate),
        charged_amount:    String(chargedAmount),
        inr_amount:        String(Math.round(balance)),
      },
    })

    return NextResponse.json({
      orderId:              order.id,
      amount:               order.amount,
      currency:             order.currency,
      displayAmount:        balance,
      courseName:           enrolment.course_name,
      paymentType,
      instalmentNumber:     nextInstalment,
      totalInstalments,
      chargedCurrency:      orderCurrency,
      chargedAmount:        chargedAmount,
      fxRate:               fxRate,
    })

  } catch (err: any) {
    console.error('[create-order-balance]', err.message)
    return NextResponse.json({ error: 'Failed to create order', detail: err.message }, { status: 500 })
  }
}
