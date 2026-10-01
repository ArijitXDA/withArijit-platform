// End-to-end SIMULATION of lifecycle-dispatcher/index.ts under plain Node.
//   node --test supabase/tests/lifecycle-dispatcher/dispatcher.sim.test.mjs
//
// The real index.ts is imported unchanged (Node strips the types). Three things are faked:
//   * `jsr:@supabase/*` imports  -> resolve hook -> mock-supabase.mjs (in-memory tables + rpc)
//   * `Deno`                     -> env + serve() capture
//   * fetch / Date               -> scripted AiSensy + Resend responses, controllable clock
// It exercises the actual v25 control flow (breaker, deferral, valve, recipient/config, too-late,
// pause gate, alerting, dry_run, preview), which the pure unit tests cannot.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { FakeDB } from './mock-supabase.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const mockUrl = pathToFileURL(join(here, 'mock-supabase.mjs')).href;
// SIM_DIR lets the mutation check point the harness at a mutated copy of index.ts + guards.ts.
const fnDir = process.env.SIM_DIR || join(here, '../../functions/lifecycle-dispatcher');
const indexUrl = pathToFileURL(join(fnDir, 'index.ts')).href;

// ── controllable clock ───────────────────────────────────────────────────────────────────────────
const RealDate = Date;
let fakeNow = RealDate.parse('2026-09-30T14:00:00+05:30');
class FDate extends RealDate {
  constructor(...a) { if (a.length === 0) super(fakeNow); else super(...a); }
  static now() { return fakeNow; }
}
globalThis.Date = FDate;
const setNow = (iso) => { fakeNow = RealDate.parse(iso); };
const advanceMin = (m) => { fakeNow += m * 60000; };
const iso = (ms) => new RealDate(ms).toISOString();
const ist = (s) => RealDate.parse(s + '+05:30');

// ── Deno + module hooks ──────────────────────────────────────────────────────────────────────────
const ENV = { SUPABASE_URL: 'http://fake', SUPABASE_SERVICE_ROLE_KEY: 'SECRET-SERVICE-KEY-000', RESEND_API_KEY: 'SECRET-RESEND-KEY-456', AISENSY_API_KEY: 'SECRET-AISENSY-KEY-123' };
let handler;
globalThis.Deno = { env: { get: (k) => ENV[k] }, serve: (h) => { handler = h; } };
registerHooks({
  resolve(spec, ctx, next) {
    if (spec === 'jsr:@supabase/functions-js/edge-runtime.d.ts') return { url: 'data:text/javascript,', shortCircuit: true };
    if (spec === 'jsr:@supabase/supabase-js@2') return { url: mockUrl, shortCircuit: true };
    return next(spec, ctx);
  },
});
await import(indexUrl);
assert.equal(typeof handler, 'function', 'index.ts registered a Deno.serve handler');

// ── scripted providers ───────────────────────────────────────────────────────────────────────────
const AI = {
  ok: () => ({ status: 200, body: { submitted_message_id: 'msg-' + Math.random().toString(36).slice(2, 8) } }),
  noPlan: () => ({ status: 400, body: { message: 'No Plan active on assistant!', name: 'ERR400', errorCode: 400, errorMessage: 'No Plan active on assistant!', aisTraceId: 'ais_test_1234' } }),
  wcc: () => ({ status: 402, body: { name: 'ERR402', errorCode: 402, errorMessage: 'Insufficient WhatsApp Conversation Credits (WCC)!' } }),
  invalidNumber: () => ({ status: 400, body: { message: 'Invalid Number' } }),
  noCampaign: () => ({ status: 400, body: { message: 'Campaign does not exist.' } }),
  unavailable: () => ({ status: 503, body: {} }),
};
let db, fetchCalls, aisensy, resend;
const aiCalls = () => fetchCalls.filter((c) => c.url.includes('aisensy'));
const mailCalls = () => fetchCalls.filter((c) => c.url.includes('resend'));
const alertMails = () => mailCalls().filter((c) => String(c.body.from).startsWith('oStaran Ops'));
globalThis.fetch = async (url, init) => {
  const u = String(url);
  const body = init && init.body ? JSON.parse(init.body) : null;
  fetchCalls.push({ url: u, body, hasSignal: !!(init && init.signal) });
  if (u.includes('aisensy')) { const r = aisensy(body, aiCalls().length); return new Response(JSON.stringify(r.body ?? {}), { status: r.status }); }
  if (u.includes('resend')) { const r = resend(body); return new Response(JSON.stringify(r.body ?? {}), { status: r.status }); }
  throw new Error('unexpected fetch ' + u);
};

// silence + capture console
const con = { warn: [], error: [], log: [] };
for (const k of ['warn', 'error', 'log']) console[k] = (...a) => { con[k].push(a.map(String).join(' ')); };

