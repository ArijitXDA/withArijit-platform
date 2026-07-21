// Pure, dependency-free slot converter for the Expert Consultation page.
// Availability is a set of RECURRING WEEKLY windows expressed in IST wall-clock.
// To show them in a visitor's timezone we must anchor each window to a concrete
// upcoming date, because the TARGET zone's UTC offset is DST-dependent (IST itself
// never observes DST, which is the only reason the fixed -5:30 shift below is valid).
//
// Everything here is deterministic given `now`, and is only ever called client-side
// AFTER mount (see ConsultationSlots.tsx), so there is no SSR/hydration exposure and
// none of the toISOString()/UTC-runtime day-shift landmines apply.

import { HOME_TZ } from '@/lib/timezone-config'

export type SlotWindow = {
  dow: number // ISO weekday: 1=Mon … 7=Sun
  startH: number
  startM: number
  endH: number
  endM: number
}

// Founder-specified availability: Mon / Tue / Thu, 10:00–12:00 and 17:00–19:00 IST.
// Static for Phase 2 (no live slot inventory yet — that's the admin slot calendar phase).
export const SLOT_WINDOWS: SlotWindow[] = [
  { dow: 1, startH: 10, startM: 0, endH: 12, endM: 0 },
  { dow: 1, startH: 17, startM: 0, endH: 19, endM: 0 },
  { dow: 2, startH: 10, startM: 0, endH: 12, endM: 0 },
  { dow: 2, startH: 17, startM: 0, endH: 19, endM: 0 },
  { dow: 4, startH: 10, startM: 0, endH: 12, endM: 0 },
  { dow: 4, startH: 17, startM: 0, endH: 19, endM: 0 },
]

const ISO_DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export type LocalSlot = {
  istDayLabel: string // "Mon"
  istRange: string // "10:00 AM – 12:00 PM IST"
  localWeekday: string // "Sun"  (buyer-local — may differ from the IST weekday)
  localDate: string // "Sep 6"
  localRange: string // "9:30 PM – 11:30 PM PDT"
  isIST: boolean // buyer zone IS Asia/Kolkata → no conversion to show
}

/** Today's IST calendar date, read via an Intl formatter pinned to Asia/Kolkata. */
function istTodayParts(now: Date): { y: number; mo: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: HOME_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0'
  return { y: Number(get('year')), mo: Number(get('month')), d: Number(get('day')) }
}

/** Next IST calendar date (today counts) whose ISO weekday is `dow`. */
function nextIstDateForDow(now: Date, dow: number): { y: number; mo: number; d: number } {
  const { y, mo, d } = istTodayParts(now)
  // Anchor at noon UTC so getUTCDay() is the true weekday of the calendar date,
  // with no risk of rolling into an adjacent day.
  const anchor = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0))
  const todayIsoDow = ((anchor.getUTCDay() + 6) % 7) + 1 // Sun=0..Sat=6 → Mon=1..Sun=7
  const delta = (dow - todayIsoDow + 7) % 7
  anchor.setUTCDate(anchor.getUTCDate() + delta)
  return { y: anchor.getUTCFullYear(), mo: anchor.getUTCMonth() + 1, d: anchor.getUTCDate() }
}

/** UTC instant for an IST wall-clock time on a given date. Valid ONLY because IST has no DST. */
function istWallClockToUTC(y: number, mo: number, d: number, hh: number, mm: number): Date {
  return new Date(Date.UTC(y, mo - 1, d, hh - 5, mm - 30))
}

function fmtIst(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function partsInTz(instant: Date, tz: string): { weekday: string; date: string; time: string; tzName: string } {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).formatToParts(instant)
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? ''
  return {
    weekday: get('weekday'),
    date: `${get('month')} ${get('day')}`,
    time: `${get('hour')}:${get('minute')} ${get('dayPeriod')}`,
    tzName: get('timeZoneName'),
  }
}

/** Convert one recurring IST window into the visitor's local time, anchored to its next occurrence. */
export function localizeSlot(win: SlotWindow, tz: string, now: Date): LocalSlot {
  const { y, mo, d } = nextIstDateForDow(now, win.dow)
  const startUTC = istWallClockToUTC(y, mo, d, win.startH, win.startM)
  const endUTC = istWallClockToUTC(y, mo, d, win.endH, win.endM)
  const s = partsInTz(startUTC, tz)
  const e = partsInTz(endUTC, tz)
  const crossesDay = s.date !== e.date
  return {
    istDayLabel: ISO_DAY_NAMES[win.dow] ?? '',
    istRange: `${fmtIst(win.startH, win.startM)} – ${fmtIst(win.endH, win.endM)} IST`,
    localWeekday: s.weekday,
    localDate: s.date,
    localRange: crossesDay
      ? `${s.time} – ${e.time} (${e.weekday} ${e.date}) ${e.tzName}`
      : `${s.time} – ${e.time} ${s.tzName}`,
    isIST: tz === HOME_TZ,
  }
}

/** Deterministic IST-only label for a window — used for the pre-mount (hydration-stable) render. */
export function istWindowLabel(win: SlotWindow): { day: string; range: string } {
  return {
    day: ISO_DAY_NAMES[win.dow] ?? '',
    range: `${fmtIst(win.startH, win.startM)} – ${fmtIst(win.endH, win.endM)} IST`,
  }
}

/** Human label for a zone, e.g. "America/New_York" → "New York". */
export function tzCityLabel(tz: string): string {
  const seg = tz.split('/').pop() ?? tz
  return seg.replace(/_/g, ' ')
}
