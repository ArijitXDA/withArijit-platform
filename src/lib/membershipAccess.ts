// Access-window arithmetic for monthly-membership payments (courses whose tenure_type is 'monthly').
//
// access_end_date is the LAST day of access (inclusive). A payment normally grants 30 days from the
// payment date. When the member still has paid days left, the new month is STACKED on top of them:
// end = furthest existing end + 30 — renewing early never forfeits days. A member with no days
// left (lapsed, or ending today) gets the unchanged legacy window (payment date + 30).
//
// Pure date-only (YYYY-MM-DD) arithmetic in UTC: no local-time drift, safe on Vercel (UTC) and tests.

/** Add whole days to a YYYY-MM-DD date, returning YYYY-MM-DD. */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

/** Statuses whose access must not be stacked onto ('refunded' is not a valid status today; kept defensively). */
const DEAD_STATUSES = new Set(['cancelled', 'refunded', 'transferred'])

/**
 * The furthest still-valid access end among a student's rows for one course, or null.
 * Rows that are cancelled/refunded are ignored; null/garbage dates are ignored.
 */
export function furthestAccessEnd(
  rows: Array<{ access_end_date?: string | null; enrolment_status?: string | null }> | null | undefined,
): string | null {
  let best: string | null = null
  for (const r of rows ?? []) {
    const end = r.access_end_date
    if (!end || !/^\d{4}-\d{2}-\d{2}$/.test(end)) continue
    if (r.enrolment_status && DEAD_STATUSES.has(r.enrolment_status)) continue
    if (best === null || end > best) best = end
  }
  return best
}

/**
 * End date for a new monthly payment made on `todayISO` (the route's existing UTC date).
 *  - member has days left (furthestEnd >= today): furthestEnd + `days`   (stacked)
 *  - otherwise:                                   today + `days`          (legacy, unchanged)
 */
export function computeMonthlyAccessEnd(todayISO: string, furthestEndISO: string | null, days = 30): { end: string; stacked: boolean } {
  // Sanity cap: an end date implausibly far out (comped / sentinel row such as 9999-12-31) is never
  // stacked onto — it would also overflow the date arithmetic and make the INSERT fail after payment.
  const cap = addDaysISO(todayISO, 400)
  if (furthestEndISO && furthestEndISO >= todayISO && furthestEndISO <= cap) {
    return { end: addDaysISO(furthestEndISO, days), stacked: furthestEndISO > todayISO }
  }
  return { end: addDaysISO(todayISO, days), stacked: false }
}
