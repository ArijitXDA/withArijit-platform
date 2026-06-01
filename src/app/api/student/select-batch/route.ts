import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { batch_id, course_id, enrolment_id } = await req.json()
  if (!batch_id || !course_id) {
    return NextResponse.json({ error: 'batch_id and course_id are required' }, { status: 400 })
  }

  const service = createServiceClient()

  // Verify batch exists and has seats
  const { data: batch } = await service
    .from('awa_batches')
    .select('id, is_open, seats_filled, max_seats, start_date, end_date, variant')
    .eq('id', batch_id)
    .single()

  if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
  if (!batch.is_open || batch.seats_filled >= batch.max_seats) {
    return NextResponse.json({ error: 'This batch is full. Please choose another.' }, { status: 400 })
  }

  // The chosen batch defines the student's access window — stamp it onto the
  // enrolment so the dashboard, certificate timing, and comms all agree.
  // Rolling (monthly-membership) cohorts have no fixed end_date: access runs for a
  // rolling 30 days from today (enrol stamped it; we keep it consistent here and
  // never clobber it with the batch's null end_date).
  let accessDates: { access_start_date: string | null; access_end_date: string | null }
  if (batch.variant === 'rolling') {
    const today = new Date()
    const end   = new Date(today); end.setDate(end.getDate() + 30)
    accessDates = {
      access_start_date: today.toISOString().split('T')[0],
      access_end_date:   end.toISOString().split('T')[0],
    }
  } else {
    accessDates = {
      access_start_date: batch.start_date ?? null,
      access_end_date:   batch.end_date ?? null,
    }
  }

  // Resolve enrolment_id — find the specific enrolment that doesn't have a batch yet
  let resolvedEnrolmentId = enrolment_id ?? null

  if (!resolvedEnrolmentId) {
    const { data: latestEnrolment } = await service
      .from('student_enrolments')
      .select('id')
      .eq('student_email', user.email!)
      .eq('course_id', course_id)
      .eq('is_active', true)
      .is('batch_id', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    resolvedEnrolmentId = latestEnrolment?.id ?? null
  }

  // Idempotency — keyed on enrolment_id (each enrolment gets exactly one batch)
  // This correctly allows same student to have multiple selections for same course
  // as long as each one is a different enrolment
  if (resolvedEnrolmentId) {
    const { data: existing } = await service
      .from('student_batch_selections')
      .select('id')
      .eq('enrolment_id', resolvedEnrolmentId)
      .maybeSingle()

    if (existing) {
      // Already selected for this enrolment — just ensure enrolment.batch_id is set
      await service
        .from('student_enrolments')
        .update({ batch_id, ...accessDates, updated_at: new Date().toISOString() })
        .eq('id', resolvedEnrolmentId)
        .is('batch_id', null)
      return NextResponse.json({ success: true, already_selected: true })
    }
  }

  // Insert new batch selection
  await service.from('student_batch_selections').insert({
    student_email:  user.email!,
    batch_id,
    course_id,
    enrolment_id:   resolvedEnrolmentId,
  })

  // Update student_enrolments.batch_id
  if (resolvedEnrolmentId) {
    await service
      .from('student_enrolments')
      .update({ batch_id, ...accessDates, updated_at: new Date().toISOString() })
      .eq('id', resolvedEnrolmentId)
  } else {
    // Fallback: update the most recent enrolment for this course without a batch
    await service
      .from('student_enrolments')
      .update({ batch_id, ...accessDates, updated_at: new Date().toISOString() })
      .eq('student_email', user.email!)
      .eq('course_id', course_id)
      .is('batch_id', null)
      .order('created_at', { ascending: false })
  }

  // Increment seats filled
  await service.rpc('increment_batch_seats', { p_batch_id: batch_id })

  // ── Fire batch_confirmed comms (non-blocking) ────────────────────────────
  if (resolvedEnrolmentId) {
    const { sendStudentComm } = await import('@/lib/comms')
    sendStudentComm({
      event_type:   'batch_confirmed',
      enrolment_id: resolvedEnrolmentId,
      triggered_by: 'system',
    }).catch(e => console.warn('[comms] batch_confirmed failed (non-fatal):', e?.message))
  }

  return NextResponse.json({ success: true })
}
