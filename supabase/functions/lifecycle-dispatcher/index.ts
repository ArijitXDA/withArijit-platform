import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * lifecycle-dispatcher v5
 *
 * v5 fix (Phase F bug):
 *   - resolveWebinarRegisterUrl() now points directly at webinar.ostaran.com
 *     instead of www.ostaran.com/free-webinar. The platform repo's /free-webinar
 *     does redirect('https://webinar.ostaran.com') as a hardcoded server-side
 *     redirect, which DROPS ALL query params — losing the partner_code attribution.
 *   - Going direct: https://webinar.ostaran.com/?utm_source=<code>&utm_medium=email&utm_campaign=lifecycle_<seq>
 *   - The webinar.ostaran.com landing form captures utm_source into
 *     qr_landing_registrations.utm_source = the canonical partner_code field
 *     (verified by existing data: RYANPINTO-2603, ARIBOMBAY-0326, etc. all stored
 *     this way).
 *
 * v4 changes (Phase F — webinar-register URL with partner attribution):
 *   - Added resolveWebinarRegisterUrl() helper. Resolves the {{webinar_register_url}}
 *     variable used by Phase F templates (em_e2_last_call_v1 + em_e3_*) with a
 *     priority chain:
 *       1) ctx.partner_code from trigger event metadata
 *       2) latest non-empty utm_source on qr_landing_registrations for this email
 *       3) default fallback: 'ARIBOMBAY-0326' (Arijit's partner code)
 *     Output: https://www.ostaran.com/free-webinar?utm_source=<code>&utm_medium=email&utm_campaign=lifecycle_<seq>
 *   - Plumbed into buildVars: only set webinar_register_url when sequenceKey starts
 *     with 'e2_' or 'e3_' to avoid an unnecessary DB lookup on every send.
 *   - Renamed buildVars _sequenceKey → sequenceKey since it's now used.
 *
 * v3 changes (Phase C — sequence S6 post-free-webinar upsell):
 *   - Added partner-aware branched vars for em_s6_* / wa_s6_* templates:
 *     {{s6_pitch_block}}, {{s6_offer_block}}, {{s6_lastcall_block}},
 *     {{s6_wa_partner_line}}, {{partner_discount_pct}},
 *     {{partner_discount_amount_inr}}, {{course_price_after_discount_inr}},
 *     {{course_mrp_inr}}. Looked up from awa_courses at send time using the
 *     contact's profession_choice -> audienceSlug -> course discount_percent + mrp.
 *   - Added formatINR() helper (en-IN locale).
 *   - Refactored resolveEnrolUrl to use a shared audienceSlug() helper, so the
 *     new S6 URL builder shares the same audience -> slug mapping. No behavior
 *     change to S8 enrol_url.
 *
 * v2 changes (correctness pass):
 *   - REMOVED silent fallbacks for critical vars (webinar_time, webinar_date, join_link).
 *     If any of these are missing, the dispatcher refuses to send and exits the
 *     enrolment with reason 'missing_critical_vars:...'. Better to skip than lie.
 *   - Mandatory pre-send validation: every variable in template.variables_declared
 *     must resolve to a non-empty string. Missing -> sequence exit, logged in
 *     dispatch_log with skip_reason and console.error.
 *   - fmtDate now uses UTC day-of-week (was timezone-sensitive before).
 *
 * Polls lifecycle_sequence_enrolments for due rows, renders the active step's
 * template, sends via Resend (email) or AiSensy (WhatsApp), logs to
 * lifecycle_dispatch_log + lifecycle_events, then advances current_step_index
 * and computes the next next_send_at.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

const AISENSY_API_URL = 'https://backend.aisensy.com/campaign/t1/api/v2';
const RESEND_API_URL  = 'https://api.resend.com/emails';
const FROM_EMAIL      = 'Arijit Chowdhury \u2014 oStaran <ai@ostaran.com>';
const BCC_EMAIL       = 'star.analytix.ai@gmail.com';
const SITE_BASE       = 'https://www.ostaran.com';
const JOIN_BASE       = 'https://partner.ostaran.com/join';
const MAX_FAILURES    = 3;
const BACKOFF_MINUTES = [5, 30, 120];

// Audience -> course slug mapping. Default slug exists, so enrol_url is always valid.
const AUDIENCE_TO_SLUG: Record<string, string> = {
  working_professional:    'ai-mastery-for-working-professionals',
  college_student:         'ai-mastery-for-students',
  job_seeker:              'ai-mastery-for-students',
  school_student:          'ai-mastery-for-school-students',
  tech_developer:          'agentic-ai-development',
  data_engineer_scientist: 'agentic-ai-development',
  home_maker:              'ai-mastery-for-homemakers',
};
const DEFAULT_SLUG = 'ai-mastery-programme';

// =====================================================================
// FORMATTING UTILITIES (return '' on missing input -- callers / validation handle)
// =====================================================================

/** UTC-stable date formatter. "2026-04-26" -> "Sun, 26 Apr 2026". '' if malformed. */
function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '';
  const [y, m, d] = parts;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (isNaN(dt.getTime())) return '';
  return `${days[dt.getUTCDay()]}, ${d} ${months[m - 1]} ${y}`;
}

