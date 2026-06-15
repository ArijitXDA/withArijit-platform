import { createServiceClient } from '@/lib/supabase/service'
import { generateSchedule, type BatchLike } from '@/lib/sessionSchedule'

/**
 * Server loader: a student's unified session list.
 *
 * Reads the NEW schema first (student_enrolments → batch + awa_session_links +
 * course_curriculum) via the canonical generateSchedule(), falling back to the
 * legacy session_master_table only when there is no new-schema enrolment. Rows
 * carry render-compatible aliases (session_id / session_title / session_date /
 * session_start_time / session_link) so the existing dashboard + Sessions-page
 * markup keeps working unchanged.
 */
export interface StudentSessionRow {
  session_id:          string
  batch_id:            string
  session_number:      number
  session_title:       string | null
  session_date:        string         // YYYY-MM-DD
  session_start_time:  string | null  // raw HH:MM[:SS]
  session_link:        string | null  // join link
  recording_link:      string | null
  study_material_link: string | null
  isPast:              boolean
}
export interface StudentSessions {
  all:      StudentSessionRow[]
  upcoming: StudentSessionRow[]
  past:     StudentSessionRow[]
  source:   'new' | 'legacy' | 'none'
}

export async function getStudentSessions(email: string): Promise<StudentSessions> {
  const service = createServiceClient()
  const today   = new Date().toISOString().split('T')[0]

  const { data: enrolments } = await service
    .from('student_enrolments')
    .select('created_at, course:course_id(id, name, total_sessions), batch:batch_id(id, label, day_of_week, start_time, start_date, end_date, duration_mins, total_sessions, variant, meeting_link)')
    .eq('student_email', email)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const withBatch = (enrolments ?? []).filter((e: any) => e.batch?.id && e.batch?.start_date)

  // ── NEW schema ─────────────────────────────────────────────────────────────
  if (withBatch.length) {
    const batchIds  = [...new Set(withBatch.map((e: any) => e.batch.id))]
    const courseIds = [...new Set(withBatch.map((e: any) => e.course?.id).filter(Boolean))]

    const [linkRes, curRes] = await Promise.all([
      service.from('awa_session_links')
        .select('batch_id, session_number, session_title, recording_link, study_material_link, meeting_link, notes')
        .in('batch_id', batchIds),
      courseIds.length
        ? service.from('course_curriculum')
            .select('course_id, session_num, title, topics, description, project_hint')
            .in('course_id', courseIds)
        : Promise.resolve({ data: [] as any[] }),
    ])

    const linksByBatch: Record<string, any[]> = {}
    for (const r of linkRes.data ?? []) (linksByBatch[r.batch_id] ??= []).push(r)
    const curByCourse: Record<string, any[]> = {}
    for (const r of (curRes as any).data ?? []) (curByCourse[r.course_id] ??= []).push(r)

    const all: StudentSessionRow[] = []
    const seen = new Set<string>()
    for (const e of withBatch as any[]) {
      const b = e.batch
      if (seen.has(b.id)) continue
      seen.add(b.id)
      const sched = generateSchedule(b as BatchLike, linksByBatch[b.id] ?? [], curByCourse[e.course?.id] ?? [])
      for (const s of sched) {
        all.push({
          session_id:          `${b.id}-${s.n}`,
          batch_id:            b.id,
          session_number:      s.n,
          session_title:       s.title,
          session_date:        s.dateISO,
          session_start_time:  b.start_time ?? null,
          session_link:        s.meetingLink,
          recording_link:      s.recordingLink,
          study_material_link: s.studyMaterialLink,
          isPast:              s.isPast,
        })
      }
    }
    all.sort((a, b) => a.session_date.localeCompare(b.session_date))
    return { all, upcoming: all.filter(s => !s.isPast), past: all.filter(s => s.isPast), source: 'new' }
  }

  // ── LEGACY fallback ────────────────────────────────────────────────────────
  const { data: legacyUser } = await service.from('users').select('batch_id').eq('email', email).maybeSingle()
  const legacyBatchId = legacyUser?.batch_id ?? null
  if (legacyBatchId) {
    const { data: rows } = await service
      .from('session_master_table')
      .select('session_id, session_title, session_date, session_start_time, session_link, study_material_link')
      .eq('batch_id', legacyBatchId)
      .order('session_date')
    const all: StudentSessionRow[] = (rows ?? []).map((r: any, i: number) => ({
      session_id:          String(r.session_id),
      batch_id:            legacyBatchId,
      session_number:      i + 1,
      session_title:       r.session_title ?? null,
      session_date:        r.session_date,
      session_start_time:  r.session_start_time ?? null,
      session_link:        r.session_link ?? null,
      recording_link:      null,
      study_material_link: r.study_material_link ?? null,
      isPast:              r.session_date < today,
    }))
    return { all, upcoming: all.filter(s => !s.isPast), past: all.filter(s => s.isPast), source: 'legacy' }
  }

  return { all: [], upcoming: [], past: [], source: 'none' }
}
