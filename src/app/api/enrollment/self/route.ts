import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// ── Commission cascade ────────────────────────────────────────────────────────
async function creditPartnerCommission(
  supabase: ReturnType<typeof createServiceClient>,
  enrolmentId: string,
  partnerCode: string,
  courseId: string,
  netTaxable: number,
  partnerPoolPct: number,
  enrollerShare: number,
  upstreamShare: number,
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

  // Update partner aggregate totals atomically.
  // The DB trigger trg_cascade_commissions was dropped to prevent double-writes.
  // This RPC is now the sole updater of partner commission totals.
  await supabase.rpc('increment_partner_commission', {
    p_partner_id:      enroller.id,
    p_commission:      enrollerAmount,
    p_count_enrolment: true,
  })

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

// ── Background work (non-blocking, fires after response is sent) ──────────────
// Includes: commission, student_master_table, discount code, qr update,
// auth invite, invoice, comms. None of these should ever block the student.
async function runBackgroundWork(params: {
  supabase:             ReturnType<typeof createServiceClient>
  enrolmentId:          string
  enrolmentSeq:         number
  email:                string
  name:                 string
  mobile:               string
  courseId:             string
  courseName:           string
  amount:               number
  paymentId:            string
  orderId:              string
  today:                string
  now:                  Date
  normEnrolmentType:    'full_course' | 'monthly'
  netTaxable:           number
  gstAmount:            number
  resolvedPartnerCode:  string | null
  resolvedPartnerId:    string | null
  partnerPoolPct:       number
  enrollerShare:        number
  upstreamShare:        number
  discountCode:         string | undefined
  body:                 any
}) {
  const {
    supabase, enrolmentId, enrolmentSeq, email, name, mobile,
    courseId, courseName, amount, paymentId, orderId, today, now,
    normEnrolmentType, netTaxable, gstAmount,
    resolvedPartnerCode, resolvedPartnerId,
    partnerPoolPct, enrollerShare, upstreamShare,
    discountCode, body,
  } = params

  // ── 1. Commission cascade ─────────────────────────────────────────────────
  // resolvedPartnerId is set during the main INSERT — use it as the source of truth.
  // If resolvedPartnerCode is missing (e.g. partner enrolled themselves), look it up.
  let finalPartnerCode  = resolvedPartnerCode
  let finalPartnerId    = resolvedPartnerId

  if (!finalPartnerCode && finalPartnerId) {
    try {
      const { data: partnerRow } = await supabase
        .from('partners')
        .select('partner_code')
        .eq('id', finalPartnerId)
        .maybeSingle()
      if (partnerRow?.partner_code) finalPartnerCode = partnerRow.partner_code
    } catch (e: any) {
      console.warn('[bg] partner_code lookup failed (non-fatal):', e.message)
    }
  }

  if (finalPartnerCode && finalPartnerId) {
    try {
      // Idempotency guard: skip if commission already recorded for this enrolment
      const { count } = await supabase
        .from('commission_ledger')
        .select('id', { count: 'exact', head: true })
        .eq('enrolment_id', enrolmentId)
        .eq('partner_id',   finalPartnerId)

      if ((count ?? 0) === 0) {
        await creditPartnerCommission(
          supabase, enrolmentId, finalPartnerCode,
          courseId, netTaxable, partnerPoolPct, enrollerShare, upstreamShare,
        )
      } else {
        console.log(`[bg] commission already exists for enrolment ${enrolmentId} — skipping`)
      }
    } catch (e: any) {
      console.warn('[bg] commission failed (non-fatal):', e.message)
      // Log to recovery table so admin can manually fix
      try {
        await supabase.from('payment_recovery_log').insert({
          razorpay_payment_id: paymentId,
          razorpay_order_id:   orderId,
          student_name:        name,
          student_email:       email.toLowerCase(),
          student_mobile:      mobile,
          course_id:           courseId,
          course_name:         courseName,
          amount,
          partner_code:        finalPartnerCode,
          failure_stage:       'commission_failed',
          failure_reason:      e.message,
        })
      } catch { /* recovery log failure is non-fatal */ }
    }
  }

  // ── 2. student_master_table (legacy admin view) ───────────────────────────
  try {
    const { data: existing } = await supabase
      .from('student_master_table')
      .select('id, total_payments_count, total_amount_paid')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (existing) {
      const newCount = (existing.total_payments_count ?? 0) + 1
      const newTotal = Number(existing.total_amount_paid ?? 0) + amount
      const slotIndex = Math.min(newCount, 4)
      const prefix    = slotIndex === 1 ? '1st' : slotIndex === 2 ? '2nd' : slotIndex === 3 ? '3rd' : '4th'
      const payCol    = slotIndex === 1 ? '1st_Course_Payment_Amount' : `${prefix}_Payment_Amt`
      const dateCol   = slotIndex === 1 ? '1st_Pay_Date'             : `${prefix}_Payment_Date`
      const rzpCol    = slotIndex === 1 ? '1st_Payment_Razorpay_ID'  : `${prefix}_Payment_Razorpay_ID`

      const updatePayload: Record<string, any> = {
        total_payments_count: newCount,
        total_amount_paid:    newTotal,
        last_payment_date:    now.toISOString(),
        updated_at:           now.toISOString(),
      }
      if (newCount <= 4) {
        updatePayload[payCol]  = amount
        updatePayload[dateCol] = today
        updatePayload[rzpCol]  = paymentId
      }
      await supabase.from('student_master_table').update(updatePayload).eq('id', existing.id)
    } else {
      await supabase.from('student_master_table').insert({
        student_name:                  name,
        email:                         email.toLowerCase(),
        mobile,
        current_course_name:           courseName,
        '1st_Course_Payment_Amount':   amount,
        '1st_Pay_Date':                today,
        '1st_Pay_Discount_Coupon_Used': discountCode ?? null,
        '1st_Payment_Razorpay_ID':     paymentId,
        referred_by:                   resolvedPartnerCode ?? null,
        total_payments_count:          1,
        total_amount_paid:             amount,
        enrollment_date:               now.toISOString(),
        last_payment_date:             now.toISOString(),
      })
    }
  } catch (e: any) {
    console.warn('[bg] student_master_table failed (non-fatal):', e.message)
  }

  // ── 3. Discount code usage counter ───────────────────────────────────────
  if (discountCode) {
    try {
      await supabase.rpc('increment_discount_uses', { p_code: discountCode.trim().toUpperCase() })
    } catch (e: any) {
      console.warn('[bg] discount increment failed (non-fatal):', e.message)
    }
  }

  // ── 4. Mark qr_landing_registrations as enrolled ─────────────────────────
  try {
    await supabase
      .from('qr_landing_registrations')
      .update({ is_enrolled: true, enrolled_at: now.toISOString() })
      .eq('email', email.toLowerCase())
  } catch (e: any) {
    console.warn('[bg] qr_landing update failed (non-fatal):', e.message)
  }

  // ── 5. Invite/notify student via Supabase Auth ───────────────────────────
  // For new users: sends magic link email with select-batch redirect
  // For existing users: silently no-ops (they're already registered)
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.ostaran.com'
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email.toLowerCase(),
      {
        data:       { full_name: name },
        redirectTo: `${appUrl}/auth/callback?next=/select-batch?course_id=${courseId}&enrolment_id=${enrolmentId}`,
      }
    )
    if (inviteError && !inviteError.message?.toLowerCase().includes('already registered')) {
      console.warn('[bg] Auth invite failed (non-fatal):', inviteError.message)
    }
  } catch (e: any) {
    console.warn('[bg] Auth invite threw (non-fatal):', e.message)
  }

  // ── 6. Payment confirmed comms ────────────────────────────────────────────
  // NOTE: create_payment_transaction was moved to the critical path (step 5
  // before the 200 response). It is NOT called here to prevent double-writing.
  try {
    const { sendStudentComm } = await import('@/lib/comms')
    await sendStudentComm({
      event_type:   'payment_confirmed',
      enrolment_id: enrolmentId,
      triggered_by: 'system',
    })
  } catch (e: any) {
    console.warn('[bg] payment_confirmed comms failed (non-fatal):', e.message)
  }
}

