import { NextRequest, NextResponse } from 'next/server'
import { getRazorpay }         from '@/lib/razorpay'
import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

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

    // ── Create Razorpay order for exact balance_due amount ─────────────────
    const order = await getRazorpay().orders.create({
      amount:   Math.round(balance * 100),   // paise — always from DB, never from client
      currency: 'INR',
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
    })

  } catch (err: any) {
    console.error('[create-order-balance]', err.message)
    return NextResponse.json({ error: 'Failed to create order', detail: err.message }, { status: 500 })
  }
}
