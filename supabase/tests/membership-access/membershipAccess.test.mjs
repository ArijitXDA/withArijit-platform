// Unit tests for the monthly-membership access-window arithmetic (src/lib/membershipAccess.ts).
//   node --test supabase/tests/membership-access/membershipAccess.test.mjs
// The real .ts is imported unchanged (Node strips the types).
import test from 'node:test'
import assert from 'node:assert/strict'
import { addDaysISO, furthestAccessEnd, computeMonthlyAccessEnd } from '../../../src/lib/membershipAccess.ts'

test('addDaysISO crosses month, year and leap day', () => {
  assert.equal(addDaysISO('2026-10-06', 30), '2026-11-05')
  assert.equal(addDaysISO('2026-12-20', 30), '2027-01-19')
  assert.equal(addDaysISO('2028-02-10', 30), '2028-03-11')
})

test('legacy window is UNCHANGED for first purchase, lapsed member and ends-today', () => {
  assert.deepEqual(computeMonthlyAccessEnd('2026-10-03', null),         { end: '2026-11-02', stacked: false })
  assert.deepEqual(computeMonthlyAccessEnd('2026-10-03', '2026-09-29'), { end: '2026-11-02', stacked: false })
  assert.deepEqual(computeMonthlyAccessEnd('2026-10-03', '2026-10-03'), { end: '2026-11-02', stacked: false })
})

test('a member with days left keeps them: end = furthest end + 30', () => {
  assert.deepEqual(computeMonthlyAccessEnd('2026-10-03', '2026-10-06'), { end: '2026-11-05', stacked: true })
  assert.deepEqual(computeMonthlyAccessEnd('2026-10-03', '2026-10-27'), { end: '2026-11-26', stacked: true })
  assert.ok(computeMonthlyAccessEnd('2026-10-03', '2026-10-06').end > computeMonthlyAccessEnd('2026-10-03', null).end)
})

test('furthestAccessEnd picks the furthest and ignores dead / malformed rows', () => {
  assert.equal(furthestAccessEnd([{ access_end_date: '2026-09-01' }, { access_end_date: '2026-10-06' }, { access_end_date: '2026-08-01' }]), '2026-10-06')
  assert.equal(furthestAccessEnd([{ access_end_date: '2026-12-31', enrolment_status: 'cancelled' }, { access_end_date: '2026-10-06', enrolment_status: 'active' }]), '2026-10-06')
  assert.equal(furthestAccessEnd([{ access_end_date: '2026-12-31', enrolment_status: 'refunded' }]), null)
  assert.equal(furthestAccessEnd([{ access_end_date: '2026-10-06', enrolment_status: null }]), '2026-10-06')
  assert.equal(furthestAccessEnd([{ access_end_date: null }, { access_end_date: 'garbage' }, { access_end_date: '2026-10-06' }]), '2026-10-06')
  assert.equal(furthestAccessEnd([]), null)
  assert.equal(furthestAccessEnd(null), null)
  assert.equal(furthestAccessEnd(undefined), null)
})

test('real cohort: a member ending 6 Oct who renews on 3 Oct keeps his 3 days', () => {
  const rows = [{ access_end_date: '2026-10-06', enrolment_status: 'active' }, { access_end_date: '2026-09-01', enrolment_status: 'paused' }]
  assert.equal(computeMonthlyAccessEnd('2026-10-03', furthestAccessEnd(rows)).end, '2026-11-05')
})