/** "15:30:00" -> "3:30 PM". '' if malformed or missing -- NO 11:00 fallback. */
function fmtTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return '';
  const [h, m] = parts;
  if (h < 0 || h > 23 || m < 0 || m > 59) return '';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtRegisteredAt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const istMs = d.getTime() + 5.5 * 3600 * 1000;
  const ist = new Date(istMs);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${ist.getUTCDate()} ${months[ist.getUTCMonth()]} ${ist.getUTCFullYear()}`;
}

function firstName(full: string | null | undefined): string {
  if (!full) return 'there';
  return full.trim().split(/\s+/)[0] || 'there';
}

/** Format integer rupees as Indian-locale currency: 47994 -> "₹47,994". */
function formatINR(n: number): string {
  if (!Number.isFinite(n)) return '';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function normalisePhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 10) return '91' + digits;
  if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.slice(1);
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return '+' + digits;
}

// =====================================================================
// ANCHOR + WINDOW
// =====================================================================

/**
 * Returns null if context is missing critical anchor data -- caller must handle.
 * Treats (webinar_date, webinar_time) as IST and converts to UTC.
 */
function computeAnchorTime(
  ctx: Record<string, unknown>,
  anchor: string | null,
  offsetHours: number | null
): Date | null {
  if (!anchor) return null;
  if (anchor === 'webinar_date') {
    const dateStr = ctx.webinar_date as string | undefined;
    const timeStr = ctx.webinar_time as string | undefined;
    if (!dateStr || !timeStr) return null; // anchor unresolvable
    const tParts = timeStr.split(':').map(Number);
    const dParts = dateStr.split('-').map(Number);
    if (tParts.length < 2 || dParts.length !== 3) return null;
    const [hh, mm] = tParts;
    const [yyyy, mo, dd] = dParts;
    const istUtcMs = Date.UTC(yyyy, mo - 1, dd, hh, mm) - 5.5 * 3600 * 1000;
    return new Date(istUtcMs + (offsetHours ?? 0) * 3600 * 1000);
  }
  return null;
}

function applySendWindow(when: Date, windowStart: string, windowEnd: string): Date {
  const istMs = when.getTime() + 5.5 * 3600 * 1000;
  const ist = new Date(istMs);
  const minOfDay = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  const [wsH, wsM] = windowStart.split(':').map(Number);
  const [weH, weM] = windowEnd.split(':').map(Number);
  const startMin = wsH * 60 + wsM;
  const endMin   = weH * 60 + weM;
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

// =====================================================================
// VARIABLE RESOLUTION
// =====================================================================

/** Maps the contact's profession_choice to a real course slug. Falls back to DEFAULT_SLUG. */
function audienceSlug(ctx: Record<string, unknown>): string {
  const profession = (ctx.profession_choice as string | null) || null;
  return (profession && AUDIENCE_TO_SLUG[profession]) || DEFAULT_SLUG;
}

function resolveEnrolUrl(ctx: Record<string, unknown>): string {
  const slug = audienceSlug(ctx);
  const partner = ctx.partner_code ? `&utm_medium=${encodeURIComponent(String(ctx.partner_code))}` : '';
  return `${SITE_BASE}/courses/${slug}?utm_source=lifecycle_s8&utm_campaign=post_masterclass${partner}`;
}

/** S6 (post-free-webinar upsell) variant of resolveEnrolUrl with its own UTM. */
function resolveEnrolUrlS6(ctx: Record<string, unknown>): string {
  const slug = audienceSlug(ctx);
  const partner = ctx.partner_code ? `&utm_medium=${encodeURIComponent(String(ctx.partner_code))}` : '';
  return `${SITE_BASE}/courses/${slug}?utm_source=lifecycle_s6&utm_campaign=post_webinar_upsell${partner}`;
}

/**
 * Resolve the /free-webinar register URL for Phase F templates (E2/E3) with
 * partner-code attribution. Priority chain:
 *   1. ctx.partner_code (from trigger event metadata)
 *   2. Latest non-empty utm_source on qr_landing_registrations for this email
 *   3. Default fallback: 'ARIBOMBAY-0326' (Arijit's personal partner code)
 *
 * Builds: https://www.ostaran.com/free-webinar?utm_source=<code>&utm_medium=email&utm_campaign=lifecycle_<seq>
 * where <seq> is the short sequence prefix (e.g. 'e3' from 'e3_quiz_followup').
 */
async function resolveWebinarRegisterUrl(
  supabase: SupabaseClient,
  ctx: Record<string, unknown>,
  email: string,
  sequenceKey: string
): Promise<string> {
  let code = ((ctx.partner_code as string) || '').trim();

  if (!code) {
    const { data } = await supabase
      .from('qr_landing_registrations')
      .select('utm_source')
      .eq('email', email.toLowerCase())
      .not('utm_source', 'is', null)
      .neq('utm_source', '')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.utm_source) code = String(data.utm_source).trim();
  }

  if (!code) code = 'ARIBOMBAY-0326';

  const seqShort = sequenceKey.split('_')[0]; // 'e3', 'e2', etc.
  const params = new URLSearchParams({
    utm_source:   code,
    utm_medium:   'email',
    utm_campaign: `lifecycle_${seqShort}`,
  });
  // Direct link to webinar.ostaran.com — the platform repo's /free-webinar
  // route does a hardcoded redirect that strips query params, breaking
  // partner attribution. Skip it entirely.
  return `https://webinar.ostaran.com/?${params.toString()}`;
}

