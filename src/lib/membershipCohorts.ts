// Membership cohorts — what a PROSPECTIVE member can join today, and the copy that describes it.
//
// The public page /courses/quantum-ai-continued must never hand-type a class day, time, date, cohort count
// or session length: all of it comes from awa_batches (+ awa_session_links for skipped / rescheduled weeks).
// This module is PURE (no I/O): the page loads the rows, this turns them into cohorts + phrases.
//
// Next-session dates come from the canonical generateSchedule() in sessionSchedule.ts (the same code the student
// dashboard uses), so the public page and a member's own dashboard apply the same skip / reschedule rules.
import { generateSchedule, fmtTime, type BatchLike, type SessionLinkRow, type ScheduleSession } from './sessionSchedule'

/** The only awa_batches columns this needs. NEVER select meeting_link / label for a public page. */
export interface CohortBatchRow {
  id: string
  day_of_week: string | null
  start_time: string | null
  start_date: string | null
  end_date: string | null
  duration_mins: number | null
  timezone: string | null
  sort_order: number | null
  is_active: boolean | null
  is_open: boolean | null
  variant: string | null
  max_seats: number | null
  seats_filled: number | null
}

/** The only awa_session_links columns this needs (the table also holds transcripts + private links). */
export interface CohortLinkRow {
  batch_id: string
  session_number: number
  status: string | null
  override_date: string | null
  override_time: string | null
}

export interface OpenCohort {
  batchId: string
  dayName: string                 // 'Sunday' (the weekday of start_date — the weekday the computed schedule actually runs on)
  weekdayIdx: number              // 0 = Sunday .. 6 = Saturday
  time24: string                  // '09:00'
  timeLabel: string               // '9:00 AM IST'
  durationMins: number | null
  isRunning: boolean              // start_date <= today
  startsOn: string | null         // start_date, for a cohort that has not started
  next: { dateISO: string; dateLabel: string; timeLabel: string; moved: boolean } | null
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const NUM_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six']
const DAY_MS = 86400000

/** Minutes since midnight, IST, for `d` (the business day is IST everywhere; Vercel runs UTC). */
export function istNowMinutes(d: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d)
  const h = Number(parts.find(p => p.type === 'hour')?.value ?? 0) % 24
  const m = Number(parts.find(p => p.type === 'minute')?.value ?? 0)
  return h * 60 + m
}

function utcDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
function weekdayOf(iso: string): number {
  return new Date(utcDay(iso)).getUTCDay()
}

/** 'Sun, 4 Oct 2026' — deterministic (no runtime-ICU variation), identical to the renewal emails' date format. */
export function fmtClassDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return ''
  return `${WEEKDAY_NAMES[weekdayOf(iso)].slice(0, 3)}, ${d} ${MONTHS[m - 1]} ${y}`
}

