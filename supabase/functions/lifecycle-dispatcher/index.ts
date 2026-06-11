import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * lifecycle-dispatcher v10 (S6/S8 conversion-drip vars)
 *
 * v10: buildVars resolves student_type_label, enrol_button_suffix and
 *      partner_name for the S6/S8 sequences only — needed by the ported
 *      conversion-nudge steps (AiSensy nudge_1..5 campaigns + nudge emails).
 *      Additive: no existing template declares these vars, so behaviour for
 *      every other step is unchanged.
 *
 * v8: From-line standardised to brand/department senders (no individual name).
 *     Student-track sequences send from 'oStaran AI Education'; partner-track
 *     (sequence.track === 'partner') from 'oStaran Partner Support'. Logic and
 *     templates otherwise unchanged.
 *
 * v7 (Phase N — partner track support):
 *   - ctx → vars fallback: any primitive value in enrolment.context auto-populates vars.
 *   - resolvePartnerProfileVars() for partner-track sequences (P1-P6).
 *   - resolveNextPartnerWebinar() for em_p1_week1_checkin_v1.
 *   - Partner-track unsubscribe URL points to partner.ostaran.com.
 *   - Dual-write to partner_comms_log on partner-track sends.
 *
 * v6: Phase K — no-show + S2 payment URL resolvers.
 * v5: Phase F bug — resolveWebinarRegisterUrl direct to webinar.ostaran.com.
 * v4: Phase F — webinar_register_url with partner-code priority chain.
 * v3: Phase C — S6 partner-aware branched vars.
 * v2: correctness pass — strict variables_declared validation.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

const AISENSY_API_URL = 'https://backend.aisensy.com/campaign/t1/api/v2';
const RESEND_API_URL  = 'https://api.resend.com/emails';
// Canonical brand/department senders (never an individual person's name).
const SENDERS = {
  student: 'oStaran AI Education <ai@ostaran.com>',
  partner: 'oStaran Partner Support <ai@ostaran.com>',
};
const BCC_EMAIL       = 'star.analytix.ai@gmail.com';
const SITE_BASE       = 'https://www.ostaran.com';
const JOIN_BASE       = 'https://partner.ostaran.com/join';
const MAX_FAILURES    = 3;
const BACKOFF_MINUTES = [5, 30, 120];

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

// v10 — human labels for the nudge campaigns' {{2}} param
const PROFESSION_TO_LABEL: Record<string, string> = {
  working_professional:    'Working Professional',
  college_student:         'College Student',
  job_seeker:              'Job Seeker',
  school_student:          'School Student',
  tech_developer:          'Tech Developer',
  data_engineer_scientist: 'Tech Developer',
  home_maker:              'Working Professional',
};

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

