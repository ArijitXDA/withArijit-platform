import { NextRequest, NextResponse } from 'next/server'
import { getRazorpay } from '@/lib/razorpay'
import { createServiceClient } from '@/lib/supabase/service'
import { paymentOrderSchema } from '@/lib/validations/payment'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = paymentOrderSchema.safeParse(body)
    if (!parsed.success) {
      // Extract the first human-readable field error to show in the modal
      const fieldErrors  = parsed.error.flatten().fieldErrors
      const firstField   = Object.keys(fieldErrors)[0]
      const firstMessage = firstField
        ? (fieldErrors[firstField as keyof typeof fieldErrors]?.[0] ?? 'Invalid input')
        : 'Invalid input'
      return NextResponse.json(
        { error: firstMessage, field: firstField, details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { course_id, payment_frequency, discount_code, name, email, mobile } = parsed.data
    const supabase = createServiceClient()

    // ── 1. Fetch course ────────────────────────────────────────────────────
    const { data: course, error: courseError } = await supabase
      .from('awa_courses')
      .select('id, name, mrp, gst_percent, discount_percent, partner_pool_percent')
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

    const mrp = Number(course.mrp ?? 0)
    const courseDiscountPct = Number(course.discount_percent ?? 0) / 100  // e.g. 0.40 for 40%

    // ── 2. Auto-discount: check if student was referred by a partner ────────
    // Rule: if student's email is in qr_landing_registrations with a non-null
    // utm_source (partner code), auto-apply the course's discount_percent.
    // This is the "student discount" for partner-referred webinar registrants.
    let autoDiscountPct  = 0
    let autoDiscountLabel = ''
    let resolvedPartnerCode = (body.partner_code as string | undefined) || null

    // Look up by email in registrations
    const { data: reg } = await supabase
      .from('qr_landing_registrations')
      .select('utm_source')
      .eq('email', email.toLowerCase())
      .not('utm_source', 'is', null)
      .order('registered_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (reg?.utm_source) {
      // Student was referred by a partner → apply course discount
      autoDiscountPct   = courseDiscountPct
      autoDiscountLabel = `Partner Referral Discount (${Math.round(courseDiscountPct * 100)}% off)`
      if (!resolvedPartnerCode) resolvedPartnerCode = reg.utm_source
    }

    // Also honor a partner referral code carried on the link (course-page ?partner= /
    // ost_partner cookie) when the buyer isn't yet a known registration. Validated
    // against an ACTIVE partner so the charged price matches the course-page display.
    if (autoDiscountPct === 0 && resolvedPartnerCode) {
      const code = String(resolvedPartnerCode).trim()
      if (code) {
        const { data: partner } = await supabase
          .from('partners')
          .select('partner_code')
          .eq('partner_code', code)
          .eq('status', 'active')
          .maybeSingle()
        if (partner) {
          autoDiscountPct     = courseDiscountPct
          autoDiscountLabel   = `Partner Referral Discount (${Math.round(courseDiscountPct * 100)}% off)`
          resolvedPartnerCode = partner.partner_code
        }
      }
    }

    // ── 3. Base amount after auto-discount ─────────────────────────────────
    const baseAfterAutoDiscount = mrp * (1 - autoDiscountPct)
    let finalAmount = payment_frequency === 'half' ? baseAfterAutoDiscount / 2 : baseAfterAutoDiscount

    let manualDiscountApplied = 0
    let manualDiscountLabel   = ''

    // ── 4. Additional manual discount code (stackable) ─────────────────────
    if (discount_code) {
      const now = new Date()
      const { data: discount } = await supabase
        .from('discount_codes')
        .select('code, label, type, discount_value, valid_from, valid_to, max_uses, uses_count, is_stackable, course_id')
        .eq('code', discount_code.trim().toUpperCase())
        .eq('status', 'active')
        .single()

      if (discount) {
        const withinWindow =
          (!discount.valid_from || now >= new Date(discount.valid_from)) &&
          (!discount.valid_to   || now <= new Date(discount.valid_to))
        const withinUsage =
          !discount.max_uses || (discount.uses_count ?? 0) < discount.max_uses
        // Course-scoped codes (course_id set) apply ONLY to that course.
        // Codes with course_id null apply to every course (unchanged behaviour).
        const courseMatches = !discount.course_id || discount.course_id === course_id

        if (withinWindow && withinUsage && courseMatches) {
          if (discount.type === 'percentage') {
            manualDiscountApplied = finalAmount * (Number(discount.discount_value) / 100)
          } else if (discount.type === 'fixed') {
            manualDiscountApplied = Math.min(Number(discount.discount_value), finalAmount)
          }
          manualDiscountLabel = discount.label ?? discount.code
          finalAmount = Math.max(0, finalAmount - manualDiscountApplied)
        }
      }
    }

    // ── 5. Total discount for display ──────────────────────────────────────
    const originalAmount      = payment_frequency === 'half' ? mrp / 2 : mrp
    const autoDiscountAmount  = Math.round(originalAmount - (payment_frequency === 'half' ? baseAfterAutoDiscount / 2 : baseAfterAutoDiscount))
    const totalDiscountApplied = autoDiscountAmount + Math.round(manualDiscountApplied)

    // Combined label for display
    const discountLabel = [
      autoDiscountLabel && `${autoDiscountLabel} (−₹${autoDiscountAmount.toLocaleString('en-IN')})`,
      manualDiscountLabel && `${manualDiscountLabel} (−₹${Math.round(manualDiscountApplied).toLocaleString('en-IN')})`,
    ].filter(Boolean).join(' + ')

    // ── 6. Create Razorpay order ───────────────────────────────────────────
    const order = await getRazorpay().orders.create({
      amount:   Math.round(finalAmount * 100),  // paise
      currency: 'INR',
      receipt:  `rcpt_${Date.now()}`,
      notes: {
        course_id,
        course_name:           course.name,
        name,
        email,
        mobile,
        payment_frequency,
        partner_code:          resolvedPartnerCode ?? '',
        discount_code:         discount_code ?? '',
        auto_discount_pct:     String(Math.round(autoDiscountPct * 100)),
        manual_discount_applied: String(Math.round(manualDiscountApplied)),
      },
    })

    return NextResponse.json({
      orderId:              order.id,
      amount:               order.amount,
      currency:             order.currency,
      courseName:           course.name,
      displayAmount:        Math.round(finalAmount),
      originalAmount:       Math.round(originalAmount),
      autoDiscountPct:      Math.round(autoDiscountPct * 100),
      autoDiscountAmount,
      discountApplied:      totalDiscountApplied,
      discountLabel:        discountLabel || null,
      partnerCode:          resolvedPartnerCode,
      // Whether the student was eligible for partner discount
      partnerDiscountApplied: autoDiscountPct > 0,
    })

  } catch (error: any) {
    console.error('Create order error:', error)
    return NextResponse.json({ error: 'Failed to create order', detail: error?.message }, { status: 500 })
  }
}