// ── fixtures ─────────────────────────────────────────────────────────────────────────────────────
const SEQ = {
  s1: { id: 'seq-s1', sequence_key: 's1_free_webinar_attendance', track: 'student', is_active: true, exit_on_events: [] },
  gen: { id: 'seq-gen', sequence_key: 'g1_generic', track: 'student', is_active: true, exit_on_events: [] },
  p9: { id: 'seq-p9', sequence_key: 'p9_webinar_invite', track: 'partner', is_active: true, exit_on_events: [], comms_class: 'promotional' },
  p2: { id: 'seq-p2', sequence_key: 'p2_partner_first_student_referral', track: 'partner', is_active: true, exit_on_events: [], comms_class: 'transactional' },
  p4: { id: 'seq-p4', sequence_key: 'p4_partner_weekly_pulse', track: 'partner', is_active: true, exit_on_events: [] }, // NO comms_class at all
};
const W = { send_window_start: '09:00:00', send_window_end: '21:00:00' };
const step = (seq, i, channel, key, extra = {}) => ({ sequence_id: seq.id, step_index: i, channel, template_key: key, delay_hours: 0, absolute_anchor: null, anchor_offset_hours: null, ...W, ...extra });
const wa = (key) => ({ template_key: key, version: 1, channel: 'whatsapp', is_active: true, aisensy_campaign_name: 'camp_' + key, aisensy_param_order: ['first_name'], variables_declared: {}, body_text: 'Hi {{1}}' });
const em = (key) => ({ template_key: key, version: 1, channel: 'email', is_active: true, subject: 'Subj ' + key, body_html: '<a href="{{unsubscribe_url}}">unsub</a>', body_text: 'txt', variables_declared: {} });

function fresh() {
  db = new FakeDB();
  globalThis.__FAKE_DB = db;
  fetchCalls = [];
  aisensy = AI.ok;
  resend = () => ({ status: 200, body: { id: 'em_1' } });
  con.warn.length = 0; con.error.length = 0; con.log.length = 0;
  setNow('2026-09-30T14:00:00+05:30');
  db.seed('lifecycle_sequences', Object.values(SEQ));
  db.seed('lifecycle_sequence_steps', [
    step(SEQ.s1, 0, 'email', 'em_t_confirm'),
    step(SEQ.s1, 1, 'whatsapp', 'wa_t_day_before', { absolute_anchor: 'webinar_date', anchor_offset_hours: -24 }),
    step(SEQ.s1, 2, 'whatsapp', 'wa_t_one_hour', { absolute_anchor: 'webinar_date', anchor_offset_hours: -1 }),
    step(SEQ.s1, 3, 'whatsapp', 'wa_t_live_now', { absolute_anchor: 'webinar_date', anchor_offset_hours: 0 }),
    step(SEQ.s1, 4, 'email', 'em_t_post', { absolute_anchor: 'webinar_date', anchor_offset_hours: 24 }),
    step(SEQ.gen, 0, 'whatsapp', 'wa_t_generic'),
    step(SEQ.gen, 1, 'email', 'em_t_followup', { delay_hours: 1 }),
    step(SEQ.p9, 0, 'whatsapp', 'wa_t_p9'),
    step(SEQ.p9, 1, 'email', 'em_t_p9', { delay_hours: 1 }),
    step(SEQ.p2, 0, 'whatsapp', 'wa_t_p2'),
    step(SEQ.p4, 0, 'whatsapp', 'wa_t_p4'),
  ]);
  db.seed('lifecycle_templates', [wa('wa_t_day_before'), wa('wa_t_one_hour'), wa('wa_t_live_now'), wa('wa_t_generic'), wa('wa_t_p9'), wa('wa_t_p2'), wa('wa_t_p4'), em('em_t_confirm'), em('em_t_post'), em('em_t_followup'), em('em_t_p9')]);
  db.tables.lifecycle_engine_alerts = [];
  db.tables.lifecycle_dispatch_log = [];
}

let n = 0;
function enrol({ seq = SEQ.gen, email, s = 0, dueMinAgo = 1, ctx = {}, failure_count = 0, last_attempt_at = null, enrolled_at = iso(fakeNow - 86400000), mobile = '9876543210', id }) {
  const row = {
    id: id || 'enr-' + ++n, sequence_id: seq.id, email: email || `user${n}@example.com`, mobile, status: 'active',
    context: { full_name: 'Test User', ...ctx }, enrolled_at, current_step_index: s, next_send_at: iso(fakeNow - dueMinAgo * 60000),
    failure_count, last_attempt_at, last_sent_at: null, exit_reason: null, dedupe_key: '',
  };
  db.t('lifecycle_sequence_enrolments').push(row);
  return row.id;
}
const E = (id) => db.t('lifecycle_sequence_enrolments').find((r) => r.id === id);
const logs = () => db.t('lifecycle_dispatch_log');
async function tick(body = {}) {
  const res = await handler(new Request('http://fn/', { method: 'POST', body: JSON.stringify(body) }));
  const j = await res.json();
  if (process.env.DEBUG_SIM) process.stderr.write('TICK ' + JSON.stringify(j) + '\nERR ' + JSON.stringify(con.error) + '\n');
  return j;
}
const outcomeOf = (out, id) => out.results.find((r) => r.enrolment_id === id);

// ═════════════════════════════════════════════════════════════════════════════════════════════════
test('baseline: a healthy WhatsApp send is byte-compatible (sent row, no tag, events, inbox mirror)', async () => {
  fresh();
  const id = enrol({ email: 'ok@example.com' });
  const out = await tick();
  assert.equal(out.sent, 1);
  assert.equal(aiCalls().length, 1);
  assert.equal(aiCalls()[0].hasSignal, true, 'AiSensy call carries the 20s abort signal');
  assert.equal(aiCalls()[0].body.campaignName, 'camp_wa_t_generic');
  const row = logs()[0];
  assert.equal(row.status, 'sent'); assert.equal(row.skip_reason, null); assert.equal(row.provider, 'aisensy'); assert.ok(row.provider_message_id);
  assert.equal(E(id).current_step_index, 1);
  assert.equal(E(id).failure_count, 0);
  assert.equal(db.t('lifecycle_events').length, 1);
  assert.equal(db.t('notifications').length, 1, 'student-track inbox mirror still written');
  assert.equal(out.wa_breaker.open, false);
});

