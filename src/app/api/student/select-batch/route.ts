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

  // Idempotency — don't double-insert
  const { data: existing } = await service
    .from('student_batch_selections')
    .select('id')
    .eq('student_email', user.email!)
    .eq('course_id', course_id)
    .maybeSingle()

  if (!existing) {
    await service.from('student_batch_selections').insert({
      student_email: user.email!,
      batch_id,
      course_id,
      enrolment_id: enrolment_id ?? null,
    })

    // Update student_enrolments with batch_id
    if (enrolment_id) {
      await service
        .from('student_enrolments')
        .update({ batch_id })
        .eq('id', enrolment_id)
    }

    // Increment seats filled
    await service.rpc('increment_batch_seats', { p_batch_id: batch_id })
  }

  return NextResponse.json({ success: true })
}
