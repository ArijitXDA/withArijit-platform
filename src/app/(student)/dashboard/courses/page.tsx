import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import CoursesClient from './CoursesClient'

// ── Generate 26 weekly session dates from batch start ─────────────────────────
// Each session is 1 week after the previous, starting from batch.start_date.
// Real links (recording, materials, meeting) are overlaid from awa_session_links.
function generateSessionSchedule(
  batch: { start_date: string | null; start_time: string; duration_mins: number },
  savedLinks: Record<number, any>,
  totalSessions = 26,
) {
  if (!batch.start_date) return []

  return Array.from({ length: totalSessions }, (_, i) => {
    const d = new Date(batch.start_date! + 'T00:00:00')
    d.setDate(d.getDate() + i * 7)
    const saved = savedLinks[i + 1] ?? {}
    return {
      session_number:      i + 1,
      session_date:        d.toISOString().split('T')[0],
      session_start_time:  batch.start_time,
      duration_mins:       batch.duration_mins,
      // Overlay from awa_session_links — null until admin pastes them
      session_title:       (saved.session_title       || null) as string | null,
      session_link:        (saved.recording_link      || null) as string | null,
      study_material_link: (saved.study_material_link || null) as string | null,
      meeting_link:        (saved.meeting_link        || null) as string | null,
    }
  })
}

export default async function CoursesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const service = createServiceClient()
  const email   = user.email!

  // Enrolments with course + batch details
  const { data: rawEnrolments } = await service
    .from('student_enrolments')
    .select(`
      id, created_at, enrolment_type, amount_paid, is_active,
      payment_date, enrolment_seq,
      course:course_id(id, name, short_name, description, total_sessions, session_duration_mins, slug, subjects),
      batch:batch_id(id, label, day_of_week, start_time, start_date, end_date, meeting_link, instructor_name, duration_mins, variant, total_sessions)
    `)
    .eq('student_email', email)
    .order('created_at', { ascending: false })

  // Collect all unique batch IDs that have a start_date (needed for session generation)
  const batchIds = [
    ...new Set(
      (rawEnrolments ?? [])
        .map((e: any) => e.batch?.id)
        .filter(Boolean)
    )
  ]

  // Fetch all saved session links for these batches in one query
  const savedLinksMap: Record<string, Record<number, any>> = {}
  if (batchIds.length > 0) {
    const { data: linkRows } = await service
      .from('awa_session_links')
      .select('batch_id, session_number, session_title, recording_link, study_material_link, meeting_link')
      .in('batch_id', batchIds)
    for (const row of linkRows ?? []) {
      if (!savedLinksMap[row.batch_id]) savedLinksMap[row.batch_id] = {}
      savedLinksMap[row.batch_id][row.session_number] = row
    }
  }

  // Build enrolments with computed + overlaid session schedule
  const enrolments = (rawEnrolments ?? []).map((e: any) => {
    const batch      = e.batch
    const batchLinks = batch ? (savedLinksMap[batch.id] ?? {}) : {}

    // Per-batch session count is authoritative — 9 for a weekend9 batch, 26 for
    // long26 — falling back to the course-level long-format reference.
    // Rolling (monthly membership) has no fixed count: show past sessions + the
    // next upcoming one (plus any session a link already exists for).
    let totalSessions = batch?.total_sessions ?? e.course?.total_sessions ?? 26
    if (batch?.variant === 'rolling' && batch.start_date) {
      const startMs      = new Date(batch.start_date + 'T00:00:00').getTime()
      const todayMs      = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00').getTime()
      const weeksElapsed = Math.max(0, Math.floor((todayMs - startMs) / (7 * 86400000)))
      const linkNums     = Object.keys(batchLinks).map(Number)
      const highestLink  = linkNums.length ? Math.max(...linkNums) : 0
      totalSessions      = Math.max(weeksElapsed + 1, highestLink, 1)
    }

    const sessions = batch
      ? generateSessionSchedule(
          { start_date: batch.start_date, start_time: batch.start_time, duration_mins: batch.duration_mins ?? 60 },
          batchLinks,
          totalSessions,
        )
      : []

    return { ...e, sessions }
  })

  // Legacy fallback
  const { data: legacyUser } = await service
    .from('users')
    .select('name, course_name, batch_day_time, start_date')
    .eq('email', email)
    .maybeSingle()

  // Cross-sell
  const enrolledCourseIds = (rawEnrolments ?? []).map((e: any) => e.course_id).filter(Boolean)
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
