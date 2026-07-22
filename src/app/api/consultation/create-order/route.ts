import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getRazorpay } from '@/lib/razorpay'
import { getFxRates } from '@/lib/fxRates'
import { toNativeOrderAmount } from '@/lib/orderCurrency'
import { isConsultationCheckoutEnabled } from '@/lib/consultationFlag'
import {
  computeConsultationPrice,
  isDurationSku,
  type DiscountSpec,
} from '@/lib/consultationCheckoutPricing'

// POST /api/consultation/create-order — USD-native Razorpay International order for an
// Expert Consultation booking. Server RE-PRICES from DB inputs (never trusts the client),
// creates the order in USD, and inserts a pending consultation_orders row. Slots are chosen
// AFTER payment, so no dates here. Dormant unless the feature flag is on.

const CONSULT_SLUG = 'expert-consultation'

export async function POST(req: NextRequest) {
  try {
    if (!(await isConsultationCheckoutEnabled())) {
      return NextResponse.json({ error: 'Consultation checkout is not available yet.' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const projectTypeCode = String(body?.project_type_code ?? '')
    const durationSku = body?.duration_sku
    const attendees = Math.max(1, Math.min(50, Math.floor(Number(body?.attendees) || 1)))
    const discountCode = String(body?.discount_code ?? '').trim().toUpperCase()
    const payToken = String(body?.pay_token ?? '').trim()

    const name = String(body?.name ?? '').trim().slice(0, 200)
    const email = String(body?.email ?? '').trim().toLowerCase().slice(0, 320)
    const mobile = String(body?.mobile ?? '').trim().slice(0, 40)
    const company = String(body?.company ?? '').trim().slice(0, 200) || null
    const timezone = String(body?.timezone ?? '').trim().slice(0, 100) || null

    if (!['type1', 'type2', 'type3', 'type4'].includes(projectTypeCode)) {
      return NextResponse.json({ error: 'Invalid project type.' }, { status: 400 })
    }
    if (!isDurationSku(durationSku)) {
      return NextResponse.json({ error: 'Invalid duration.' }, { status: 400 })
    }
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 })
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const now = new Date().toISOString()

    // ── Project type (server-side rate) ──────────────────────────────────────
    const { data: ptype, error: ptErr } = await supabase
      .from('consultation_project_types')
      .select('code, price_per_hour_usd, min_charge_usd, is_dynamic, is_active')
      .eq('code', projectTypeCode)
      .maybeSingle()
    if (ptErr || !ptype || !ptype.is_active) {
      return NextResponse.json({ error: 'This project type is not available.' }, { status: 400 })
    }

    const { data: cfg } = await supabase
      .from('consultation_config')
      .select('free_attendees, group_surcharge_per_person_per_hour_usd')
      .eq('id', 1)
      .maybeSingle()
    const freeAttendees = Number(cfg?.free_attendees ?? 5)
    const surchargePerPersonPerHour = Number(cfg?.group_surcharge_per_person_per_hour_usd ?? 10)

    // ── Rate: type1-3 use the fixed rate; type4 requires an APPROVED quote pay-token ──
    let rateUsd: number
    let minChargeUsd: number
    let quoteId: string | null = null

    if (projectTypeCode === 'type4') {
      if (!payToken) {
        return NextResponse.json({ error: 'A custom (Type-4) booking needs an approved quote.' }, { status: 400 })
      }
      const { data: quote } = await supabase
        .from('consultation_quotes')
        .select('id, status, final_rate_usd, pay_token_expires_at')
        .eq('pay_token', payToken)
        .maybeSingle()
      if (!quote || quote.status !== 'approved' || quote.final_rate_usd == null) {
        return NextResponse.json({ error: 'This quote is not approved for payment.' }, { status: 400 })
      }
      if (quote.pay_token_expires_at && now > quote.pay_token_expires_at) {
        return NextResponse.json({ error: 'This payment link has expired. Please contact us.' }, { status: 400 })
      }
      rateUsd = Number(quote.final_rate_usd)
      minChargeUsd = 0 // bespoke rate has no separate floor
      quoteId = quote.id
    } else {
      if (ptype.price_per_hour_usd == null) {
        return NextResponse.json({ error: 'This project type is not priced.' }, { status: 400 })
      }
      rateUsd = Number(ptype.price_per_hour_usd)
      minChargeUsd = Number(ptype.min_charge_usd ?? 0)
    }

    // ── Discount code (optional) ─────────────────────────────────────────────
    // Percentage codes are currency-agnostic. Flat codes carry an INR value across the
    // storefront, so a flat code only applies here if it is EXPLICITLY scoped to the
    // consultation course (i.e. an admin created it for this USD product on purpose).
    let discount: DiscountSpec | null = null
    if (discountCode) {
      const { data: consultCourse } = await supabase
        .from('awa_courses')
        .select('id')
        .eq('slug', CONSULT_SLUG)
        .maybeSingle()

      const { data: coupon } = await supabase
        .from('discount_codes')
        .select('id, type, discount_value, max_uses, uses_count, valid_from, valid_to, course_id, status')
        .eq('code', discountCode)
        .eq('status', 'active')
        .maybeSingle()

      if (!coupon) return NextResponse.json({ error: 'Invalid or expired coupon code.' }, { status: 400 })
      if (coupon.valid_from && now < coupon.valid_from)
        return NextResponse.json({ error: 'This coupon is not yet active.' }, { status: 400 })
      if (coupon.valid_to && now > coupon.valid_to)
        return NextResponse.json({ error: 'This coupon has expired.' }, { status: 400 })
      if (coupon.max_uses && (coupon.uses_count ?? 0) >= coupon.max_uses)
        return NextResponse.json({ error: 'This coupon has reached its usage limit.' }, { status: 400 })
      if (coupon.course_id && coupon.course_id !== consultCourse?.id)
        return NextResponse.json({ error: 'This coupon is not valid for consultations.' }, { status: 400 })

      if (coupon.type === 'percentage') {
        discount = { kind: 'percentage', value: Number(coupon.discount_value) }
      } else if (coupon.course_id && coupon.course_id === consultCourse?.id) {
        // Flat code intentionally scoped to this USD product → value is USD.
        discount = { kind: 'flat', value: Number(coupon.discount_value) }
      } else {
        return NextResponse.json(
          { error: 'This coupon type is not supported for consultations.' },
          { status: 400 },
        )
      }
    }

    // ── Authoritative price ──────────────────────────────────────────────────
    const price = computeConsultationPrice({
      rateUsd,
      minChargeUsd,
      sku: durationSku,
      attendees,
      freeAttendees,
      surchargePerPersonPerHour,
      discount,
    })
    if (!(price.totalUsd > 0)) {
      return NextResponse.json({ error: 'This booking has no payable amount.' }, { status: 400 })
    }

    // ── USD-native Razorpay International order ───────────────────────────────
    const rates = await getFxRates()
    const oa = toNativeOrderAmount(price.totalUsd, 'USD', rates)

    const rzOrder = await getRazorpay().orders.create({
      amount: oa.amount, // exact cents
      currency: 'USD',
      receipt: `consult_${Date.now()}`,
      notes: {
        product: 'consultation',
        project_type_code: projectTypeCode,
        duration_sku: durationSku,
        currency: 'USD',
        charged_amount: String(oa.chargedAmount),
        fx_rate: String(oa.fxRate),
        inr_amount: String(oa.inrAmount),
        name,
        email,
        mobile,
      },
    })

    const { data: order, error: ordErr } = await supabase
      .from('consultation_orders')
      .insert({
        quote_id: quoteId,
        project_type_code: projectTypeCode,
        duration_sku: durationSku,
        hours: price.hours,
        sessions: price.sessions,
        attendees,
        rate_usd: rateUsd,
        base_usd: price.baseUsd,
        surcharge_usd: price.surchargeUsd,
        discount_usd: price.discountUsd,
        discount_code: discountCode || null,
        total_usd: price.totalUsd,
        currency: 'USD',
        fx_rate: oa.fxRate,
        inr_amount: oa.inrAmount,
        razorpay_order_id: rzOrder.id,
        status: 'pending',
        buyer_name: name,
        buyer_email: email,
        buyer_mobile: mobile || null,
        buyer_company: company,
        buyer_timezone: timezone,
      })
      .select('id')
      .single()
    if (ordErr || !order) {
      console.error('[consultation create-order] insert failed:', ordErr?.message)
      return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({
      orderId: rzOrder.id,
      amount: oa.amount,
      currency: 'USD',
      keyId: process.env.RAZORPAY_KEY_ID,
      totalUsd: price.totalUsd,
      breakdown: {
        hours: price.hours,
        sessions: price.sessions,
        baseUsd: price.baseUsd,
        surchargeUsd: price.surchargeUsd,
        discountUsd: price.discountUsd,
        totalUsd: price.totalUsd,
      },
    })
  } catch (err: any) {
    console.error('[consultation create-order]', err?.message)
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 })
  }
}