test('OUTAGE tick: exactly ONE AiSensy probe, rest deferred without a call, nothing counted, email still flows', async () => {
  fresh();
  aisensy = AI.noPlan;
  const waIds = [1, 2, 3, 4, 5].map((i) => enrol({ email: `wa${i}@example.com`, dueMinAgo: 10 - i }));
  const emailId = enrol({ email: 'mail@example.com', s: 1, dueMinAgo: 0.5 });
  const out = await tick();
  assert.equal(aiCalls().length, 1, 'one probe only');
  const failed = logs().filter((r) => r.status === 'failed');
  assert.equal(failed.length, 1, 'ONE failure row for the tick, none per deferred enrolment');
  assert.equal(failed[0].skip_reason, 'provider_outage:no_plan');
  assert.match(failed[0].error_message, /^AiSensy 400: .*No Plan active on assistant!/);
  const nextExpected = iso(fakeNow + 15 * 60000);
  for (const id of waIds) {
    const e = E(id);
    assert.equal(e.status, 'active'); assert.equal(e.failure_count, 0, 'failure_count untouched'); assert.equal(e.current_step_index, 0);
    assert.equal(e.next_send_at, nextExpected, 'now + 15 min (inside the 09-21 window)'); assert.equal(e.last_attempt_at, null);
  }
  assert.equal(E(emailId).status, 'completed', 'email step of another enrolment still went out');
  assert.equal(mailCalls().length, 1);
  assert.equal(out.deferred, 5); assert.equal(out.failed, 0);
  assert.deepEqual({ open: out.wa_breaker.open, reason: out.wa_breaker.reason, probe_failures: out.wa_breaker.probe_failures, deferred_without_call: out.wa_breaker.deferred_without_call }, { open: true, reason: 'no_plan', probe_failures: 1, deferred_without_call: 4 });
});

test('RECOVERY: next tick after the account is fixed sends everything; breaker never opens', async () => {
  fresh();
  aisensy = AI.noPlan;
  const ids = [1, 2, 3].map((i) => enrol({ email: `r${i}@example.com`, dueMinAgo: 10 - i }));
  await tick();
  assert.ok(ids.every((id) => E(id).current_step_index === 0));
  aisensy = AI.ok; advanceMin(16);
  const out = await tick();
  assert.equal(out.sent, 3);
  assert.ok(ids.every((id) => E(id).current_step_index === 1 && E(id).failure_count === 0));
  assert.equal(out.wa_breaker.open, false);
  assert.equal(logs().filter((r) => r.status === 'sent').length, 3);
});

test('WCC exhausted (402) behaves the same as No Plan', async () => {
  fresh();
  aisensy = AI.wcc;
  const a = enrol({}); const b = enrol({});
  const out = await tick();
  assert.equal(aiCalls().length, 1);
  assert.equal(out.wa_breaker.reason, 'wcc_exhausted');
  assert.equal(E(a).failure_count + E(b).failure_count, 0);
});

test('DEFERRAL respects the send window: outage at 20:55 IST defers to 09:00 next morning', async () => {
  fresh(); setNow('2026-09-30T20:55:00+05:30');
  aisensy = AI.noPlan;
  const id = enrol({});
  await tick();
  assert.equal(E(id).next_send_at, iso(ist('2026-10-01T09:00:00')));
});

test('48h SAFETY VALVE: expired steps fall back to counting failures (and bypass the breaker as probes)', async () => {
  fresh();
  aisensy = AI.noPlan;
  const old = iso(fakeNow - 3 * 86400000);
  const A = enrol({ dueMinAgo: 9, enrolled_at: iso(fakeNow - 5 * 86400000), last_attempt_at: old });
  const B = enrol({ dueMinAgo: 8 }); // fresh
  const C = enrol({ dueMinAgo: 7, enrolled_at: iso(fakeNow - 5 * 86400000), last_attempt_at: old });
  const out = await tick();
  assert.equal(E(A).failure_count, 1, 'valve-expired probe is counted');
  assert.equal(E(A).next_send_at, iso(fakeNow + 5 * 60000), 'old backoff (5 min)');
  assert.equal(E(B).failure_count, 0, 'non-expired step deferred without a call');
  assert.equal(E(B).next_send_at, iso(fakeNow + 15 * 60000));
  assert.equal(E(C).failure_count, 1, 'expired step bypasses the open breaker and is really attempted');
  assert.equal(aiCalls().length, 2);
  assert.equal(out.wa_breaker.open, true);
});

test('48h valve: third strike finally fails an expired enrolment', async () => {
  fresh();
  aisensy = AI.noPlan;
  const A = enrol({ enrolled_at: iso(fakeNow - 6 * 86400000), last_attempt_at: iso(fakeNow - 4 * 86400000), failure_count: 2 });
  const out = await tick();
  assert.equal(E(A).status, 'failed'); assert.match(E(A).exit_reason, /^max_failures:AiSensy 400/);
  assert.equal(outcomeOf(out, A).outcome, 'failed');
});

