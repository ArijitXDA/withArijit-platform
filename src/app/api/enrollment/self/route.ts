import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { queueEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { payment_id, order_id, course_id, name, email, mobile, amount, discount_code } = body

    if (!payment_id || !order_id || !course_id || !name || !email || !mobile || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const now = new Date()

    // Insert payment record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: paymentError } = await (supabase as any).from('payments').insert({
      amount,
      payment_date: now.toISOString().split('T')[0],
      payment_time: now.toTimeString().split(' ')[0],
      currency: 'INR',
      country: 'IN',
      razorpay_payment_id: payment_id,
      razorpay_order_id: order_id,
      coupon_code: discount_code ?? null,
      status: 'captured',
    })

    if (paymentError) {
      console.error('Failed to insert payment:', paymentError.message)
    }

    // Upsert student record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: studentError } = await (supabase as any).from('student_master_table').upsert(
      {
        name,
        email,
        mobile,
        course_name: course_id,
        enrollment_date: now.toISOString(),
        total_payments_count: 1,
        total_amount_paid: amount,
      },
      { onConflict: 'email' }
    )

    if (studentError) {
      console.error('Failed to upsert student:', studentError.message)
    }

    // Queue confirmation email
    await queueEmail({
      to: email,
      template_name: 'enrollment_confirmation',
      payload: { name, course_id, amount },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Self enrollment error:', error)
    return NextResponse.json({ error: 'Enrollment failed' }, { status: 500 })
  }
}
