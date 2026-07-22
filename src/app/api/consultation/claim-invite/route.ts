import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { todayISO } from '@/lib/sessionSchedule'

// POST /api/consultation/claim-invite — an invited attendee, once signed in, claims their
// seat: a zero-amount enrolment is created on the same consultation batch so they see the
// sessions + recordings. Email-ownership checked against the invite. Idempotent per invite.

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json().catch(() => ({}))
    if (!token) return NextResponse.json({ error: 'Missing invite token.' }, { status: 400 })

    // Signed-in user.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return NextResponse.json({ error: 'Please sign in to accept your seat.' }, { status: 401 })
    const email = user.email.toLowerCase()

    const svc = createServiceClient()

    const { data: invite } = await svc
      .from('consultation_invites')
      .select('id, order_id, invitee_email, invitee_name, status')
      .eq('invite_token', token)
      .maybeSingle()
    if (!invite) return NextResponse.json({ error: 'Invalid invitation.' }, { status: 404 })
    if (invite.status === 'claimed') return NextResponse.json({ success: true, already: true })

    if (email !== String(invite.invitee_email).toLowerCase()) {
      return NextResponse.json(
        { error: `This invitation is for ${invite.invitee_email}. Please sign in with that email.` },
        { status: 403 },
      )
    }

    const { data: order } = await svc
      .from('consultation_orders')
      .select('id, batch_id, status')
      .eq('id', invite.order_id)
      .maybeSingle()
    if (!order) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    if (!order.batch_id) {
      return NextResponse.json(
        { error: 'The organiser has not scheduled the sessions yet. You will get access once they do.' },
        { status: 409 },
      )
    }

    const { data: course } = await svc
      .from('awa_courses')
      .select('id, name')
      .eq('slug', 'expert-consultation')
      .maybeSingle()
    if (!course) return NextResponse.json({ error: 'Consultation product missing.' }, { status: 500 })

    // Atomic claim latch: flip 'invited' → 'claimed' first, so concurrent double-clicks can't
    // both create a zero-amount enrolment. Only the request that wins the flip enrols.
    const { data: latch } = await svc
      .from('consultation_invites')
      .update({ status: 'claimed', claimed_at: new Date().toISOString() })
      .eq('id', invite.id)
      .eq('status', 'invited')
      .select('id')
      .maybeSingle()
    if (!latch) return NextResponse.json({ success: true, already: true })

    // Already enrolled in the consultation course? Link to it; else create a zero-amount seat.
    let enrolmentId: string
    const { data: existing } = await svc
      .from('student_enrolments')
      .select('id')
      .eq('student_email', email)
      .eq('course_id', course.id)
      .eq('batch_id', order.batch_id)
      .maybeSingle()

    if (existing) {
      enrolmentId = existing.id
    } else {
      const { count } = await svc
        .from('student_enrolments')
        .select('*', { count: 'exact', head: true })
        .eq('student_email', email)
        .eq('course_id', course.id)
      const { data: enrol, error: enrolErr } = await svc
        .from('student_enrolments')
        .insert({
          partner_id: null,
          student_name: invite.invitee_name ?? email.split('@')[0],
          student_email: email,
          student_mobile: '',
          course_name: course.name,
          course_id: course.id,
          enrolment_type: 'full_course',
          mrp: 0,
          discount_pct: 0,
          discount_amount: 0,
          net_after_discount: 0,
          gst_pct: 0,
          gst_amount: 0,
          net_taxable: 0,
          amount_paid: 0,
          currency: 'USD',
          amount_charged: 0,
          fx_rate: 1,
          balance_due: 0,
          payment_mode: 'group_invite',
          payment_date: todayISO(),
          commission_pct: 0,
          commission_amount: 0,
          oi_amount: 0,
          is_active: true,
          enrolment_seq: (count ?? 0) + 1,
          enrolment_status: 'active',
          batch_id: order.batch_id,
        })
        .select('id')
        .single()
      if (enrolErr || !enrol) {
        console.error('[consultation claim-invite] enrolment failed:', enrolErr?.message)
        // Release the latch so the invitee can retry.
        await svc
          .from('consultation_invites')
          .update({ status: 'invited', claimed_at: null })
          .eq('id', invite.id)
        return NextResponse.json({ error: 'Could not activate your seat. Please try again.' }, { status: 500 })
      }
      enrolmentId = enrol.id
    }

    // Status was already flipped by the latch above; just record the enrolment.
    await svc.from('consultation_invites').update({ enrolment_id: enrolmentId }).eq('id', invite.id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[consultation claim-invite]', err?.message)
    return NextResponse.json({ error: 'Could not activate your seat. Please contact support.' }, { status: 500 })
  }
}
