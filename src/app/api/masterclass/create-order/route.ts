import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRazorpay } from '@/lib/razorpay'
import { getFxRates } from '@/lib/fxRates'
import { toOrderAmount } from '@/lib/orderCurrency'
import { isCurrency } from '@/lib/currency-config'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, mobile, profession, campaign_id,
            utm_source, utm_medium, utm_campaign, utm_content,
            course_name, webinar_date, webinar_time } = body

    if (!name || !email || !mobile || !profession)
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })

    // Buyer's charge currency (INR default). Drives the Razorpay order currency +
    // amount; the INR pricing math below is unchanged.
    const reqCurrency = isCurrency(body.currency) ? body.currency : 'INR'

    // 1. Fetch base price from config (server-side — never trust client)
    const { data: config } = await admin
      .from('masterclass_config')
      .select('base_price, is_live')
      .single()
    if (!config?.is_live)
      return NextResponse.json({ error: 'Masterclass registrations are currently closed' }, { status: 400 })

    const basePrice = Number(config.base_price)
    let finalPrice  = basePrice
    let discountAmt = 0
    let validCampaignId: string | null = null

    // 2. Re-validate campaign server-side — NEVER trust client price
    if (campaign_id) {
      const { data: campaign } = await admin
        .from('masterclass_campaigns')
        .select('*')
        .eq('id', campaign_id)
        .eq('is_active', true)
        .maybeSingle()

      if (campaign) {
        const today = new Date().toISOString().split('T')[0]
        const withinDate = (!campaign.valid_until || campaign.valid_until >= today)
        const withinUses = (!campaign.max_uses || campaign.uses_count < campaign.max_uses)

        if (withinDate && withinUses) {
          discountAmt = campaign.discount_type === 'flat'
            ? Number(campaign.discount_value)
            : Math.round(basePrice * Number(campaign.discount_value) / 100)
          finalPrice    = Math.max(0, basePrice - discountAmt)
          validCampaignId = campaign.id
        }
      }
    }

    // 3. Insert pending registration into qr_landing_registrations
    const { data: reg, error: regErr } = await admin
      .from('qr_landing_registrations')
      .insert({
        full_name:         name.trim(),
        email:             email.trim().toLowerCase(),
        mobile:            mobile.trim(),
        profession_choice: profession,
        course_name:       course_name || 'AI Masterclass',
        webinar_date:      webinar_date || null,
        webinar_time:      webinar_time || null,
        registration_type: 'masterclass',
        masterclass_campaign_id: validCampaignId,
        masterclass_base_price:  basePrice,
        masterclass_discount:    discountAmt,
        masterclass_final_price: finalPrice,
        payment_status:    'pending',
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
      })
      .select('id')
      .single()

    if (regErr) throw new Error(regErr.message)

    // 4. Create Razorpay order
    // INR is charged in whole rupees (unchanged). USD/EUR are charged in 2-decimal
    // units converted from the SAME INR finalPrice at the admin FX rate, snapshotted
    // onto the order notes + returned so the record + confirmation email reflect
    // exactly what was charged. Non-INR requires Razorpay International.
    const oa = toOrderAmount(finalPrice, reqCurrency, await getFxRates())

    const order = await getRazorpay().orders.create({
      amount:   oa.amount,
      currency: oa.currency,
      receipt:  `mc_${Date.now()}`,
      notes: {
        type:            'masterclass',
        registration_id: reg.id,
        name,
        email,
        campaign_id:     validCampaignId ?? '',
        currency:        oa.currency,
        fx_rate:         String(oa.fxRate),
        charged_amount:  String(oa.chargedAmount),
        inr_amount:      String(oa.inrAmount),
      },
    })

    // 5. Save Razorpay order ID to registration
    await admin
      .from('qr_landing_registrations')
      .update({ razorpay_order_id: order.id })
      .eq('id', reg.id)

    return NextResponse.json({
      razorpayOrderId: order.id,
      amountPaise:     order.amount,
      registrationId:  reg.id,
      finalPrice,
      basePrice,
      discountAmt,
      orderCurrency:   order.currency,
      chargedCurrency: oa.currency,
      chargedAmount:   oa.chargedAmount,
      fxRate:          oa.fxRate,
    })

  } catch (err: any) {
    console.error('[masterclass/create-order]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