test('valve-bypass success closes the breaker for the rest of the tick', async () => {
  fresh();
  const old = iso(fakeNow - 3 * 86400000);
  // first (fresh) enrolment probes with a 402 -> breaker opens; the valve-expired second one is really attempted and SUCCEEDS
  let n = 0; aisensy = () => (++n === 1 ? AI.wcc() : AI.ok());
  const A = enrol({ dueMinAgo: 9 });
  const B = enrol({ dueMinAgo: 8, enrolled_at: iso(fakeNow - 5 * 86400000), last_attempt_at: old });
  const C = enrol({ dueMinAgo: 7 });
  const out = await tick();
  assert.equal(E(A).current_step_index, 0); assert.equal(E(A).failure_count, 0);
  assert.equal(E(B).current_step_index, 1, 'B sent');
  assert.equal(E(C).current_step_index, 1, 'breaker closed by B success -> C sent too');
  assert.equal(out.wa_breaker.open, false);
});

test('RECIPIENT error: logged once, step ADVANCED, enrolment lives, next recipient still gets a real call', async () => {
  fresh();
  let n = 0; aisensy = () => (++n === 1 ? AI.invalidNumber() : AI.ok());
  const X = enrol({ dueMinAgo: 5 }); const Y = enrol({ dueMinAgo: 4 });
  const out = await tick();
  const bad = logs().find((r) => r.status === 'failed');
  assert.equal(bad.skip_reason, 'recipient_error:invalid_recipient'); assert.match(bad.error_message, /Invalid Number/);
  assert.equal(E(X).status, 'active'); assert.equal(E(X).current_step_index, 1); assert.equal(E(X).failure_count, 0);
  assert.equal(E(Y).current_step_index, 1);
  assert.equal(aiCalls().length, 2);
  assert.equal(out.wa_breaker.open, false);
  assert.match(outcomeOf(out, X).detail, /wa_recipient_error/);
});

test('CONFIG error: 3 strikes (5 / 30 min backoff, window-clamped) then failed, tagged config_error', async () => {
  fresh(); aisensy = AI.noCampaign;
  const id = enrol({});
  await tick();
  assert.equal(E(id).failure_count, 1); assert.equal(E(id).next_send_at, iso(fakeNow + 5 * 60000));
  assert.equal(logs()[0].skip_reason, 'config_error:campaign_missing');
  advanceMin(6); await tick();
  assert.equal(E(id).failure_count, 2); assert.equal(E(id).next_send_at, iso(fakeNow + 30 * 60000));
  advanceMin(31); const out = await tick();
  assert.equal(E(id).status, 'failed'); assert.match(E(id).exit_reason, /^max_failures:AiSensy 400/);
  assert.equal(outcomeOf(out, id).outcome, 'failed');
  assert.equal(logs().filter((r) => r.skip_reason === 'config_error:campaign_missing').length, 3);
});

test('TRANSIENT 503: a single poisoned recipient does NOT block WhatsApp for everyone', async () => {
  fresh();
  let n = 0; aisensy = () => (++n === 1 ? AI.unavailable() : AI.ok());
  const A = enrol({ dueMinAgo: 5 }); const B = enrol({ dueMinAgo: 4 }); const C = enrol({ dueMinAgo: 3 });
  const out = await tick();
  assert.equal(E(A).current_step_index, 0); assert.equal(E(A).failure_count, 0); assert.equal(E(A).next_send_at, iso(fakeNow + 15 * 60000));
  assert.equal(E(B).current_step_index, 1); assert.equal(E(C).current_step_index, 1);
  assert.equal(aiCalls().length, 3);
  assert.equal(out.wa_breaker.open, false);
  assert.equal(logs().filter((r) => String(r.skip_reason).startsWith('provider_outage')).length, 1);
});

test('TRANSIENT 503 twice in a row opens the breaker; the third is deferred without a call', async () => {
  fresh(); aisensy = AI.unavailable;
  const ids = [5, 4, 3].map((m) => enrol({ dueMinAgo: m }));
  const out = await tick();
  assert.equal(aiCalls().length, 2);
  assert.equal(out.wa_breaker.open, true); assert.equal(out.wa_breaker.deferred_without_call, 1);
  assert.ok(ids.every((id) => E(id).failure_count === 0 && E(id).status === 'active'));
});

test('missing AISENSY_API_KEY is an outage, not 3 strikes', async () => {
  fresh(); const saved = ENV.AISENSY_API_KEY; delete ENV.AISENSY_API_KEY;
  try {
    const a = enrol({}); const b = enrol({});
    const out = await tick();
    assert.equal(aiCalls().length, 0);
    assert.equal(out.wa_breaker.reason, 'api_key_missing');
    assert.equal(E(a).failure_count + E(b).failure_count, 0);
    assert.equal(logs().filter((r) => String(r.skip_reason).startsWith('provider_outage')).length, 1);
  } finally { ENV.AISENSY_API_KEY = saved; }
});

// ── too-late guard ───────────────────────────────────────────────────────────────────────────────
const ctx1800 = { webinar_date: '2026-09-30', webinar_time: '18:00:00' };

test('TOO LATE: live-now WA 50 min after the webinar started is skipped + advanced, never sent', async () => {
  fresh(); setNow('2026-09-30T18:50:00+05:30');
  const id = enrol({ seq: SEQ.s1, s: 3, ctx: ctx1800 });
  const out = await tick();
  assert.equal(aiCalls().length, 0);
  const row = logs()[0];
  assert.equal(row.status, 'skipped'); assert.equal(row.skip_reason, 'too_late'); assert.equal(row.channel, 'whatsapp');
  assert.equal(E(id).current_step_index, 4); assert.equal(E(id).failure_count, 0); assert.equal(E(id).status, 'active');
  assert.match(outcomeOf(out, id).detail, /too_late/);
});

