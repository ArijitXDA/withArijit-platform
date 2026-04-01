import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import SelectBatchClient from './SelectBatchClient'

// ── Shared-content course group ───────────────────────────────────────────────
// These 6 courses all teach the same curriculum and share the same batches.
// When a student enrolled in ANY of these selects a batch, show ALL timeslots
// across the entire group. The course name displayed stays what they enrolled for.
const SHARED_CONTENT_SLUGS = [
  'ai-mastery-for-working-professionals',
  'ai-mastery-for-leaders',
  'ai-mastery-for-entrepreneurs',
  'ai-mastery-for-students',
  'ai-mastery-for-homemakers',
  'ai-mastery-programme',
]

export default async function SelectBatchPage({
  searchParams,
}: {
  searchParams: Promise<{ course_id?: string; enrolment_id?: string }>
}) {
  const { course_id, enrolment_id } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const service = createServiceClient()

  // Resolve course_id + enrolment_id if not in URL
  let resolvedCourseId    = course_id
  let resolvedEnrolmentId = enrolment_id

  if (!resolvedCourseId) {
    const { data: latest } = await service
      .from('student_enrolments')
      .select('id, course_id')
      .eq('student_email', user.email!)
      .is('batch_id', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latest) {
      resolvedCourseId    = latest.course_id
      resolvedEnrolmentId = resolvedEnrolmentId ?? latest.id
    }
  }

  // If already has a batch for this enrolment → check for other pending or go to dashboard
  if (resolvedEnrolmentId) {
    const { data: existing } = await service
      .from('student_batch_selections')
      .select('id')
      .eq('enrolment_id', resolvedEnrolmentId)
      .maybeSingle()

    if (existing) {
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
        redirect(`/select-batch?course_id=${otherPending.course_id}&enrolment_id=${otherPending.id}`)
      }
      redirect('/dashboard')
    }
  }

  // Fetch the enrolled course (for display name)
  const { data: course } = resolvedCourseId
    ? await service
        .from('awa_courses')
        .select('id, name, short_name, slug, total_sessions, session_duration_mins')
        .eq('id', resolvedCourseId)
        .single()
    : { data: null }

  if (!course) redirect('/dashboard')

  // ── Determine which course IDs to show batches for ────────────────────────
  // If the enrolled course is in the shared-content group, show ALL batches
  // from ALL courses in that group. Otherwise show only this course's batches.
  let batchCourseIds: string[] = [resolvedCourseId!]
  let isSharedGroup = false

  if (course.slug && SHARED_CONTENT_SLUGS.includes(course.slug)) {
    isSharedGroup = true
    // Fetch all course IDs in the shared group
    const { data: groupCourses } = await service
      .from('awa_courses')
      .select('id, slug')
      .in('slug', SHARED_CONTENT_SLUGS)
      .eq('is_active', true)

    if (groupCourses && groupCourses.length > 0) {
      batchCourseIds = groupCourses.map((c: any) => c.id)
    }
  }

  // Fetch batches for the resolved course ID set
  const { data: batches } = await service
    .from('awa_batches')
    .select('id, batch_code, label, day_of_week, start_time, start_date, max_seats, seats_filled, notes, is_open, course_id')
    .in('course_id', batchCourseIds)
    .eq('is_active', true)
    .order('sort_order')

  if (!batches || batches.length === 0) redirect('/dashboard')

  // Count pending batch selections
  const { count: pendingCount } = await service
    .from('student_enrolments')
    .select('*', { count: 'exact', head: true })
    .eq('student_email', user.email!)
    .eq('is_active', true)
    .is('batch_id', null)

  return (
    <SelectBatchClient
      course={course as any}
      batches={batches as any}
      enrolmentId={resolvedEnrolmentId ?? null}
      studentEmail={user.email!}
      pendingCount={pendingCount ?? 1}
      isSharedGroup={isSharedGroup}
    />
  )
}