function computeAnchorTime(ctx: Record<string, unknown>, anchor: string | null, offsetHours: number | null): Date | null {
  if (!anchor) return null;
  if (anchor === 'webinar_date') {
    const dateStr = ctx.webinar_date as string | undefined;
    const timeStr = ctx.webinar_time as string | undefined;
    if (!dateStr || !timeStr) return null;
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

function audienceSlug(ctx: Record<string, unknown>): string {
  const profession = (ctx.profession_choice as string | null) || null;
  return (profession && AUDIENCE_TO_SLUG[profession]) || DEFAULT_SLUG;
}

function resolveEnrolUrl(ctx: Record<string, unknown>): string {
  const slug = audienceSlug(ctx);
  const partner = ctx.partner_code ? `&utm_medium=${encodeURIComponent(String(ctx.partner_code))}` : '';
  return `${SITE_BASE}/courses/${slug}?utm_source=lifecycle_s8&utm_campaign=post_masterclass${partner}`;
}

function resolveEnrolUrlS6(ctx: Record<string, unknown>): string {
  const slug = audienceSlug(ctx);
  const partner = ctx.partner_code ? `&utm_medium=${encodeURIComponent(String(ctx.partner_code))}` : '';
  return `${SITE_BASE}/courses/${slug}?utm_source=lifecycle_s6&utm_campaign=post_webinar_upsell${partner}`;
}

async function resolveWebinarRegisterUrl(supabase: SupabaseClient, ctx: Record<string, unknown>, email: string, sequenceKey: string): Promise<string> {
  let code = ((ctx.partner_code as string) || '').trim();
  if (!code) {
    const { data } = await supabase.from('qr_landing_registrations').select('utm_source').eq('email', email.toLowerCase()).not('utm_source', 'is', null).neq('utm_source', '').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (data?.utm_source) code = String(data.utm_source).trim();
  }
  if (!code) code = 'ARIBOMBAY-0326';
  const seqShort = sequenceKey.split('_')[0];
  const params = new URLSearchParams({ utm_source: code, utm_medium: 'email', utm_campaign: `lifecycle_${seqShort}` });
  return `https://webinar.ostaran.com/?${params.toString()}`;
}

function unsubscribeUrl(enrolmentId: string): string {
  return `${SITE_BASE}/unsubscribe/${enrolmentId}`;
}

async function resolveMasterclassPaymentUrl(supabase: SupabaseClient, ctx: Record<string, unknown>, email: string): Promise<string> {
  let code = ((ctx.partner_code as string) || '').trim();
  if (!code) {
    const { data } = await supabase.from('qr_landing_registrations').select('utm_source').eq('email', email.toLowerCase()).not('utm_source', 'is', null).neq('utm_source', '').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (data?.utm_source) code = String(data.utm_source).trim();
  }
  if (!code) code = 'ARIBOMBAY-0326';
  const params = new URLSearchParams({ utm_source: code, utm_medium: 'whatsapp', utm_campaign: 'lifecycle_s2_wa_payment' });
  return `https://www.ostaran.com/masterclass?${params.toString()}`;
}

async function resolveNoShowVars(supabase: SupabaseClient, email: string, registrationType: 'webinar' | 'masterclass', vars: Record<string, string>): Promise<void> {
  const { data: reg } = await supabase.from('qr_landing_registrations').select('course_id, join_token').eq('email', email.toLowerCase()).eq('registration_type', registrationType).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!reg) return;
  if (reg.join_token) vars.join_link = `${JOIN_BASE}/${reg.join_token}?ref=lifecycle`;
  if (!reg.course_id) return;
  const todayIso = new Date().toISOString().slice(0, 10);
  const { data: nextSess } = await supabase.from('awa_webinar_sessions').select('webinar_date, webinar_time').eq('course_id', reg.course_id).eq('status', 'scheduled').gte('webinar_date', todayIso).order('webinar_date', { ascending: true }).order('webinar_time', { ascending: true }).limit(1).maybeSingle();
  if (nextSess) {
    vars.next_webinar_date_display = fmtDate(nextSess.webinar_date);
    vars.next_webinar_time_display = fmtTime(nextSess.webinar_time);
  }
}

function joinLinkFromContext(ctx: Record<string, unknown>): string {
  const token = ctx.join_token as string | undefined;
  if (!token || token.trim() === '') return '';
  return `${JOIN_BASE}/${token}?ref=lifecycle`;
}

async function lookupPostWebinarBranch(supabase: SupabaseClient, email: string, webinarDate: string): Promise<'attended' | 'no_show'> {
  const { data, error } = await supabase.from('qr_landing_registrations').select('attendance_confirmed, attended_at').eq('email', email.toLowerCase()).eq('webinar_date', webinarDate).eq('registration_type', 'webinar').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) return 'no_show';
  return (data?.attendance_confirmed === true || data?.attended_at) ? 'attended' : 'no_show';
}