test('TOO LATE: "starts in 1 hour" (-1h) sent 20 min late is fine, 50 min late is skipped', async () => {
  fresh(); setNow('2026-09-30T17:20:00+05:30');
  const a = enrol({ seq: SEQ.s1, s: 2, ctx: ctx1800 });
  await tick();
  assert.equal(aiCalls().length, 1); assert.equal(E(a).current_step_index, 3);
  fresh(); setNow('2026-09-30T17:50:00+05:30');
  const b = enrol({ seq: SEQ.s1, s: 2, ctx: ctx1800 });
  await tick();
  assert.equal(aiCalls().length, 0); assert.equal(logs()[0].skip_reason, 'too_late'); assert.equal(E(b).current_step_index, 3);
});

test('TOO LATE: outage deferral of the live-now step ends in a skip once past +45 min (never sent late)', async () => {
  fresh(); aisensy = AI.noPlan; setNow('2026-09-30T18:02:00+05:30');
  const id = enrol({ seq: SEQ.s1, s: 3, ctx: ctx1800 });
  await tick();
  assert.equal(E(id).current_step_index, 3, 'deferred while within grace'); assert.equal(aiCalls().length, 1);
  aisensy = AI.ok; advanceMin(16); await tick();          // 18:18 -> still inside grace, account back -> sent
  assert.equal(E(id).current_step_index, 4); assert.equal(aiCalls().length, 2);
  // same story but the account stays down past 18:45
  fresh(); aisensy = AI.noPlan; setNow('2026-09-30T18:02:00+05:30');
  const id2 = enrol({ seq: SEQ.s1, s: 3, ctx: ctx1800 });
  await tick(); advanceMin(16); await tick(); advanceMin(16); await tick(); advanceMin(16); await tick(); // 18:50 -> too late
  assert.equal(E(id2).current_step_index, 4);
  assert.equal(logs().filter((r) => r.skip_reason === 'too_late').length, 1);
  assert.equal(aiCalls().length, 3, 'one probe per tick while inside the grace (18:02, 18:18, 18:34), none once too late');
});

test('day-before WA (-24h): 50 min late (cron gap) is still sent; 7h late is skipped', async () => {
  fresh(); setNow('2026-09-29T18:50:00+05:30'); // reminder for the 18:00 webinar on 30 Sep was due 29 Sep 18:00
  const a = enrol({ seq: SEQ.s1, s: 1, ctx: ctx1800 });
  await tick();
  assert.equal(aiCalls().length, 1); assert.equal(E(a).current_step_index, 2);
  fresh(); setNow('2026-09-30T01:00:00+05:30'); // 7h late (window would have pushed it to 09:00 anyway)
  const b = enrol({ seq: SEQ.s1, s: 1, ctx: ctx1800 });
  await tick();
  assert.equal(aiCalls().length, 0); assert.equal(logs()[0].skip_reason, 'too_late'); assert.equal(E(b).current_step_index, 2);
});

test('non-anchored WhatsApp steps are NEVER too-late (behaviour unchanged)', async () => {
  fresh();
  const id = enrol({ seq: SEQ.gen, dueMinAgo: 60 * 24 * 5, enrolled_at: iso(fakeNow - 9 * 86400000) });
  await tick();
  assert.equal(aiCalls().length, 1); assert.equal(E(id).current_step_index, 1);
});

test('email steps with an anchor <= 0 are not subject to the too-late guard', async () => {
  fresh(); setNow('2026-09-30T20:00:00+05:30');
  // s1 step 1 is WA in this fixture; craft an email step anchored -24h via s1 step 0? use a dedicated seq
  const seq = { id: 'seq-e', sequence_key: 'e_anchor', track: 'student', is_active: true, exit_on_events: [] };
  db.seed('lifecycle_sequences', [seq]);
  db.seed('lifecycle_sequence_steps', [step(seq, 0, 'email', 'em_t_confirm', { absolute_anchor: 'webinar_date', anchor_offset_hours: -1 })]);
  const id = enrol({ seq, ctx: ctx1800 });
  await tick();
  assert.equal(mailCalls().length, 1); assert.equal(E(id).status, 'completed');
});

// ── partner pause gate ───────────────────────────────────────────────────────────────────────────
function pauseMap(m) { db.rpcHandlers.partner_wa_pause_state = ({ p_email }) => ({ data: m[p_email] ?? null, error: null }); }

