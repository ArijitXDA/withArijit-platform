/**
 * lifecycle-dispatcher v25 — pure guard logic.
 *
 * RULES FOR THIS FILE
 *  - NO imports of any kind (no jsr:, npm:, https:, node:). It is bundled next to index.ts by the
 *    Supabase CLI and is also unit-tested under plain Node (`node --test`, type-stripping).
 *  - Erasable TypeScript only (no enums / namespaces / parameter properties) so Node's
 *    --experimental-strip-types and Deno both run it unchanged.
 *  - No I/O, no clocks: every function takes `nowMs` / timestamps as arguments.
 *
 * What lives here: WhatsApp error classification, the too-late guard, send-window clamping,
 * the in-memory provider breaker state machine, the sustained-outage detector, pause-scope
 * decision, and the alert email builder.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tunables
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A time-critical WhatsApp step (-1h, live-now) is skipped when now > scheduled send time + this.
 * 45 min (was 30): live data showed real dispatch lag up to ~20 min and the cron drops ticks for 30-50 min at a time;
 * a 90-minute webinar is still in progress 45 min after its start, so a live-now ping remains valid.
 */
export const TOO_LATE_GRACE_MIN = 45;
/**
 * Long-lead reminders ("day before", offset <= LONG_LEAD_OFFSET_HOURS) keep their copy valid for hours, and the
 * dispatcher cron is known to skip ticks for 30-50 min at a time, so a 30 min grace would silently drop them.
 * DELIBERATE deviation from a flat 30 min; set LONG_LEAD_GRACE_MIN = 30 to make it flat again.
 */
export const LONG_LEAD_OFFSET_HOURS = -3;
export const LONG_LEAD_GRACE_MIN = 360;
/** Provider-outage deferral. */
export const OUTAGE_DEFER_MINUTES = 15;
/** Safety valve: after this long deferred for outage reasons, fall back to counting failures. */
export const OUTAGE_MAX_DEFER_HOURS = 48;
/** Transient provider errors (429/5xx/timeout) need corroboration before the breaker opens. */
export const TRANSIENT_STRIKES_TO_OPEN = 2;
/** Pause-check RPC failure deferral. */
export const PAUSE_CHECK_DEFER_MINUTES = 5;
/** Alerting: 3 distinct probe ticks with no WA success in between = sustained outage. */
export const ALERT_TICKS_NEEDED = 3;
export const ALERT_TICK_MS = 5 * 60 * 1000;
export const ALERT_LOOKBACK_MS = 60 * 60 * 1000;
export const ALERT_COOLDOWN_HOURS = 6;

// ─────────────────────────────────────────────────────────────────────────────
// (a) WhatsApp (AiSensy) error classification
// ─────────────────────────────────────────────────────────────────────────────

export type WaErrorClass = 'provider_outage' | 'recipient' | 'config';
/** account = deterministic account-level (plan/credits/auth); transient = 429/5xx/network. */
export type WaOutageKind = 'account' | 'transient';

export interface WaErrorInfo {
  cls: WaErrorClass;
  kind: WaOutageKind | null; // only set for provider_outage
  httpStatus: number | null;
  reason: string; // short machine tag
}

function outage(kind: WaOutageKind, httpStatus: number | null, reason: string): WaErrorInfo {
  return { cls: 'provider_outage', kind, httpStatus, reason };
}
function recipient(httpStatus: number | null, reason: string): WaErrorInfo {
  return { cls: 'recipient', kind: null, httpStatus, reason };
}
function config(httpStatus: number | null, reason: string): WaErrorInfo {
  return { cls: 'config', kind: null, httpStatus, reason };
}