async function buildS6PartnerVars(supabase: SupabaseClient, ctx: Record<string, unknown>, vars: Record<string, string>): Promise<void> {
  const partnerCode = ((ctx.partner_code as string) || '').trim();
  const slug = audienceSlug(ctx);
  const { data: course } = await supabase.from('awa_courses').select('discount_percent, mrp').eq('slug', slug).maybeSingle();
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

async function resolvePartnerProfileVars(supabase: SupabaseClient, email: string, ctx: Record<string, unknown>, vars: Record<string, string>): Promise<void> {
  const { data: p } = await supabase.from('partners').select('partner_code, qr_code_url, commission_rate, cascade_rate, total_network_size, full_name').eq('email', email.toLowerCase()).maybeSingle();
  const partnerCode = p?.partner_code || (ctx.partner_code as string) || '';
  if (partnerCode) {
    vars.partner_code = partnerCode;
    if (!vars.partner_share_url) vars.partner_share_url = `https://webinar.ostaran.com/?utm_source=${encodeURIComponent(partnerCode)}`;
  }
  if (p?.qr_code_url) vars.qr_code_url = p.qr_code_url;
  if (p?.commission_rate != null) vars.commission_rate = String(Math.round(Number(p.commission_rate)));
  if (p?.cascade_rate != null) vars.cascade_rate = String(Math.round(Number(p.cascade_rate)));
  if (p?.total_network_size != null) vars.network_size = String(p.total_network_size);
  if (!vars.dashboard_url) vars.dashboard_url = 'https://partner.ostaran.com/dashboard';
}

async function resolveNextPartnerWebinar(supabase: SupabaseClient, vars: Record<string, string>): Promise<void> {
  const todayIso = new Date().toISOString().slice(0, 10);
  const { data } = await supabase.from('awa_webinar_sessions').select('webinar_date, webinar_time, ms_teams_link').eq('session_type', 'partner').eq('status', 'scheduled').gte('webinar_date', todayIso).order('webinar_date', { ascending: true }).order('webinar_time', { ascending: true }).limit(1).maybeSingle();
  if (data) {
    vars.next_partner_webinar_date = fmtDate(data.webinar_date);
    vars.next_partner_webinar_time = fmtTime(data.webinar_time);
    vars.partner_webinar_join_link = data.ms_teams_link || '';
  }
}

async function buildVars(supabase: SupabaseClient, enrolment: { id: string; email: string; mobile: string | null; context: Record<string, unknown>; enrolled_at: string }, templateKey: string, sequenceKey: string): Promise<Record<string, string>> {
  const ctx = enrolment.context || {};
  const fullName = (ctx.full_name as string) || '';
  const webinarDate = (ctx.webinar_date as string) || '';
  const webinarTime = (ctx.webinar_time as string) || '';
  // Phase N — ctx → vars fallback
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') vars[k] = String(v);
  }
  vars.first_name            = firstName(fullName);
  vars.full_name             = fullName;
  vars.email                 = enrolment.email;
  vars.mobile                = enrolment.mobile || '';
  vars.webinar_date_display  = fmtDate(webinarDate);
  vars.webinar_time_display  = fmtTime(webinarTime);
  vars.registered_at_display = fmtRegisteredAt(enrolment.enrolled_at);
  vars.course_name           = (ctx.course_name as string) || vars.course_name || '';
  vars.partner_code          = (ctx.partner_code as string) || vars.partner_code || '';
  vars.join_link             = joinLinkFromContext(ctx);
  vars.enrol_url             = resolveEnrolUrl(ctx);
  vars.unsubscribe_url       = sequenceKey.startsWith('p') && !sequenceKey.startsWith('phase_')
    ? `https://partner.ostaran.com/unsubscribe/${enrolment.id}`
    : unsubscribeUrl(enrolment.id);
  if (templateKey === 'em_s1_post_webinar_v1' && webinarDate) {
    const branch = await lookupPostWebinarBranch(supabase, enrolment.email, webinarDate);
    if (branch === 'attended') {
      vars.post_webinar_headline = `Thanks for attending, ${vars.first_name}`;
      vars.post_webinar_intro    = "I hope yesterday's session sparked something. Most attendees walk away with one specific thing they want to try right away — what was it for you? Hit reply and tell me, I read every one.";
    } else {
      vars.post_webinar_headline = `We missed you, ${vars.first_name}`;
      vars.post_webinar_intro    = "Life happened — no judgment. The next free session is this Sunday at 11 AM IST and your registration auto-rolls forward. Or if you'd rather catch a recap, just hit reply and I'll send you the highlights.";
    }
  }
  if (templateKey.startsWith('em_s6_') || templateKey.startsWith('wa_s6_')) {
    vars.enrol_url = resolveEnrolUrlS6(ctx);
    await buildS6PartnerVars(supabase, ctx, vars);
  }
  // v10 — conversion-drip vars (nudge_1..5 campaigns + ported nudge emails), S6/S8 only.
  if (sequenceKey === 's6_post_free_webinar_upsell' || sequenceKey === 's8_post_paid_masterclass_enrol') {
    vars.student_type_label = PROFESSION_TO_LABEL[(ctx.profession_choice as string) || ''] || 'Professional';
    const sp = new URLSearchParams();
    if (vars.partner_code) sp.set('partner', vars.partner_code);
    if (enrolment.email)   sp.set('email', enrolment.email);
    if (fullName)          sp.set('name', fullName);
    if (enrolment.mobile)  sp.set('mobile', enrolment.mobile);
    sp.set('enrol', '1');
    vars.enrol_button_suffix = sp.toString();
    if (!vars.partner_name) {
      if (vars.partner_code) {
        const { data: pn } = await supabase.from('partners').select('full_name').eq('partner_code', vars.partner_code).maybeSingle();
        vars.partner_name = (pn?.full_name || '').trim() || 'AIwithArijit';
      } else {
        vars.partner_name = 'AIwithArijit';
      }
    }
  }
  if (sequenceKey.startsWith('e2_') || sequenceKey.startsWith('e3_') || sequenceKey.startsWith('e5_') || sequenceKey.startsWith('e6_') || sequenceKey.startsWith('x1_')) {
    vars.webinar_register_url = await resolveWebinarRegisterUrl(supabase, ctx, enrolment.email, sequenceKey);
  }
  if (sequenceKey === 's3_paidmc_noshow_reengage') await resolveNoShowVars(supabase, enrolment.email, 'masterclass', vars);
  else if (sequenceKey === 's7_free_webinar_noshow_recovery') await resolveNoShowVars(supabase, enrolment.email, 'webinar', vars);
  if (templateKey === 'wa_s2_complete_payment_v1') vars.masterclass_payment_url = await resolveMasterclassPaymentUrl(supabase, ctx, enrolment.email);
  // Phase N — Partner-track sequences
  if (sequenceKey === 'p1_partner_welcome_onboarding' || sequenceKey === 'p2_partner_first_student_referral' || sequenceKey === 'p3_partner_first_commission' || sequenceKey === 'p4_partner_weekly_pulse' || sequenceKey === 'p5_subpartner_added' || sequenceKey === 'p6_partner_dormancy_recovery') {
    await resolvePartnerProfileVars(supabase, enrolment.email, ctx, vars);
    if (webinarDate && !vars.webinar_date_display) vars.webinar_date_display = fmtDate(webinarDate);
  }
  if (templateKey === 'em_p1_week1_checkin_v1') await resolveNextPartnerWebinar(supabase, vars);
  return vars;
}

