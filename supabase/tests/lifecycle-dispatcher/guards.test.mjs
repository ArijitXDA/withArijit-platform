// Run:  node --test supabase/tests/lifecycle-dispatcher/guards.test.mjs
// (Node >= 22.6 strips the TypeScript types of guards.ts on the fly; no build step, no deps.)
//
// Error strings below are the REAL ones from lifecycle_dispatch_log (status='failed', channel='whatsapp'),
// queried 2026-09-30 (all-time distinct families, counts in comments).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import * as G from '../../functions/lifecycle-dispatcher/guards.ts';

const here = dirname(fileURLToPath(import.meta.url));
const fnDir = join(here, '../../functions/lifecycle-dispatcher');

// ── real error strings ───────────────────────────────────────────────────────────────────────────
const REAL = {
  wcc_old: 'AiSensy 402: {"name":"ERR402","errorCode":402,"errorMessage":"Insufficient WhatsApp Conversation Credits (WCC)!"}', // 1,653
  noplan_old: 'AiSensy 400: {"name":"ERR400","errorCode":400,"errorMessage":"No Plan active on assistant!"}', // 1,275
  wcc_mid: 'AiSensy 402: {"message":"Insufficient WhatsApp Conversation Credits (WCC)!","name":"ERR402","errorCode":402,"errorMessage":"Insufficient WhatsApp Conversation Credits (WCC)!"}', // 537
  wcc_trace: 'AiSensy 402: {"message":"Insufficient WhatsApp Conversation Credits (WCC)!","name":"ERR402","errorCode":402,"errorMessage":"Insufficient WhatsApp Conversation Credits (WCC)!","aisTraceId":"ais_mu6k769j_9c53d496"}',
  noplan_trace: 'AiSensy 400: {"message":"No Plan active on assistant!","name":"ERR400","errorCode":400,"errorMessage":"No Plan active on assistant!","aisTraceId":"ais_mum6apj6_f00b82d8"}', // 705+
  params: 'AiSensy 400: {"message":"Template params does not match the campaign"}', // 206
  campaign: 'AiSensy 400: {"message":"Campaign does not exist."}', // 76
  invalid_number: 'AiSensy 400: {"message":"Invalid Number"}', // 9
};

test('classifyWaError: every real production string', () => {
  for (const k of ['wcc_old', 'wcc_mid', 'wcc_trace']) {
    const r = G.classifyWaError(REAL[k]);
    assert.equal(r.cls, 'provider_outage', k);
    assert.equal(r.kind, 'account', k);
    assert.equal(r.httpStatus, 402, k);
    assert.equal(r.reason, 'wcc_exhausted', k);
  }
  for (const k of ['noplan_old', 'noplan_trace']) {
    const r = G.classifyWaError(REAL[k]);
    assert.equal(r.cls, 'provider_outage', k);
    assert.equal(r.kind, 'account', k);
    assert.equal(r.httpStatus, 400, k);
    assert.equal(r.reason, 'no_plan', k);
  }
  assert.deepEqual(G.classifyWaError(REAL.params), { cls: 'config', kind: null, httpStatus: 400, reason: 'param_mismatch' });
  assert.deepEqual(G.classifyWaError(REAL.campaign), { cls: 'config', kind: null, httpStatus: 400, reason: 'campaign_missing' });
  assert.deepEqual(G.classifyWaError(REAL.invalid_number), { cls: 'recipient', kind: null, httpStatus: 400, reason: 'invalid_recipient' });
});