function unsubscribeUrl(enrolmentId: string): string {
  return `${SITE_BASE}/unsubscribe/${enrolmentId}`;
}

/** Returns '' if no real join_token -- NEVER falls back to webinar.ostaran.com. */
function joinLinkFromContext(ctx: Record<string, unknown>): string {
  const token = ctx.join_token as string | undefined;
  if (!token || token.trim() === '') return '';
  return `${JOIN_BASE}/${token}?ref=lifecycle`;
}

async function lookupPostWebinarBranch(
  supabase: SupabaseClient,
  email: string,
  webinarDate: string
): Promise<'attended' | 'no_show'> {
  const { data, error } = await supabase
    .from('qr_landing_registrations')
    .select('attendance_confirmed, attended_at')
    .eq('email', email.toLowerCase())
    .eq('webinar_date', webinarDate)
    .eq('registration_type', 'webinar')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return 'no_show';
  return (data?.attendance_confirmed === true || data?.attended_at) ? 'attended' : 'no_show';
}

/**
 * S6 partner-aware variable builder. Looks up the contact's audience-mapped course
 * in awa_courses, computes discount %/amount, and sets branched copy variables for
 * em_s6_* and wa_s6_* templates. Always sets all S6 vars to non-empty strings so
 * the validator never fails on a missing branch.
 */
async function buildS6PartnerVars(
  supabase: SupabaseClient,
  ctx: Record<string, unknown>,
  vars: Record<string, string>
): Promise<void> {
  const partnerCode = ((ctx.partner_code as string) || '').trim();
  const slug = audienceSlug(ctx);

  const { data: course } = await supabase
    .from('awa_courses')
    .select('discount_percent, mrp')
    .eq('slug', slug)
    .maybeSingle();

  const mrp = course ? Number(course.mrp) || 0 : 0;
  const pct = course ? Math.round(Number(course.discount_percent) || 0) : 0;
  const amount = Math.round(mrp * pct / 100);
  const finalPrice = mrp - amount;

  const hasPartner = partnerCode.length > 0 && pct > 0 && mrp > 0;

  if (hasPartner) {
    vars.partner_discount_pct = String(pct);
    vars.partner_discount_amount_inr = formatINR(amount);
    vars.course_mrp_inr = formatINR(mrp);
    vars.course_price_after_discount_inr = formatINR(finalPrice);
    vars.s6_pitch_block = `Your partner discount is active: <strong>${pct}% off</strong> the full programme. You pay <strong>${formatINR(finalPrice)}</strong> (saves ${formatINR(amount)} off the <strong>${formatINR(mrp)}</strong> sticker price). Discount auto-applies at checkout.`;
    vars.s6_offer_block = `Your partner discount of <strong>${formatINR(amount)}</strong> (${pct}% off) is auto-applied at checkout. Net price: <strong>${formatINR(finalPrice)}</strong> for the full 5-week programme.`;
    vars.s6_lastcall_block = `Your partner discount of <strong>${pct}%</strong> (you'd save ${formatINR(amount)}) is still applicable for one more week. After this batch, partner referrals roll over to the next cohort and pricing may change.`;
    vars.s6_wa_partner_line = `Partner discount ${pct}% off active until batch starts.`;
  } else {
    // Non-partner branch: keep numeric vars empty (template won't reference them)
    // and set the rendered blocks to a generic early-bird/limited-seats framing.
    vars.partner_discount_pct = '';
    vars.partner_discount_amount_inr = '';
    vars.course_mrp_inr = mrp > 0 ? formatINR(mrp) : '';
    vars.course_price_after_discount_inr = '';
    vars.s6_pitch_block = `The 5-week programme runs in cohorts. Your audience-specific page below shows pricing and the next batch start date.`;
    vars.s6_offer_block = `Each cohort has limited seats — checkout will show your audience-specific pricing.`;
    vars.s6_lastcall_block = `The current batch has limited seats remaining. Once full, we'll wait-list for the next cohort.`;
    vars.s6_wa_partner_line = `Limited seats per batch.`;
  }
}

