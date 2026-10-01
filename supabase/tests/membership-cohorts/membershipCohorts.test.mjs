// Tests for src/lib/membershipCohorts.ts (the cohort filter + copy behind /courses/quantum-ai-continued).
//   node --test supabase/tests/membership-cohorts/membershipCohorts.test.mjs
// The real .ts is imported unchanged (Node strips the types). sessionSchedule.ts reads the clock internally, so
// every test pins the clock with mock.timers and passes the matching `todayISO` / `nowMinutesIST`.
import test, { mock } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

// Next-style extensionless relative imports ('./sessionSchedule') -> '.ts' for plain Node.
registerHooks({
  resolve(spec, ctx, next) {
    try { return next(spec, ctx) } catch (e) {
      if (spec.startsWith('.') && !/\.\w+$/.test(spec)) return next(spec + '.ts', ctx)
      throw e
    }
  },
})
const { buildOpenCohorts, describeCohorts, isBookable, istNowMinutes, fmtClassDate } = await import('../../../src/lib/membershipCohorts.ts')

// ── LIVE production data (2026-10-01) ────────────────────────────────────────────────────────────
const SUN = { id: 'sun', day_of_week: 'Sunday', start_time: '09:00:00', start_date: '2026-06-21', end_date: null, duration_mins: 60, timezone: 'Asia/Kolkata', sort_order: 2, is_active: true, is_open: true, variant: 'rolling', max_seats: 999, seats_filled: 11 }
const SAT = { id: 'sat', day_of_week: 'Saturday', start_time: '12:00:00', start_date: '2026-09-12', end_date: null, duration_mins: 60, timezone: 'Asia/Kolkata', sort_order: 1, is_active: false, is_open: false, variant: 'rolling', max_seats: 999, seats_filled: 1 }
// 52 pre-seeded link rows per batch; the real non-default ones: SUN #3 skipped, #15 'scheduled' with a (ignored) override_time
const links = (id, extra = {}) => Array.from({ length: 52 }, (_, i) => ({ batch_id: id, session_number: i + 1, status: 'scheduled', override_date: null, override_time: null, ...(extra[i + 1] || {}) }))
const SUN_LINKS = links('sun', { 3: { status: 'skipped' }, 15: { override_time: '12:30:00' } })

const at = (iso) => { mock.timers.reset(); mock.timers.enable({ apis: ['Date'], now: new Date(iso) }) }
const build = (batches, lk, todayISO, nowMinutesIST = 0) => buildOpenCohorts({ batches, links: lk, todayISO, nowMinutesIST })
// every STRING the page would render (JSON.stringify would also match structural nulls)
const allCopy = (c) => Object.values(c).filter(v => typeof v === 'string').join(' | ') + ' | ' + (c.next ? `${c.next.dateLabel} ${c.next.timeLabel}` : '')

test('LIVE DATA: only the open Sunday cohort is advertised — Saturday / noon / "two cohorts" never appear', () => {
  at('2026-10-01T10:00:00+05:30')
  const cohorts = build([SAT, SUN], [...links('sat'), ...SUN_LINKS], '2026-10-01', istNowMinutes(new Date()))
  assert.equal(cohorts.length, 1)
  const c = cohorts[0]
  assert.equal(c.dayName, 'Sunday'); assert.equal(c.timeLabel, '9:00 AM IST'); assert.equal(c.durationMins, 60); assert.equal(c.isRunning, true)
  assert.equal(c.next.dateISO, '2026-10-04'); assert.equal(c.next.dateLabel, 'Sun, 4 Oct 2026'); assert.equal(c.next.timeLabel, '9:00 AM IST')
  const copy = describeCohorts(cohorts)
  assert.equal(copy.count, 1); assert.equal(copy.joinable, true)
  assert.equal(copy.heading, 'Your weekly live session')
  assert.equal(copy.sub, 'One live class a week, same membership. Join anytime.')
  assert.equal(copy.bullet, 'Live every Sunday at 9:00 AM IST')
  assert.equal(copy.faqQ, 'When is the live session?')
  assert.match(copy.faqA, /^Every Sunday at 9:00 AM IST \(60 minutes\)\. The next scheduled class is Sun, 4 Oct 2026\./)
  assert.equal(copy.durationPhrase, '60-minute'); assert.equal(copy.cadence, 'every Sunday')
  const blob = allCopy(copy)
  for (const bad of ['Saturday', 'noon', '12:00', 'Two weekly', 'both', 'Both', 'switch']) assert.ok(!blob.includes(bad), `copy must not contain "${bad}"`)
})