function validateRequiredVars(declaredVars: Record<string, unknown> | null | undefined, resolvedVars: Record<string, string>): string[] {
  if (!declaredVars) return [];
  const missing: string[] = [];
  for (const varName of Object.keys(declaredVars)) {
    const val = resolvedVars[varName];
    if (val === undefined || val === null || String(val).trim() === '') missing.push(varName);
  }
  return missing;
}

function renderTemplate(text: string | null | undefined, vars: Record<string, string>): string {
  if (!text) return '';
  return text.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_match, key) => vars[key] !== undefined ? vars[key] : `{{${key}}}`);
}

async function isSuppressed(supabase: SupabaseClient, email: string, channel: string): Promise<boolean> {
  const { data } = await supabase.from('lifecycle_suppression').select('channels').eq('email', email.toLowerCase()).maybeSingle();
  if (!data) return false;
  return Array.isArray(data.channels) && data.channels.includes(channel);
}

async function consentOk(supabase: SupabaseClient, email: string, channel: string): Promise<boolean> {
  const { data } = await supabase.from('lifecycle_consent_log').select('state').eq('email', email.toLowerCase()).eq('channel', channel).order('recorded_at', { ascending: false }).limit(1).maybeSingle();
  if (!data) return true;
  return data.state === 'opted_in';
}

async function findExitEvent(supabase: SupabaseClient, email: string, exitTypes: string[], since: string): Promise<string | null> {
  if (!exitTypes || exitTypes.length === 0) return null;
  const { data } = await supabase.from('lifecycle_events').select('event_type').eq('email', email.toLowerCase()).in('event_type', exitTypes).gte('occurred_at', since).eq('backfilled', false).order('occurred_at', { ascending: false }).limit(1).maybeSingle();
  return data?.event_type ?? null;
}

