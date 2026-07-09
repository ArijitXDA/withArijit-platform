import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getRazorpay } from '@/lib/razorpay'
import { getFxRates } from '@/lib/fxRates'
import { toOrderAmount } from '@/lib/orderCurrency'
import { isCurrency } from '@/lib/currency-config'

// ── POST /api/group-enrol/create-order ────────────────────────────────────────
// 1. Validates all inputs server-side (course, quantity, coupon, batch capacity)
// 2. Computes final pricing — NEVER trusts client-submitted prices
// 3. Creates a Razorpay order
// 4. Inserts a pending group_enrolments row
// 5. Returns order details to the client for Razorpay checkout

const GST_RATE = 0.18

export async function POST(req: NextRequest) {
  let body: any = null
  try {
    body = await req.json()

    const {
      purchaser_name,
      purchaser_email,
      purchaser_mobile,
      purchaser_type,       // 'individual' | 'partner' | 'organization'
      organization_name,    // optional — for org buyers
      gstin,                // optional — for B2B GST invoice
      partner_code,         // optional — if purchaser is a partner
      course_id,
      quantity,
      batch_id,             // optional — pre-selected batch
      discount_code,        // optional coupon code
    } = body

    // ── Basic validation ────────────────────────────────────────────────────
    if (!purchaser_name?.trim() || !purchaser_email?.trim() || !purchaser_mobile?.trim())
      return NextResponse.json({ error: 'Purchaser name, email and mobile are required' }, { status: 400 })

    if (!course_id)
      return NextResponse.json({ error: 'Course is required' }, { status: 400 })

    const qty = parseInt(quantity, 10)
    if (!qty || qty < 2 || qty > 500)
      return NextResponse.json({ error: 'Quantity must be between 2 and 500' }, { status: 400 })

    const supabase = createServiceClient()
    const now      = new Date().toISOString()

    // Buyer's charge currency (INR default). Drives the Razorpay order currency +
    // amount; the INR per-seat pricing math below is unchanged.
    const reqCurrency = isCurrency(body.currency) ? body.currency : 'INR'

    // ── 1. Fetch course — server-side MRP, never trust client ───────────────
    const { data: course, error: courseErr } = await supabase
      .from('awa_courses')
      .select('id, name, mrp, is_active')
      .eq('id', course_id)
      .single()

    if (courseErr || !course)
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })

    if (!course.is_active)
      return NextResponse.json({ error: 'This course is not currently available for enrolment' }, { status: 400 })

    const mrpPerSeat = Number(course.mrp)

    // ── 2. Validate coupon (if provided) — server-side, never trust client ──
    let discountPerSeat  = 0
    let totalDiscount    = 0
    let couponId: string | null = null
    let couponType: string | null = null
    let couponValue: number = 0

    if (discount_code?.trim()) {
      const code = discount_code.trim().toUpperCase()

      const { data: coupon } = await supabase
        .from('discount_codes')
        .select('id, type, discount_value, max_uses, uses_count, valid_from, valid_to, applies_to, course_id, min_enrolments_to_unlock, status')
        .eq('code', code)
        .eq('status', 'active')
        .maybeSingle()

      if (!coupon)
        return NextResponse.json({ error: 'Invalid or expired coupon code' }, { status: 400 })

      if (coupon.valid_from && now < coupon.valid_from)
        return NextResponse.json({ error: 'This coupon is not yet active' }, { status: 400 })

      if (coupon.valid_to && now > coupon.valid_to)
        return NextResponse.json({ error: 'This coupon has expired' }, { status: 400 })

      if (coupon.max_uses && (coupon.uses_count ?? 0) >= coupon.max_uses)
        return NextResponse.json({ error: 'This coupon has reached its usage limit' }, { status: 400 })

      if (coupon.course_id && coupon.course_id !== course_id)
        return NextResponse.json({ error: 'This coupon is not valid for the selected course' }, { status: 400 })

      if ((coupon.min_enrolments_to_unlock ?? 0) > 0 && qty < coupon.min_enrolments_to_unlock)
        return NextResponse.json({
          error: `This coupon requires a minimum of ${coupon.min_enrolments_to_unlock} seats`,
        }, { status: 400 })

      couponId    = coupon.id
      couponType  = coupon.type
      couponValue = Number(coupon.discount_value)

      if (coupon.type === 'percentage') {
        discountPerSeat = Number((mrpPerSeat * couponValue / 100).toFixed(2))
      } else {
        discountPerSeat = Math.min(couponValue, mrpPerSeat)
      }

      totalDiscount = Number((discountPerSeat * qty).toFixed(2))
    }

    // ── 3. Final price calculation ───────────────────────────────────────────
    const pricePerSeat  = Number((mrpPerSeat - discountPerSeat).toFixed(2))
    const totalMrp      = Number((mrpPerSeat * qty).toFixed(2))
    const subTotal      = Number((pricePerSeat * qty).toFixed(2))    // before GST
    const gstAmount     = Number((subTotal * GST_RATE).toFixed(2))
    const totalPayable  = Number((subTotal + gstAmount).toFixed(2))

    if (totalPayable <= 0)
      return NextResponse.json({ error: 'Total payable amount must be greater than zero' }, { status: 400 })

    // ── 4. Validate batch capacity (if pre-selected) ─────────────────────────
    if (batch_id) {
      const { data: batch } = await supabase
        .from('awa_batches')
        .select('id, max_seats, seats_filled, is_active, is_open, course_id')
        .eq('id', batch_id)
        .single()

      if (!batch)
        return NextResponse.json({ error: 'Selected batch not found' }, { status: 404 })

      if (!batch.is_active || !batch.is_open)
        return NextResponse.json({ error: 'Selected batch is no longer open for enrolment' }, { status: 400 })

      if (batch.course_id !== course_id)
        return NextResponse.json({ error: 'Selected batch does not belong to this course' }, { status: 400 })

      const available = (batch.max_seats ?? 999) - (batch.seats_filled ?? 0)
      if (available < qty)
        return NextResponse.json({
          error: `The selected batch only has ${available} seat${available === 1 ? '' : 's'} available. Please choose a different batch or reduce the quantity.`,
        }, { status: 400 })
    }

    // ── 5. Resolve partner_id if partner_code provided ────────────────────────
    let resolvedPartnerId: string | null = null
    if (partner_code?.trim()) {
      const { data: partner } = await supabase
        .from('partners')
        .select('id')
        .eq('partner_code', partner_code.trim().toUpperCase())
        .maybeSingle()
      resolvedPartnerId = partner?.id ?? null
    }

    // ── 6. Create Razorpay order ──────────────────────────────────────────────
    // Guard: reject placeholder keys before hitting Razorpay API
    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID.includes('placeholder')) {
      return NextResponse.json({
        error: 'Payment gateway is not configured. Please contact support at ai@ostaran.com'
      }, { status: 503 })
    }

    // INR is charged in whole rupees (paise collected == displayed rupees). USD/EUR
    // are charged in 2-decimal units converted from the SAME INR totalPayable at the
    // admin FX rate, snapshotted onto the order + persisted so the enrolment record +
    // invoice reflect exactly what was charged. Non-INR requires Razorpay International.
    const oa = toOrderAmount(totalPayable, reqCurrency, await getFxRates())

    let order: any
    try {
      order = await getRazorpay().orders.create({
      amount:   oa.amount,
      currency: oa.currency,
      receipt:  `grp_${Date.now()}`,
      notes: {
        type:           'group_enrolment',
        course_id,
        course_name:    course.name,
        quantity:       String(qty),
        purchaser_name,
        purchaser_email,
        discount_code:  discount_code?.trim().toUpperCase() ?? '',
        currency:       oa.currency,
        fx_rate:        String(oa.fxRate),
        charged_amount: String(oa.chargedAmount),
        inr_amount:     String(oa.inrAmount),
      },
    })
    } catch (rzpErr: any) {
      const msg = rzpErr?.error?.description ?? rzpErr?.message ?? 'Payment gateway error'
      console.error('[group-enrol/create-order] Razorpay error:', msg)
      return NextResponse.json({ error: `Payment gateway error: ${msg}` }, { status: 502 })
    }

    // ── 7. Insert pending group_enrolments row ────────────────────────────────
    const { data: groupEnrolment, error: insertErr } = await supabase
      .from('group_enrolments')
      .insert({
        purchaser_name:     purchaser_name.trim(),
        purchaser_email:    purchaser_email.trim().toLowerCase(),
        purchaser_mobile:   purchaser_mobile.trim(),
        purchaser_type:     purchaser_type ?? 'individual',
        organization_name:  organization_name?.trim() || null,
        gstin:              gstin?.trim().toUpperCase() || null,
        partner_id:         resolvedPartnerId,
        partner_code:       partner_code?.trim().toUpperCase() || null,
        course_id,
        course_name:        course.name,
        quantity:           qty,
        mrp_per_seat:       mrpPerSeat,
        discount_code:      discount_code?.trim().toUpperCase() || null,
        discount_type:      couponType,
        discount_value:     couponValue || null,
        discount_per_seat:  discountPerSeat,
        total_mrp:          totalMrp,
        total_discount:     totalDiscount,
        discount_amount_total: totalDiscount,   // legacy column name
        total_payable:      totalPayable,
        gst_amount:         gstAmount,
        // Charge-currency snapshot — internal accounting above stays INR.
        currency:           oa.currency,
        amount_charged:     oa.chargedAmount,
        fx_rate:            oa.fxRate,
        batch_id:           batch_id || null,
        razorpay_order_id:  order.id,
        payment_status:     'pending',
        seats_filled:       0,
        seats_claimed:      0,
      })
      .select('id, manage_token')
      .single()

    if (insertErr) {
      console.error('[group-enrol/create-order] DB insert failed:', insertErr.message)
      return NextResponse.json({ error: `Failed to create enrolment record: ${insertErr.message}` }, { status: 500 })
    }

    // ── 8. Return to client ───────────────────────────────────────────────────
    return NextResponse.json({
      razorpay_order_id:  order.id,
      amount_paise:       order.amount,        // smallest unit of chargedCurrency (paise for INR, cents for USD/EUR)
      group_enrolment_id: groupEnrolment.id,
      manage_token:       groupEnrolment.manage_token,
      // Charge-currency snapshot — client opens Razorpay in this currency.
      chargedCurrency:    oa.currency,
      chargedAmount:      oa.chargedAmount,
      fxRate:             oa.fxRate,
      // Pricing summary for display in checkout UI
      pricing: {
        mrp_per_seat:       mrpPerSeat,
        discount_per_seat:  discountPerSeat,
        price_per_seat:     pricePerSeat,
        quantity:           qty,
        total_mrp:          totalMrp,
        total_discount:     totalDiscount,
        sub_total:          subTotal,
        gst_amount:         gstAmount,
        total_payable:      totalPayable,
        course_name:        course.name,
      },
    })

  } catch (err: any) {
    console.error('[group-enrol/create-order] unhandled:', err.message)
    return NextResponse.json({ error: `Order creation failed: ${err.message}` }, { status: 500 })
  }
}
