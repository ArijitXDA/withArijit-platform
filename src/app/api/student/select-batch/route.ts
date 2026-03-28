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
    .select('id, is_open, seats_filled, max_seats')
    .eq('id', batch_id)
    .single()

  if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
  if (!batch.is_open || batch.seats_filled >= batch.max_seats) {
    return NextResponse.json({ error: 'This batch is full. Please choose another.' }, { status: 400 })
  }

  // Resolve enrolment_id — if not passed, find the latest active enrolment
  // for this student + course that doesn't have a batch yet
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

  // Idempotency — don't double-insert for same student + course
  const { data: existing } = await service
    .from('student_batch_selections')
    .select('id')
    .eq('student_email', user.email!)
    .eq('course_id', course_id)
    .maybeSingle()

  if (!existing) {
    await service.from('student_batch_selections').insert({
      student_email:  user.email!,
      batch_id,
      course_id,
      enrolment_id:   resolvedEnrolmentId,
    })

    // Always update student_enrolments.batch_id — whether enrolment_id was
    // passed in, or auto-resolved above
    if (resolvedEnrolmentId) {
      await service
        .from('student_enrolments')
        .update({ batch_id, updated_at: new Date().toISOString() })
        .eq('id', resolvedEnrolmentId)
    } else {
      // Fallback: update by email + course_id (no batch set yet)
      await service
        .from('student_enrolments')
        .update({ batch_id, updated_at: new Date().toISOString() })
        .eq('student_email', user.email!)
        .eq('course_id', course_id)
        .is('batch_id', null)
    }

    // Increment seats filled
    await service.rpc('increment_batch_seats', { p_batch_id: batch_id })
  } else {
    // Already selected — but batch_id on enrolment may still be null, fix it
    if (resolvedEnrolmentId) {
      await service
        .from('student_enrolments')
        .update({ batch_id, updated_at: new Date().toISOString() })
        .eq('id', resolvedEnrolmentId)
        .is('batch_id', null)
    }
  }

  return NextResponse.json({ success: true })
}