test('today\'s class stops being "next" once it has finished; before it ends it still is', () => {
  at('2026-10-04T08:00:00+05:30')   // Sunday 08:00 IST, class 09:00-10:00
  assert.equal(build([SUN], SUN_LINKS, '2026-10-04', 8 * 60)[0].next.dateISO, '2026-10-04')
  at('2026-10-04T09:30:00+05:30')   // mid-class: still today's
  assert.equal(build([SUN], SUN_LINKS, '2026-10-04', 9 * 60 + 30)[0].next.dateISO, '2026-10-04')
  at('2026-10-04T10:30:00+05:30')   // finished
  assert.equal(build([SUN], SUN_LINKS, '2026-10-04', 10 * 60 + 30)[0].next.dateISO, '2026-10-11')
})

test('a skipped week is never "next"; a rescheduled week shows its new date and time', () => {
  at('2026-10-05T10:00:00+05:30')
  const skipNext = links('sun', { 17: { status: 'skipped' } })                       // 11 Oct skipped
  assert.equal(build([SUN], skipNext, '2026-10-05', 600)[0].next.dateISO, '2026-10-18')
  at('2026-10-02T10:00:00+05:30')
  const moved = links('sun', { 16: { status: 'rescheduled', override_date: '2026-10-05', override_time: '18:00:00' } })   // #16 was 4 Oct
  const n = build([SUN], moved, '2026-10-02', 600)[0].next
  assert.equal(n.dateISO, '2026-10-05'); assert.equal(n.timeLabel, '6:00 PM IST'); assert.equal(n.dateLabel, 'Mon, 5 Oct 2026'); assert.equal(n.moved, true)
  // an override_time on a NON-rescheduled row is ignored (matches every other consumer)
  const stray = links('sun', { 16: { status: 'scheduled', override_time: '12:30:00' } })
  assert.equal(build([SUN], stray, '2026-10-02', 600)[0].next.timeLabel, '9:00 AM IST')
})

test('two open cohorts: heading/bullet/FAQ list each slot and never say "both ... at" when times differ', () => {
  at('2026-10-01T10:00:00+05:30')
  const sat = { ...SAT, is_active: true, is_open: true }
  const cohorts = build([SUN, sat], [...SUN_LINKS, ...links('sat')], '2026-10-01', 600)
  assert.equal(cohorts.length, 2)
  assert.equal(cohorts[0].dayName, 'Saturday')   // 3 Oct comes before 4 Oct
  const copy = describeCohorts(cohorts)
  assert.equal(copy.heading, 'Two weekly cohorts — pick what suits you')
  assert.equal(copy.bullet, 'Pick your slot: Saturday at 12:00 PM IST or Sunday at 9:00 AM IST')
  assert.equal(copy.faqQ, 'When are the live sessions?')
  assert.equal(copy.slotsOr, 'Saturday at 12:00 PM IST or Sunday at 9:00 AM IST')
  assert.equal(copy.slotsAnd, 'Saturday at 12:00 PM IST and Sunday at 9:00 AM IST')
  assert.equal(copy.cadence, 'every week')
  assert.ok(!/both|Both/.test(allCopy(copy)))
  // identical times collapse
  const sameTime = build([SUN, { ...sat, start_time: '09:00:00' }], [...SUN_LINKS, ...links('sat')], '2026-10-01', 600)
  assert.equal(describeCohorts(sameTime).slotsAnd, 'Saturday and Sunday at 9:00 AM IST')
  assert.equal(describeCohorts(sameTime).bullet, 'Pick your slot: Saturday or Sunday at 9:00 AM IST')
  // two cohorts on the SAME day at different times must not claim they differ by day
  const sameDay = build([SUN, { ...SUN, id: 'sun2', start_time: '18:00:00' }], [...SUN_LINKS, ...links('sun2')], '2026-10-01', 600)
  assert.equal(describeCohorts(sameDay).bullet, 'Pick your slot: Sunday at 9:00 AM IST or Sunday at 6:00 PM IST')
})

