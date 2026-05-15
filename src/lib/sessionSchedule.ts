// ─────────────────────────────────────────────────────────────────────────────
// sessionSchedule — the single source of truth for a student's session schedule.
//
// New batches (post the 2026-05 schedule-variant rollout) do NOT use the legacy
// session_master_table. A batch's schedule is COMPUTED: start_date + (n-1)×7,
// for `total_sessions` sessions. Per-session links live in awa_session_links
// (recording / study material / meeting link / title) and the topic content
// comes from course_curriculum.
//
// weekend9 batches deliver the full 26-session curriculum compressed into 9
// weekend blocks (C3 bundling: 8 blocks of 3 + 1 of 2). long26 batches map
// 1 session ↔ 1 curriculum row.
// ─────────────────────────────────────────────────────────────────────────────

export interface BatchLike {
  id: string
  label: string | null
  day_of_week: string | null
  start_time: string | null
  start_date: string | null
  end_date: string | null
  duration_mins: number | null
  total_sessions: number | null
  variant: string | null            // 'weekend9' | 'long26'
  meeting_link: string | null
}

export interface SessionLinkRow {
  session_number: number
  session_title: string | null
  recording_link: string | null
  study_material_link: string | null
  meeting_link: string | null
  notes: string | null
}

export interface CurriculumRow {
  session_num: number
  title: string
  topics: string[] | null
  description: string | null
  project_hint: string | null
}

export interface ScheduleSession {
  n: number                       // 1-based session number within the batch
  dateISO: string                 // YYYY-MM-DD
  dateLabel: string               // "Sat, 4 Jul 2026"
  time: string                    // "11:00 AM IST"
  durationMins: number
  title: string                   // best available title
  topics: string[]
  projectHint: string | null
  description: string | null
  recordingLink: string | null
  studyMaterialLink: string | null
  meetingLink: string | null      // per-session link, else the batch-level link
  curriculumRange: string | null  // weekend9 only, e.g. "Curriculum S1–S3"
  isPast: boolean
  isToday: boolean
}

// ── helpers ──────────────────────────────────────────────────────────────────
function pad(n: number) { return String(n).padStart(2, '0') }
function ymd(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

export function fmtTime(t: string | null | undefined): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${pad(m || 0)} ${h >= 12 ? 'PM' : 'AM'} IST`
}

export function variantLabel(variant: string | null | undefined): string {
  if (variant === 'weekend9') return '9-Week Weekend Intensive'
  if (variant === 'long26')   return '26-Week Long Track'
  return 'Course'
}

export function variantBlurb(variant: string | null | undefined): string {
  if (variant === 'weekend9')
    return '9 weekend sessions × 120 min — the full curriculum, intensive pace'
  if (variant === 'long26')
    return '26 weekly weekend sessions × 60 min — the full curriculum, steady pace'
  return ''
}

// C3 bundling: which weekend block (1-9) a curriculum session (1-26) falls in.
function wgroup(s: number) { return s >= 25 ? 9 : Math.floor((s - 1) / 3) + 1 }
// The curriculum sessions that make up weekend block w.
function wmembers(w: number): number[] {
  const out: number[] = []
  for (let s = 1; s <= 26; s++) if (wgroup(s) === w) out.push(s)
  return out
}

/**
 * Build the full computed schedule for a batch, overlaying real per-session
 * links (awa_session_links) and topic content (course_curriculum).
 */
export function generateSchedule(
  batch: BatchLike | null | undefined,
  links: SessionLinkRow[] = [],
  curriculum: CurriculumRow[] = [],
): ScheduleSession[] {
  if (!batch?.start_date) return []

  const total      = batch.total_sessions ?? 26
  const isWeekend9 = batch.variant === 'weekend9'
  const linkMap    = new Map(links.map(l => [l.session_number, l]))
  const curMap     = new Map(curriculum.map(c => [c.session_num, c]))
  const todayISO   = ymd(new Date())
  const out: ScheduleSession[] = []

  for (let i = 0; i < total; i++) {
    const d = new Date(batch.start_date + 'T00:00:00')
    d.setDate(d.getDate() + i * 7)
    const dateISO = ymd(d)
    const link    = linkMap.get(i + 1)

    let curTitle = ''
    let topics: string[] = []
    let projectHint: string | null = null
    let description: string | null = null
    let curriculumRange: string | null = null

    if (isWeekend9) {
      // Weekend block (i+1) bundles its C3 group of curriculum sessions.
      const members = wmembers(i + 1)
      const rows    = members.map(sn => curMap.get(sn)).filter(Boolean) as CurriculumRow[]
      curTitle      = rows.map(r => r.title).join('  +  ')
      topics        = rows.flatMap(r => r.topics ?? [])
      projectHint   = rows.map(r => r.project_hint).filter(Boolean).join('; ') || null
      description   = rows.map(r => r.description).filter(Boolean).join(' ') || null
      if (members.length) curriculumRange = `Curriculum S${members[0]}–S${members[members.length - 1]}`
    } else {
      const c     = curMap.get(i + 1)
      curTitle    = c?.title ?? ''
      topics      = c?.topics ?? []
      projectHint = c?.project_hint ?? null
      description = c?.description ?? null
    }

    out.push({
      n: i + 1,
      dateISO,
      dateLabel: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
      time: fmtTime(batch.start_time),
      durationMins: batch.duration_mins ?? 60,
      title: link?.session_title || curTitle || `Session ${i + 1}`,
      topics,
      projectHint,
      description,
      recordingLink: link?.recording_link ?? null,
      studyMaterialLink: link?.study_material_link ?? null,
      meetingLink: link?.meeting_link ?? batch.meeting_link ?? null,
      curriculumRange,
      isPast: dateISO < todayISO,
      isToday: dateISO === todayISO,
    })
  }
  return out
}

/** The next not-yet-past session (today counts as upcoming), or null. */
export function nextSessionOf(schedule: ScheduleSession[]): ScheduleSession | null {
  return schedule.find(s => !s.isPast) ?? null
}

/** Whole days from now until an ISO date (negative if past, 0 if today). */
export function daysUntil(dateISO: string): number {
  const d = new Date(dateISO + 'T00:00:00')
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - now.getTime()) / 86400000)
}