async function buildVars(
  supabase: SupabaseClient,
  enrolment: { id: string; email: string; mobile: string | null; context: Record<string, unknown>; enrolled_at: string },
  templateKey: string,
  sequenceKey: string
): Promise<Record<string, string>> {
  const ctx = enrolment.context || {};
  const fullName = (ctx.full_name as string) || '';
  const webinarDate = (ctx.webinar_date as string) || '';
  const webinarTime = (ctx.webinar_time as string) || ''; // NO fallback

  const vars: Record<string, string> = {
    first_name:            firstName(fullName),
    full_name:             fullName,
    email:                 enrolment.email,
    mobile:                enrolment.mobile || '',
    webinar_date_display:  fmtDate(webinarDate),         // '' if missing/malformed
    webinar_time_display:  fmtTime(webinarTime),         // '' if missing/malformed
    registered_at_display: fmtRegisteredAt(enrolment.enrolled_at),
    course_name:           (ctx.course_name as string) || '',
    partner_code:          (ctx.partner_code as string) || '',
    join_link:             joinLinkFromContext(ctx),     // '' if no token
    enrol_url:             resolveEnrolUrl(ctx),         // always valid (default slug)
    unsubscribe_url:       unsubscribeUrl(enrolment.id), // always valid (we have id)
  };

  if (templateKey === 'em_s1_post_webinar_v1' && webinarDate) {
    const branch = await lookupPostWebinarBranch(supabase, enrolment.email, webinarDate);
    if (branch === 'attended') {
      vars.post_webinar_headline = `Thanks for attending, ${vars.first_name}`;
      vars.post_webinar_intro    = "I hope yesterday's session sparked something. Most attendees walk away with one specific thing they want to try right away \u2014 what was it for you? Hit reply and tell me, I read every one.";
    } else {
      vars.post_webinar_headline = `We missed you, ${vars.first_name}`;
      vars.post_webinar_intro    = "Life happened \u2014 no judgment. The next free session is this Sunday at 11 AM IST and your registration auto-rolls forward. Or if you'd rather catch a recap, just hit reply and I'll send you the highlights.";
    }
  }

  // S6 \u2014 Post-Free-Webinar Upsell (v3)
  if (templateKey.startsWith('em_s6_') || templateKey.startsWith('wa_s6_')) {
    vars.enrol_url = resolveEnrolUrlS6(ctx);
    await buildS6PartnerVars(supabase, ctx, vars);
  }

  // E2 + E3 \u2014 webinar register URL with partner attribution (v4)
  if (sequenceKey.startsWith('e2_') || sequenceKey.startsWith('e3_')) {
    vars.webinar_register_url = await resolveWebinarRegisterUrl(
      supabase, ctx, enrolment.email, sequenceKey
    );
  }

  return vars;
}

/** Returns array of declared-but-empty variable names. Empty array = all good. */
function validateRequiredVars(
  declaredVars: Record<string, unknown> | null | undefined,
  resolvedVars: Record<string, string>
): string[] {
  if (!declaredVars) return [];
  const missing: string[] = [];
  for (const varName of Object.keys(declaredVars)) {
    const val = resolvedVars[varName];
    if (val === undefined || val === null || String(val).trim() === '') {
      missing.push(varName);
    }
  }
  return missing;
}

function renderTemplate(text: string | null | undefined, vars: Record<string, string>): string {
  if (!text) return '';
  return text.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_match, key) => {
    return vars[key] !== undefined ? vars[key] : `{{${key}}}`;
  });
}

// =====================================================================
// CHECKS
// =====================================================================

async function isSuppressed(supabase: SupabaseClient, email: string, channel: string): Promise<boolean> {
  const { data } = await supabase
    .from('lifecycle_suppression')
    .select('channels')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  if (!data) return false;
  return Array.isArray(data.channels) && data.channels.includes(channel);
}

