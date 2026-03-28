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

    // ── 1. Fetch course ────────────────────────────────────────────────────
    const { data: course, error: courseError } = await supabase
      .from('awa_courses')
      .select('id, name, mrp, gst_percent, discount_percent')
      .eq('id', course_id)
      .single()

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (payment_frequency === 'monthly') {
      return NextResponse.json(
        { error: 'Monthly installments are not yet available for online payment' },
        { status: 400 }
      )
    }

    // ── 2. Base amount ─────────────────────────────────────────────────────
    // MRP is the final price students pay (already includes GST).
    // For half payment: charge 50% upfront.
    const mrp = Number(course.mrp ?? 0)
    let finalAmount = payment_frequency === 'half' ? mrp / 2 : mrp

    // ── 3. Resolve partner code ────────────────────────────────────────────
    // Partner code is passed in the body (from URL ?partner= param).
    // It doesn't affect the price — partner earns commission post-payment.
    // We include it in the Razorpay order notes so the webhook can use it.
    const partnerCode = (body.partner_code as string | undefined) || null

    // ── 4. Apply discount code ─────────────────────────────────────────────
    // Table: discount_codes
    // Relevant columns: code (text), discount_value (numeric), type (text),
    //                   status (text — 'active' | 'inactive'), valid_from, valid_to
    let discountApplied = 0
    let discountLabel = ''

    if (discount_code) {
      const now = new Date().toISOString()
      const { data: discount } = await supabase
        .from('discount_codes')
        .select('code, label, type, discount_value, valid_from, valid_to, max_uses, uses_count')
        .eq('code', discount_code.trim().toUpperCase())
        .eq('status', 'active')
        .single()

      if (discount) {
        // Check validity window
        const validFrom = discount.valid_from ? new Date(discount.valid_from) : null
        const validTo   = discount.valid_to   ? new Date(discount.valid_to)   : null
        const nowDate   = new Date(now)
        const withinWindow =
          (!validFrom || nowDate >= validFrom) &&
          (!validTo   || nowDate <= validTo)

        // Check usage limit
        const withinUsage =
          !discount.max_uses || (discount.uses_count ?? 0) < discount.max_uses

        if (withinWindow && withinUsage) {
          if (discount.type === 'percentage') {
            discountApplied = finalAmount * (Number(discount.discount_value) / 100)
          } else if (discount.type === 'fixed') {
            discountApplied = Math.min(Number(discount.discount_value), finalAmount)
          }
          discountLabel   = discount.label ?? discount.code
          finalAmount     = Math.max(0, finalAmount - discountApplied)
        }
      }
    }

    // ── 5. Create Razorpay order ───────────────────────────────────────────
    // Razorpay expects amount in paise (× 100), must be an integer
    const order = await getRazorpay().orders.create({
      amount:   Math.round(finalAmount * 100),
      currency: 'INR',
      receipt:  `rcpt_${Date.now()}`,
      notes: {
        course_id,
        course_name:        course.name,
        name,
        email,
        mobile,
        payment_frequency,
        partner_code:       partnerCode ?? '',
        discount_code:      discount_code ?? '',
        discount_applied:   String(Math.round(discountApplied)),
      },
    })

    return NextResponse.json({
      orderId:          order.id,
      amount:           order.amount,
      currency:         order.currency,
      courseName:       course.name,
      displayAmount:    finalAmount,
      discountApplied:  Math.round(discountApplied),
      discountLabel:    discountLabel || null,
      originalAmount:   payment_frequency === 'half' ? mrp / 2 : mrp,
    })

  } catch (error: any) {
    console.error('Create order error:', error)
    return NextResponse.json({ error: 'Failed to create order', detail: error?.message }, { status: 500 })
  }
}