test('classifyWaError: missing API key, auth, rate limit, 5xx, network/timeout', () => {
  assert.deepEqual(G.classifyWaError('AISENSY_API_KEY not configured'), { cls: 'provider_outage', kind: 'account', httpStatus: null, reason: 'api_key_missing' });
  for (const s of [401, 403]) {
    const r = G.classifyWaError(`AiSensy ${s}: {"message":"Unauthorized"}`);
    assert.equal(r.cls, 'provider_outage'); assert.equal(r.kind, 'account'); assert.equal(r.reason, 'auth');
  }
  const rl = G.classifyWaError('AiSensy 429: {"message":"Too many requests"}');
  assert.equal(rl.cls, 'provider_outage'); assert.equal(rl.kind, 'transient'); assert.equal(rl.reason, 'rate_limited');
  for (const s of [500, 502, 503, 504]) {
    const r = G.classifyWaError(`AiSensy ${s}: {}`);
    assert.equal(r.cls, 'provider_outage'); assert.equal(r.kind, 'transient'); assert.equal(r.reason, 'provider_5xx'); assert.equal(r.httpStatus, s);
  }
  for (const s of [
    'TimeoutError: The operation was aborted due to timeout',
    'The signal has been aborted',
    'error sending request for url (https://backend.aisensy.com/campaign/t1/api/v2): operation timed out',
  ]) {
    const r = G.classifyWaError(s);
    assert.equal(r.cls, 'provider_outage', s); assert.equal(r.kind, 'transient', s); assert.equal(r.reason, 'timeout', s);
  }
  for (const s of ['fetch failed', 'error sending request for url (https://backend.aisensy.com/x): client error (Connect)', 'dns error: failed to lookup address information', 'connection reset by peer']) {
    const r = G.classifyWaError(s);
    assert.equal(r.cls, 'provider_outage', s); assert.equal(r.kind, 'transient', s);
  }
});

test('classifyWaError: auth text on a 400 is an outage, never a recipient problem', () => {
  const r = G.classifyWaError('AiSensy 400: {"message":"Invalid API key"}');
  assert.equal(r.cls, 'provider_outage'); assert.equal(r.reason, 'auth');
});

test('classifyWaError: unknown things default to CONFIG (old 3-strike behaviour = safe default)', () => {
  assert.equal(G.classifyWaError(null).cls, 'config');
  assert.equal(G.classifyWaError(undefined).cls, 'config');
  assert.equal(G.classifyWaError('').cls, 'config');
  assert.equal(G.classifyWaError('AiSensy 400: {"message":"Something new and strange"}').cls, 'config');
  assert.equal(G.classifyWaError('AiSensy 404: {"message":"Not found"}').cls, 'config');
  assert.equal(G.classifyWaError('AiSensy 422: {}').cls, 'config');
  assert.equal(G.classifyWaError('TypeError: Invalid URL').cls, 'config');
});

test('classifyWaError: recipient variants', () => {
  for (const s of [
    'AiSensy 400: {"message":"Invalid Number"}',
    'AiSensy 400: {"message":"Invalid phone number"}',
    'AiSensy 400: {"message":"Number is not on WhatsApp"}',
    'AiSensy 400: {"message":"User has opted out"}',
  ]) assert.equal(G.classifyWaError(s).cls, 'recipient', s);
});

test('failureTag maps each class', () => {
  assert.equal(G.failureTag(G.classifyWaError(REAL.noplan_trace)), 'provider_outage:no_plan');
  assert.equal(G.failureTag(G.classifyWaError(REAL.wcc_old)), 'provider_outage:wcc_exhausted');
  assert.equal(G.failureTag(G.classifyWaError(REAL.invalid_number)), 'recipient_error:invalid_recipient');
  assert.equal(G.failureTag(G.classifyWaError(REAL.params)), 'config_error:param_mismatch');
  assert.equal(G.failureTag(G.classifyWaError(REAL.campaign)), 'config_error:campaign_missing');
  // admin filters split on ':' -> the class is the first token, and the alert query prefix matches every outage tag
  for (const k of Object.keys(REAL)) {
    const t = G.failureTag(G.classifyWaError(REAL[k]));
    assert.ok(t.includes(':')); 
    assert.equal(t.startsWith(G.OUTAGE_TAG_PREFIX), G.classifyWaError(REAL[k]).cls === 'provider_outage', k);
  }
});