async function alreadySent(supabase: SupabaseClient, enrolmentId: string, stepIndex: number): Promise<boolean> {
  const { data } = await supabase.from('lifecycle_dispatch_log').select('id').eq('enrolment_id', enrolmentId).eq('step_index', stepIndex).eq('status', 'sent').limit(1).maybeSingle();
  return !!data;
}

interface SendResult { ok: boolean; provider_id?: string; error?: string; }

async function sendEmail(apiKey: string, from: string, to: string, subject: string, html: string, text: string | null): Promise<SendResult> {
  try {
    const body: Record<string, unknown> = { from, to: [to], bcc: [BCC_EMAIL], subject, html };
    if (text) body.text = text;
    const res = await fetch(RESEND_API_URL, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, provider_id: data.id };
    return { ok: false, error: `Resend ${res.status}: ${JSON.stringify(data)}` };
  } catch (err) { return { ok: false, error: (err as Error).message }; }
}

async function sendWhatsApp(apiKey: string, destination: string, userName: string, campaignName: string, templateParams: string[]): Promise<SendResult> {
  try {
    const res = await fetch(AISENSY_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey, campaignName, destination, userName: userName || 'Student', source: 'lifecycle_dispatcher', templateParams }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, provider_id: data?.submitted_message_id };
    return { ok: false, error: `AiSensy ${res.status}: ${JSON.stringify(data)}` };
  } catch (err) { return { ok: false, error: (err as Error).message }; }
}

interface ProcessResult { enrolment_id: string; outcome: 'sent' | 'skipped' | 'exited' | 'completed' | 'failed' | 'deferred'; detail?: string; next_send_at?: string | null; }

async function computeNextSendAt(supabase: SupabaseClient, sequenceId: string, newStepIndex: number, enrolledAt: string, context: Record<string, unknown>): Promise<{ nextStep: any | null; nextSendAt: Date | null }> {
  const { data: nextStep } = await supabase.from('lifecycle_sequence_steps').select('*').eq('sequence_id', sequenceId).eq('step_index', newStepIndex).maybeSingle();
  if (!nextStep) return { nextStep: null, nextSendAt: null };
  let scheduled: Date;
  if (nextStep.absolute_anchor) {
    const anchored = computeAnchorTime(context, nextStep.absolute_anchor, nextStep.anchor_offset_hours);
    scheduled = anchored ? anchored : new Date(new Date(enrolledAt).getTime() + (nextStep.delay_hours || 0) * 3600 * 1000);
  } else {
    scheduled = new Date(new Date(enrolledAt).getTime() + (nextStep.delay_hours || 0) * 3600 * 1000);
  }
  const now = new Date();
  if (scheduled.getTime() < now.getTime()) scheduled = now;
  const windowed = applySendWindow(scheduled, String(nextStep.send_window_start || '00:00'), String(nextStep.send_window_end || '23:59'));
  return { nextStep, nextSendAt: windowed };
}

async function exitEnrolment(supabase: SupabaseClient, enrolmentId: string, reason: string) {
  await supabase.from('lifecycle_sequence_enrolments').update({ status: 'exited', exit_reason: reason.slice(0, 200), next_send_at: null, updated_at: new Date().toISOString() }).eq('id', enrolmentId);
}

