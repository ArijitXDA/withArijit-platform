// ── 50-50 balance content gate ────────────────────────────────────────────────
// On-demand course content (recordings, study notes, transcripts, the AI Assistant
// Professor) is LOCKED for a 50-50 student who hasn't cleared their balance by the
// 6th session. Live-class Join is NEVER gated. Single source of truth for the rule.
//
// Session 6 = start_date + 35 days (5 × 7; weekly cadence for both weekend9 & long26).
// `today` is IST because the server runs UTC (the [[reference_ist_date_landmine]]).

export const BALANCE_DEADLINE_OFFSET_DAYS = 35 // session 6 = start + 5 weeks

/** The batch's 6th-session date (YYYY-MM-DD), i.e. the 50-50 balance deadline. */
export function balanceDeadlineISO(batchStartDate?: string | null): string | null {
  if (!batchStartDate) return null
  const d = new Date(batchStartDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + BALANCE_DEADLINE_OFFSET_DAYS)
  return d.toISOString().slice(0, 10)
}

/** True → hide on-demand content: an unpaid 50-50 balance whose 6th-session deadline has passed. */
export function isContentLocked(balanceDue: number | null | undefined, batchStartDate?: string | null): boolean {
  if (!(Number(balanceDue) > 0)) return false
  const deadline = balanceDeadlineISO(batchStartDate)
  if (!deadline) return false // no batch/date picked yet → nothing to lock against
  const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) // YYYY-MM-DD
  return todayIST >= deadline
}