// ── too-late guard ───────────────────────────────────────────────────────────────────────────────
test('isTimeCriticalWaStep', () => {
  assert.equal(G.isTimeCriticalWaStep('whatsapp', 'webinar_date', -1), true);
  assert.equal(G.isTimeCriticalWaStep('whatsapp', 'webinar_date', 0), true);
  assert.equal(G.isTimeCriticalWaStep('whatsapp', 'webinar_date', -24), true);
  assert.equal(G.isTimeCriticalWaStep('whatsapp', 'webinar_date', null), true); // null offset = 0
  assert.equal(G.isTimeCriticalWaStep('whatsapp', 'webinar_date', 24), false); // post-event steps are not time critical
  assert.equal(G.isTimeCriticalWaStep('whatsapp', 'webinar_date', 1), false);
  assert.equal(G.isTimeCriticalWaStep('whatsapp', null, -1), false); // non-anchored: behaviour unchanged
  assert.equal(G.isTimeCriticalWaStep('whatsapp', '', 0), false);
  assert.equal(G.isTimeCriticalWaStep('email', 'webinar_date', -1), false);
  assert.equal(G.isTimeCriticalWaStep('push', 'webinar_date', 0), false);
});

test('isTooLate: 45 minute grace, boundary exclusive', () => {
  const sched = Date.parse('2026-09-30T12:30:00Z'); // 18:00 IST live-now
  const min = 60000;
  assert.equal(G.isTooLate(sched - 5 * min, sched), false);
  assert.equal(G.isTooLate(sched, sched), false);
  assert.equal(G.isTooLate(sched + 45 * min, sched), false); // exactly 45 min: still sendable
  assert.equal(G.isTooLate(sched + 45 * min + 1, sched), true);
  assert.equal(G.isTooLate(sched + 6 * 60 * min, sched), true);
  assert.equal(G.isTooLate(NaN, sched), false);
  assert.equal(G.isTooLate(sched, NaN), false);
  assert.equal(G.isTooLate(sched + 55 * min, sched, 60), false); // custom grace
});

test('tooLateGraceMin: 45 min for -1h/live-now, 6h for day-before (cron skips 30-50 min ticks)', () => {
  assert.equal(G.tooLateGraceMin(0), 45);
  assert.equal(G.tooLateGraceMin(-1), 45);
  assert.equal(G.tooLateGraceMin(-2), 45);
  assert.equal(G.tooLateGraceMin(-3), 360);
  assert.equal(G.tooLateGraceMin(-24), 360);
  assert.equal(G.tooLateGraceMin(null), 45);
  assert.equal(G.tooLateGraceMin(undefined), 45);
  const sched = Date.parse('2026-09-29T12:30:00Z'); // day-before reminder
  assert.equal(G.isTooLate(sched + 50 * 60000, sched, G.tooLateGraceMin(-24)), false, '50 min cron gap must not drop a day-before reminder');
  assert.equal(G.isTooLate(sched + 6 * 3600000 + 1, sched, G.tooLateGraceMin(-24)), true);
});

test('too-late scenario: "starts in 1 hour" (-1h) after an outage', () => {
  const start = Date.parse('2026-09-30T12:30:00Z'); // webinar 18:00 IST
  const scheduled = start - 3600 * 1000; // -1h step
  assert.equal(G.isTooLate(scheduled + 10 * 60000, scheduled), false); // 10 min late: send
  assert.equal(G.isTooLate(start, scheduled), true); // webinar already started: skip
  assert.equal(G.isTooLate(start + 3600 * 1000, scheduled), true);
});