async function processEnrolment(supabase: SupabaseClient, resendKey: string, aiSensyKey: string | null, enrolmentId: string, dryRun: boolean): Promise<ProcessResult> {
  const startTs = Date.now();
  const { data: enrolment } = await supabase.from('lifecycle_sequence_enrolments').select('*').eq('id', enrolmentId).maybeSingle();
  if (!enrolment) return { enrolment_id: enrolmentId, outcome: 'failed', detail: 'enrolment_not_found' };
  if (enrolment.status !== 'active') return { enrolment_id: enrolmentId, outcome: 'skipped', detail: `status_${enrolment.status}` };
  const { data: sequence } = await supabase.from('lifecycle_sequences').select('*').eq('id', enrolment.sequence_id).maybeSingle();
  if (!sequence) return { enrolment_id: enrolmentId, outcome: 'failed', detail: 'sequence_not_found' };
  if (!sequence.is_active) return { enrolment_id: enrolmentId, outcome: 'skipped', detail: 'sequence_inactive' };
  const { data: step } = await supabase.from('lifecycle_sequence_steps').select('*').eq('sequence_id', sequence.id).eq('step_index', enrolment.current_step_index).maybeSingle();
  if (!step) {
    if (!dryRun) await supabase.from('lifecycle_sequence_enrolments').update({ status: 'completed', next_send_at: null, updated_at: new Date().toISOString() }).eq('id', enrolmentId);
    return { enrolment_id: enrolmentId, outcome: 'completed', detail: 'no_more_steps' };
  }
  const exitMatch = await findExitEvent(supabase, enrolment.email, (sequence.exit_on_events as string[]) || [], enrolment.enrolled_at);
  if (exitMatch) {
    if (!dryRun) await exitEnrolment(supabase, enrolmentId, `exit_event:${exitMatch}`);
    return { enrolment_id: enrolmentId, outcome: 'exited', detail: `exit_event_${exitMatch}` };
  }
  const idemSent = await alreadySent(supabase, enrolmentId, step.step_index);
  const { data: template } = await supabase.from('lifecycle_templates').select('*').eq('template_key', step.template_key).order('version', { ascending: false }).limit(1).maybeSingle();
  if (!template) {
    if (!dryRun) await supabase.from('lifecycle_dispatch_log').insert({ enrolment_id: enrolmentId, sequence_id: sequence.id, step_index: step.step_index, channel: step.channel, template_key: step.template_key, recipient_email: enrolment.email, recipient_mobile: enrolment.mobile, status: 'skipped', skip_reason: 'template_not_found', duration_ms: Date.now() - startTs });
    return advanceStep(supabase, enrolment, sequence, step.step_index, dryRun, 'template_not_found');
  }
  if (template.channel === 'whatsapp' && !template.is_active) {
    if (!dryRun) await supabase.from('lifecycle_dispatch_log').insert({ enrolment_id: enrolmentId, sequence_id: sequence.id, step_index: step.step_index, channel: 'whatsapp', template_key: template.template_key, recipient_email: enrolment.email, recipient_mobile: enrolment.mobile, status: 'skipped', skip_reason: 'template_inactive_aisensy_pending', duration_ms: Date.now() - startTs });
    return advanceStep(supabase, enrolment, sequence, step.step_index, dryRun, 'wa_template_inactive');
  }
  const channelKey = template.channel === 'email' ? 'email' : 'whatsapp';
  if (await isSuppressed(supabase, enrolment.email, channelKey)) {
    if (!dryRun) {
      await supabase.from('lifecycle_dispatch_log').insert({ enrolment_id: enrolmentId, sequence_id: sequence.id, step_index: step.step_index, channel: channelKey, template_key: template.template_key, recipient_email: enrolment.email, recipient_mobile: enrolment.mobile, status: 'skipped', skip_reason: 'suppressed', duration_ms: Date.now() - startTs });
      await exitEnrolment(supabase, enrolmentId, 'suppressed');
    }
    return { enrolment_id: enrolmentId, outcome: 'exited', detail: 'suppressed' };
  }
  if (!(await consentOk(supabase, enrolment.email, channelKey))) {
    if (!dryRun) await supabase.from('lifecycle_dispatch_log').insert({ enrolment_id: enrolmentId, sequence_id: sequence.id, step_index: step.step_index, channel: channelKey, template_key: template.template_key, recipient_email: enrolment.email, recipient_mobile: enrolment.mobile, status: 'skipped', skip_reason: 'no_consent', duration_ms: Date.now() - startTs });
    return advanceStep(supabase, enrolment, sequence, step.step_index, dryRun, 'no_consent');
  }
  const vars = await buildVars(supabase, enrolment, template.template_key, sequence.sequence_key);
  const missing = validateRequiredVars(template.variables_declared as Record<string, unknown>, vars);
  if (missing.length > 0) {
    const reason = `missing_critical_vars:${missing.join(',')}`;
    console.error('[lifecycle-dispatcher]', enrolmentId, 'step', step.step_index, reason);
    if (!dryRun) {
      await supabase.from('lifecycle_dispatch_log').insert({ enrolment_id: enrolmentId, sequence_id: sequence.id, step_index: step.step_index, channel: template.channel, template_key: template.template_key, recipient_email: enrolment.email, recipient_mobile: enrolment.mobile, status: 'skipped', skip_reason: reason, duration_ms: Date.now() - startTs });
      await exitEnrolment(supabase, enrolmentId, reason);
    }
    return { enrolment_id: enrolmentId, outcome: 'exited', detail: reason };
  }
  if (dryRun) return { enrolment_id: enrolmentId, outcome: 'sent', detail: `DRY_RUN ${template.channel} -> ${enrolment.email} via ${template.template_key} (vars OK)` };
  let result: SendResult;
  if (template.channel === 'email') {
    if (idemSent) result = { ok: true, provider_id: 'idempotent_skip' };
    else {
      const subject = renderTemplate(template.subject, vars);
      const html    = renderTemplate(template.body_html, vars);
      const text    = renderTemplate(template.body_text, vars) || null;
      const from    = sequence.track === 'partner' ? SENDERS.partner : SENDERS.student;
      result = await sendEmail(resendKey, from, enrolment.email, subject, html, text);
    }
  } else {
    if (!aiSensyKey) result = { ok: false, error: 'AISENSY_API_KEY not configured' };
    else if (!enrolment.mobile) {
      await supabase.from('lifecycle_dispatch_log').insert({ enrolment_id: enrolmentId, sequence_id: sequence.id, step_index: step.step_index, channel: 'whatsapp', template_key: template.template_key, recipient_email: enrolment.email, recipient_mobile: null, status: 'skipped', skip_reason: 'no_mobile', duration_ms: Date.now() - startTs });
      return advanceStep(supabase, enrolment, sequence, step.step_index, dryRun, 'no_mobile');
    } else if (idemSent) result = { ok: true, provider_id: 'idempotent_skip' };
    else {
      const params = (template.aisensy_param_order as string[] | null || []).map(k => vars[k] ?? '');
      const destination = normalisePhone(enrolment.mobile);
      result = await sendWhatsApp(aiSensyKey, destination, vars.full_name, template.aisensy_campaign_name as string, params);
    }
  }
  await supabase.from('lifecycle_dispatch_log').insert({ enrolment_id: enrolmentId, sequence_id: sequence.id, step_index: step.step_index, channel: template.channel, template_key: template.template_key, recipient_email: enrolment.email, recipient_mobile: enrolment.mobile, status: result.ok ? 'sent' : 'failed', provider: template.channel === 'email' ? 'resend' : 'aisensy', provider_message_id: result.provider_id || null, error_message: result.error || null, duration_ms: Date.now() - startTs });
  // Phase N — dual-write to partner_comms_log
  if (sequence.track === 'partner') {
    try {
      await supabase.from('partner_comms_log').insert({ channel: template.channel, send_mode: 'lifecycle', template_slug: template.template_key, partner_code: vars.partner_code || null, aisensy_campaign: template.aisensy_campaign_name || null, triggered_by: 'lifecycle_dispatcher', triggered_at: new Date().toISOString(), status: result.ok ? 'sent' : 'failed', ref_id: enrolmentId, ref_type: 'lifecycle_enrolment', notes: result.error || null }); } catch (err) { console.warn('[lifecycle-dispatcher] partner_comms_log dual-write failed:', (err as Error).message); }
  }
  if (result.ok) {
    await supabase.from('lifecycle_events').insert({ email: enrolment.email.toLowerCase(), mobile: enrolment.mobile, event_type: template.channel === 'email' ? 'email_sent' : 'whatsapp_sent', event_source_table: 'lifecycle_dispatch_log', source_row_id: null, track: sequence.track || 'student', metadata: { sequence_key: sequence.sequence_key, step_index: step.step_index, template_key: template.template_key, provider_id: result.provider_id }, backfilled: false });
  }
  if (!result.ok) {
    const newFailureCount = (enrolment.failure_count || 0) + 1;
    if (newFailureCount >= MAX_FAILURES) {
      await supabase.from('lifecycle_sequence_enrolments').update({ status: 'failed', exit_reason: `max_failures:${result.error?.slice(0, 100)}`, failure_count: newFailureCount, last_attempt_at: new Date().toISOString(), next_send_at: null, updated_at: new Date().toISOString() }).eq('id', enrolmentId);
      return { enrolment_id: enrolmentId, outcome: 'failed', detail: `max_failures: ${result.error}` };
    } else {
      const backoffMin = BACKOFF_MINUTES[Math.min(newFailureCount - 1, BACKOFF_MINUTES.length - 1)];
      const retryAt = new Date(Date.now() + backoffMin * 60 * 1000);
      await supabase.from('lifecycle_sequence_enrolments').update({ failure_count: newFailureCount, last_attempt_at: new Date().toISOString(), next_send_at: retryAt.toISOString(), updated_at: new Date().toISOString() }).eq('id', enrolmentId);
      return { enrolment_id: enrolmentId, outcome: 'deferred', detail: `retry_${backoffMin}min: ${result.error}`, next_send_at: retryAt.toISOString() };
    }
  }
  return advanceStep(supabase, enrolment, sequence, step.step_index, dryRun, 'sent');
}