function timeLabelFor(t: string, tz: string | null): string {
  const base = fmtTime(t).replace(/ IST$/, '')            // '9:00 AM'
  const zone = !tz || tz === 'Asia/Kolkata' ? 'IST' : tz   // never call a non-IST batch "IST"
  return `${base} ${zone}`
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * A prospective member can join a cohort today when it is a rolling batch that is BOTH active AND open, has a
 * start date/time, has not ended and still has a seat. (is_active alone = existing members still attend;
 * is_open=false = intake closed.) Mirrors group-enrol/page.tsx and the select-batch API.
 */
export function isBookable(b: CohortBatchRow, todayISO: string): boolean {
  return b.variant === 'rolling' && b.is_active === true && b.is_open === true
    && !!b.start_date && !!b.start_time && (!b.end_date || b.end_date >= todayISO)
    && (b.max_seats == null || b.seats_filled == null || b.seats_filled < b.max_seats)
}

export function buildOpenCohorts(input: {
  batches: CohortBatchRow[]
  links: CohortLinkRow[]
  todayISO: string
  nowMinutesIST: number
  fallbackDurationMins?: number | null
}): OpenCohort[] {
  const { batches, links, todayISO, nowMinutesIST, fallbackDurationMins = null } = input
  const out: OpenCohort[] = []

  for (const b of batches) {
    if (!isBookable(b, todayISO)) continue
    const start = b.start_time as string
    const startDate = b.start_date as string
    const duration = b.duration_mins ?? fallbackDurationMins ?? null
    // The computed schedule runs on the weekday of start_date, so that is the day we name (day_of_week is a
    // redundant label that can drift; it must never contradict the dates shown next to it).
    const weekdayIdx = weekdayOf(startDate)

    // Canonical schedule: start + 7*(n-1) with the skipped / rescheduled overlay. The rolling horizon in
    // generateSchedule() is max(weeks elapsed + 1, highest link number): it never reaches a FUTURE week by itself, so
    // pad a synthetic 'scheduled' link 14 weeks ahead — the next class then exists even when the pre-seeded
    // link rows run out (or a cohort was never provisioned). A synthetic row carries no override, so it is inert.
    const weeksElapsed = Math.max(0, Math.floor((utcDay(todayISO) - utcDay(startDate)) / (7 * DAY_MS)))
    const batchLinks = links.filter(l => l.batch_id === b.id)
    const linkRows: SessionLinkRow[] = batchLinks.map(l => ({
      session_number: l.session_number, session_title: null, recording_link: null, study_material_link: null,
      meeting_link: null, notes: null, status: l.status, override_date: l.override_date, override_time: l.override_time,
    }))
    const horizon = weeksElapsed + 14
    if (batchLinks.reduce((m, l) => Math.max(m, l.session_number), 0) < horizon) {
      linkRows.push({ session_number: horizon, session_title: null, recording_link: null, study_material_link: null, meeting_link: null, notes: null, status: 'scheduled', override_date: null, override_time: null })
    }
    const batchLike: BatchLike = {
      id: b.id, label: null, day_of_week: b.day_of_week, start_time: b.start_time, start_date: b.start_date,
      end_date: b.end_date, duration_mins: duration, total_sessions: null, variant: 'rolling', meeting_link: null,
    }
    const schedule = generateSchedule(batchLike, linkRows)

    // Next live class = the EARLIEST (date, time) that is upcoming — by date, not by session number, so a
    // rescheduled week that lands before/after its neighbours is still ordered correctly. Not skipped, not past,
    // not after the cohort's end_date, and today's class stops counting once it has finished.
    const upcoming = schedule.filter((s: ScheduleSession) => {
      if (s.isPast || s.status === 'skipped') return false
      if (b.end_date && s.dateISO > b.end_date) return false
      if (s.isToday && s.timeRaw && toMinutes(String(s.timeRaw)) + (s.durationMins ?? 60) <= nowMinutesIST) return false
      return true
    })
    upcoming.sort((a, c) => a.dateISO.localeCompare(c.dateISO) || String(a.timeRaw ?? '').localeCompare(String(c.timeRaw ?? '')))
    const next = upcoming[0]

    out.push({
      batchId: b.id,
      dayName: WEEKDAY_NAMES[weekdayIdx],
      weekdayIdx,
      time24: String(start).slice(0, 5),
      timeLabel: timeLabelFor(start, b.timezone),
      durationMins: duration,
      isRunning: startDate <= todayISO,
      startsOn: startDate > todayISO ? startDate : null,
      next: next
        ? { dateISO: next.dateISO, dateLabel: fmtClassDate(next.dateISO), timeLabel: timeLabelFor(String(next.timeRaw ?? start), b.timezone), moved: next.status === 'rescheduled' }
        : null,
    })
  }

  // Soonest next class first; cohorts with no known next class last; stable by weekday then time.
  return out.sort((a, b) => {
    const an = a.next?.dateISO ?? '9999-12-31', bn = b.next?.dateISO ?? '9999-12-31'
    return an.localeCompare(bn) || a.time24.localeCompare(b.time24) || a.weekdayIdx - b.weekdayIdx
  })
}

function joinList(items: string[], word: 'and' | 'or'): string {
  if (items.length <= 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]} ${word} ${items[1]}`
  return `${items.slice(0, -1).join(', ')} ${word} ${items[items.length - 1]}`
}

export interface CohortCopy {
  count: number
  joinable: boolean                  // true => a NEW member can be placed in a cohort (>= 1 open cohort)
  durationMins: number | null        // common session length, or null when unknown / the cohorts differ
  durationPhrase: string             // '60-minute' | ''
  days: string                       // 'Sunday' | 'Saturday and Sunday'
  slotsAnd: string                   // 'Saturday and Sunday at 12:00 PM IST' | 'Saturday at 12:00 PM IST and Sunday at 9:00 AM IST'
  slotsOr: string                    // 'Saturday at 12:00 PM IST or Sunday at 9:00 AM IST'
  cadence: string                    // 'every Sunday' | 'every week'
  heading: string
  sub: string
  bullet: string
  faqQ: string
  faqA: string
  liveSentence: string               // 'Live every Sunday at 9:00 AM IST' | 'New cohort dates coming soon'
  next: { dateLabel: string; timeLabel: string; moved: boolean } | null   // the soonest next live class across open cohorts
}

/** Every sentence on the page that mentions the schedule, derived from the open cohorts. */
export function describeCohorts(cohorts: OpenCohort[], opts: { courseDurationMins?: number | null } = {}): CohortCopy {
  const count = cohorts.length
  const byDay = [...cohorts].sort((a, b) => DAY_ORDER.indexOf(a.dayName) - DAY_ORDER.indexOf(b.dayName) || a.time24.localeCompare(b.time24))
  const days = joinList(Array.from(new Set(byDay.map(c => c.dayName))), 'and')
  const daysOr = joinList(Array.from(new Set(byDay.map(c => c.dayName))), 'or')

  // Session length: from the open cohorts when there are any, else the course-level default (so the zero-cohort
  // page still says '60-minute' rather than dropping it).
  const durations = byDay.length
    ? Array.from(new Set(byDay.map(c => c.durationMins ?? opts.courseDurationMins ?? null)))
    : [opts.courseDurationMins ?? null]
  const durationMins = durations.length === 1 ? durations[0] : null
  const durationPhrase = durationMins ? `${durationMins}-minute` : ''

  const slot = (c: OpenCohort) => `${c.dayName} at ${c.timeLabel}`
  const sameTime = byDay.length > 1 && new Set(byDay.map(c => c.timeLabel)).size === 1
  const slotsAnd = sameTime ? `${days} at ${byDay[0].timeLabel}` : joinList(byDay.map(slot), 'and')
  const slotsOr = sameTime ? `${daysOr} at ${byDay[0].timeLabel}` : joinList(byDay.map(slot), 'or')
  const cadence = count === 1 ? `every ${byDay[0].dayName}` : 'every week'

  const nextCohort = cohorts.find(c => c.next)
  const next = nextCohort?.next ? { dateLabel: nextCohort.next.dateLabel, timeLabel: nextCohort.next.timeLabel, moved: nextCohort.next.moved } : null

  if (count === 0) {
    return {
      count, joinable: false, durationMins, durationPhrase, days: '', slotsAnd: '', slotsOr: '', cadence,
      heading: 'New cohort dates coming soon',
      sub: 'New enrolment is paused while we schedule the next cohort. Existing members can still renew below.',
      bullet: 'Renewals open for existing members',
      faqQ: 'When are the live sessions?',
      faqA: 'New enrolment is paused right now and the next cohort dates are not announced yet. Use the contact page and we will let you know as soon as it opens. Existing members can keep renewing.',
      liveSentence: 'New cohort dates coming soon',
      next: null,
    }
  }

  if (count === 1) {
    const c = byDay[0]
    return {
      count, joinable: true, durationMins, durationPhrase, days, slotsAnd, slotsOr, cadence,
      heading: 'Your weekly live session',
      sub: 'One live class a week, same membership. Join anytime.',
      bullet: `Live every ${c.dayName} at ${c.timeLabel}`,
      faqQ: 'When is the live session?',
      faqA: `Every ${c.dayName} at ${c.timeLabel}${durationMins ? ` (${durationMins} minutes)` : ''}.${next ? ` The next scheduled class is ${next.dateLabel}.` : ''} Dates can shift around festivals or holidays — this page always shows the current next-class date.`,
      liveSentence: `Live every ${c.dayName} at ${c.timeLabel}`,
      next,
    }
  }

  const countWord = NUM_WORDS[count] ?? String(count)
  return {
    count, joinable: true, durationMins, durationPhrase, days, slotsAnd, slotsOr, cadence,
    heading: `${countWord} weekly cohorts — pick what suits you`,
    sub: 'Choose your cohort after you join. Same membership, your preferred slot.',
    bullet: `Pick your slot: ${slotsOr}`,
    faqQ: 'When are the live sessions?',
    faqA: `${slotsOr}${durationMins ? ` (${durationMins} minutes each)` : ''}. You choose your cohort after joining.${next ? ` The next scheduled class is ${next.dateLabel} at ${next.timeLabel}.` : ''} Dates can shift around festivals or holidays — this page always shows the current next-class date.`,
    liveSentence: `Live on ${slotsOr}`,
    next,
  }
}