// ── send window clamp ────────────────────────────────────────────────────────────────────────────
// v24 applySendWindow copied VERBATIM from the deployed source for the equivalence fuzz.
function applySendWindowV24(when, windowStart, windowEnd) {
  const istMs = when.getTime() + 5.5 * 3600 * 1000;
  const ist = new Date(istMs);
  const minOfDay = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  const [wsH, wsM] = windowStart.split(':').map(Number);
  const [weH, weM] = windowEnd.split(':').map(Number);
  const startMin = wsH * 60 + wsM;
  const endMin = weH * 60 + weM;
  if (minOfDay >= startMin && minOfDay <= endMin) return when;
  const newIst = new Date(istMs);
  if (minOfDay < startMin) {
    newIst.setUTCHours(wsH, wsM, 0, 0);
  } else {
    newIst.setUTCDate(newIst.getUTCDate() + 1);
    newIst.setUTCHours(wsH, wsM, 0, 0);
  }
  return new Date(newIst.getTime() - 5.5 * 3600 * 1000);
}

test('clampToWindow == v24 applySendWindow (fuzz, real window shapes)', () => {
  const windows = [
    ['09:00:00', '21:00:00'], ['09:00:00', '19:00:00'], ['06:00:00', '23:00:00'], ['09:00:00', '22:00:00'],
    ['08:00:00', '21:30:00'], ['07:00:00', '22:00:00'], ['07:00:00', '22:30:00'], ['09:00:00', '20:00:00'],
    ['08:00:00', '20:00:00'], ['00:00', '23:59'], ['00:00:00', '23:59:00'],
  ];
  let seed = 123456789;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const base = Date.parse('2026-01-01T00:00:00Z');
  for (let i = 0; i < 30000; i++) {
    const when = new Date(base + Math.floor(rnd() * 400 * 86400000));
    const [ws, we] = windows[Math.floor(rnd() * windows.length)];
    const a = G.clampToWindow(when, ws, we).getTime();
    const b = applySendWindowV24(when, ws, we).getTime();
    assert.equal(a, b, `${when.toISOString()} ${ws}-${we}`);
  }
});

test('clampToWindow: concrete IST cases', () => {
  const ist = (s) => new Date(Date.parse(s + '+05:30'));
  const iso = (d) => new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ');
  assert.equal(iso(G.clampToWindow(ist('2026-09-30T20:50:00'), '09:00:00', '21:00:00')), '2026-09-30 20:50'); // inside
  assert.equal(iso(G.clampToWindow(ist('2026-09-30T21:05:00'), '09:00:00', '21:00:00')), '2026-10-01 09:00'); // after end -> tomorrow
  assert.equal(iso(G.clampToWindow(ist('2026-09-30T03:10:00'), '09:00:00', '21:00:00')), '2026-09-30 09:00'); // before start -> today
  assert.equal(iso(G.clampToWindow(ist('2026-09-30T23:30:00'), '09:00:00', '21:00:00')), '2026-10-01 09:00');
  assert.equal(iso(G.clampToWindow(ist('2026-09-30T21:00:00'), '09:00:00', '21:00:00')), '2026-09-30 21:00'); // end inclusive
});

test('deferTime: 15-min outage deferral stays inside the window', () => {
  const ist = (s) => Date.parse(s + '+05:30');
  const iso = (d) => new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ');
  // 20:50 IST + 15 min = 21:05 -> outside 09-21 window -> next morning 09:00
  assert.equal(iso(G.deferTime(ist('2026-09-30T20:50:00'), 15, '09:00:00', '21:00:00')), '2026-10-01 09:00');
  // 14:00 + 15 = 14:15 inside
  assert.equal(iso(G.deferTime(ist('2026-09-30T14:00:00'), 15, '09:00:00', '21:00:00')), '2026-09-30 14:15');
  // 5-min pause-check deferral
  assert.equal(iso(G.deferTime(ist('2026-09-30T14:00:00'), 5, '09:00:00', '21:00:00')), '2026-09-30 14:05');
});

