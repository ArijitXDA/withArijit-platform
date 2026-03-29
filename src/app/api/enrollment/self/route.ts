import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// ── Commission cascade ────────────────────────────────────────────────────────
// Walks the partner hierarchy and writes one commission_ledger row per level.
async function creditPartnerCommission(
  supabase: ReturnType<typeof createServiceClient>,
  enrolmentId: string,
  partnerCode: string,
  courseId: string,
  netTaxable: number,   // pre-GST amount — the commission base
  partnerPoolPct: number,   // e.g. 0.40
  enrollerShare: number,    // e.g. 0.75
  upstreamShare: number,    // e.g. 0.25
) {
  const { data: enroller } = await supabase
    .from('partners')
    .select('id, partner_code, full_name, parent_partner_id')
    .eq('partner_code', partnerCode)
    .single()

  if (!enroller) {
    console.warn(`[commission] Partner not found: ${partnerCode}`)
    return
  }

  const partnerPoolAmount = netTaxable * partnerPoolPct
  const enrollerAmount    = partnerPoolAmount * enrollerShare
  const upstreamPool      = partnerPoolAmount * upstreamShare

  // Level 1 — direct enrolling partner gets 75% of pool
  await supabase.from('commission_ledger').insert({
    enrolment_id:           enrolmentId,
    partner_id:             enroller.id,
    partner_level_in_chain: 1,
    direct_partner_id:      enroller.id,
    base_amount:            netTaxable,
    commission_rate:        partnerPoolPct * enrollerShare,
    commission_amount:      enrollerAmount,
    commission_model:       'cascade',
    enroller_layer:         1,
    course_id:              courseId,
    status:                 'pending',
  })

  // Upstream levels — each gets 75% of remaining 25%
  let parentId: string | null = enroller.parent_partner_id as string | null
  let level = 2
  let remaining = upstreamPool

  while (parentId && level <= 6) {
    const { data: ancestor } = await supabase
      .from('partners')
      .select('id, parent_partner_id')
      .eq('id', parentId)
      .single()

    if (!ancestor) break

    const thisLevel = remaining * 0.75
    remaining       = remaining * 0.25

    await supabase.from('commission_ledger').insert({
      enrolment_id:           enrolmentId,
      partner_id:             ancestor.id,
      partner_level_in_chain: level,
      direct_partner_id:      enroller.id,
      base_amount:            netTaxable,
      commission_rate:        thisLevel / netTaxable,
      commission_amount:      thisLevel,
      commission_model:       'cascade',
      enroller_layer:         1,
      upstream_layer_index:   level - 1,
      total_upstream_count:   level - 1,
      course_id:              courseId,
      status:                 'pending',
    })

    parentId = ancestor.parent_partner_id as string | null
    level++
  }
}