test('PAUSE GATE matrix: promotional blocks promotional only; all blocks everything; unpaused sends', async () => {
  fresh();
  pauseMap({ 'a@p.com': 'promotional', 'b@p.com': 'promotional', 'c@p.com': 'all', 'e@p.com': 'all', 'g@p.com': 'promotional' });
  const A = enrol({ seq: SEQ.p9, email: 'a@p.com' });     // promotional + promotional  -> skipped
  const B = enrol({ seq: SEQ.p2, email: 'b@p.com' });     // promotional + transactional -> SENT
  const C = enrol({ seq: SEQ.p2, email: 'c@p.com' });     // all + transactional         -> skipped
  const D = enrol({ seq: SEQ.p9, email: 'd@p.com' });     // not paused                  -> sent
  const G = enrol({ seq: SEQ.p4, email: 'g@p.com' });     // sequence has NO comms_class -> treated promotional -> skipped
  const out = await tick();
  const skipped = logs().filter((r) => r.skip_reason === 'wa_paused').map((r) => r.recipient_email).sort();
  assert.deepEqual(skipped, ['a@p.com', 'c@p.com', 'g@p.com']);
  assert.ok(logs().filter((r) => r.skip_reason === 'wa_paused').every((r) => r.status === 'skipped' && r.channel === 'whatsapp'));
  const sentTo = aiCalls().map((c) => c.body.destination).length;
  assert.equal(sentTo, 2, 'only b (transactional) and d (unpaused) reach AiSensy');
  assert.equal(E(A).current_step_index, 1, 'paused promotional step advanced to the email step');
  assert.equal(E(A).status, 'active'); assert.equal(E(A).failure_count, 0);
  assert.equal(E(C).status, 'completed', 'single-step sequence completes when its only WA step is skipped');
  assert.equal(E(B).status, 'completed'); assert.equal(E(D).current_step_index, 1);
  assert.equal(E(G).status, 'completed');
  assert.match(outcomeOf(out, A).detail, /wa_paused/);
  assert.equal(out.wa_breaker.open, false);
});

test('PAUSE GATE: email steps of a paused partner still send; student-track never consults the pause', async () => {
  fresh();
  pauseMap({ 'p@p.com': 'all' });
  const mail = enrol({ seq: SEQ.p9, email: 'p@p.com', s: 1 });          // partner EMAIL step
  const student = enrol({ seq: SEQ.gen, email: 'p@p.com' });            // same person, STUDENT-track WhatsApp
  await tick();
  assert.equal(E(mail).status, 'completed'); assert.equal(mailCalls().length, 1);
  assert.equal(E(student).current_step_index, 1); assert.equal(aiCalls().length, 1);
  assert.equal(db.rpcCalls.length, 0, 'the pause RPC was not called for email steps or student-track sequences');
});

test('PAUSE GATE: RPC not created yet (42883) = not paused, one console warning', async () => {
  fresh(); // no handler registered -> mock returns 42883
  const a = enrol({ seq: SEQ.p9, email: 'x1@p.com' }); const b = enrol({ seq: SEQ.p9, email: 'x2@p.com' });
  await tick();
  assert.equal(aiCalls().length, 2); assert.equal(E(a).current_step_index, 1); assert.equal(E(b).current_step_index, 1);
});

test('PAUSE GATE: PGRST202 (function not in schema cache) is treated the same as 42883', async () => {
  fresh();
  db.rpcHandlers.partner_wa_pause_state = () => ({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } });
  const a = enrol({ seq: SEQ.p9, email: 'x3@p.com' });
  await tick();
  assert.equal(aiCalls().length, 1); assert.equal(E(a).current_step_index, 1);
});

test('PAUSE GATE: any OTHER rpc error defers 5 min, no AiSensy call, no failure, no log row', async () => {
  fresh();
  db.rpcHandlers.partner_wa_pause_state = () => ({ data: null, error: { code: '42501', message: 'permission denied for function partner_wa_pause_state' } });
  const a = enrol({ seq: SEQ.p9, email: 'x4@p.com' });
  const out = await tick();
  assert.equal(aiCalls().length, 0); assert.equal(logs().length, 0);
  assert.equal(E(a).failure_count, 0); assert.equal(E(a).current_step_index, 0);
  assert.equal(E(a).next_send_at, iso(fakeNow + 5 * 60000));
  assert.match(outcomeOf(out, a).detail, /^pause_check_failed:42501/);
  assert.equal(outcomeOf(out, a).outcome, 'deferred');
});

test('PAUSE GATE runs BEFORE the breaker: a paused partner is skipped even while WhatsApp is down', async () => {
  fresh(); aisensy = AI.noPlan; pauseMap({ 'z@p.com': 'promotional' });
  enrol({ dueMinAgo: 9 });                                     // probes -> breaker opens
  const Z = enrol({ seq: SEQ.p9, email: 'z@p.com', dueMinAgo: 5 });
  await tick();
  assert.equal(E(Z).current_step_index, 1, 'skipped+advanced (not left deferred forever)');
  assert.equal(logs().filter((r) => r.skip_reason === 'wa_paused').length, 1);
});

// ── dry_run / preview write NOTHING ──────────────────────────────────────────────────────────────
test('dry_run: paused partner, too-late step, healthy step, email step, breaker path -> ZERO writes, ZERO fetches', async () => {
  fresh(); setNow('2026-09-30T18:40:00+05:30');
  pauseMap({ 'dp@p.com': 'all' });
  enrol({ seq: SEQ.p9, email: 'dp@p.com' });
  enrol({ seq: SEQ.s1, s: 3, ctx: ctx1800 });
  enrol({ seq: SEQ.gen });
  enrol({ seq: SEQ.p9, email: 'pm@p.com', s: 1 });
  const before = db.snapshot();
  const out = await tick({ dry_run: true });
  assert.equal(db.snapshot(), before, 'database untouched');
  assert.equal(db.writes, 0);
  assert.equal(fetchCalls.length, 0);
  assert.equal(out.dry_run, true);
  assert.ok(out.results.some((r) => /DRY_RUN advance/.test(r.detail || '')), 'pause / too-late reported as dry advance');
});