// ── 48h safety valve ─────────────────────────────────────────────────────────────────────────────
test('outageDeferralExpired: 48h boundary', () => {
  const due = Date.parse('2026-09-30T00:00:00Z');
  const h = 3600 * 1000;
  assert.equal(G.outageDeferralExpired(due + 47 * h, due), false);
  assert.equal(G.outageDeferralExpired(due + 48 * h, due), false); // exactly 48h: not yet
  assert.equal(G.outageDeferralExpired(due + 48 * h + 1, due), true);
  assert.equal(G.outageDeferralExpired(due + 500 * h, NaN), false); // unknown due time never trips the valve
});

// ── breaker state machine ────────────────────────────────────────────────────────────────────────
test('breaker: account-level outage opens immediately (ONE probe per tick)', () => {
  const b = G.newBreaker();
  assert.equal(b.open, false);
  const info = G.classifyWaError(REAL.noplan_trace);
  assert.equal(G.breakerOnOutage(b, info, 1000, REAL.noplan_trace), true);
  assert.equal(b.open, true);
  assert.equal(b.reason, 'no_plan');
  assert.equal(b.probeFailures, 1);
  assert.ok(b.sample && b.sample.startsWith('AiSensy 400'));
});

test('breaker: transient errors need corroboration (poison-recipient protection)', () => {
  const b = G.newBreaker();
  const info = G.classifyWaError('AiSensy 503: {}');
  assert.equal(G.breakerOnOutage(b, info, 1), false, 'first 503 alone must NOT block everyone');
  assert.equal(b.open, false);
  G.breakerOnSuccess(b); // next recipient succeeded -> it was that recipient
  assert.equal(b.transientStrikes, 0);
  assert.equal(G.breakerOnOutage(b, info, 2), false);
  assert.equal(G.breakerOnOutage(b, info, 3), true, 'two consecutive 503s open it');
  assert.equal(b.open, true);
});

test('breaker: a real success closes it (valve-bypass probe recovers the tick)', () => {
  const b = G.newBreaker();
  G.breakerOnOutage(b, G.classifyWaError(REAL.wcc_old), 1, REAL.wcc_old);
  assert.equal(b.open, true);
  G.breakerOnSuccess(b);
  assert.equal(b.open, false);
  assert.equal(b.reason, null);
});

test('breaker state is per-instance (no shared module state)', () => {
  const a = G.newBreaker(); const c = G.newBreaker();
  G.breakerOnOutage(a, G.classifyWaError(REAL.wcc_old), 1);
  assert.equal(a.open, true);
  assert.equal(c.open, false);
});

// ── sustained-outage detection + alert cooldown ──────────────────────────────────────────────────
test('sustainedOutage: 3 distinct 5-min ticks, reset by a successful send', () => {
  const now = Date.parse('2026-09-30T12:00:00Z');
  const min = 60000;
  const t = (m) => now - m * min;
  // ticks at -10, -5, 0 min (one row per tick)
  let v = G.sustainedOutage([t(0), t(5), t(10)], null, now);
  assert.equal(v.sustained, true); assert.equal(v.ticks, 3);
  // two rows in the same tick bucket count once
  v = G.sustainedOutage([t(0) - 1000, t(0), t(5)], null, now);
  assert.equal(v.sustained, false); assert.equal(v.ticks, 2);
  // quiet-hours cadence: probes every 15 min still qualifies inside the 60 min lookback
  v = G.sustainedOutage([t(0), t(15), t(30)], null, now);
  assert.equal(v.sustained, true);
  // a successful send resets the run: only probes AFTER it count
  v = G.sustainedOutage([t(0), t(5), t(10)], t(7), now);
  assert.equal(v.ticks, 2); assert.equal(v.sustained, false);
  v = G.sustainedOutage([t(0), t(5), t(10)], t(2), now);
  assert.equal(v.ticks, 1); assert.equal(v.sustained, false);
  // stale rows outside the lookback are ignored
  v = G.sustainedOutage([t(0), t(5), t(90)], null, now);
  assert.equal(v.sustained, false);
  v = G.sustainedOutage([], null, now);
  assert.equal(v.sustained, false); assert.equal(v.firstMs, null);
});

