import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { queueEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { payer_name, payer_email, friend_email, course_id, payment_id, order_id, amount } = body

    if (!payer_name || !payer_email || !friend_email || !course_id || !payment_id || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const now = new Date()

    // Record payment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('payments').insert({
      amount,
      payment_date: now.toISOString().split('T')[0],
      payment_time: now.toTimeString().split(' ')[0],
      currency: 'INR',
      country: 'IN',
      razorpay_payment_id: payment_id,
      razorpay_order_id: order_id ?? null,
      status: 'captured',
    })

    // Send gift notification to recipient
    await queueEmail({
      to: friend_email,
      template_name: 'gift_enrollment',
      payload: {
        payer_name,
        course_id,
        signup_url: `${process.env.NEXT_PUBLIC_APP_URL}/signup?gifted=true&course=${course_id}`,
      },
    })

    // Confirm to payer
    await queueEmail({
      to: payer_email,
      template_name: 'gift_enrollment_confirmation',
      payload: { payer_name, friend_email, course_id, amount },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Gift enrollment error:', error)
    return NextResponse.json({ error: 'Gift enrollment failed' }, { status: 500 })
  }
}
