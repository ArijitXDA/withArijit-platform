import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { attributeBroadcast } from '@/lib/broadcastAttribution'
import { notifyPartner, type PartnerNotice } from '@/lib/notifyPartner'
import { allocateCascade } from '@/lib/cascade'
import { publicPartnerCode, resolvePartnerByCode, resolvePartnerIdByCode } from '@/lib/partnerCode'
import { getRazorpay, verifyPaymentSignature, verifyInternalEnrolmentSignature } from '@/lib/razorpay'

// Commission amounts are unrounded fractions of the net, so they are shown to the paisa. The
// shared formatCurrency() fixes 0 decimals, which would tell a partner they earned 4,408 when
// the ledger credits 4,407.60 — a number they can check against their own income page.
const money = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

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
  // No partner pool → no commission. Products with partner_pool_percent = 0 (e.g. the Expert
  // Consultation product, which pays no partner commission) never book a ledger row. This also
  // avoids writing meaningless zero-amount rows for any future non-commissionable product.
  if (!(partnerPoolPct > 0)) return

  // Resolved through partner_code_aliases. `partnerCode` here is whatever the enrolment
  // was attributed with — a legacy name-derived code off a printed poster, or the new
  // opaque one. A .eq('partner_code', …) would find only the first, and the enroller not
  // being found means NO commission ledger row is ever written.
  const enroller = await resolvePartnerByCode(
    supabase, partnerCode, 'id, partner_code, partner_code_v2, full_name, parent_partner_id')

  if (!enroller) {
    console.warn(`[commission] Partner not found: ${partnerCode}`)
    return
  }

  // Round to paise HERE, byte-identically to how student_enrolments.commission_amount is
  // booked below (Number(x.toFixed(2))). Passing the raw float let the engine's drift
  // correction chase a target the books never used: on a pool ending in half a paisa
  // (partner_pool_percent 0.25 — the Quantum course — whenever netTaxable paise ≡ 2 mod 4)
  // Math.round(x*100)/100 and toFixed(2) break the tie in opposite directions and the ledger
  // ended up 1 paisa ABOVE the booked commission.
  const partnerPoolAmount = Number((netTaxable * partnerPoolPct).toFixed(2))

  // ── Walk the upline chain, nearest first, collecting each partner's "keep" dial ──────
  // The dial is keyed (parent, child): what THIS upline keeps on sales originating in that
  // child's sub-tree. Missing row → keeps everything (1).
  const uplineIds: string[] = []
  const childOf  = new Map<string, string>()   // upline id → the node just below it in this chain
  {
    let cursor: string | null = enroller.parent_partner_id as string | null
    let below  = enroller.id
    // Hard depth cap + cycle guard. The seen-set includes the ENROLLER: a cycle that loops
    // back to them (E → A → B → E) would otherwise book the enroller twice on one enrolment,
    // and there is no unique constraint on (enrolment_id, partner_id) to catch it.
    const seen = new Set<string>([enroller.id])
    while (cursor && uplineIds.length < 12 && !seen.has(cursor)) {
      const { data: ancestor } = await supabase
        .from('partners').select('id, parent_partner_id').eq('id', cursor).single()
      if (!ancestor) break
      uplineIds.push(ancestor.id)
      seen.add(ancestor.id)
      childOf.set(ancestor.id, below)
      below  = ancestor.id
      cursor = ancestor.parent_partner_id as string | null
    }
  }

  const keepByUpline = new Map<string, number>()
  if (uplineIds.length) {
    const { data: dials } = await supabase
      .from('partner_downline_sharing')
      .select('parent_partner_id, child_partner_id, keep_fraction')
      .in('parent_partner_id', uplineIds)
      .eq('is_active', true)
    for (const d of dials ?? []) {
      if (childOf.get(d.parent_partner_id) === d.child_partner_id) {
        keepByUpline.set(d.parent_partner_id, Number(d.keep_fraction ?? 1))
      }
    }
  }

  // ── Allocate. The shared engine guarantees the parts sum to EXACTLY the pool ─────────
  const allocations = allocateCascade(
    partnerPoolAmount,
    uplineIds.map(id => ({ partnerId: id, keepFraction: keepByUpline.get(id) ?? 1 })),
    enrollerShare,
    upstreamShare,
  )
  // allocations[0] is the enroller (layerInChain 1); the engine leaves its partnerId blank.
  if (allocations.length) allocations[0].partnerId = enroller.id

  const enrollerLayer = uplineIds.length + 1
  const layerOf = new Map<string, number>(allocations.map(a => [a.partnerId, a.layerInChain] as [string, number]))

  // ── EMPLOYEE REMITTANCE (post-cascade — does NOT touch allocateCascade) ───────────────
  // A sub-partner may be an EMPLOYEE of their sponsor: the employer keeps (1 - keep) of
  // EVERYTHING the employee earns on this enrolment, redirected UPWARD. This is the mirror of
  // the downward partner_downline_sharing dial, kept out of the cascade engine so the
  // 700k-verified geometry is never perturbed. When nobody in the chain is an employee (the
  // overwhelming majority) every map below stays empty and this collapses to exactly the
  // original cascade behaviour: finalCascade === the raw allocations, and no remittance rows.
  //
  // Employee data is resolved for every chain member AND transitively up each employer line, so
  // an employee who is themselves an employer forwards their share on again — an employee who
  // builds a team also feeds their own employer from the team's sales.
  const r2 = (n: number) => Math.round(n * 100) / 100
  const clamp01 = (n: number) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 1))
  const empData = new Map<string, { employerId: string; keep: number; name: string }>()
  {
    const resolved = new Set<string>()
    let frontier = new Set<string>(allocations.map(a => a.partnerId))
    for (let i = 0; i < 24 && frontier.size; i++) {
      const ids = [...frontier].filter(id => id && !resolved.has(id))
      ids.forEach(id => resolved.add(id))
      frontier = new Set<string>()
      if (!ids.length) break
      const { data: emps } = await supabase
        .from('partners')
        .select('id, employee_of, employee_keep_fraction, full_name')
        .in('id', ids)
        .eq('employee_status', 'active')
        .not('employee_of', 'is', null)
      for (const e of emps ?? []) {
        if (!e.employee_of) continue
        empData.set(e.id, {
          employerId: e.employee_of as string,
          keep: clamp01(Number(e.employee_keep_fraction ?? 1)),
          name: (e.full_name as string) ?? 'Employee',
        })
        if (!resolved.has(e.employee_of as string)) frontier.add(e.employee_of as string)
      }
    }
  }

  // finalCascade[p] = a chain member's commission AFTER their own employee-share is removed.
  const finalCascade = new Map<string, number>(allocations.map(a => [a.partnerId, a.amount] as [string, number]))
  const remitCredit  = new Map<string, number>()   // employer id → total remittance credited to them
  const remitRows: { employerId: string; amount: number; sourceEmployeeId: string; sourceName: string }[] = []

  const pushRemit = (employerId: string, amt: number, srcId: string, srcName: string) => {
    if (!(amt > 0)) return
    remitRows.push({ employerId, amount: amt, sourceEmployeeId: srcId, sourceName: srcName })
    remitCredit.set(employerId, r2((remitCredit.get(employerId) ?? 0) + amt))
  }
  // Send `amount` up from `sourceEmployeeId`. Each intervening employer that is ITSELF an
  // employee keeps their fraction and forwards the rest; the last (non-employee) employer keeps
  // the remainder. Every credit is positive, and the per-hop splits telescope so they sum to
  // EXACTLY `amount` — no paise is minted or lost.
  const redirectUp = (startEmployerId: string, amount: number, sourceEmployeeId: string, sourceName: string) => {
    let cur: string | null = startEmployerId
    let flowing = r2(amount)
    const guard = new Set<string>([sourceEmployeeId])
    let hops = 0
    while (flowing > 0 && cur && !guard.has(cur) && hops < 24) {
      guard.add(cur); hops++
      const e = empData.get(cur)
      if (e && e.employerId) {
        const kept = r2(e.keep * flowing)
        pushRemit(cur, kept, sourceEmployeeId, sourceName)
        flowing = r2(flowing - kept)
        cur = e.employerId
      } else {
        pushRemit(cur, flowing, sourceEmployeeId, sourceName)   // terminal employer keeps the rest
        flowing = 0
        cur = null
      }
    }
    if (flowing > 0) pushRemit(startEmployerId, flowing, sourceEmployeeId, sourceName)  // cycle/cap fallback
  }

  // For each employee in the chain, redirect (1 - keep) of THEIR OWN cascade share upward.
  // (Redirects they RECEIVE from a downline employee are split inside redirectUp above, so a
  // partner's keep applies to all their earnings.) Snapshot what was applied for the ledger.
  const empReduction = new Map<string, { keep: number; remit: number }>()
  for (const a of allocations) {
    const e = empData.get(a.partnerId)
    if (!e) continue
    const redirect = r2((1 - e.keep) * a.amount)
    empReduction.set(a.partnerId, { keep: e.keep, remit: redirect })
    if (!(redirect > 0)) continue
    finalCascade.set(a.partnerId, r2(a.amount - redirect))
    redirectUp(e.employerId, redirect, a.partnerId, e.name)
  }

  const enrollerAmount = finalCascade.get(enroller.id) ?? 0

  // ── Book the whole chain in ONE insert (atomicity) ───────────────────────────────────
  // Cascade rows carry the ENGINE's snapshot untouched (entitlement/received/forgone/keep); an
  // employee's commission_amount is the reduced take, with the employee-share in its own two
  // columns. Remittance rows are SEPARATE POSITIVE credits to the employer — every consumer
  // filters commission_amount > 0, so a contra/negative row would be dropped and cause a double
  // payout. These must stay positive; sum across all rows is still exactly the pool.
  const cascadeLedger = allocations.map(a => {
    const er = empReduction.get(a.partnerId)
    const amt = finalCascade.get(a.partnerId) ?? a.amount
    return {
      enrolment_id:           enrolmentId,
      partner_id:             a.partnerId,
      partner_level_in_chain: a.layerInChain,
      direct_partner_id:      enroller.id,
      base_amount:            netTaxable,
      commission_rate:        netTaxable > 0 ? amt / netTaxable : 0,
      commission_amount:      amt,
      commission_model:       'cascade',
      enroller_layer:         enrollerLayer,
      upstream_layer_index:   a.layerInChain > 1 ? a.layerInChain - 1 : null,
      total_upstream_count:   uplineIds.length,
      course_id:              courseId,
      status:                 'pending',
      // Snapshot the cascade maths so a partner moving a slider later can never rewrite history.
      entitlement_amount:     a.entitlement,
      received_amount:        a.received,
      keep_fraction_applied:  a.keepFraction,
      forgone_amount:         a.forgone,
      // Employee-share snapshot — null for ordinary (non-employee) partners.
      employee_keep_applied:  er ? er.keep : null,
      employee_remit_amount:  er ? er.remit : null,
    }
  })
  const remitLedger = remitRows.map(r => ({
    enrolment_id:           enrolmentId,
    partner_id:             r.employerId,
    partner_level_in_chain: layerOf.get(r.employerId) ?? 0,
    direct_partner_id:      enroller.id,
    base_amount:            netTaxable,
    commission_rate:        netTaxable > 0 ? r.amount / netTaxable : 0,
    commission_amount:      r.amount,
    commission_model:       'employee_remittance',
    enroller_layer:         enrollerLayer,
    upstream_layer_index:   null,
    total_upstream_count:   uplineIds.length,
    course_id:              courseId,
    status:                 'pending',
    source_employee_id:     r.sourceEmployeeId,
    notes:                  `Employee remittance from ${r.sourceName}`,
  }))

  const { error: ledgerErr } = await supabase
    .from('commission_ledger')
    .insert([...cascadeLedger, ...remitLedger])
  // Throw so the caller's catch records a payment_recovery_log entry — a commission that
  // failed to book must never fail silently.
  if (ledgerErr) throw new Error(`commission_ledger insert failed: ${ledgerErr.message}`)

  // ── Aggregates. NET amounts only, so a partner's totals match their ledger rows ──────
  // The DB trigger trg_cascade_commissions was dropped to prevent double-writes; this RPC is
  // the sole updater of partner commission totals.
  await supabase.rpc('increment_partner_commission', {
    p_partner_id:      enroller.id,
    p_commission:      enrollerAmount,
    p_count_enrolment: true,
  })

  // Queued, not sent inline (each notify is an FCM round-trip); money first, then notify.
  const notices: PartnerNotice[] = []
  if (enrollerAmount > 0) {
    notices.push({
      partnerId: enroller.id,
      kind:      'enrolment_commission',
      title:     '🎓 New enrolment — commission earned',
      body:      `You earned ${money(enrollerAmount)} on a new enrolment.`,
      link:      '/dashboard/income',
    })
  }

  // Upstream partners earn on their downline's work. A partner on dial/keep 0 earns nothing
  // here, so they are not notified about a zero credit.
  for (const a of allocations.slice(1)) {
    const amt = finalCascade.get(a.partnerId) ?? 0
    if (!(amt > 0)) continue
    await supabase.rpc('increment_partner_commission', {
      p_partner_id:      a.partnerId,
      p_commission:      amt,
      p_count_enrolment: false,
    })
    notices.push({
      partnerId: a.partnerId,
      kind:      'enrolment_commission',
      title:     '📈 Your network earned you a commission',
      body:      `${enroller.full_name} closed an enrolment — ${money(amt)} credited to you.`,
      link:      '/dashboard/income',
    })
  }

  // The employer's cut of their employees' sales — a positive credit on top of any network
  // slice they already earn as an upline.
  for (const [employerId, credit] of remitCredit) {
    if (!(credit > 0)) continue
    await supabase.rpc('increment_partner_commission', {
      p_partner_id:      employerId,
      p_commission:      credit,
      p_count_enrolment: false,
    })
    notices.push({
      partnerId: employerId,
      kind:      'enrolment_commission',
      title:     '👥 Your team earned you a commission',
      body:      `An employee in your team closed a sale — ${money(credit)} credited to you.`,
      link:      '/dashboard/income',
    })
  }

  // Every ledger row is durable by now, so a slow or failing notification can no longer cost
  // anyone their commission.
  await Promise.all(notices.map(n => notifyPartner(n)))
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
  /**
   * True when the enrolment was unlocked by an NNWD distribution coupon. The seat was bought
   * wholesale and resold by a distributor, so oStaran's revenue was booked at the wholesale
   * purchase and there is no referral commission to pay on top. Crediting a cascade here
   * would pay twice for one seat and mis-attribute the learner to a referral partner who had
   * nothing to do with the sale.
   */
  isNnwdSeat:           boolean
  /**
   * True when the coupon lookup itself failed, so the channel could not be established.
   * Treated exactly like a wholesale seat for the cascade: withholding a commission is
   * recoverable by hand, whereas paying one on a wholesale seat is silent and irreversible.
   */
  channelUnknown:       boolean
  body:                 any
}) {
  const {
    supabase, enrolmentId, enrolmentSeq, email, name, mobile,
    courseId, courseName, amount, paymentId, orderId, today, now,
    normEnrolmentType, netTaxable, gstAmount,
    resolvedPartnerCode, resolvedPartnerId,
    partnerPoolPct, enrollerShare, upstreamShare,
    discountCode, isNnwdSeat, channelUnknown, body,
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
        .select('partner_code, partner_code_v2')
        .eq('id', finalPartnerId)
        .maybeSingle()
      if (partnerRow) finalPartnerCode = publicPartnerCode(partnerRow) || null
    } catch (e: any) {
      console.warn('[bg] partner_code lookup failed (non-fatal):', e.message)
    }
  }

  // A wholesale seat never pays a cascade — see isNnwdSeat above.
  if (isNnwdSeat && finalPartnerCode) {
    console.log(`[bg] Udaan seat ${enrolmentId} — wholesale, no commission cascade`)
  }
  if (channelUnknown && finalPartnerCode) {
    console.error(`[bg] enrolment ${enrolmentId} — channel undetermined, commission WITHHELD `
      + `pending manual review (partner ${finalPartnerCode})`)
  }

  if (finalPartnerCode && finalPartnerId && !isNnwdSeat && !channelUnknown) {
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
  // Only count the use if the code actually applies to this course: a
  // course-scoped code (course_id set) must match; null-scoped codes apply
  // everywhere. Prevents a scoped code from burning uses on the wrong course.
  //
  // Skipped for a Udaan seat: nnwd_claim_seat has already burned that coupon
  // (status → 'expired', uses_count → 1) as part of consuming the seat, so
  // incrementing again would leave uses_count = 2 on a max_uses = 1 code.
  if (discountCode && !isNnwdSeat) {
    try {
      const { data: dc } = await supabase
        .from('discount_codes')
        .select('course_id')
        .eq('code', discountCode.trim().toUpperCase())
        .maybeSingle()
      const appliesToCourse = !dc?.course_id || dc.course_id === courseId
      if (appliesToCourse) {
        await supabase.rpc('increment_discount_uses', { p_code: discountCode.trim().toUpperCase() })
      }
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


/**
 * Prove the payment actually happened before creating a paid enrolment.
 *
 * This endpoint mints an enrolment, can burn a distributor's seat and can fire a commission
 * cascade — and it had no authentication and never checked that `payment_id` was real. The
 * client did call /api/payments/verify-payment first, but that is a SEPARATE endpoint an
 * attacker simply skips.
 *
 * Three accepted proofs, cheapest first:
 *   1. razorpay_signature   — what Razorpay's own checkout handler returns to the browser.
 *   2. x-internal-signature — our webhook's HMAC; it has already verified Razorpay's webhook
 *                             signature before calling us.
 *   3. neither → ask Razorpay directly whether this payment exists and belongs to this order.
 *
 * Proof 3 is what makes this safe to ship in one go. A browser running a CACHED bundle from
 * before this change sends no signature; without the fallback it would be rejected after
 * paying. With it, the payment is simply verified the slow way.
 *
 * Amounts are deliberately NOT compared: orders can be USD/EUR while the enrolment records
 * INR, and a rounding or currency mismatch must never reject a real payment. Existence,
 * status and order linkage are what defeat forgery.
 */
async function verifyPaymentIsReal(args: {
  orderId: string; paymentId: string; signature: string | null; internalSig: string | null
}): Promise<{ ok: boolean; how: string; reason?: string }> {
  const { orderId, paymentId, signature, internalSig } = args

  if (signature) {
    return verifyPaymentSignature(orderId, paymentId, signature)
      ? { ok: true, how: 'razorpay_signature' }
      : { ok: false, how: 'razorpay_signature', reason: 'Payment signature did not verify.' }
  }

  if (internalSig) {
    return verifyInternalEnrolmentSignature(orderId, paymentId, internalSig)
      ? { ok: true, how: 'internal_signature' }
      : { ok: false, how: 'internal_signature', reason: 'Internal signature did not verify.' }
  }

  try {
    const payment: any = await getRazorpay().payments.fetch(paymentId)
    if (!payment || (payment.order_id && payment.order_id !== orderId)) {
      return { ok: false, how: 'lookup', reason: 'That payment does not belong to this order.' }
    }
    if (!['captured', 'authorized'].includes(String(payment.status))) {
      return { ok: false, how: 'lookup', reason: `Payment is ${payment.status}, not captured.` }
    }
    return { ok: true, how: 'lookup' }
  } catch (e: any) {
    const status = Number(e?.statusCode ?? e?.status ?? 0)

    // A 4xx is Razorpay ANSWERING us: no such payment, or it is not ours. That is a
    // definitive negative and must be rejected. The Razorpay SDK throws for this exactly as
    // it throws for a network failure, and treating the two alike is precisely how a forged
    // request with an invented payment id got through in testing.
    if (status >= 400 && status < 500) {
      return { ok: false, how: 'lookup', reason: 'That payment could not be found.' }
    }

    // No status, or 5xx: Razorpay is unreachable, or the keys are unset. We genuinely cannot
    // tell. Allowing is the lesser harm — rejecting during a Razorpay outage would strand a
    // learner who has actually paid — and it is the pre-existing behaviour, not a new hole.
    // Logged loudly so it is visible rather than silent.
    console.error(`[enrol] PAYMENT UNVERIFIED (lookup unavailable, status=${status || 'none'}: `
      + `${e?.message}) — allowing order=${orderId} payment=${paymentId}; review this enrolment`)
    return { ok: true, how: 'unverified_lookup_unavailable' }
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
      currency,               // INR | USD | EUR actually charged (display + invoice); INR math unchanged
      amount_charged,         // amount charged in `currency` (major units); defaults to INR `amount`
      fx_rate,                // INR per 1 unit of `currency` at purchase (snapshot); 1 for INR
      discount_code,
      partner_code,
      enrolment_type,
      guardian_name,
      guardian_email,
      guardian_consent,
    } = body

    if (!payment_id || !order_id || !course_id || !name || !email || !mobile || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const proof = await verifyPaymentIsReal({
      orderId:     String(order_id),
      paymentId:   String(payment_id),
      signature:   body?.razorpay_signature ? String(body.razorpay_signature) : null,
      internalSig: request.headers.get('x-internal-signature'),
    })
    if (!proof.ok) {
      console.error(`[enrol] REJECTED unverified payment (${proof.how}): `
        + `order=${order_id} payment=${payment_id}`)
      return NextResponse.json({ error: proof.reason ?? 'Payment could not be verified.' },
        { status: 401 })
    }

    const supabase = createServiceClient()
    const now      = new Date()
    const today    = now.toISOString().split('T')[0]

    // ── 0. Idempotency ────────────────────────────────────────────────────────
    // The client handler AND the Razorpay webhook can BOTH call this for one payment
    // (whichever fires first). Dedup on the Razorpay payment_id so a single payment
    // never creates two enrolment rows. Renewals use a distinct payment_id each time,
    // so they are unaffected.
    {
      const { data: dup } = await supabase
        .from('student_enrolments')
        .select('id')
        .eq('payment_reference', payment_id)
        .limit(1)
        .maybeSingle()
      if (dup) {
        return NextResponse.json({ success: true, enrolment_id: dup.id, duplicate: true })
      }
    }

    // ── 1. Fetch course pricing ───────────────────────────────────────────────
    const { data: course } = await supabase
      .from('awa_courses')
      .select('id, name, mrp, gst_percent, discount_percent, partner_pool_percent, enroller_share, upstream_share, tenure_type, audience_category')
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

    // Monthly-membership RENEWAL: if the student already has an enrolment for this
    // course with a chosen batch, carry that same batch onto the renewal row so it's
    // recognised as the same membership (no batch-less row, no re-pick a batch). Only
    // for monthly memberships — one-time courses keep the select-batch flow untouched.
    let carryBatchId: string | null = null
    if (isMonthlyMembership) {
      const { data: prior } = await supabase
        .from('student_enrolments')
        .select('batch_id')
        .eq('student_email', email.toLowerCase())
        .eq('course_id', course_id)
        .not('batch_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      carryBatchId = (prior?.batch_id as string | null) ?? null
    }
    const isRenewal = !!carryBatchId

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

    // ⚠ MONEY PATH. Resolved through partner_code_aliases so BOTH the old name-derived
    // code (still printed on collateral and stored in every historical utm_source) and the
    // new opaque code land on the same partner. Matching one column would leave
    // resolvedPartnerId null for half the traffic → commissionPct 0 → the partner is never
    // paid for that enrolment. resolvedPartnerCode itself is stored exactly as it arrived.
    const resolvedPartnerId: string | null = resolvedPartnerCode
      ? await resolvePartnerIdByCode(supabase, resolvedPartnerCode)
      : null

    // ── Which sales channel is this? ─────────────────────────────────────────
    // Read from the coupon record, never from the request body, so a learner cannot claim a
    // wholesale seat by passing a flag. Resolved HERE, above the commission maths, because a
    // Udaan seat must not be stamped with a commission that will never be paid.
    //
    // Validated the way create-order validates it. Without these checks an expired, spent or
    // wrong-course Udaan code still flipped the flag — silently killing a genuine referral
    // commission AND burning a live distributor seat the seller still owned.
    let isNnwdSeat     = false
    let channelUnknown = false
    if (discount_code) {
      const { data: dc, error: dcErr } = await supabase
        .from('discount_codes')
        .select('status, valid_from, valid_to, max_uses, uses_count, course_id, config')
        .eq('code', String(discount_code).trim().toUpperCase())
        .maybeSingle()

      if (dcErr) {
        // Fail CLOSED on money. We could not establish the channel, so neither credit a
        // cascade nor consume a seat — both are recoverable by hand, whereas a commission
        // paid on a wholesale seat is silent and leaves the coupon reusable.
        channelUnknown = true
        console.error('[enrol] channel lookup failed — commission withheld:', dcErr.message)
      } else if ((dc?.config as any)?.source === 'nnwd') {
        const nowIso = now.toISOString()
        isNnwdSeat =
          dc!.status === 'active' &&
          (!dc!.valid_from || nowIso >= dc!.valid_from) &&
          (!dc!.valid_to   || nowIso <= dc!.valid_to) &&
          (!dc!.max_uses   || (dc!.uses_count ?? 0) < dc!.max_uses) &&
          (!dc!.course_id  || dc!.course_id === course_id)
      }
    }

    // ── Minors: consent must be RECORDED, not assumed (DPDP s.9) ─────────────
    // PaymentModal blocks submission without it, but that is a browser check: the API
    // accepted and stored whatever it was handed, so a direct POST could enrol a 9-year-old
    // with guardian_consent_at null. audience_category was never read here at all.
    //
    // We WITHHOLD ACCESS rather than reject. Rejecting would orphan a payment that has
    // already succeeded — worst of all for the backup webhook path, which cannot forward the
    // guardian fields (they never reach create-order, so they are not in the Razorpay notes).
    // is_active = false is the gate the whole student dashboard already keys on, so the seat
    // exists and is paid for, but nothing opens until consent is on file and an admin
    // reactivates it.
    const isMinorAudience   = course?.audience_category === 'school'
    const hasGuardianConsent = guardian_consent === true
      && !!String(guardian_name ?? '').trim()
      && !!String(guardian_email ?? '').trim()
    const withholdForConsent = isMinorAudience && !hasGuardianConsent
    if (withholdForConsent) {
      console.error(`[enrol] minors course ${course_id} enrolled without recorded guardian `
        + `consent — access withheld pending review (${email})`)
    }

    // A wholesale seat earns nobody a referral commission — the distributor already took
    // their margin on resale. Zeroing it here keeps the enrolment ROW honest; the cascade
    // itself is skipped separately in the background block.
    const paysCommission   = !!resolvedPartnerId && !isNnwdSeat && !channelUnknown
    const commissionPct    = paysCommission ? partnerPoolPct : 0
    const commissionAmount = paysCommission ? Number((netTaxable * partnerPoolPct).toFixed(2)) : 0
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
    // isNnwdSeat is resolved above, before the commission maths — see "Which sales channel
    // is this?". It must not be recomputed here.
    const resolvedFullPrice  = Number(full_discounted_price ?? amount)
    // A wholesale seat is paid in full to the distributor before the coupon is even issued,
    // so nothing is outstanding here. Without this a membership-tenure course would book a
    // balance against a learner who has already paid the distributor in full.
    const resolvedBalanceDue = (normEnrolmentType === 'monthly' && !isNnwdSeat)
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
        amount_paid:        amount,                // first instalment only (INR — internal accounting)
        currency:           ((currency === 'USD' || currency === 'EUR') && Number(fx_rate) > 0) ? currency : 'INR',
        amount_charged:     Number.isFinite(Number(amount_charged)) ? Number(amount_charged) : amount,
        fx_rate:            Number(fx_rate) > 0 ? Number(fx_rate) : 1,
        balance_due:        resolvedBalanceDue,    // ₹0 for full pay, = amount for 50-50
        payment_mode:       'upi',
        payment_date:       today,
        payment_reference:  payment_id,
        commission_pct:     commissionPct,
        commission_amount:  commissionAmount,
        oi_amount:          oiAmount,
        is_active:          !withholdForConsent,
        enrolment_seq:      enrolmentSeq,
        enrolment_status:   'active',
        // Stamp the channel in the SAME insert that creates the row — not in a follow-up RPC
        // that is allowed to fail — so a wholesale enrolment is permanently distinguishable
        // from a referral one. This is the key the isolation check reconciles against:
        //   select * from student_enrolments e join commission_ledger c on c.enrolment_id = e.id
        //    where e.enrolment_source = 'udaan';   -- must always be empty
        // Referral enrolments are left to the column default ('self_paid'), so their
        // behaviour is byte-identical to before.
        ...(isNnwdSeat ? { enrolment_source: 'udaan' as const } : {}),
        batch_id:           carryBatchId,         // carried on a monthly renewal; null otherwise (select-batch sets it)
        access_start_date:  monthlyAccessStart,   // null for one-time courses (unchanged)
        access_end_date:    monthlyAccessEnd,     // null for one-time courses (unchanged)
        guardian_name:       guardian_name || null,
        guardian_email:      guardian_email ? String(guardian_email).toLowerCase() : null,
        guardian_consent_at: guardian_consent === true ? now.toISOString() : null,
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

    // ── Claim the distribution seat this coupon represents ────────────────────
    // Serialised inventory: the code identifies ONE unit, tracked since oStaran issued it.
    // The claim is a conditional UPDATE inside the database, so two simultaneous redemptions
    // cannot both win — exactly one sees a row and the other is refused. It also binds the
    // code to the learner's email, so a code forwarded to a friend does not work for them.
    //
    // Runs AFTER the enrolment insert because the claim records which enrolment consumed the
    // seat. If it loses (the code was already spent, or the emails differ) the learner has
    // still paid their Rs 1, so the enrolment stands and the conflict is written to
    // payment_recovery_log for a human rather than failing silently.
    if (isNnwdSeat) {
      try {
        const { data: claim } = await supabase.rpc('nnwd_claim_seat', {
          p_code: String(discount_code).trim().toUpperCase(),
          p_enrolment_id: enrolmentId,
          p_email: email.toLowerCase(),
        })
        if (!claim?.ok) {
          console.error(`[nnwd] seat claim refused for enrolment ${enrolmentId}: ${claim?.reason}`)
          await supabase.from('payment_recovery_log').insert({
            razorpay_payment_id: payment_id,
            razorpay_order_id:   order_id,
            student_email:       email.toLowerCase(),
            course_id,
            amount,
            failure_reason: `NNWD seat claim refused (${claim?.reason ?? 'unknown'}) for code ${discount_code}`,
          }).then(() => {}, () => {})
        }
      } catch (e: any) {
        console.error('[nnwd] seat claim errored (non-fatal):', e?.message)
      }
    }

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
      // Stamp the charged currency + FX snapshot onto the invoice row so the
      // student's dashboard invoice renders the currency actually charged. INR
      // orders keep the defaults (currency 'INR', fx_rate 1).
      if (currency === 'USD' || currency === 'EUR') {
        await supabase.from('payment_transactions')
          .update({
            currency,
            fx_rate:        Number(fx_rate) > 0 ? Number(fx_rate) : 1,
            amount_charged: Number.isFinite(Number(amount_charged)) ? Number(amount_charged) : amount,
          })
          .eq('enrolment_id', enrolmentId)
      }
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
      isNnwdSeat,
      channelUnknown,
      body,
    })

    // Broadcast funnel: attribute this enrolment if it came via a cold-email click.
    await attributeBroadcast(request.cookies.get('ost_bk')?.value, 'enrolled', email.toLowerCase())

    return NextResponse.json({
      success:      true,
      enrolment_id: enrolmentId,
      partner_code: resolvedPartnerCode ?? null,
      partner_id:   resolvedPartnerId ?? null,
      renewed:      isRenewal,          // true → membership renewal (client skips select-batch)
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