test('alertCooldownElapsed: once per 6 hours', () => {
  const now = Date.parse('2026-09-30T12:00:00Z'); const h = 3600 * 1000;
  assert.equal(G.alertCooldownElapsed(null, now), true);
  assert.equal(G.alertCooldownElapsed(now - 5 * h, now), false);
  assert.equal(G.alertCooldownElapsed(now - 6 * h, now), true);
  assert.equal(G.alertCooldownElapsed(now - 7 * h, now), true);
});

test('buildOutageAlert: advice per reason, HTML-escaped provider text, no secrets', () => {
  const a = G.buildOutageAlert({ reason: 'no_plan', ticks: 3, firstMs: Date.parse('2026-09-30T11:50:00Z'), lastMs: Date.parse('2026-09-30T12:00:00Z'), sample: '<script>alert(1)</script> "x"', deferredThisTick: 42 });
  assert.match(a.subject, /WhatsApp sending is down \(no_plan\)/);
  assert.match(a.text, /plan has lapsed/i);
  assert.match(a.html, /&lt;script&gt;/);
  assert.doesNotMatch(a.html, /<script>/);
  assert.match(a.text, /42/);
  assert.match(G.buildOutageAlert({ reason: 'wcc_exhausted', ticks: 3, firstMs: null, lastMs: null, sample: null, deferredThisTick: 0 }).text, /WCC/);
  assert.match(G.buildOutageAlert({ reason: 'auth', ticks: 3, firstMs: null, lastMs: null, sample: null, deferredThisTick: 0 }).text, /API key/);
  assert.match(G.buildOutageAlert({ reason: 'provider_5xx', ticks: 3, firstMs: null, lastMs: null, sample: null, deferredThisTick: 0 }).text, /status page/i);
});

// ── partner pause decision ───────────────────────────────────────────────────────────────────────
test('pauseBlocks matrix', () => {
  // not paused
  for (const cls of ['promotional', 'transactional', undefined, null]) {
    assert.equal(G.pauseBlocks(null, cls), false);
    assert.equal(G.pauseBlocks(undefined, cls), false);
    assert.equal(G.pauseBlocks('', cls), false);
  }
  // promotional scope: blocks promotional, exempts transactional
  assert.equal(G.pauseBlocks('promotional', 'promotional'), true);
  assert.equal(G.pauseBlocks('promotional', 'transactional'), false);
  assert.equal(G.pauseBlocks('promotional', undefined), true, 'missing comms_class = promotional');
  assert.equal(G.pauseBlocks('promotional', null), true);
  // all scope: blocks everything incl. transactional
  assert.equal(G.pauseBlocks('all', 'transactional'), true);
  assert.equal(G.pauseBlocks('all', 'promotional'), true);
  assert.equal(G.pauseBlocks('all', undefined), true);
  // unknown non-null scope fails closed on the promotional side only
  assert.equal(G.pauseBlocks('weird', 'promotional'), true);
  assert.equal(G.pauseBlocks('weird', 'transactional'), false);
});

test('missing-function / missing-table error codes', () => {
  assert.equal(G.isMissingFunctionError('42883'), true);
  assert.equal(G.isMissingFunctionError('PGRST202'), true);
  assert.equal(G.isMissingFunctionError('42501'), false); // permission denied must NOT be treated as "missing"
  assert.equal(G.isMissingFunctionError(undefined), false);
  assert.equal(G.isMissingTableError('42P01'), true);
  assert.equal(G.isMissingTableError('PGRST205'), true);
  assert.equal(G.isMissingTableError('42501'), false);
});

