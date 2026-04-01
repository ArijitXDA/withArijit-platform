import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import CoursesClient from './CoursesClient'

// ── Generate 26 weekly session dates from batch start ─────────────────────────
// Sessions happen every week on the batch's day_of_week, starting from start_date.
// We compute dates purely from awa_batches data — no external session table needed.
function generateSessionSchedule(batch: {
  start_date: string | null
  day_of_week: string
  start_time: string
  duration_mins: number
}, totalSessions = 26) {
  if (!batch.start_date) return []

  const sessions = []
  const startDate = new Date(batch.start_date + 'T00:00:00')

  for (let i = 0; i < totalSessions; i++) {
    const sessionDate = new Date(startDate)
    sessionDate.setDate(startDate.getDate() + i * 7)

    sessions.push({
      session_number: i + 1,
      session_date:   sessionDate.toISOString().split('T')[0],  // YYYY-MM-DD
      session_start_time: batch.start_time,
      duration_mins:  batch.duration_mins,
      // These are null until admin pastes them into the session record
      session_title:         null as string | null,
      session_link:          null as string | null,  // recording link (past sessions)
      study_material_link:   null as string | null,
      meeting_link:          null as string | null,  // live join link (upcoming)
    })
  }

  return sessions
}

export default async function CoursesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const service = createServiceClient()
  const email   = user.email!

  // All enrolments with course + batch details
  const { data: rawEnrolments } = await service
    .from('student_enrolments')
    .select(`
      id, created_at, enrolment_type, amount_paid, is_active,
      payment_date, enrolment_seq,
      course:course_id(id, name, short_name, description, total_sessions, session_duration_mins, slug, subjects),
      batch:batch_id(id, label, day_of_week, start_time, start_date, meeting_link, instructor_name)
    `)
    .eq('student_email', email)
    .order('created_at', { ascending: false })

  // Generate session schedule mathematically from batch data — no external table
  const enrolments = (rawEnrolments ?? []).map((e: any) => {
    const batch = e.batch
    const totalSessions = e.course?.total_sessions ?? 26

    const sessions = batch
      ? generateSessionSchedule({
          start_date:   batch.start_date,
          day_of_week:  batch.day_of_week,
          start_time:   batch.start_time,
          duration_mins: batch.duration_mins ?? 60,
        }, totalSessions)
      : []

    return { ...e, sessions }
  })

  // Legacy fallback
  const { data: legacyUser } = await service
    .from('users')
    .select('name, course_name, batch_day_time, start_date')
    .eq('email', email)
    .maybeSingle()

  // Cross-sell: courses the student is NOT yet enrolled in
  const enrolledCourseIds = (rawEnrolments ?? [])
    .map((e: any) => e.course_id)
    .filter(Boolean)

  const { data: allCourses } = await service
    .from('awa_courses')
    .select('id, name, short_name, description, mrp, slug, student_registration_url, is_featured, subjects, target_audience')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true })

  const unenrolledCourses = (allCourses ?? []).filter(
    (c: any) => !enrolledCourseIds.includes(c.id)
  )

  return (
    <CoursesClient
      enrolments={enrolments as any}
      legacyUser={legacyUser as any}
      unenrolledCourses={unenrolledCourses as any}
    />
  )
}
