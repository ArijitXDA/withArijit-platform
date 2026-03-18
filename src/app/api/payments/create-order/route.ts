import { NextRequest, NextResponse } from 'next/server'
import { getRazorpay } from '@/lib/razorpay'
import { createServiceClient } from '@/lib/supabase/service'
import { paymentOrderSchema } from '@/lib/validations/payment'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = paymentOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const { course_id, payment_frequency, discount_code, name, email, mobile } = parsed.data
    const supabase = createServiceClient()

    // Fetch course pricing
    const { data: course, error: courseError } = await supabase
      .from('awa_courses')
      .select('mrp, name')
      .eq('id', course_id)
      .single()

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (payment_frequency === 'monthly') {
      return NextResponse.json({ error: 'Monthly installments are not yet available for online payment' }, { status: 400 })
    }

    // Calculate amount with 18% GST (default, as gst_percent column not confirmed in schema)
    const gstPercent = 18
    let baseAmount = ((course.mrp as number) ?? 0) * (1 + gstPercent / 100)
    if (payment_frequency === 'half') baseAmount = baseAmount / 2

    let finalAmount = baseAmount

    // Apply discount if provided
    if (discount_code) {
      const { data: discount } = await supabase
        .from('discount_codes')
        .select('discount_percent')
        .eq('code', discount_code)
        .eq('is_active', true)
        .single()
      if (discount) {
        finalAmount = finalAmount * (1 - (discount.discount_percent as number) / 100)
      }
    }

    const order = await getRazorpay().orders.create({
      amount: Math.round(finalAmount * 100), // paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: {
        course_id,
        name,
        email,
        mobile,
        payment_frequency,
      },
    })

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    })
  } catch (error) {
    console.error('Create order error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
