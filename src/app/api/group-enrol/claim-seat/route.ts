import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient }        from '@/lib/supabase/server'

// ── POST /api/group-enrol/claim-seat ─────────────────────────────────────────
// Called from ActivateClient once the invitee is signed in.
// 1. Verifies the signed-in user's email matches the seat's invitee_email
// 2. Creates student_enrolments row (enrolment_source = 'group')
// 3. If batch pre-selected → writes batch_id and increments seats_filled
// 4. Marks seat as enrolled
// 5. Updates group_enrolments.seats_claimed
// 6. Sends welcome email to invitee
// 7. Optionally fires student_master_table update

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 })

    // ── 1. Verify authenticated user ─────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const service = createServiceClient()

    // ── 2. Fetch and validate seat ────────────────────────────────────────────
    const { data: seat, error: seatErr } = await service
      .from('group_enrolment_seats')
      .select('id, invitee_name, invitee_email, invitee_mobile, status, invite_claimed_at, invite_expires_at, group_enrolment_id, enrolment_id')
      .eq('invite_token', token)
      .single()

    if (seatErr || !seat)
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 })

    if (seat.invite_claimed_at || seat.status === 'enrolled')
      return NextResponse.json({ error: 'This seat has already been activated' }, { status: 400 })

    if (seat.invite_expires_at && new Date(seat.invite_expires_at) < new Date())
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 })

    // ── 3. Email ownership check ──────────────────────────────────────────────
    if (user.email.toLowerCase() !== seat.invitee_email.toLowerCase())
      return NextResponse.json({
        error: `This invitation is for ${seat.invitee_email}. Please sign in with that email address.`,
      }, { status: 403 })

    // ── 4. Fetch parent group enrolment ───────────────────────────────────────
    const { data: ge } = await service
      .from('group_enrolments')
      .select('id, course_id, course_name, batch_id, purchaser_name, organization_name, seats_claimed, quantity')
      .eq('id', seat.group_enrolment_id)
      .single()

    if (!ge) return NextResponse.json({ error: 'Group enrolment not found' }, { status: 404 })

    // ── 5. Check if already enrolled in this course (duplicate guard) ─────────
    const { data: existingEnrolment } = await service
      .from('student_enrolments')
      .select('id')
      .eq('student_email', user.email.toLowerCase())
      .eq('course_id', ge.course_id)
      .eq('is_active', true)
      .maybeSingle()

    // If already enrolled in same course, still mark seat — just link to existing enrolment
    let enrolmentId: string

    if (existingEnrolment) {
      enrolmentId = existingEnrolment.id
    } else {
      // ── 6. Create student_enrolments row ──────────────────────────────────
      const { data: enrolment, error: enrolErr } = await service
        .from('student_enrolments')
        .insert({
          student_name:       seat.invitee_name,
          student_email:      user.email.toLowerCase(),
          student_mobile:     seat.invitee_mobile ?? '',
          course_id:          ge.course_id,
          course_name:        ge.course_name,
          enrolment_source:   'group',
          group_enrolment_id: ge.id,
          enrolment_type:     'full_course',
          mrp:                0,             // purchaser paid — not invitee
          amount_paid:        0,
          discount_pct:       1,             // effectively 100% discount for the invitee
          discount_amount:    0,
          net_after_discount: 0,
          gst_pct:            0.18,
          gst_amount:         0,
          net_taxable:        0,
          commission_pct:     0,             // no commission on group enrolments
          commission_amount:  0,
          oi_amount:          0,
          payment_mode:       'group_enrolment',
          payment_date:       new Date().toISOString().split('T')[0],
          payment_reference:  `group_${ge.id}`,
          batch_id:           ge.batch_id ?? null,
          is_active:          true,
          enrolment_status:   'active',
          balance_due:        0,
        })
        .select('id')
        .single()

      if (enrolErr)
        return NextResponse.json({ error: `Failed to create enrolment: ${enrolErr.message}` }, { status: 500 })

      enrolmentId = enrolment.id
    }

    // ── 7. If batch pre-selected, increment batch seats_filled ───────────────
    if (ge.batch_id) {
      try {
        const { data: batchRow } = await service
          .from('awa_batches')
          .select('seats_filled')
          .eq('id', ge.batch_id)
          .single()
        if (batchRow) {
          await service
            .from('awa_batches')
            .update({ seats_filled: (batchRow.seats_filled ?? 0) + 1 })
            .eq('id', ge.batch_id)
        }
      } catch (e: any) {
        console.warn('[claim-seat] batch seats_filled increment failed (non-fatal):', e.message)
      }
    }

    // ── 8. Mark seat as enrolled ─────────────────────────────────────────────
    await service
      .from('group_enrolment_seats')
      .update({
        status:             'enrolled',
        invite_claimed_at:  new Date().toISOString(),
        student_user_id:    user.id,
        enrolment_id:       enrolmentId,
      })
      .eq('id', seat.id)

    // ── 9. Update seats_claimed on parent ─────────────────────────────────────
    await service
      .from('group_enrolments')
      .update({ seats_claimed: (ge.seats_claimed ?? 0) + 1 })
      .eq('id', ge.id)

    // ── 10. Background: student_master_table + welcome email ──────────────────
    void runBackground({ service, seat, ge, enrolmentId, userEmail: user.email })

    return NextResponse.json({
      success:            true,
      enrolment_id:       enrolmentId,
      batch_pre_selected: !!ge.batch_id,
    })

  } catch (err: any) {
    console.error('[group-enrol/claim-seat]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── Background work ────────────────────────────────────────────────────────────
async function runBackground(params: {
  service:     ReturnType<typeof createServiceClient>
  seat:        any
  ge:          any
  enrolmentId: string
  userEmail:   string
}) {
  const { service, seat, ge, enrolmentId, userEmail } = params

  // student_master_table
  try {
    const { data: existing } = await service
      .from('student_master_table')
      .select('id')
      .eq('email', userEmail.toLowerCase())
      .maybeSingle()

    if (!existing) {
      await service.from('student_master_table').insert({
        student_name:         seat.invitee_name,
        email:                userEmail.toLowerCase(),
        mobile:               seat.invitee_mobile ?? '',
        current_course_name:  ge.course_name,
        referred_by:          'GROUP_ENROLMENT',
        total_payments_count: 0,
        total_amount_paid:    0,
        enrollment_date:      new Date().toISOString(),
      })
    }
  } catch (e: any) {
    console.warn('[claim-seat bg] student_master_table:', e.message)
  }

  // Welcome email
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.ostaran.com'
    const gifter = ge.organization_name ?? ge.purchaser_name
    const html   = `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f6f8;margin:0;padding:24px 0;">
<table width="600" cellpadding="0" cellspacing="0"
  style="background:#fff;border-radius:8px;padding:32px;margin:0 auto;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
<tr><td>
  <div style="background:#000;padding:4px 12px;border-radius:6px;display:inline-block;margin-bottom:24px;">
    <img src="https://www.ostaran.com/ostaran-logo.png" alt="oStaran" style="height:32px;display:block;" />
  </div>
</td></tr>
<tr><td style="font-size:22px;font-weight:bold;color:#111827;padding-bottom:12px;">
  Welcome to oStaran, ${seat.invitee_name.split(' ')[0]}! 🎉
</td></tr>
<tr><td style="font-size:14px;color:#374151;line-height:1.8;padding-bottom:20px;">
  Your seat in <strong>${ge.course_name}</strong> — enrolled by <strong>${gifter}</strong> —
  has been successfully activated.<br/><br/>
  Head to your dashboard to access your course, sessions, and resources.
</td></tr>
<tr><td style="padding-bottom:24px;">
  <a href="${appUrl}/dashboard"
    style="display:inline-block;padding:13px 28px;background:#4f46e5;color:#fff;
           border-radius:8px;font-weight:bold;font-size:14px;text-decoration:none;">
    Go to My Dashboard →
  </a>
</td></tr>
<tr><td style="font-size:13px;color:#6b7280;padding-top:20px;border-top:1px solid #e5e7eb;">
  Star Analytix Pvt Ltd · Mira Road East, Mumbai ·
  <a href="mailto:ai@ostaran.com" style="color:#4f46e5;">ai@ostaran.com</a>
</td></tr>
</table>
</body></html>`

    await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'oStaran AI Education <ai@ostaran.com>',
        to:      [userEmail],
        subject: `✅ You're enrolled in ${ge.course_name} — Welcome to oStaran!`,
        html,
      }),
    })
  } catch (e: any) {
    console.warn('[claim-seat bg] welcome email:', e.message)
  }
}