// Account-level text (works on any HTTP status). Real strings seen in lifecycle_dispatch_log:
//   AiSensy 402: {"name":"ERR402","errorCode":402,"errorMessage":"Insufficient WhatsApp Conversation Credits (WCC)!"}
//   AiSensy 400: {"message":"No Plan active on assistant!","name":"ERR400",...,"aisTraceId":"ais_..."}
const RE_NO_PLAN = /no plan active|plan (?:is )?(?:expired|inactive|not active)|subscription (?:is )?(?:expired|inactive)/i;
const RE_CREDITS = /insufficient[^"]*(?:credit|balance)|conversation credits|\bwcc\b|out of credits|low balance|quota (?:exceeded|exhausted)/i;
const RE_ACCOUNT_BLOCKED = /account (?:is )?(?:suspended|blocked|deactivated|disabled|banned)/i;
const RE_AUTH = /invalid api ?key|api ?key (?:is )?(?:invalid|missing|required|expired|not valid)|unauthori[sz]ed|forbidden|invalid (?:access )?token|access denied/i;
// Recipient-specific (real: AiSensy 400: {"message":"Invalid Number"}).
const RE_RECIPIENT = /invalid number|invalid (?:phone|mobile|destination|whatsapp)|not a valid (?:phone|whatsapp|number|mobile)|(?:not|no) (?:registered|available|present|found|active) (?:on|in|with) whatsapp|not on whatsapp|no whatsapp account|opted[- ]?out|opt[- ]?out|unsubscribed|user (?:has )?blocked|blocked (?:the )?(?:business|number)|undeliverable|incorrect number|number (?:is )?(?:invalid|not valid|incorrect)|invalid recipient/i;
// Non-HTTP failures raised by fetch() itself.
const RE_NETWORK = /fetch failed|failed to fetch|network|timeout|timed out|abort|dns|tls|ssl|socket|connect|connection|reset|refused|unreachable|eai_again|enotfound|econn|error sending request|broken pipe|eof/i;
const RE_TIMEOUT = /timeout|timed out|abort/i;

/**
 * Classify a WhatsApp send error string (as produced by sendWhatsApp():
 *   `AiSensy <status>: <json body>`  or the thrown fetch error message  or
 *   'AISENSY_API_KEY not configured').
 *
 *  PROVIDER_OUTAGE  account-level (402, 400 "No Plan active", WCC exhausted, 401/403 auth,
 *                   missing API key) or transient (429, 5xx, timeout, network). Deferred, never
 *                   counted, never kills an enrolment.
 *  RECIPIENT        bad / non-WhatsApp number etc. Logged once, step advanced.
 *  CONFIG           deterministic campaign / template-param problems and anything unrecognised:
 *                   keeps the existing 3-strike behaviour.
 */
export function classifyWaError(error: string | null | undefined): WaErrorInfo {
  const raw = error === null || error === undefined ? '' : String(error);
  const text = raw.trim();
  if (text === '') return config(null, 'unknown_empty');
  const lower = text.toLowerCase();

  if (lower.includes('aisensy_api_key not configured')) return outage('account', null, 'api_key_missing');

  const m = /^\s*aisensy\s+(\d{3})\b/i.exec(text);
  const status = m ? Number(m[1]) : null;

  if (status === null) {
    // Not an AiSensy HTTP response -> fetch() itself threw.
    if (RE_NETWORK.test(lower)) return outage('transient', null, RE_TIMEOUT.test(lower) ? 'timeout' : 'network');
    return config(null, 'unclassified_non_http');
  }

  if (status === 402) return outage('account', 402, RE_CREDITS.test(text) ? 'wcc_exhausted' : 'payment_required');
  if (status === 401 || status === 403) return outage('account', status, 'auth');
  if (status === 429) return outage('transient', 429, 'rate_limited');
  if (status === 408) return outage('transient', 408, 'timeout');
  if (status >= 500) return outage('transient', status, 'provider_5xx');

  // 4xx (real world: 400): decide on the body text.
  if (RE_NO_PLAN.test(text)) return outage('account', status, 'no_plan');
  if (RE_CREDITS.test(text)) return outage('account', status, 'wcc_exhausted');
  if (RE_ACCOUNT_BLOCKED.test(text)) return outage('account', status, 'account_blocked');
  if (RE_AUTH.test(text)) return outage('account', status, 'auth');
  if (RE_RECIPIENT.test(text)) return recipient(status, 'invalid_recipient');
  if (/campaign[^"]*(?:does not exist|not found|not live|not active|paused|inactive|not approved)/i.test(text)) return config(status, 'campaign_missing');
  if (/params?[^"]*(?:does not match|mismatch|missing|required)|template[^"]*(?:not approved|not found|mismatch)/i.test(text)) return config(status, 'param_mismatch');
  return config(status, 'unclassified_4xx');
}

/** Prefix of every failed-row tag that means "provider outage" (used by the alert query: skip_reason LIKE 'provider_outage%'). */
export const OUTAGE_TAG_PREFIX = 'provider_outage';

/**
 * Tag written to lifecycle_dispatch_log.skip_reason on a FAILED WhatsApp row, in the house `reason:detail`
 * convention (admin filters use split_part(skip_reason, ':', 1)): provider_outage:no_plan,
 * recipient_error:invalid_recipient, config_error:param_mismatch, ...
 * error_message keeps the raw provider text. Health views / KPIs only count status='skipped', so tagging a
 * failed row cannot inflate skip counts.
 */
export function failureTag(info: WaErrorInfo): string {
  const base = info.cls === 'provider_outage' ? OUTAGE_TAG_PREFIX : info.cls === 'recipient' ? 'recipient_error' : 'config_error';
  return base + ':' + info.reason;
}

// ─────────────────────────────────────────────────────────────────────────────
// (d) Too-late guard
// ─────────────────────────────────────────────────────────────────────────────

/** WhatsApp step anchored to an event with offset <= 0 (-24h / -1h / live-now): message copy is relative to send time. */
export function isTimeCriticalWaStep(
  channel: string | null | undefined,
  absoluteAnchor: string | null | undefined,
  offsetHours: number | null | undefined,
): boolean {
  if (channel !== 'whatsapp') return false;
  if (!absoluteAnchor) return false;
  const off = offsetHours === null || offsetHours === undefined ? 0 : Number(offsetHours);
  return Number.isFinite(off) && off <= 0;
}

/** Grace (minutes) after the step's scheduled time before it is "too late", by how far ahead of the event it fires. */
export function tooLateGraceMin(offsetHours: number | null | undefined): number {
  const off = offsetHours === null || offsetHours === undefined ? 0 : Number(offsetHours);
  return Number.isFinite(off) && off <= LONG_LEAD_OFFSET_HOURS ? LONG_LEAD_GRACE_MIN : TOO_LATE_GRACE_MIN;
}

/**
 * `scheduledMs` = the step's own scheduled send time (anchor time INCLUDING its offset, i.e. what
 * computeAnchorTime() returns). Late by more than `graceMin` => skip.
 */
export function isTooLate(nowMs: number, scheduledMs: number, graceMin: number = TOO_LATE_GRACE_MIN): boolean {
  if (!Number.isFinite(nowMs) || !Number.isFinite(scheduledMs)) return false;
  return nowMs > scheduledMs + graceMin * 60000;
}

// ─────────────────────────────────────────────────────────────────────────────
// (e) Send-window clamp + deferral time
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exact port of v24 applySendWindow(): move `when` into the [windowStart, windowEnd] IST window.
 * Before the window -> today's window start; after the window -> tomorrow's window start.
 * Window strings are 'HH:MM' or 'HH:MM:SS' (Postgres time). Fuzz-tested against the v24 original.
 */
export function clampToWindow(when: Date, windowStart: string, windowEnd: string): Date {
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

/** now + minutes, clamped into the step's send window. */
export function deferTime(nowMs: number, minutes: number, windowStart: string, windowEnd: string): Date {
  return clampToWindow(new Date(nowMs + minutes * 60000), windowStart, windowEnd);
}

// ─────────────────────────────────────────────────────────────────────────────
// (b) Outage safety valve + in-memory breaker
// ─────────────────────────────────────────────────────────────────────────────

/** True when the step has been outage-deferred for longer than maxHours since it first became due. */
export function outageDeferralExpired(nowMs: number, firstDueMs: number, maxHours: number = OUTAGE_MAX_DEFER_HOURS): boolean {
  if (!Number.isFinite(nowMs) || !Number.isFinite(firstDueMs)) return false;
  return nowMs - firstDueMs > maxHours * 3600 * 1000;
}

/** Per-invocation state. NEVER module-level: a warm isolate would carry it across ticks and never re-probe. */
export interface WaBreaker {
  open: boolean;
  reason: string | null;
  openedAtMs: number | null;
  transientStrikes: number;
  probeFailures: number; // real AiSensy calls that failed as provider_outage this tick
  deferred: number; // steps deferred WITHOUT calling AiSensy this tick
  sample: string | null; // first provider error text (for the alert)
}

export function newBreaker(): WaBreaker {
  return { open: false, reason: null, openedAtMs: null, transientStrikes: 0, probeFailures: 0, deferred: 0, sample: null };
}

/**
 * Record a provider_outage failure. Account-level errors open the breaker immediately.
 * Transient ones (429/5xx/timeout) need TRANSIENT_STRIKES_TO_OPEN consecutive failures so a single
 * poisoned recipient that makes AiSensy 500 cannot block WhatsApp for everyone. Returns true if
 * the breaker is open afterwards.
 */
export function breakerOnOutage(b: WaBreaker, info: WaErrorInfo, nowMs: number, sampleText?: string): boolean {
  b.probeFailures += 1;
  if (b.sample === null && sampleText) b.sample = sampleText.slice(0, 300);
  if (info.kind === 'account') {
    if (!b.open) { b.open = true; b.openedAtMs = nowMs; b.reason = info.reason; }
    return true;
  }
  b.transientStrikes += 1;
  if (!b.open && b.transientStrikes >= TRANSIENT_STRIKES_TO_OPEN) {
    b.open = true; b.openedAtMs = nowMs; b.reason = info.reason;
  }
  return b.open;
}

/** A real successful WhatsApp send proves the provider is up: close the breaker, clear strikes. */
export function breakerOnSuccess(b: WaBreaker): void {
  b.transientStrikes = 0;
  if (b.open) { b.open = false; b.reason = null; b.openedAtMs = null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// (g) Sustained-outage detection + alert cooldown + email body
// ─────────────────────────────────────────────────────────────────────────────

export interface SustainedVerdict { sustained: boolean; ticks: number; firstMs: number | null; lastMs: number | null }

/**
 * `probeTimesMs` = timestamps of lifecycle_dispatch_log rows (status='failed', skip_reason='provider_outage').
 * Sustained = probe failures in >= ALERT_TICKS_NEEDED distinct 5-minute tick buckets within the last
 * hour, counting only failures AFTER the most recent successful WhatsApp send (`lastWaSentMs`).
 */
export function sustainedOutage(
  probeTimesMs: number[],
  lastWaSentMs: number | null,
  nowMs: number,
  needTicks: number = ALERT_TICKS_NEEDED,
  tickMs: number = ALERT_TICK_MS,
  lookbackMs: number = ALERT_LOOKBACK_MS,
): SustainedVerdict {
  const floor = lastWaSentMs === null ? -Infinity : lastWaSentMs;
  const rel = probeTimesMs.filter((t) => Number.isFinite(t) && t >= nowMs - lookbackMs && t <= nowMs + tickMs && t > floor);
  const buckets = new Set<number>();
  for (const t of rel) buckets.add(Math.floor(t / tickMs));
  const sorted = rel.slice().sort((a, b) => a - b);
  return {
    sustained: buckets.size >= needTicks,
    ticks: buckets.size,
    firstMs: sorted.length ? sorted[0] : null,
    lastMs: sorted.length ? sorted[sorted.length - 1] : null,
  };
}

export function alertCooldownElapsed(lastAlertMs: number | null, nowMs: number, cooldownHours: number = ALERT_COOLDOWN_HOURS): boolean {
  if (lastAlertMs === null || !Number.isFinite(lastAlertMs)) return true;
  return nowMs - lastAlertMs >= cooldownHours * 3600 * 1000;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface OutageAlertInput {
  reason: string;
  ticks: number;
  firstMs: number | null;
  lastMs: number | null;
  sample: string | null;
  deferredThisTick: number;
}

export function buildOutageAlert(a: OutageAlertInput): { subject: string; html: string; text: string } {
  const fmt = (ms: number | null) => (ms === null ? 'n/a' : new Date(ms).toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
  const advice =
    a.reason === 'no_plan' ? 'AiSensy reports "No Plan active on assistant": the AiSensy plan has lapsed. Renew the plan.'
    : a.reason === 'wcc_exhausted' || a.reason === 'payment_required' ? 'AiSensy reports insufficient WhatsApp Conversation Credits (WCC). Top up WCC.'
    : a.reason === 'auth' || a.reason === 'api_key_missing' ? 'AiSensy rejected the API key (or none is configured). Check the AISENSY_API_KEY secret on the edge function.'
    : 'AiSensy is failing (rate limit / server error / network). Check the AiSensy status page and account.';
  const subject = `[oStaran] WhatsApp sending is down (${a.reason}) - action needed`;
  const text = [
    'WhatsApp (AiSensy) sends have failed for at least ' + a.ticks + ' consecutive dispatcher ticks.',
    '',
    'Reason: ' + a.reason,
    advice,
    'First failure in window: ' + fmt(a.firstMs),
    'Latest failure: ' + fmt(a.lastMs),
    'Steps deferred (not failed) in the latest tick: ' + a.deferredThisTick,
    a.sample ? 'Provider said: ' + a.sample : '',
    '',
    'Nothing is lost: WhatsApp steps are deferred and retried automatically. Once the account is fixed they resume within one or two 5-minute ticks. Time-critical reminders (1 hour before / live now) that become too late are skipped, not sent late.',
    'Emails are unaffected.',
    'Admin: https://partner.ostaran.com/admin',
  ].filter((l) => l !== '').join('\n');
  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111">' +
    '<h2 style="margin:0 0 8px">WhatsApp sending is down</h2>' +
    '<p>AiSensy sends have failed for at least <b>' + a.ticks + '</b> consecutive dispatcher ticks.</p>' +
    '<p><b>Reason:</b> ' + esc(a.reason) + '<br>' + esc(advice) + '</p>' +
    '<p>First failure in window: ' + esc(fmt(a.firstMs)) + '<br>Latest failure: ' + esc(fmt(a.lastMs)) +
    '<br>Steps deferred (not failed) in the latest tick: ' + a.deferredThisTick + '</p>' +
    (a.sample ? '<p style="color:#555">Provider said: <code>' + esc(a.sample) + '</code></p>' : '') +
    '<p>Nothing is lost: WhatsApp steps are deferred and retried automatically. Once the account is fixed they resume within one or two 5-minute ticks. Time-critical reminders (1 hour before / live now) that become too late are skipped, not sent late. Emails are unaffected.</p>' +
    '<p><a href="https://partner.ostaran.com/admin">Open admin</a></p></div>';
  return { subject, html, text };
}

// ─────────────────────────────────────────────────────────────────────────────
// (f) Partner WhatsApp pause decision
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `state` is what partner_wa_pause_state() returns: NULL (not paused) | 'promotional' | 'all'.
 *  - 'all' blocks every WhatsApp step for the partner (incl. transactional).
 *  - 'promotional' blocks every step except sequences whose comms_class is 'transactional'.
 *    (comms_class undefined/null/unknown is treated as 'promotional'.)
 *  - any other non-null value is treated like 'promotional' (fail closed on the promotional side).
 */
export function pauseBlocks(state: string | null | undefined, commsClass: string | null | undefined): boolean {
  if (state === null || state === undefined || state === '') return false;
  if (state === 'all') return true;
  return (commsClass === null || commsClass === undefined ? 'promotional' : commsClass) !== 'transactional';
}

/** Postgres 42883 (undefined_function) / PostgREST PGRST202 (function not in schema cache). */
export function isMissingFunctionError(code: string | null | undefined): boolean {
  return code === '42883' || code === 'PGRST202';
}

/** Postgres 42P01 (undefined_table) / PostgREST PGRST205 (table not in schema cache). */
export function isMissingTableError(code: string | null | undefined): boolean {
  return code === '42P01' || code === 'PGRST205';
}
