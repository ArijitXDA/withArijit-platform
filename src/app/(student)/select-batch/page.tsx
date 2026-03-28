import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import SelectBatchClient from './SelectBatchClient'

export default async function SelectBatchPage({
  searchParams,
}: {
  searchParams: Promise<{ course_id?: string; enrolment_id?: string }>
}) {
  const { course_id, enrolment_id } = await searchParams

  // Must be authenticated
  const supabase   = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const service = createServiceClient()

  // If no course_id, try to get it from the student's latest enrolment
  let resolvedCourseId = course_id
  let resolvedEnrolmentId = enrolment_id

  if (!resolvedCourseId) {
    const { data: latest } = await service
      .from('student_enrolments')
      .select('id, course_id')
      .eq('student_email', user.email!)
      .is('batch_id', null)         // hasn't picked a batch yet
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latest) {
      resolvedCourseId    = latest.course_id
      resolvedEnrolmentId = resolvedEnrolmentId ?? latest.id
    }
  }

  // If student already has a batch for this enrolment → go to dashboard
  if (resolvedEnrolmentId) {
    const { data: existing } = await service
      .from('student_batch_selections')
      .select('id')
      .eq('enrolment_id', resolvedEnrolmentId)
      .maybeSingle()
    if (existing) {
      // Check if there are other enrolments still pending batch selection
      const { data: otherPending } = await service
        .from('student_enrolments')
        .select('id, course_id')
        .eq('student_email', user.email!)
        .eq('is_active', true)
        .is('batch_id', null)
        .neq('id', resolvedEnrolmentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (otherPending) {
        // Redirect to select batch for the next pending enrolment
        redirect(`/select-batch?course_id=${otherPending.course_id}&enrolment_id=${otherPending.id}`)
      }
      redirect('/dashboard')
    }
  }

  // Fetch course info
  const { data: course } = resolvedCourseId
    ? await service
        .from('awa_courses')
        .select('id, name, short_name, total_sessions, session_duration_mins')
        .eq('id', resolvedCourseId)
        .single()
    : { data: null }

  // Fetch available batches for this course
  const { data: batches } = resolvedCourseId
    ? await service
        .from('awa_batches')
        .select('id, batch_code, label, day_of_week, start_time, start_date, max_seats, seats_filled, notes, is_open')
        .eq('course_id', resolvedCourseId)
        .eq('is_active', true)
        .order('sort_order')
    : { data: [] }

  if (!course || !batches || batches.length === 0) {
    redirect('/dashboard')
  }

  // Count how many enrolments still need batch selection
  const { count: pendingCount } = await service
    .from('student_enrolments')
    .select('*', { count: 'exact', head: true })
    .eq('student_email', user.email!)
    .eq('is_active', true)
    .is('batch_id', null)

  return (
    <SelectBatchClient
      course={course}
      batches={batches}
      enrolmentId={resolvedEnrolmentId ?? null}
      studentEmail={user.email!}
      pendingCount={pendingCount ?? 1}
    />
  )
}