test('zero open cohorts: honest "coming soon" copy, joining disabled', () => {
  at('2026-10-01T10:00:00+05:30')
  const cohorts = build([SAT, { ...SUN, is_open: false }], [...links('sat'), ...SUN_LINKS], '2026-10-01', 600)
  assert.equal(cohorts.length, 0)
  const copy = describeCohorts(cohorts)
  assert.equal(copy.count, 0); assert.equal(copy.joinable, false)
  assert.equal(copy.heading, 'New cohort dates coming soon'); assert.equal(copy.liveSentence, 'New cohort dates coming soon')
  assert.equal(copy.bullet, 'Renewals open for existing members')
  assert.ok(!/Sunday|Saturday/.test(allCopy(copy)))
  // the course-level session length still applies when no cohort is open
  const withDur = describeCohorts(cohorts, { courseDurationMins: 60 })
  assert.equal(withDur.durationPhrase, '60-minute')
})

test('isBookable: needs rolling + active + open + start date/time + not ended', () => {
  const t = '2026-10-01'
  assert.equal(isBookable(SUN, t), true)
  assert.equal(isBookable({ ...SUN, is_active: false }, t), false)
  assert.equal(isBookable({ ...SUN, is_open: false }, t), false)
  assert.equal(isBookable({ ...SUN, is_active: null }, t), false)
  assert.equal(isBookable({ ...SUN, variant: 'long26' }, t), false)
  assert.equal(isBookable({ ...SUN, start_date: null }, t), false)
  assert.equal(isBookable({ ...SUN, start_time: null }, t), false)
  assert.equal(isBookable({ ...SUN, end_date: '2026-09-30' }, t), false)
  assert.equal(isBookable({ ...SUN, end_date: '2026-10-01' }, t), true)
  assert.equal(isBookable({ ...SUN, max_seats: 11, seats_filled: 11 }, t), false)   // full
  assert.equal(isBookable({ ...SUN, max_seats: 12, seats_filled: 11 }, t), true)
  assert.equal(isBookable({ ...SUN, max_seats: null, seats_filled: 500 }, t), true)
})

test('a batch that has not started yet is joinable and reports its start date', () => {
  at('2026-10-01T10:00:00+05:30')
  const future = { ...SUN, start_date: '2026-10-11' }
  const c = build([future], links('sun'), '2026-10-01', 600)[0]
  assert.equal(c.isRunning, false); assert.equal(c.startsOn, '2026-10-11'); assert.equal(c.next.dateISO, '2026-10-11')
})

test('a non-IST batch is labelled with its own zone, never "IST"', () => {
  at('2026-10-01T10:00:00+05:30')
  const c = build([{ ...SUN, timezone: 'America/New_York' }], SUN_LINKS, '2026-10-01', 600)[0]
  assert.equal(c.timeLabel, '9:00 AM America/New_York')
})

test('unknown session length is omitted, never invented', () => {
  at('2026-10-01T10:00:00+05:30')
  const cohorts = build([{ ...SUN, duration_mins: null }], SUN_LINKS, '2026-10-01', 600)
  const copy = describeCohorts(cohorts)
  assert.equal(copy.durationMins, null); assert.equal(copy.durationPhrase, '')
  assert.ok(!/\d+ minutes|-minute/.test(allCopy(copy)))
  assert.equal(describeCohorts(cohorts, { courseDurationMins: 45 }).durationPhrase, '45-minute')
})

test('no link rows at all: the canonical rolling horizon can lack a next class — copy must still be sound (no crash, no invented date)', () => {
  at('2026-10-05T10:00:00+05:30')   // Monday after the 4 Oct class
  const c = build([SUN], [], '2026-10-05', 600)
  assert.equal(c.length, 1)
  const copy = describeCohorts(c)
  assert.ok(!/undefined|null|NaN/.test(allCopy(copy)))
  if (!c[0].next) assert.equal(copy.next, null)
})