// ── POST /api/enrollment/self ─────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: any = null
  try {
    body = await request.json()
    const {
      payment_id,
      order_id,
      course_id,
      name,
      email,
      mobile,
      amount,
      full_discounted_price,  // full discounted course fee (= amount*2 for 50-50, = amount for full pay)
      discount_code,
      partner_code,
      enrolment_type,
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
      .select('id, name, mrp, gst_percent, discount_percent, partner_pool_percent, enroller_share, upstream_share, tenure_type')
      .eq('id', course_id)
      .single()

    // Monthly-membership courses (e.g. Quantum & AI — Continued Up-skilling) grant
    // a rolling 30-day access window per payment, stamped here at enrol time.
    // One-time / 50-50 courses leave these null — select-batch stamps them from the
    // chosen batch, exactly as before.
    const isMonthlyMembership = course?.tenure_type === 'monthly'
    let monthlyAccessStart: string | null = null
    let monthlyAccessEnd:   string | null = null
    if (isMonthlyMembership) {
      const end = new Date(now)
      end.setDate(end.getDate() + 30)
      monthlyAccessStart = today
      monthlyAccessEnd   = end.toISOString().split('T')[0]
    }

    const mrp            = Number(course?.mrp ?? amount)
    const gstPct         = Number(course?.gst_percent ?? 18) / 100
    const partnerPoolPct = Number(course?.partner_pool_percent ?? 0.40)
    const enrollerShare  = Number(course?.enroller_share ?? 0.75)
    const upstreamShare  = Number(course?.upstream_share ?? 0.25)
    const netTaxable     = Number((amount / (1 + gstPct)).toFixed(2))
    const gstAmount      = Number((amount - netTaxable).toFixed(2))

    const normEnrolmentType: 'full_course' | 'monthly' =
      enrolment_type === 'monthly' ? 'monthly' : 'full_course'

    // ── 2. Resolve partner ────────────────────────────────────────────────────
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

    // ── 3. Count existing enrolments (for sequence number) ───────────────────
    const { count: existingCount } = await supabase
      .from('student_enrolments')
      .select('*', { count: 'exact', head: true })
      .eq('student_email', email.toLowerCase())
      .eq('course_id', course_id)

    const enrolmentSeq = (existingCount ?? 0) + 1

    // ── 4. CRITICAL: Write student_enrolments ────────────────────────────────
    // This is the ONLY step that must succeed before returning to the student.
    // Everything else runs in background after this succeeds.
    // ── Resolve the full discounted price ────────────────────────────────────
    // For 50-50 plan: full_discounted_price = 2 × amount (first instalment)
    // For full payment: full_discounted_price = amount
    // Falls back to amount if not provided (backward compat)
    const resolvedFullPrice  = Number(full_discounted_price ?? amount)
    const resolvedBalanceDue = normEnrolmentType === 'monthly'
      ? Number((resolvedFullPrice - amount).toFixed(2))
      : 0
    // discount is based on MRP vs full discounted price (not just the instalment)
    const resolvedDiscountPct    = mrp > 0 ? Number((1 - resolvedFullPrice / mrp).toFixed(4)) : 0
    const resolvedDiscountAmount = Number(Math.max(0, mrp - resolvedFullPrice).toFixed(2))

    const { data: enrolmentRow, error: enrolmentError } = await supabase
      .from('student_enrolments')
      .insert({
        partner_id:         resolvedPartnerId,
        student_name:       name,
        student_email:      email.toLowerCase(),
        student_mobile:     mobile,
        course_name:        course?.name ?? 'AI Mastery Programme',
        course_id:          course_id,
        enrolment_type:     normEnrolmentType,
        mrp,
        discount_pct:       resolvedDiscountPct,
        discount_amount:    resolvedDiscountAmount,
        net_after_discount: resolvedFullPrice,     // full discounted price (both instalments)
        gst_pct:            gstPct,
        gst_amount:         gstAmount,
        net_taxable:        netTaxable,
        amount_paid:        amount,                // first instalment only
        balance_due:        resolvedBalanceDue,    // ₹0 for full pay, = amount for 50-50
        payment_mode:       'upi',
        payment_date:       today,
        payment_reference:  payment_id,
        commission_pct:     commissionPct,
        commission_amount:  commissionAmount,
        oi_amount:          oiAmount,
        is_active:          true,
        enrolment_seq:      enrolmentSeq,
        enrolment_status:   'active',
        access_start_date:  monthlyAccessStart,   // null for one-time courses (unchanged)
        access_end_date:    monthlyAccessEnd,     // null for one-time courses (unchanged)
      })
      .select('id')
      .single()

    if (enrolmentError) {
      // Enrolment failed — log to recovery table and return error
      // (payment was successful but we couldn't create the enrolment)
      console.error('[enrolment] student_enrolments insert failed:', enrolmentError.message)
      try {
        await supabase.from('payment_recovery_log').insert({
          razorpay_payment_id: payment_id,
          razorpay_order_id:   order_id,
          student_name:        name,
          student_email:       email.toLowerCase(),
          student_mobile:      mobile,
          course_id:           course_id,
          course_name:         course?.name ?? null,
          amount,
          enrolment_type:      normEnrolmentType,
          discount_code:       discount_code ?? null,
          partner_code:        resolvedPartnerCode ?? null,
          failure_stage:       'enrolment_insert',
          failure_reason:      enrolmentError.message,
          raw_payload:         body,
        })
      } catch { /* recovery log failure is non-fatal */ }
      return NextResponse.json(
        { error: `Enrolment insert failed: ${enrolmentError.message}` },
        { status: 500 }
      )
    }

    const enrolmentId = enrolmentRow!.id

    // ── 5. Write payment_transactions record (CRITICAL PATH) ─────────────────
    // This MUST complete before returning 200 — it's what the student's
    // /dashboard/payments page reads. Moved out of runBackgroundWork because
    // Vercel can kill the serverless function after the response is sent,
    // causing the payment history to be missing for 15-20 minutes.
    // This is a single fast DB RPC (~100-150ms) — no external services involved.
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
    } catch (e: any) {
      // Non-fatal: log to recovery but don't block the student
      // (enrolment already succeeded — student has access to the course)
      console.warn('[enrolment] create_payment_transaction failed (non-fatal):', e.message)
      try {
        await supabase.from('payment_recovery_log').insert({
          razorpay_payment_id: payment_id,
          razorpay_order_id:   order_id,
          student_name:        name,
          student_email:       email.toLowerCase(),
          student_mobile:      mobile,
          course_id:           course_id,
          course_name:         course?.name ?? null,
          amount,
          partner_code:        resolvedPartnerCode ?? null,
          failure_stage:       'payment_transaction_rpc',
          failure_reason:      e.message,
        })
      } catch { /* recovery log failure is non-fatal */ }
    }

    // ── 6. Return SUCCESS immediately ────────────────────────────────────────
    // The enrolment row AND payment_transactions row both exist now.
    // All remaining background work (commission, invite, comms) runs async.
    void runBackgroundWork({
      supabase,
      enrolmentId,
      enrolmentSeq,
      email,
      name,
      mobile,
      courseId:            course_id,
      courseName:          course?.name ?? 'AI Mastery Programme',
      amount,
      paymentId:           payment_id,
      orderId:             order_id,
      today,
      now,
      normEnrolmentType,
      netTaxable,
      gstAmount,
      resolvedPartnerCode,
      resolvedPartnerId,
      partnerPoolPct,
      enrollerShare,
      upstreamShare,
      discountCode:        discount_code,
      body,
    })

    return NextResponse.json({
      success:      true,
      enrolment_id: enrolmentId,
      partner_code: resolvedPartnerCode ?? null,
      partner_id:   resolvedPartnerId ?? null,
    })

  } catch (error: any) {
    console.error('[enrolment] Unhandled error:', error.message)
    try {
      const supabase = createServiceClient()
      await supabase.from('payment_recovery_log').insert({
        razorpay_payment_id: body?.payment_id ?? 'unknown',
        razorpay_order_id:   body?.order_id ?? null,
        student_name:        body?.name ?? null,
        student_email:       body?.email?.toLowerCase() ?? null,
        student_mobile:      body?.mobile ?? null,
        course_id:           body?.course_id ?? null,
        amount:              body?.amount ?? null,
        failure_stage:       'unhandled_exception',
        failure_reason:      error.message,
        raw_payload:         body ?? null,
      })
    } catch { /* non-fatal */ }
    return NextResponse.json({ error: `Enrollment failed: ${error.message}` }, { status: 500 })
  }
}