async function advanceStep(supabase: SupabaseClient, enrolment: any, sequence: any, currentIndex: number, dryRun: boolean, reason: string): Promise<ProcessResult> {
  const nextIndex = currentIndex + 1;
  const { nextStep, nextSendAt } = await computeNextSendAt(supabase, sequence.id, nextIndex, enrolment.enrolled_at, enrolment.context);
  if (dryRun) return { enrolment_id: enrolment.id, outcome: nextStep ? 'sent' : 'completed', detail: `DRY_RUN advance -> step ${nextIndex} (${nextStep ? nextStep.template_key : 'NONE'})`, next_send_at: nextSendAt?.toISOString() ?? null };
  if (!nextStep) {
    await supabase.from('lifecycle_sequence_enrolments').update({ status: 'completed', current_step_index: nextIndex, next_send_at: null, last_sent_at: reason === 'sent' ? new Date().toISOString() : enrolment.last_sent_at, last_attempt_at: new Date().toISOString(), failure_count: 0, updated_at: new Date().toISOString() }).eq('id', enrolment.id);
    return { enrolment_id: enrolment.id, outcome: 'completed', detail: `last_step_was_${reason}` };
  }
  await supabase.from('lifecycle_sequence_enrolments').update({ current_step_index: nextIndex, next_send_at: nextSendAt?.toISOString() || null, last_sent_at: reason === 'sent' ? new Date().toISOString() : enrolment.last_sent_at, last_attempt_at: new Date().toISOString(), failure_count: 0, updated_at: new Date().toISOString() }).eq('id', enrolment.id);
  return { enrolment_id: enrolment.id, outcome: reason === 'sent' ? 'sent' : 'skipped', detail: `advanced_to_step_${nextIndex}_${reason}`, next_send_at: nextSendAt?.toISOString() ?? null };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
  const startedAt = Date.now();
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const aiSensyKey = Deno.env.get('AISENSY_API_KEY') || null;
    if (!resendKey) return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), { status: 500, headers: CORS });
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const dryRun: boolean = body.dry_run === true;
    const limit: number = Math.min(Number(body.limit) || 50, 200);
    const onlyEnrolmentId: string | undefined = body.enrolment_id;
    let dueIds: string[] = [];
    if (onlyEnrolmentId) dueIds = [onlyEnrolmentId];
    else {
      const { data: due } = await supabase.from('lifecycle_sequence_enrolments').select('id').eq('status', 'active').lte('next_send_at', new Date().toISOString()).order('next_send_at', { ascending: true }).limit(limit);
      dueIds = (due ?? []).map(r => r.id as string);
    }
    const results: ProcessResult[] = [];
    for (const id of dueIds) {
      try { results.push(await processEnrolment(supabase, resendKey, aiSensyKey, id, dryRun)); }
      catch (err) { console.error('[lifecycle-dispatcher]', id, (err as Error).message); results.push({ enrolment_id: id, outcome: 'failed', detail: (err as Error).message }); }
    }
    const summary = { processed: results.length, sent: results.filter(r => r.outcome === 'sent').length, skipped: results.filter(r => r.outcome === 'skipped').length, exited: results.filter(r => r.outcome === 'exited').length, completed: results.filter(r => r.outcome === 'completed').length, deferred: results.filter(r => r.outcome === 'deferred').length, failed: results.filter(r => r.outcome === 'failed').length };
    console.log('[lifecycle-dispatcher]', JSON.stringify(summary), `${Date.now() - startedAt}ms`);
    return new Response(JSON.stringify({ success: true, dry_run: dryRun, duration_ms: Date.now() - startedAt, ...summary, results }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[lifecycle-dispatcher] unhandled:', (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: CORS });
  }
});