test('istNowMinutes is the IST wall clock regardless of host timezone', () => {
  assert.equal(istNowMinutes(new Date('2026-10-04T03:30:00Z')), 9 * 60)
  assert.equal(istNowMinutes(new Date('2026-10-04T18:30:00Z')), 0)       // 00:00 IST next day
  assert.equal(istNowMinutes(new Date('2026-10-04T12:29:00Z')), 17 * 60 + 59)
})

// ── review fixes ─────────────────────────────────────────────────────────────────────────────────
test('next class is the EARLIEST by date, not the lowest session number (a rescheduled week can jump)', () => {
  at('2026-10-01T10:00:00+05:30')
  // #16 (4 Oct) pushed out to 14 Oct; #17 still runs 11 Oct -> 11 Oct is next
  const out = links('sun', { 16: { status: 'rescheduled', override_date: '2026-10-14', override_time: '18:00:00' } })
  assert.equal(build([SUN], out, '2026-10-01', 600)[0].next.dateISO, '2026-10-11')
  // #17 (11 Oct) pulled FORWARD to 3 Oct -> 3 Oct is next, ahead of #16 on 4 Oct
  const fwd = links('sun', { 17: { status: 'rescheduled', override_date: '2026-10-03', override_time: '09:00:00' } })
  assert.equal(build([SUN], fwd, '2026-10-01', 600)[0].next.dateISO, '2026-10-03')
})

test('next class is capped at the cohort end_date', () => {
  at('2026-10-01T10:00:00+05:30')
  const c = build([{ ...SUN, end_date: '2026-10-02' }], SUN_LINKS, '2026-10-01', 600)[0]
  assert.equal(c.next, null)
  assert.equal(build([{ ...SUN, end_date: '2026-10-04' }], SUN_LINKS, '2026-10-01', 600)[0].next.dateISO, '2026-10-04')
})

test('horizon: the next class still exists when the pre-seeded link rows have run out (or never existed)', () => {
  at('2027-06-14T10:00:00+05:30')   // Monday after session 52 (13 Jun 2027)
  const n = build([SUN], SUN_LINKS, '2027-06-14', 600)[0].next
  assert.equal(n.dateISO, '2027-06-20'); assert.equal(n.timeLabel, '9:00 AM IST')
  at('2026-10-05T10:00:00+05:30')   // an unprovisioned cohort: no link rows at all
  assert.equal(build([SUN], [], '2026-10-05', 600)[0].next.dateISO, '2026-10-11')
  // a skip on that padded week is still honoured when the row exists
  at('2026-10-05T10:00:00+05:30')
  assert.equal(build([SUN], links('sun', { 17: { status: 'skipped' } }), '2026-10-05', 600)[0].next.dateISO, '2026-10-18')
})

test('the day named in the copy is the weekday of start_date, never a drifting day_of_week label', () => {
  at('2026-10-01T10:00:00+05:30')
  const c = build([{ ...SUN, day_of_week: 'Saturday' }], SUN_LINKS, '2026-10-01', 600)[0]
  assert.equal(c.dayName, 'Sunday')
  assert.equal(describeCohorts([c]).bullet, 'Live every Sunday at 9:00 AM IST')
})

test("today's finished-class check works even when the session length is unknown", () => {
  at('2026-10-04T15:00:00+05:30')
  assert.equal(build([{ ...SUN, duration_mins: null }], SUN_LINKS, '2026-10-04', 15 * 60)[0].next.dateISO, '2026-10-11')
})

test('fmtClassDate is deterministic and matches the renewal emails ("Sun, 4 Oct 2026")', () => {
  assert.equal(fmtClassDate('2026-10-04'), 'Sun, 4 Oct 2026')
  assert.equal(fmtClassDate('2027-01-01'), 'Fri, 1 Jan 2027')
  assert.equal(fmtClassDate(null), ''); assert.equal(fmtClassDate('garbage'), '')
})