async function consentOk(supabase: SupabaseClient, email: string, channel: string): Promise<boolean> {
  const { data } = await supabase
    .from('lifecycle_consent_log')
    .select('state')
    .eq('email', email.toLowerCase())
    .eq('channel', channel)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return true; // legacy = opted_in default
  return data.state === 'opted_in';
}

async function findExitEvent(
  supabase: SupabaseClient,
  email: string,
  exitTypes: string[],
  since: string
): Promise<string | null> {
  if (!exitTypes || exitTypes.length === 0) return null;
  const { data } = await supabase
    .from('lifecycle_events')
    .select('event_type')
    .eq('email', email.toLowerCase())
    .in('event_type', exitTypes)
    .gte('occurred_at', since)
    .eq('backfilled', false)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.event_type ?? null;
}

async function alreadySent(
  supabase: SupabaseClient,
  enrolmentId: string,
  stepIndex: number
): Promise<boolean> {
  const { data } = await supabase
    .from('lifecycle_dispatch_log')
    .select('id')
    .eq('enrolment_id', enrolmentId)
    .eq('step_index', stepIndex)
    .eq('status', 'sent')
    .limit(1)
    .maybeSingle();
  return !!data;
}

// =====================================================================
// SENDERS
// =====================================================================

interface SendResult { ok: boolean; provider_id?: string; error?: string; }

