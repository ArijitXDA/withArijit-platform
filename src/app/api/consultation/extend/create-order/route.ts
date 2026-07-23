import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { getRazorpay } from '@/lib/razorpay'
import { getFxRates } from '@/lib/fxRates'
import { inrPerUnit } from '@/lib/currency-config'
import { computeConsultationCharge } from '@/lib/consultationTax'
import { isConsultationCheckoutEnabled } from '@/lib/consultationFlag'
import { SKU_HOURS, SKU_SESSIONS, type DurationSku } from '@/lib/consultationCheckoutPricing'

// POST /api/consultation/extend/create-order — top up an existing consultation with N more
// sessions at the buyer's ORIGINAL locked rate, in the SAME tax regime (INR+GST or USD export)
// as the parent order. No slot picking — the extra sessions continue the same weekly slot.

const MAX_EXTRA = 52
const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100

export async function POST(req: NextRequest) {
  try {
    if (!(await isConsultationCheckoutEnabled())) {
      return NextResponse.json({ error: 'Consultation checkout is not available yet.' }, { status: 403 })
    }
    const body = await req.json().catch(() => ({}))
    const token = String(body?.schedule_token ?? '').trim()
    const extra = Math.floor(Number(body?.extra_sessions) || 0)
    if (!token) return NextResponse.json({ error: 'Missing booking reference.' }, { status: 400 })
    if (!(extra >= 1 && extra <= MAX_EXTRA)) {
      return NextResponse.json({ error: `Add between 1 and ${MAX_EXTRA} sessions.` }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Parent booking — must be paid/scheduled with a batch.
    const { data: parent } = await supabase
      .from('consultation_orders')
      .select('*')
      .eq('schedule_token', token)
      .eq('order_kind', 'booking')
      .maybeSingle()
    if (!parent) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    if (parent.status !== 'paid' && parent.status !== 'scheduled') {
      return NextResponse.json({ error: 'This booking is not active.' }, { status: 400 })
    }
    if (!parent.batch_id) {
      return NextResponse.json({ error: 'Pick your session time first, then you can add more.' }, { status: 409 })
    }

    const dsku = parent.duration_sku as DurationSku
    const perSessionHours = (SKU_HOURS[dsku] ?? 1) / (SKU_SESSIONS[dsku] ?? 1)
    const addHours = round2(extra * perSessionHours)

    const { data: cfg } = await supabase
      .from('consultation_config')
      .select('free_attendees, group_surcharge_per_person_per_hour_usd, gst_rate, gst_mode')
      .eq('id', 1)
      .maybeSingle()
    const freeAttendees = Number(cfg?.free_attendees ?? 5)
    const surchargePerPersonPerHour = Number(cfg?.group_surcharge_per_person_per_hour_usd ?? 10)
    const gstRate = Number(cfg?.gst_rate ?? 18)
    const gstMode = (cfg?.gst_mode === 'inclusive' ? 'inclusive' : 'exclusive') as 'inclusive' | 'exclusive'

    const rateUsd = Number(parent.rate_usd) || 0
    const attendees = Number(parent.attendees) || 1
    const extraAtt = Math.max(0, attendees - freeAttendees)
    const baseUsd = round2(rateUsd * addHours)
    const surchargeUsd = round2(surchargePerPersonPerHour * extraAtt * addHours)
    const totalUsd = round2(baseUsd + surchargeUsd)
    if (!(totalUsd > 0)) {
      return NextResponse.json({ error: 'This extension has no payable amount.' }, { status: 400 })
    }

    const rates = await getFxRates()
    const fxRate = inrPerUnit('USD', rates)
    const charge = computeConsultationCharge({
      usd: { hours: addHours, sessions: extra, rateUsd, baseUsd, surchargeUsd, discountUsd: 0, totalUsd, amountCents: Math.round(totalUsd * 100) },
      billingCountry: parent.billing_country || 'OT',
      billingState: parent.billing_state,
      fxRate,
      gstRate,
      gstMode,
    })

    const isDomestic = charge.regime === 'domestic_gst'
    const rzAmount = isDomestic ? charge.amountPaise! : charge.amountCents!
    const rzCurrency: 'INR' | 'USD' = isDomestic ? 'INR' : 'USD'

    const rzOrder = await getRazorpay().orders.create({
      amount: rzAmount,
      currency: rzCurrency,
      receipt: `consult_ext_${Date.now()}`,
      notes: { product: 'consultation', kind: 'extension', parent: String(parent.id), extra_sessions: String(extra), currency: rzCurrency },
    })

    const scheduleToken = randomUUID() // for the top-up invoice download
    const { data: order, error: ordErr } = await supabase
      .from('consultation_orders')
      .insert({
        order_kind: 'extension',
        parent_order_id: parent.id,
        extra_sessions: extra,
        project_type_code: parent.project_type_code,
        duration_sku: parent.duration_sku,
        hours: addHours,
        sessions: extra,
        attendees,
        rate_usd: rateUsd,
        base_usd: baseUsd,
        surcharge_usd: surchargeUsd,
        discount_usd: 0,
        total_usd: totalUsd,
        currency: charge.currency,
        fx_rate: charge.fxRate,
        inr_amount: charge.inrEquivalent,
        tax_regime: charge.regime,
        gst_rate: isDomestic ? charge.gstRate : 0,
        taxable_inr: charge.taxableInr ?? null,
        cgst_inr: charge.cgstInr ?? null,
        sgst_inr: charge.sgstInr ?? null,
        igst_inr: charge.igstInr ?? null,
        total_inr: charge.totalInr ?? null,
        invoice_type: isDomestic ? 'tax_invoice' : 'export_invoice',
        billing_country: parent.billing_country,
        billing_state: parent.billing_state,
        billing_postal: parent.billing_postal,
        billing_address: parent.billing_address,
        billing_gstin: parent.billing_gstin,
        schedule_token: scheduleToken,
        razorpay_order_id: rzOrder.id,
        status: 'pending',
        buyer_name: parent.buyer_name,
        buyer_email: parent.buyer_email,
        buyer_mobile: parent.buyer_mobile,
        buyer_company: parent.buyer_company,
        buyer_timezone: parent.buyer_timezone,
      })
      .select('id')
      .single()
    if (ordErr || !order) {
      console.error('[consultation extend create-order] insert failed:', ordErr?.message)
      return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({
      orderId: rzOrder.id,
      amount: rzAmount,
      currency: rzCurrency,
      keyId: process.env.RAZORPAY_KEY_ID,
      regime: charge.regime,
      breakdown: {
        extraSessions: extra,
        addHours,
        totalUsd,
        totalInr: charge.totalInr ?? null,
        taxableInr: charge.taxableInr ?? null,
        gstInr: isDomestic ? (charge.cgstInr! + charge.sgstInr! + charge.igstInr!) : null,
      },
    })
  } catch (err: any) {
    console.error('[consultation extend create-order]', err?.message)
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 })
  }
}
