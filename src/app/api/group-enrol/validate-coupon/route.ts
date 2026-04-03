import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// ── POST /api/group-enrol/validate-coupon ─────────────────────────────────────
// Validates a discount coupon for group enrolment.
// Returns the discount type, value, and calculated per-seat / total discount.
// Called live as the user types — does NOT consume a use.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { code, course_id, quantity, mrp_per_seat } = body

    if (!code?.trim())
      return NextResponse.json({ valid: false, error: 'No code provided' }, { status: 400 })
    if (!course_id || !quantity || !mrp_per_seat)
      return NextResponse.json({ valid: false, error: 'Missing course_id, quantity or mrp_per_seat' }, { status: 400 })

    const supabase = createServiceClient()
    const now      = new Date().toISOString()

    const { data: coupon } = await supabase
      .from('discount_codes')
      .select('id, code, label, type, discount_value, max_uses, uses_count, valid_from, valid_to, applies_to, course_id, min_enrolments_to_unlock, status')
      .eq('code',   code.trim().toUpperCase())
      .eq('status', 'active')
      .maybeSingle()

    if (!coupon)
      return NextResponse.json({ valid: false, error: 'Invalid or expired coupon code' })

    // ── Validity checks ─────────────────────────────────────────────────────
    if (coupon.valid_from && now < coupon.valid_from)
      return NextResponse.json({ valid: false, error: 'This coupon is not yet active' })

    if (coupon.valid_to && now > coupon.valid_to)
      return NextResponse.json({ valid: false, error: 'This coupon has expired' })

    if (coupon.max_uses && (coupon.uses_count ?? 0) >= coupon.max_uses)
      return NextResponse.json({ valid: false, error: 'This coupon has reached its usage limit' })

    // Course restriction
    if (coupon.course_id && coupon.course_id !== course_id)
      return NextResponse.json({ valid: false, error: 'This coupon is not valid for the selected course' })

    // Minimum enrolments gate
    if ((coupon.min_enrolments_to_unlock ?? 0) > 0 && quantity < coupon.min_enrolments_to_unlock)
      return NextResponse.json({
        valid: false,
        error: `This coupon requires a minimum of ${coupon.min_enrolments_to_unlock} seats`,
      })

    // ── Calculate discount ──────────────────────────────────────────────────
    const mrp         = Number(mrp_per_seat)
    const qty         = Number(quantity)
    const totalMrp    = mrp * qty
    let   discountPerSeat  = 0

    if (coupon.type === 'percentage') {
      discountPerSeat = Number((mrp * Number(coupon.discount_value) / 100).toFixed(2))
    } else {
      // flat — applied per seat
      discountPerSeat = Math.min(Number(coupon.discount_value), mrp)
    }

    const totalDiscount  = Number((discountPerSeat * qty).toFixed(2))
    const pricePerSeat   = Number((mrp - discountPerSeat).toFixed(2))
    const totalPayable   = Number((pricePerSeat * qty).toFixed(2))

    return NextResponse.json({
      valid:           true,
      coupon_id:       coupon.id,
      label:           coupon.label,
      type:            coupon.type,            // 'percentage' | 'flat'
      discount_value:  coupon.discount_value,  // raw value (% or ₹)
      discount_per_seat: discountPerSeat,
      total_discount:  totalDiscount,
      price_per_seat:  pricePerSeat,
      total_payable:   totalPayable,
      total_mrp:       totalMrp,
    })

  } catch (err: any) {
    console.error('[group-enrol/validate-coupon]', err.message)
    return NextResponse.json({ valid: false, error: 'Coupon validation failed' }, { status: 500 })
  }
}