async function sendEmail(
  apiKey: string,
  to: string,
  subject: string,
  html: string,
  text: string | null
): Promise<SendResult> {
  try {
    const body: Record<string, unknown> = {
      from: FROM_EMAIL, to: [to], bcc: [BCC_EMAIL], subject, html,
    };
    if (text) body.text = text;
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, provider_id: data.id };
    return { ok: false, error: `Resend ${res.status}: ${JSON.stringify(data)}` };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

async function sendWhatsApp(
  apiKey: string,
  destination: string,
  userName: string,
  campaignName: string,
  templateParams: string[]
): Promise<SendResult> {
  try {
    const res = await fetch(AISENSY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey, campaignName, destination,
        userName: userName || 'Student',
        source: 'lifecycle_dispatcher',
        templateParams,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, provider_id: data?.submitted_message_id };
    return { ok: false, error: `AiSensy ${res.status}: ${JSON.stringify(data)}` };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// =====================================================================
// CORE
// =====================================================================

interface ProcessResult {
  enrolment_id: string;
  outcome: 'sent' | 'skipped' | 'exited' | 'completed' | 'failed' | 'deferred';
  detail?: string;
  next_send_at?: string | null;
}

async function computeNextSendAt(
  supabase: SupabaseClient,
  sequenceId: string,
  newStepIndex: number,
  enrolledAt: string,
  context: Record<string, unknown>
): Promise<{ nextStep: any | null; nextSendAt: Date | null }> {
  const { data: nextStep } = await supabase
    .from('lifecycle_sequence_steps')
    .select('*')
    .eq('sequence_id', sequenceId)
    .eq('step_index', newStepIndex)
    .maybeSingle();
  if (!nextStep) return { nextStep: null, nextSendAt: null };

  let scheduled: Date;
  if (nextStep.absolute_anchor) {
    const anchored = computeAnchorTime(context, nextStep.absolute_anchor, nextStep.anchor_offset_hours);
    if (!anchored) {
      scheduled = new Date(new Date(enrolledAt).getTime() + (nextStep.delay_hours || 0) * 3600 * 1000);
    } else {
      scheduled = anchored;
    }
  } else {
    scheduled = new Date(new Date(enrolledAt).getTime() + (nextStep.delay_hours || 0) * 3600 * 1000);
  }

  const now = new Date();
  if (scheduled.getTime() < now.getTime()) scheduled = now;

  const windowed = applySendWindow(
    scheduled,
    String(nextStep.send_window_start || '00:00'),
    String(nextStep.send_window_end   || '23:59')
  );
  return { nextStep, nextSendAt: windowed };
}

async function exitEnrolment(
  supabase: SupabaseClient,
  enrolmentId: string,
  reason: string
) {
  await supabase.from('lifecycle_sequence_enrolments').update({
    status: 'exited',
    exit_reason: reason.slice(0, 200),
    next_send_at: null,
    updated_at: new Date().toISOString(),
  }).eq('id', enrolmentId);
}

async function processEnrolment(
  supabase: SupabaseClient,
  resendKey: string,
  aiSensyKey: string | null,
  enrolmentId: string,
  dryRun: boolean
): Promise<ProcessResult> {
  const startTs = Date.now();

  // 1. Load enrolment + sequence + current step
  const { data: enrolment } = await supabase
    .from('lifecycle_sequence_enrolments').select('*').eq('id', enrolmentId).maybeSingle();
  if (!enrolment) return { enrolment_id: enrolmentId, outcome: 'failed', detail: 'enrolment_not_found' };
  if (enrolment.status !== 'active') {
    return { enrolment_id: enrolmentId, outcome: 'skipped', detail: `status_${enrolment.status}` };
  }

  const { data: sequence } = await supabase
    .from('lifecycle_sequences').select('*').eq('id', enrolment.sequence_id).maybeSingle();
  if (!sequence) return { enrolment_id: enrolmentId, outcome: 'failed', detail: 'sequence_not_found' };
  if (!sequence.is_active) {
    return { enrolment_id: enrolmentId, outcome: 'skipped', detail: 'sequence_inactive' };
  }

  const { data: step } = await supabase
    .from('lifecycle_sequence_steps').select('*')
    .eq('sequence_id', sequence.id).eq('step_index', enrolment.current_step_index).maybeSingle();
  if (!step) {
    if (!dryRun) {
      await supabase.from('lifecycle_sequence_enrolments').update({
        status: 'completed', next_send_at: null, updated_at: new Date().toISOString(),
      }).eq('id', enrolmentId);
    }
    return { enrolment_id: enrolmentId, outcome: 'completed', detail: 'no_more_steps' };
  }

  // 2. Exit-event check
  const exitMatch = await findExitEvent(
    supabase, enrolment.email, (sequence.exit_on_events as string[]) || [], enrolment.enrolled_at
  );
  if (exitMatch) {
    if (!dryRun) await exitEnrolment(supabase, enrolmentId, `exit_event:${exitMatch}`);
    return { enrolment_id: enrolmentId, outcome: 'exited', detail: `exit_event_${exitMatch}` };
  }

  // 3. Crash-recovery idempotency check
  const idemSent = await alreadySent(supabase, enrolmentId, step.step_index);

  // 4. Template lookup
  const { data: template } = await supabase
    .from('lifecycle_templates').select('*').eq('template_key', step.template_key)
    .order('version', { ascending: false }).limit(1).maybeSingle();

  if (!template) {
    if (!dryRun) {
      await supabase.from('lifecycle_dispatch_log').insert({
        enrolment_id: enrolmentId, sequence_id: sequence.id, step_index: step.step_index,
        channel: step.channel, template_key: step.template_key,
        recipient_email: enrolment.email, recipient_mobile: enrolment.mobile,
        status: 'skipped', skip_reason: 'template_not_found', duration_ms: Date.now() - startTs,
      });
    }
    return advanceStep(supabase, enrolment, sequence, step.step_index, dryRun, 'template_not_found');
  }

  // 5. WhatsApp template inactive -> skip + advance
  if (template.channel === 'whatsapp' && !template.is_active) {
    if (!dryRun) {
      await supabase.from('lifecycle_dispatch_log').insert({
        enrolment_id: enrolmentId, sequence_id: sequence.id, step_index: step.step_index,
        channel: 'whatsapp', template_key: template.template_key,
        recipient_email: enrolment.email, recipient_mobile: enrolment.mobile,
        status: 'skipped', skip_reason: 'template_inactive_aisensy_pending',
        duration_ms: Date.now() - startTs,
      });
    }
    return advanceStep(supabase, enrolment, sequence, step.step_index, dryRun, 'wa_template_inactive');
  }

  // 6. Suppression + consent
  const channelKey = template.channel === 'email' ? 'email' : 'whatsapp';
  if (await isSuppressed(supabase, enrolment.email, channelKey)) {
    if (!dryRun) {
      await supabase.from('lifecycle_dispatch_log').insert({
        enrolment_id: enrolmentId, sequence_id: sequence.id, step_index: step.step_index,
        channel: channelKey, template_key: template.template_key,
        recipient_email: enrolment.email, recipient_mobile: enrolment.mobile,
        status: 'skipped', skip_reason: 'suppressed', duration_ms: Date.now() - startTs,
      });
      await exitEnrolment(supabase, enrolmentId, 'suppressed');
    }
    return { enrolment_id: enrolmentId, outcome: 'exited', detail: 'suppressed' };
  }
  if (!(await consentOk(supabase, enrolment.email, channelKey))) {
    if (!dryRun) {
      await supabase.from('lifecycle_dispatch_log').insert({
        enrolment_id: enrolmentId, sequence_id: sequence.id, step_index: step.step_index,
        channel: channelKey, template_key: template.template_key,
        recipient_email: enrolment.email, recipient_mobile: enrolment.mobile,
        status: 'skipped', skip_reason: 'no_consent', duration_ms: Date.now() - startTs,
      });
    }
    return advanceStep(supabase, enrolment, sequence, step.step_index, dryRun, 'no_consent');
  }

  // 7. Build vars + STRICT validation
  const vars = await buildVars(supabase, enrolment, template.template_key, sequence.sequence_key);
  const missing = validateRequiredVars(
    template.variables_declared as Record<string, unknown>, vars
  );
  if (missing.length > 0) {
    const reason = `missing_critical_vars:${missing.join(',')}`;
    console.error('[lifecycle-dispatcher]', enrolmentId, 'step', step.step_index, reason);
    if (!dryRun) {
      await supabase.from('lifecycle_dispatch_log').insert({
        enrolment_id: enrolmentId, sequence_id: sequence.id, step_index: step.step_index,
        channel: template.channel, template_key: template.template_key,
        recipient_email: enrolment.email, recipient_mobile: enrolment.mobile,
        status: 'skipped', skip_reason: reason, duration_ms: Date.now() - startTs,
      });
      await exitEnrolment(supabase, enrolmentId, reason);
    }
    return { enrolment_id: enrolmentId, outcome: 'exited', detail: reason };
  }

  if (dryRun) {
    return {
      enrolment_id: enrolmentId, outcome: 'sent',
      detail: `DRY_RUN ${template.channel} -> ${enrolment.email} via ${template.template_key} (vars OK)`,
    };
  }

  // 8. Send
  let result: SendResult;
  if (template.channel === 'email') {
    if (idemSent) {
      result = { ok: true, provider_id: 'idempotent_skip' };
    } else {
      const subject = renderTemplate(template.subject, vars);
      const html    = renderTemplate(template.body_html, vars);
      const text    = renderTemplate(template.body_text, vars) || null;
      result = await sendEmail(resendKey, enrolment.email, subject, html, text);
    }
  } else {
    if (!aiSensyKey) {
      result = { ok: false, error: 'AISENSY_API_KEY not configured' };
    } else if (!enrolment.mobile) {
      await supabase.from('lifecycle_dispatch_log').insert({
        enrolment_id: enrolmentId, sequence_id: sequence.id, step_index: step.step_index,
        channel: 'whatsapp', template_key: template.template_key,
        recipient_email: enrolment.email, recipient_mobile: null,
        status: 'skipped', skip_reason: 'no_mobile', duration_ms: Date.now() - startTs,
      });
      return advanceStep(supabase, enrolment, sequence, step.step_index, dryRun, 'no_mobile');
    } else if (idemSent) {
      result = { ok: true, provider_id: 'idempotent_skip' };
    } else {
      const params = (template.aisensy_param_order as string[] | null || []).map(k => vars[k] ?? '');
      const destination = normalisePhone(enrolment.mobile);
      result = await sendWhatsApp(
        aiSensyKey, destination, vars.full_name, template.aisensy_campaign_name as string, params
      );
    }
  }

  // 9. Log + emit event
  await supabase.from('lifecycle_dispatch_log').insert({
    enrolment_id: enrolmentId, sequence_id: sequence.id, step_index: step.step_index,
    channel: template.channel, template_key: template.template_key,
    recipient_email: enrolment.email, recipient_mobile: enrolment.mobile,
    status: result.ok ? 'sent' : 'failed',
    provider: template.channel === 'email' ? 'resend' : 'aisensy',
    provider_message_id: result.provider_id || null,
    error_message: result.error || null,
    duration_ms: Date.now() - startTs,
  });

  if (result.ok) {
    await supabase.from('lifecycle_events').insert({
      email: enrolment.email.toLowerCase(),
      mobile: enrolment.mobile,
      event_type: template.channel === 'email' ? 'email_sent' : 'whatsapp_sent',
      event_source_table: 'lifecycle_dispatch_log',
      source_row_id: null,
      track: 'student',
      metadata: {
        sequence_key: sequence.sequence_key,
        step_index: step.step_index,
        template_key: template.template_key,
        provider_id: result.provider_id,
      },
      backfilled: false,
    });
  }

  // 10. Advance or backoff
  if (!result.ok) {
    const newFailureCount = (enrolment.failure_count || 0) + 1;
    if (newFailureCount >= MAX_FAILURES) {
      await supabase.from('lifecycle_sequence_enrolments').update({
        status: 'failed',
        exit_reason: `max_failures:${result.error?.slice(0, 100)}`,
        failure_count: newFailureCount,
        last_attempt_at: new Date().toISOString(),
        next_send_at: null,
        updated_at: new Date().toISOString(),
      }).eq('id', enrolmentId);
      return { enrolment_id: enrolmentId, outcome: 'failed', detail: `max_failures: ${result.error}` };
    } else {
      const backoffMin = BACKOFF_MINUTES[Math.min(newFailureCount - 1, BACKOFF_MINUTES.length - 1)];
      const retryAt = new Date(Date.now() + backoffMin * 60 * 1000);
      await supabase.from('lifecycle_sequence_enrolments').update({
        failure_count: newFailureCount,
        last_attempt_at: new Date().toISOString(),
        next_send_at: retryAt.toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', enrolmentId);
      return { enrolment_id: enrolmentId, outcome: 'deferred', detail: `retry_${backoffMin}min: ${result.error}`, next_send_at: retryAt.toISOString() };
    }
  }

  return advanceStep(supabase, enrolment, sequence, step.step_index, dryRun, 'sent');
}

async function advanceStep(
  supabase: SupabaseClient,
  enrolment: any,
  sequence: any,
  currentIndex: number,
  dryRun: boolean,
  reason: string
): Promise<ProcessResult> {
  const nextIndex = currentIndex + 1;
  const { nextStep, nextSendAt } = await computeNextSendAt(
    supabase, sequence.id, nextIndex, enrolment.enrolled_at, enrolment.context
  );

  if (dryRun) {
    return {
      enrolment_id: enrolment.id,
      outcome: nextStep ? 'sent' : 'completed',
      detail: `DRY_RUN advance -> step ${nextIndex} (${nextStep ? nextStep.template_key : 'NONE'})`,
      next_send_at: nextSendAt?.toISOString() ?? null,
    };
  }

  if (!nextStep) {
    await supabase.from('lifecycle_sequence_enrolments').update({
      status: 'completed',
      current_step_index: nextIndex,
      next_send_at: null,
      last_sent_at: reason === 'sent' ? new Date().toISOString() : enrolment.last_sent_at,
      last_attempt_at: new Date().toISOString(),
      failure_count: 0,
      updated_at: new Date().toISOString(),
    }).eq('id', enrolment.id);
    return { enrolment_id: enrolment.id, outcome: 'completed', detail: `last_step_was_${reason}` };
  }

  await supabase.from('lifecycle_sequence_enrolments').update({
    current_step_index: nextIndex,
    next_send_at: nextSendAt?.toISOString() || null,
    last_sent_at: reason === 'sent' ? new Date().toISOString() : enrolment.last_sent_at,
    last_attempt_at: new Date().toISOString(),
    failure_count: 0,
    updated_at: new Date().toISOString(),
  }).eq('id', enrolment.id);

  return {
    enrolment_id: enrolment.id,
    outcome: reason === 'sent' ? 'sent' : 'skipped',
    detail: `advanced_to_step_${nextIndex}_${reason}`,
    next_send_at: nextSendAt?.toISOString() ?? null,
  };
}

// =====================================================================
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
  const startedAt = Date.now();
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const aiSensyKey = Deno.env.get('AISENSY_API_KEY') || null;
    if (!resendKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), { status: 500, headers: CORS });
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const dryRun: boolean = body.dry_run === true;
    const limit: number = Math.min(Number(body.limit) || 50, 200);
    const onlyEnrolmentId: string | undefined = body.enrolment_id;

    let dueIds: string[] = [];
    if (onlyEnrolmentId) {
      dueIds = [onlyEnrolmentId];
    } else {
      const { data: due } = await supabase
        .from('lifecycle_sequence_enrolments').select('id')
        .eq('status', 'active').lte('next_send_at', new Date().toISOString())
        .order('next_send_at', { ascending: true }).limit(limit);
      dueIds = (due ?? []).map(r => r.id as string);
    }

    const results: ProcessResult[] = [];
    for (const id of dueIds) {
      try {
        results.push(await processEnrolment(supabase, resendKey, aiSensyKey, id, dryRun));
      } catch (err) {
        console.error('[lifecycle-dispatcher]', id, (err as Error).message);
        results.push({ enrolment_id: id, outcome: 'failed', detail: (err as Error).message });
      }
    }

    const summary = {
      processed: results.length,
      sent:      results.filter(r => r.outcome === 'sent').length,
      skipped:   results.filter(r => r.outcome === 'skipped').length,
      exited:    results.filter(r => r.outcome === 'exited').length,
      completed: results.filter(r => r.outcome === 'completed').length,
      deferred:  results.filter(r => r.outcome === 'deferred').length,
      failed:    results.filter(r => r.outcome === 'failed').length,
    };
    console.log('[lifecycle-dispatcher]', JSON.stringify(summary), `${Date.now() - startedAt}ms`);

    return new Response(JSON.stringify({
      success: true, dry_run: dryRun, duration_ms: Date.now() - startedAt, ...summary, results,
    }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[lifecycle-dispatcher] unhandled:', (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: CORS });
  }
});