// ── POST /api/enrollment/self ─────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      payment_id,       // Razorpay payment ID
      order_id,         // Razorpay order ID
      course_id,        // awa_courses.id (uuid)
      name,
      email,
      mobile,
      amount,           // total amount paid incl. GST (in INR)
      discount_code,
      partner_code,     // may be null for walk-ins
      enrolment_type,   // 'full_course' | 'monthly'  (from PaymentModal)
    } = body

    if (!payment_id || !order_id || !course_id || !name || !email || !mobile || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const now      = new Date()
    const today    = now.toISOString().split('T')[0]

    // ── 1. Fetch course pricing ───────────────────────────────────────────────
    const { data: course } = await supabase
      .from('awa_courses')
      .select('id, name, mrp, gst_percent, discount_percent, partner_pool_percent, enroller_share, upstream_share')
      .eq('id', course_id)
      .single()

    const mrp            = Number(course?.mrp ?? amount)
    const gstPct         = Number(course?.gst_percent ?? 18) / 100
    const partnerPoolPct = Number(course?.partner_pool_percent ?? 0.40)
    const enrollerShare  = Number(course?.enroller_share ?? 0.75)
    const upstreamShare  = Number(course?.upstream_share ?? 0.25)
    const netTaxable     = Number((amount / (1 + gstPct)).toFixed(2))
    const gstAmount      = Number((amount - netTaxable).toFixed(2))

    // Normalise enrolment_type to valid enum value
    const normEnrolmentType: 'full_course' | 'monthly' =
      enrolment_type === 'monthly' ? 'monthly' : 'full_course'

    // ── 2. Resolve partner code (passed in URL, or look up from registrations) ─
    let resolvedPartnerCode = (partner_code as string | null) || null

    if (!resolvedPartnerCode) {
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

    // Resolve partner UUID from code
    let resolvedPartnerId: string | null = null
    if (resolvedPartnerCode) {
      const { data: partner } = await supabase
        .from('partners')
        .select('id')
        .eq('partner_code', resolvedPartnerCode)
        .maybeSingle()
      resolvedPartnerId = partner?.id ?? null
    }

    const commissionPct    = resolvedPartnerId ? partnerPoolPct : 0
    const commissionAmount = resolvedPartnerId ? Number((netTaxable * partnerPoolPct).toFixed(2)) : 0
    const oiAmount         = Number((netTaxable - commissionAmount).toFixed(2))

    // ── 3. Write student_enrolments ─────────────────────────────────────────
    // Determine enrolment sequence number for this student + course
    const { count: existingCount } = await supabase
      .from('student_enrolments')
      .select('*', { count: 'exact', head: true })
      .eq('student_email', email.toLowerCase())
      .eq('course_id', course_id)

    const enrolmentSeq = (existingCount ?? 0) + 1

    const { data: enrolmentRow, error: enrolmentError } = await supabase
      .from('student_enrolments')
      .insert({
        partner_id:         resolvedPartnerId,   // nullable — OK if null
        student_name:       name,
        student_email:      email.toLowerCase(),
        student_mobile:     mobile,
        course_name:        course?.name ?? 'AI Mastery Programme',
        course_id:          course_id,
        enrolment_type:     normEnrolmentType,
        mrp,
        // discount_pct: back-calculate from MRP vs amount paid
        discount_pct:       mrp > 0 ? Math.round((1 - amount / mrp) * 100) / 100 : 0,
        discount_amount:    Math.max(0, mrp - amount),
        net_after_discount: amount,
        gst_pct:            gstPct,
        gst_amount:         gstAmount,
        net_taxable:        netTaxable,
        amount_paid:        amount,
        payment_mode:       'upi',               // Razorpay default; can be refined
        payment_date:       today,
        payment_reference:  payment_id,
        commission_pct:     commissionPct,
        commission_amount:  commissionAmount,
        oi_amount:          oiAmount,
        is_active:          true,
        enrolment_seq:      enrolmentSeq,
        enrolment_status:   'active',
      })
      .select('id')
      .single()

    if (enrolmentError) {
      console.error('[enrolment] student_enrolments insert failed:', enrolmentError.message)
      return NextResponse.json({ error: `Enrolment insert failed: ${enrolmentError.message}` }, { status: 500 })
    }

    const enrolmentId = enrolmentRow!.id

    // ── 4. Fire commission cascade ────────────────────────────────────────────
    if (resolvedPartnerCode && resolvedPartnerId) {
      await creditPartnerCommission(
        supabase,
        enrolmentId,
        resolvedPartnerCode,
        course_id,
        netTaxable,
        partnerPoolPct,
        enrollerShare,
        upstreamShare,
      )
    }

    // ── 5. Upsert student_master_table (legacy admin — keep working) ──────────
    try {
      const { data: existing } = await supabase
        .from('student_master_table')
        .select('id, total_payments_count, total_amount_paid')
        .eq('email', email.toLowerCase())
        .maybeSingle()

      if (existing) {
        // Update existing student record
        const newCount  = (existing.total_payments_count ?? 0) + 1
        const newTotal  = Number(existing.total_amount_paid ?? 0) + amount
        const payCol    = newCount === 1 ? '1st_Course_Payment_Amount' : `${newCount === 2 ? '2nd' : newCount === 3 ? '3rd' : '4th'}_Payment_Amt`
        const dateCol   = newCount === 1 ? '1st_Pay_Date' : `${newCount === 2 ? '2nd' : newCount === 3 ? '3rd' : '4th'}_Payment_Date`
        const rzpCol    = newCount === 1 ? '1st_Payment_Razorpay_ID' : `${newCount === 2 ? '2nd' : newCount === 3 ? '3rd' : '4th'}_Payment_Razorpay_ID`

        await supabase
          .from('student_master_table')
          .update({
            total_payments_count: newCount,
            total_amount_paid:    newTotal,
            last_payment_date:    now.toISOString(),
            updated_at:           now.toISOString(),
            [payCol]:             amount,
            [dateCol]:            today,
            [rzpCol]:             payment_id,
          })
          .eq('id', existing.id)
      } else {
        // New student
        await supabase.from('student_master_table').insert({
          student_name:                  name,
          email:                         email.toLowerCase(),
          mobile,
          current_course_name:           course?.name ?? 'AI Mastery Programme',
          '1st_Course_Payment_Amount':   amount,
          '1st_Pay_Date':                today,
          '1st_Pay_Discount_Coupon_Used': discount_code ?? null,
          '1st_Payment_Razorpay_ID':     payment_id,
          referred_by:                   resolvedPartnerCode ?? null,
          total_payments_count:          1,
          total_amount_paid:             amount,
          enrollment_date:               now.toISOString(),
          last_payment_date:             now.toISOString(),
        })
      }
    } catch (legacyErr: any) {
      // Non-fatal — legacy table update failure shouldn't block enrolment
      console.warn('[enrolment] student_master_table update failed (non-fatal):', legacyErr.message)
    }

    // ── 6. Increment discount code usage counter ────────────────────────────
    if (discount_code) {
      try {
        await supabase.rpc('increment_discount_uses', { p_code: discount_code.trim().toUpperCase() })
      } catch (e: any) {
        console.warn('[enrolment] discount increment failed (non-fatal):', e?.message)
      }
    }

    // ── 7. Mark qr_landing_registrations as enrolled ──────────────────────────
    await supabase
      .from('qr_landing_registrations')
      .update({ is_enrolled: true, enrolled_at: now.toISOString() })
      .eq('email', email.toLowerCase())

    // ── 7. Invite student to Supabase Auth (non-fatal) ────────────────────────
    try {
      const { data: existingUsers } = await supabase.auth.admin.listUsers()
      const alreadyExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase())

      if (!alreadyExists) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://with-arijit-platform.vercel.app'
        await supabase.auth.admin.inviteUserByEmail(email, {
          data: { full_name: name },
          redirectTo: `${appUrl}/auth/callback?next=/dashboard`,
        })
      }
    } catch (authErr: any) {
      console.warn('[enrolment] Auth invite failed (non-fatal):', authErr.message)
    }

    // ── 8. Create payment_transactions invoice record ───────────────────────
    try {
      const isFull = normEnrolmentType === 'full_course'
      await supabase.rpc('create_payment_transaction', {
        p_enrolment_id:      enrolmentId,
        p_payment_type:      isFull ? 'full' : 'first_instalment',
        p_instalment_number: 1,
        p_total_instalments: isFull ? 1 : 2,
        p_amount_paid:       amount,
        p_payment_mode:      'upi',
        p_payment_date:      today,
        p_payment_reference: payment_id,
        p_razorpay_order_id: order_id,
        p_partner_code:      resolvedPartnerCode ?? null,
      })
    } catch (invoiceErr: any) {
      console.warn('[enrolment] invoice transaction failed (non-fatal):', invoiceErr.message)
    }

    // ── 9. Fire payment_confirmed comms (non-blocking) ──────────────────────
    const { sendStudentComm } = await import('@/lib/comms')
    sendStudentComm({
      event_type:    'payment_confirmed',
      enrolment_id:  enrolmentId,
      triggered_by:  'system',
    }).catch(e => console.warn('[comms] payment_confirmed failed (non-fatal):', e?.message))

    return NextResponse.json({
      success:      true,
      enrolment_id: enrolmentId,
      partner_code: resolvedPartnerCode ?? null,
      partner_id:   resolvedPartnerId ?? null,
    })

  } catch (error: any) {
    console.error('[enrolment] Unhandled error:', error.message)
    return NextResponse.json({ error: `Enrollment failed: ${error.message}` }, { status: 500 })
  }
}