test('dry_run with a pause-check RPC error still writes nothing', async () => {
  fresh();
  db.rpcHandlers.partner_wa_pause_state = () => ({ data: null, error: { code: '42501', message: 'nope' } });
  enrol({ seq: SEQ.p9, email: 'dq@p.com' });
  const before = db.snapshot();
  await tick({ dry_run: true });
  assert.equal(db.snapshot(), before);
});

test('preview: renders the partner-track unsubscribe link on www (not the 404 partner host) and writes nothing', async () => {
  fresh();
  const id = enrol({ seq: SEQ.p9, email: 'pv@p.com', s: 1 });
  const before = db.snapshot();
  const res = await handler(new Request('http://fn/', { method: 'POST', body: JSON.stringify({ preview: true, enrolment_id: id }) }));
  const j = await res.json();
  assert.equal(db.snapshot(), before); assert.equal(fetchCalls.length, 0);
  assert.equal(j.channel, 'email');
  assert.ok(j.body_html.includes(`https://www.ostaran.com/unsubscribe/${id}`), j.body_html);
  assert.ok(!j.body_html.includes('partner.ostaran.com/unsubscribe'));
});

test('real partner email carries the working unsubscribe host', async () => {
  fresh();
  const id = enrol({ seq: SEQ.p9, email: 'pe@p.com', s: 1 });
  await tick();
  assert.equal(mailCalls().length, 1);
  assert.ok(mailCalls()[0].body.html.includes(`https://www.ostaran.com/unsubscribe/${id}`));
});

// ── retry window clamp (existing 3-strike retry) ─────────────────────────────────────────────────
test('retry backoff respects the send window (email failure at 20:59 IST retries at 09:00 next day, not +5 min)', async () => {
  fresh(); setNow('2026-09-30T20:59:00+05:30');
  resend = () => ({ status: 500, body: { message: 'boom' } });
  const id = enrol({ seq: SEQ.gen, s: 1, dueMinAgo: 2 });   // email step
  await tick();
  assert.equal(E(id).failure_count, 1);
  assert.equal(E(id).next_send_at, iso(ist('2026-10-01T09:00:00')));
});

// ── alerting ─────────────────────────────────────────────────────────────────────────────────────
function seedAdmins() {
  db.seed('admin_users', [
    { email: 'Founder@Example.com', role: 'super_admin', status: 'active' },
    { email: 'dev@example.com', role: 'dev_admin', status: 'active' },
    { email: 'viewer@example.com', role: 'viewer', status: 'active' },
    { email: 'gone@example.com', role: 'dev_admin', status: 'inactive' },
  ]);
}
async function outageTicks(k) { const outs = []; for (let i = 0; i < k; i++) { enrol({ dueMinAgo: 1 }); outs.push(await tick()); if (i < k - 1) advanceMin(5); } return outs; }

test('ALERT: 3 consecutive outage ticks -> one alerts row + ONE email to active admins; cooldown suppresses repeats for 6h', async () => {
  fresh(); aisensy = AI.noPlan; seedAdmins();
  const outs = await outageTicks(2);
  assert.equal(alertMails().length, 0, 'no alert after 2 ticks'); assert.match(outs[1].wa_breaker.alert, /^not_sustained/);
  advanceMin(5); enrol({ dueMinAgo: 1 }); const third = await tick();
  assert.equal(third.wa_breaker.alert, 'alerted');
  assert.equal(alertMails().length, 1);
  const m = alertMails()[0].body;
  assert.equal(m.from, 'oStaran Ops <ai@ostaran.com>');
  assert.deepEqual([...m.to].sort(), ['dev@example.com', 'founder@example.com']);
  assert.deepEqual(m.bcc, ['star.analytix.ai@gmail.com']);
  assert.match(m.subject, /WhatsApp sending is down \(no_plan\)/);
  assert.ok(!JSON.stringify(m).includes('SECRET-'), 'no secrets in the alert email');
  const al = db.t('lifecycle_engine_alerts');
  assert.ok(!JSON.stringify(al).includes('SECRET-'), 'no secrets in the alerts row'); assert.equal(al.length, 1); assert.equal(al[0].kind, 'wa_provider_outage'); assert.equal(al[0].detail.reason, 'no_plan'); assert.ok(al[0].detail.ticks >= 3); assert.ok(al[0].id);
  const firstAlertAt = fakeNow;
  // the outage continues: a probing tick every 5 minutes for the next 5h50m -> every one is inside the 6h cooldown
  let sawCooldown = 0;
  while (fakeNow - firstAlertAt < (6 * 60 - 10) * 60000) { advanceMin(5); enrol({ dueMinAgo: 1 }); const o = await tick(); assert.equal(o.wa_breaker.alert, 'cooldown', `at +${(fakeNow - firstAlertAt) / 60000} min`); sawCooldown++; }
  assert.ok(sawCooldown > 60);
  assert.equal(alertMails().length, 1, 'exactly one email during the first 6 hours');
  // past 6h and STILL down -> the next alert goes out (once)
  let more = 0;
  for (let i = 0; i < 6; i++) { advanceMin(5); enrol({ dueMinAgo: 1 }); const o = await tick(); if (o.wa_breaker.alert === 'alerted') more++; }
  assert.equal(more, 1); assert.equal(alertMails().length, 2); assert.equal(db.t('lifecycle_engine_alerts').length, 2);
});

