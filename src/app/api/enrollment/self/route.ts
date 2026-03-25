import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { queueEmail } from '@/lib/email'

// ── Commission cascade helper ─────────────────────────────────────────────────
// Walks up the partner chain and writes to commission_ledger for each level.
async function creditPartnerCommission(
  supabase: ReturnType<typeof createServiceClient>,
  enrolmentId: string,
  partnerCode: string,
  courseId: string,
  netAmount: number, // amount after GST deduction — the taxable base for commission
  partnerPoolPct: number,  // e.g. 0.40
  enrollerShare: number,   // e.g. 0.75
  upstreamShare: number,   // e.g. 0.25
) {
  // 1. Find the direct (enrolling) partner
  const { data: enrollerPartner } = await supabase
    .from('partners')
    .select('id, parent_partner_code, partner_code, full_name')
    .eq('partner_code', partnerCode)
    .single()

  if (!enrollerPartner) {
    console.warn(`[commission] Partner not found for code: ${partnerCode}`)
    return
  }

  const partnerPoolAmount = netAmount * partnerPoolPct
  const enrollerAmount    = partnerPoolAmount * enrollerShare
  const upstreamPool      = partnerPoolAmount * upstreamShare

  // 2. Direct partner gets 75% of partner pool
  await supabase.from('commission_ledger').insert({
    enrolment_id:        enrolmentId,
    partner_id:          enrollerPartner.id,
    partner_level_in_chain: 1,
    direct_partner_id:   enrollerPartner.id,
    base_amount:         netAmount,
    commission_rate:     partnerPoolPct * enrollerShare,
    commission_amount:   enrollerAmount,
    commission_model:    'cascade',
    enroller_layer:      1,
    course_id:           courseId,
    status:              'pending',
  })

  // 3. Walk up ancestor chain and split remaining 25%
  let currentCode = enrollerPartner.parent_partner_code as string | null
  let level = 2
  let remaining = upstreamPool

  while (currentCode && level <= 6) {
    const { data: ancestor } = await supabase
      .from('partners')
      .select('id, parent_partner_code')
      .eq('partner_code', currentCode)
      .single()

    if (!ancestor) break

    // Each upstream level gets 75% of their slice, passing 25% further up
    const thisLevel = remaining * 0.75
    remaining       = remaining * 0.25

    await supabase.from('commission_ledger').insert({
      enrolment_id:        enrolmentId,
      partner_id:          ancestor.id,
      partner_level_in_chain: level,
      direct_partner_id:   enrollerPartner.id,
      base_amount:         netAmount,
      commission_rate:     thisLevel / netAmount,
      commission_amount:   thisLevel,
      commission_model:    'cascade',
      enroller_layer:      1,
      upstream_layer_index: level - 1,
      course_id:           courseId,
      status:              'pending',
    })

    currentCode = ancestor.parent_partner_code as string | null
    level++
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      payment_id,
      order_id,
      course_id,
      name,
      email,
      mobile,
      amount,         // total amount paid (inc. GST)
      discount_code,
      partner_code,   // utm_source from qr_landing_registrations — may be null
      enrolment_type, // 'full' | 'half' — payment plan
    } = body

    if (!payment_id || !order_id || !course_id || !name || !email || !mobile || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const now      = new Date()

    // ── 1. Fetch course pricing config ────────────────────────────────────────
    const { data: course } = await supabase
      .from('awa_courses')
      .select('id, name, mrp, gst_percent, discount_percent, partner_pool_percent, enroller_share, upstream_share')
      .eq('id', course_id)
      .single()

    const mrp               = Number(course?.mrp ?? amount)
    const gstPct            = Number(course?.gst_percent ?? 18) / 100
    const partnerPoolPct    = Number(course?.partner_pool_percent ?? 0.40)
    const enrollerShare     = Number(course?.enroller_share ?? 0.75)
    const upstreamShare     = Number(course?.upstream_share ?? 0.25)
    const netTaxable        = amount / (1 + gstPct) // back-calculate pre-GST base
    const gstAmount         = amount - netTaxable

    // ── 2. Insert payment record ──────────────────────────────────────────────
    const { data: paymentRow } = await supabase.from('payments').insert({
      amount,
      payment_date:        now.toISOString().split('T')[0],
      payment_time:        now.toTimeString().split(' ')[0],
      currency:            'INR',
      country:             'IN',
      razorpay_payment_id: payment_id,
      razorpay_order_id:   order_id,
      coupon_code:         discount_code ?? null,
      status:              'captured',
    }).select('id').single()

    // ── 3. Upsert student in student_master_table (legacy, keeps existing admin working) ──
    await supabase.from('student_master_table').upsert(
      {
        name,
        email,
        mobile,
        course_name:           course_id,
        enrollment_date:       now.toISOString(),
        total_payments_count:  1,
        total_amount_paid:     amount,
      },
      { onConflict: 'email' }
    )

    // ── 4. Resolve partner from partner_code OR from qr_landing_registrations ──
    let resolvedPartnerCode = partner_code as string | null

    if (!resolvedPartnerCode) {
      // Try to find a recent registration for this email with a partner code
      const { data: reg } = await supabase
        .from('qr_landing_registrations')
        .select('utm_source')
        .eq('email', email)
        .not('utm_source', 'is', null)
        .order('registered_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (reg?.utm_source) resolvedPartnerCode = reg.utm_source
    }

    // ── 5. Write to student_enrolments ────────────────────────────────────────
    const { data: enrolmentRow, error: enrolmentError } = await supabase
      .from('student_enrolments')
      .insert({
        partner_id:          null,      // resolved below if partner found
        student_reg_id:      null,      // link to qr_landing_registrations if desired
        student_name:        name,
        student_email:       email,
        student_mobile:      mobile,
        course_name:         course?.name ?? course_id,
        enrolment_type:      enrolment_type ?? 'full_payment',
        mrp,
        discount_pct:        0,
        discount_amount:     0,
        net_after_discount:  mrp,
        gst_pct:             gstPct,
        gst_amount:          gstAmount,
        net_taxable:         netTaxable,
        amount_paid:         amount,
        payment_mode:        'online',
        payment_date:        now.toISOString().split('T')[0],
        payment_reference:   payment_id,
        commission_pct:      resolvedPartnerCode ? partnerPoolPct : 0,
        commission_amount:   resolvedPartnerCode ? netTaxable * partnerPoolPct : 0,
        oi_amount:           netTaxable * (1 - (resolvedPartnerCode ? partnerPoolPct : 0)),
        is_active:           true,
        course_id:           course_id,
      })
      .select('id')
      .single()

    if (enrolmentError) {
      console.error('[enrolment] Failed to write student_enrolments:', enrolmentError.message)
    }

    // ── 6. If partner code exists → resolve partner id + credit commission ────
    if (resolvedPartnerCode && enrolmentRow?.id) {
      const { data: partner } = await supabase
        .from('partners')
        .select('id')
        .eq('partner_code', resolvedPartnerCode)
        .maybeSingle()

      // Update enrolment with partner_id
      if (partner?.id) {
        await supabase
          .from('student_enrolments')
          .update({ partner_id: partner.id })
          .eq('id', enrolmentRow.id)
      }

      // Fire commission cascade
      await creditPartnerCommission(
        supabase,
        enrolmentRow.id,
        resolvedPartnerCode,
        course_id,
        netTaxable,
        partnerPoolPct,
        enrollerShare,
        upstreamShare,
      )
    }

    // ── 7. Create Supabase auth user (invite) if not already exists ───────────
    // This lets the student log in to the dashboard after payment
    try {
      const { data: existingUser } = await supabase.auth.admin.listUsers()
      const alreadyExists = existingUser?.users?.some(u => u.email === email)

      if (!alreadyExists) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://with-arijit-platform.vercel.app'
        await supabase.auth.admin.inviteUserByEmail(email, {
          data: { full_name: name },
          redirectTo: `${appUrl}/auth/callback?next=/dashboard`,
        })
      }
    } catch (authErr: any) {
      // Non-fatal — student can still sign up manually
      console.warn('[enrolment] Auth invite failed (non-fatal):', authErr.message)
    }

    // ── 8. Mark qr_landing_registrations as enrolled ──────────────────────────
    await supabase
      .from('qr_landing_registrations')
      .update({ is_enrolled: true, enrolled_at: now.toISOString() })
      .eq('email', email)

    // ── 9. Queue confirmation email ───────────────────────────────────────────
    await queueEmail({
      to:            email,
      template_name: 'enrollment_confirmation',
      payload:       { name, course_id, course_name: course?.name, amount },
      ref_id:        enrolmentRow?.id ?? undefined,
      ref_type:      'student_enrolment',
    })

    return NextResponse.json({
      success:       true,
      enrolment_id:  enrolmentRow?.id,
      partner_code:  resolvedPartnerCode ?? null,
    })
  } catch (error: any) {
    console.error('Self enrollment error:', error)
    return NextResponse.json({ error: 'Enrollment failed' }, { status: 500 })
  }
}