// ── structural guarantees that protect the deploy ────────────────────────────────────────────────
test('guards.ts has NO imports at all (bundles/boots with zero remote dependencies)', () => {
  const src = readFileSync(join(fnDir, 'guards.ts'), 'utf8');
  assert.doesNotMatch(src, /^\s*import\s/m);
  assert.doesNotMatch(src, /\brequire\s*\(/);
  assert.doesNotMatch(src, /https?:\/\/(?!partner\.ostaran\.com)/); // no remote URLs (only the admin link in the alert copy)
  assert.doesNotMatch(src, /\benum\s|\bnamespace\s/); // erasable TS only
});

test('index.ts imports: only jsr: specifiers + ./guards.ts (explicit .ts extension)', () => {
  const src = readFileSync(join(fnDir, 'index.ts'), 'utf8');
  const specs = [...src.matchAll(/^\s*import\s[\s\S]*?from\s+'([^']+)'|^\s*import\s+'([^']+)'/gm)].map((m) => m[1] || m[2]);
  assert.ok(specs.length >= 3, 'found imports');
  for (const s of specs) assert.ok(s.startsWith('jsr:') || s === './guards.ts', `unexpected import ${s}`);
  assert.ok(specs.includes('./guards.ts'));
  // every symbol imported from guards.ts really is exported by it
  const blocks = [...src.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*'\.\/guards\.ts'/g)];
  assert.ok(blocks.length >= 1);
  const names = blocks.flatMap((m) => m[1].split(',').map((x) => x.trim()).filter(Boolean));
  for (const n of names) if (n !== 'WaBreaker') assert.ok(n in G, `guards.ts does not export ${n}`); // WaBreaker is a type (erased)
});

test('index.ts keeps the safety-critical v25 wiring', () => {
  const src = readFileSync(join(fnDir, 'index.ts'), 'utf8');
  // breaker is created per request, inside Deno.serve, never at module level
  assert.match(src, /Deno\.serve\([\s\S]*const tick: TickState = \{ breaker: newBreaker\(\) \}/);
  assert.doesNotMatch(src, /^(const|let|var)\s+\w*[bB]reaker\w*\s*=/m);
  // pause gate sits after consentOk and before buildVars
  const iConsent = src.indexOf("'no_consent')");
  const iPause = src.indexOf("partnerWaPauseVerdict(supabase, enrolment.email");
  const iBuild = src.indexOf('const vars = await buildVars(supabase, enrolment, template.template_key');
  assert.ok(iConsent > 0 && iPause > iConsent && iBuild > iPause, 'order: consent < pause gate < buildVars');
  // dry_run guards
  assert.match(src, /if \(!dryRun\) await supabase\.from\('lifecycle_dispatch_log'\)\.insert\(\{[^}]*skip_reason: 'wa_paused'/);
  assert.match(src, /if \(!dryRun\) await supabase\.from\('lifecycle_dispatch_log'\)\.insert\(\{[^}]*skip_reason: 'too_late'/);
  // unsubscribe host fixed
  assert.doesNotMatch(src, /`https:\/\/partner\.ostaran\.com\/unsubscribe/); // no template literal building the 404 host
  assert.match(src, /vars\.unsubscribe_url\s*= unsubscribeUrl\(enrolment\.id\);/);
});

test('isPastSendBy: opt-in, never blocks on absent/garbage, blocks strictly after the instant', () => {
  const t0 = Date.parse('2026-10-04T09:00:00+05:30');
  assert.equal(G.isPastSendBy(undefined, t0), false);
  assert.equal(G.isPastSendBy(null, t0), false);
  assert.equal(G.isPastSendBy('', t0), false);
  assert.equal(G.isPastSendBy('   ', t0), false);
  assert.equal(G.isPastSendBy('not a date', t0), false);
  assert.equal(G.isPastSendBy(12345, t0), false);
  assert.equal(G.isPastSendBy('2026-10-04T09:00:00+05:30', t0), false);        // exactly at the instant: still sendable
  assert.equal(G.isPastSendBy('2026-10-04T09:00:00+05:30', t0 + 1), true);      // 1 ms later: stale
  assert.equal(G.isPastSendBy('2026-10-04T09:00:00+05:30', t0 - 3600000), false);
  assert.equal(G.isPastSendBy('2026-10-04T09:00:00+05:30', Number.NaN), false);
});
