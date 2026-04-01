import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import CoursesClient from './CoursesClient'

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
      batch:batch_id(id, label, day_of_week, start_time, start_date, meeting_link, instructor_name, batch_id_legacy:batch_code)
    `)
    .eq('student_email', email)
    .order('created_at', { ascending: false })

  // For each enrolment fetch sessions from session_master_table (batch_id is legacy batch_code text)
  const enrolments = await Promise.all(
    (rawEnrolments ?? []).map(async (e: any) => {
      const batchCode = e.batch?.batch_id_legacy ?? null
      let sessions: any[] = []

      if (batchCode) {
        const { data: sess } = await service
          .from('session_master_table')
          .select('session_id, session_title, session_date, session_start_time, session_link, study_material_link, session_description')
          .eq('batch_id', batchCode)
          .order('session_date', { ascending: true })
        sessions = sess ?? []
      }

      return { ...e, sessions }
    })
  )

  // Legacy fallback
  const { data: legacyUser } = await service
    .from('users')
    .select('name, course_name, batch_day_time, start_date')
    .eq('email', email)
    .maybeSingle()

  // ── Cross-sell: fetch courses the student is NOT yet enrolled in ──────────
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