test('ALERT: a successful WhatsApp send between failures resets the run (no false alarm after recovery)', async () => {
  fresh(); aisensy = AI.noPlan; seedAdmins();
  await outageTicks(2);
  aisensy = AI.ok; advanceMin(5); enrol({ dueMinAgo: 1 }); await tick();       // recovered: a sent row
  aisensy = AI.noPlan; advanceMin(5); enrol({ dueMinAgo: 1 }); const o = await tick(); // blip
  assert.match(o.wa_breaker.alert, /^not_sustained/);
  assert.equal(alertMails().length, 0);
});

test('ALERT: lifecycle_engine_alerts table missing -> tolerated (warning, no email, tick still fine)', async () => {
  fresh(); aisensy = AI.noPlan; seedAdmins();
  db.tableErrors.lifecycle_engine_alerts = { code: 'PGRST205', message: "Could not find the table 'public.lifecycle_engine_alerts' in the schema cache" };
  const outs = await outageTicks(3);
  assert.equal(outs[2].wa_breaker.alert, 'alerts_table_unavailable');
  assert.equal(alertMails().length, 0);
  assert.ok(con.warn.some((w) => /lifecycle_engine_alerts/.test(w) && /table missing/.test(w)));
  assert.equal(outs[2].success, true);
});

test('ALERT: Postgres 42P01 is also recognised as "table missing"', async () => {
  fresh(); aisensy = AI.noPlan;
  db.tableErrors.lifecycle_engine_alerts = { code: '42P01', message: 'relation "lifecycle_engine_alerts" does not exist' };
  const outs = await outageTicks(3);
  assert.equal(outs[2].wa_breaker.alert, 'alerts_table_unavailable');
  assert.ok(con.warn.some((w) => /table missing/.test(w)));
});

test('ALERT: email failure releases the claim so the next tick retries', async () => {
  fresh(); aisensy = AI.noPlan; seedAdmins();
  resend = () => ({ status: 500, body: { message: 'resend down' } });
  const outs = await outageTicks(3);
  assert.equal(outs[2].wa_breaker.alert, 'email_failed');
  assert.equal(db.t('lifecycle_engine_alerts').length, 0);
  resend = () => ({ status: 200, body: { id: 'ok' } });
  advanceMin(5); enrol({ dueMinAgo: 1 }); const again = await tick();
  assert.equal(again.wa_breaker.alert, 'alerted'); assert.equal(db.t('lifecycle_engine_alerts').length, 1);
});

test('ALERT: an idempotent_skip "sent" row does not reset the outage run', async () => {
  fresh(); aisensy = AI.noPlan; seedAdmins();
  await outageTicks(2);
  db.t('lifecycle_dispatch_log').push({ id: 'idem', channel: 'whatsapp', status: 'sent', provider_message_id: 'idempotent_skip', attempted_at: iso(fakeNow + 1000), recipient_email: 'x@y.z' });
  advanceMin(5); enrol({ dueMinAgo: 1 }); const third = await tick();
  assert.equal(third.wa_breaker.alert, 'alerted');
});

test('ALERT: no admin_users rows -> falls back to the mailbox the dispatcher already BCCs (no invented address)', async () => {
  fresh(); aisensy = AI.noPlan;
  await outageTicks(3);
  const m = alertMails().at(-1).body;
  assert.deepEqual(m.to, ['star.analytix.ai@gmail.com']); assert.deepEqual(m.bcc ?? [], []);
});

test('ALERT: healthy tick makes no alert; dry_run never alerts or writes', async () => {
  fresh(); aisensy = AI.noPlan; seedAdmins();
  await outageTicks(3); const mails = alertMails().length;
  assert.equal(mails, 1);
  fresh(); enrol({}); const out = await tick();
  assert.equal(out.wa_breaker.alert, null); assert.equal(alertMails().length, 0);
  // dry_run during an outage: no alert, no writes
  fresh(); aisensy = AI.noPlan; seedAdmins(); enrol({});
  const b4 = db.snapshot(); const dry = await tick({ dry_run: true });
  assert.equal(dry.wa_breaker.alert, null); assert.equal(db.snapshot(), b4); assert.equal(fetchCalls.length, 0);
});

// ── breaker is per invocation ────────────────────────────────────────────────────────────────────
test('breaker is NOT sticky across invocations (warm isolate): next tick probes again', async () => {
  fresh(); aisensy = AI.noPlan;
  enrol({ dueMinAgo: 3 }); await tick();
  assert.equal(aiCalls().length, 1);
  advanceMin(16); enrol({ dueMinAgo: 1 }); const out = await tick();
  assert.ok(aiCalls().length >= 2, 'the second invocation made its own probe');
  assert.equal(out.wa_breaker.open, true);
});

test('forced single-enrolment run ({enrolment_id}) uses its own fresh breaker', async () => {
  fresh(); aisensy = AI.ok;
  const id = enrol({ dueMinAgo: -30 }); // not due yet; forced run ignores next_send_at
  const out = await tick({ enrolment_id: id });
  assert.equal(out.sent, 1);
});

// ── push / email regression ──────────────────────────────────────────────────────────────────────
test('email failure still uses the old 3-strike retry (no classification for email)', async () => {
  fresh(); resend = () => ({ status: 500, body: { message: 'boom' } });
  const id = enrol({ seq: SEQ.gen, s: 1 });
  await tick();
  assert.equal(E(id).failure_count, 1); assert.equal(logs()[0].skip_reason, null, 'email rows carry no class tag');
  assert.equal(logs()[0].status, 'failed');
});
