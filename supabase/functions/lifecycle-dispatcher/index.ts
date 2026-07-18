import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * lifecycle-dispatcher v23 (+ in-app inbox mirror)
 *
 * v23: WhatsApp inbox rows resolve the POSITIONAL {{1}}..{{n}} placeholders via
 *      aisensy_param_order. renderTemplate only matches named vars, so v22 filed WhatsApp rows
 *      with every placeholder literal. Caught before any real WhatsApp send hit the new code.
 *
 * v22: every student-track send now also files a row in `notifications`, so the app's bell is a
 *      record of EVERY comm rather than just pushes and support tickets. Rendered here because
 *      this is the only place the personalised text exists. Push is excluded (its own endpoint
 *      already writes the row) as is the partner track (UUID-keyed, written by notifyPartner).
 *      Failure to mirror never fails the send.
 *
 * v21: `push` is a first-class lifecycle_channel alongside email/whatsapp. A push step
 *      sends via the www app's /api/admin/push/send (which owns the proven FCM HTTP v1
 *      sender AND writes the in-app notifications row, so the bell stays in sync).
 *      channelKey is now a real 3-way — it used to be `email ? email : whatsapp`, which
 *      would have consent-checked push against the WhatsApp opt-out and then sent it down
 *      the AiSensy path. A recipient with no registered device logs skip_reason
 *      'no_device' rather than failing, so it never burns a retry or trips MAX_FAILURES.
 *
 * v20: POST { preview:true, enrolment_id, template_key? } renders the message exactly as it
 *      would be sent (buildVars + renderTemplate + resolveCtaTarget) WITHOUT sending, minting,
 *      logging, or advancing — powers the admin Comms Analytics "view message" modal. For WA
 *      it returns the ordered params (incl. the resolved link target) + best-effort body_text.
 * v16 (body-link bite campaigns live: BITE_BY_PROFESSION -> *_link)
 *
 * v16: the 6 audience bite campaigns + general now point at the Meta-approved BODY-LINK
 *      templates (wa_bite_*_link) — the tracked /l/ short link rides as the LAST body
 *      variable (comms_url) instead of a button. wa_e4/wa_e5 switched to *_link via their
 *      template rows (aisensy_campaign_name + comms_url appended to aisensy_param_order).
 *      IMPORTANT: comms_url is minted AFTER validateRequiredVars, so it must NEVER be
 *      declared in variables_declared (only in aisensy_param_order) or the enrolment exits.
 * v15: shortToken() -> 8 chars (6 random bytes). Tokenised links are now offered as
 *      BOTH comms_token (raw token) AND comms_url (the full https://ostaran.com/l/<token>,
 *      apex = shortest visible URL) so a WhatsApp BODY variable can carry the tracked link.
 *      Minting fires when EITHER comms_token OR comms_url is in the template param order.
 *      resolveCtaTarget appends ?partner=<code> to the /watch and /courses targets.
 * v14: resolveEnrolUrl / resolveEnrolUrlS6 / the warm /videos link also carry &partner=.
 * v12.1: token minting gated on comms_token in aisensy_param_order; bite step always
 *      selects the audience campaign; audience_label also resolved for wa_s9.
 * v12:  tokenised /l/<token> CTA support + audience bite selection (wa_video_bite).
 * v11:  resolveWebinarRegisterUrl warm-aware (already-registered -> /videos).
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

function jsonResponse(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

const AISENSY_API_URL = 'https://backend.aisensy.com/campaign/t1/api/v2';
const RESEND_API_URL  = 'https://api.resend.com/emails';
const SENDERS = {
  student: 'oStaran AI Education <ai@ostaran.com>',
  partner: 'oStaran Partner Support <ai@ostaran.com>',
};
const BCC_EMAIL       = 'star.analytix.ai@gmail.com';
const SITE_BASE       = 'https://www.ostaran.com';
const LINK_BASE       = 'https://ostaran.com';
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

const PROFESSION_TO_LABEL: Record<string, string> = {
  working_professional:    'Working Professional',
  college_student:         'College Student',
  job_seeker:              'Job Seeker',
  school_student:          'School Student',
  tech_developer:          'Tech Developer',
  data_engineer_scientist: 'Tech Developer',
  home_maker:              'Working Professional',
};

const AUDIENCE_LABEL: Record<string, string> = {
  working_professional:    'Working Professional',
  college_student:         'Student',
  job_seeker:              'Job Seeker',
  school_student:          'School Student',
  tech_developer:          'Developer',
  data_engineer_scientist: 'Data Scientist',
  home_maker:              'Career Returner',
};

const BITE_BY_PROFESSION: Record<string, { campaign: string; slug: string | null }> = {
  working_professional:    { campaign: 'wa_bite_working_pro_link', slug: 'ai-mastery-for-working-professionals' },
  college_student:         { campaign: 'wa_bite_student_link',     slug: 'ai-mastery-for-students' },
  job_seeker:              { campaign: 'wa_bite_student_link',     slug: 'ai-mastery-for-students' },
  school_student:          { campaign: 'wa_bite_school_link',      slug: 'ai-mastery-for-school-students' },
  tech_developer:          { campaign: 'wa_bite_developer_link',   slug: 'agentic-ai-development' },
  data_engineer_scientist: { campaign: 'wa_bite_developer_link',   slug: 'agentic-ai-development' },
  home_maker:              { campaign: 'wa_bite_homemaker_link',   slug: 'ai-mastery-for-homemakers' },
};
const BITE_DEFAULT = { campaign: 'wa_bite_general_link', slug: null as string | null };
function biteFor(profession: string | undefined | null): { campaign: string; slug: string | null } {
  return (profession && BITE_BY_PROFESSION[profession]) || BITE_DEFAULT;
}

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

function resolveCtaTarget(templateKey: string, ctx: Record<string, unknown>): string | null {
  const code = ((ctx.partner_code as string) || '').trim();
  const partnerQ = code ? `?partner=${encodeURIComponent(code)}` : '';
  if (templateKey === 'wa_video_bite') {
    const b = biteFor(ctx.profession_choice as string | undefined);
    return b.slug ? `${SITE_BASE}/watch/${b.slug}${partnerQ}` : `${SITE_BASE}/videos${partnerQ}`;
  }
  const slug = audienceSlug(ctx);
  switch (templateKey) {
    case 'wa_e4_resume_pathway':    return `${SITE_BASE}/courses/${slug}${partnerQ}`;
    case 'wa_e5_contact_reply':     return `${SITE_BASE}/courses/${slug}${partnerQ}`;
    case 'wa_s4_programme_welcome': return `${SITE_BASE}/dashboard`;
    case 'wa_s4_welcome_wa_v1':     return `${SITE_BASE}/dashboard`;
    case 'wa_s10_seat_held_v1':     return `${SITE_BASE}/courses/${slug}${partnerQ}`;
    case 'wa_s10_last_reminder_v1': return `${SITE_BASE}/courses/${slug}${partnerQ}`;
    case 'wa_s9_referral_wa_v1':    return `${SITE_BASE}/become-a-partner`;
    case 'wa_m1_keep_edge_v1':      return `${SITE_BASE}/courses/quantum-ai-continued${partnerQ}`;
    case 'wa_m1_alumni_rate_v1':    return `${SITE_BASE}/courses/quantum-ai-continued${partnerQ}`;
    case 'wa_s9_alumni_referral':   return `${SITE_BASE}/become-a-partner`;
    case 'wa_p1_welcome_tour':      return 'https://partner.ostaran.com/watch/partner-tutorial';
    case 'wa_p4_weekly_pulse':      return 'https://partner.ostaran.com/dashboard';
    case 'wa_r1_recruiter_welcome': return 'https://partner.ostaran.com/recruit/jobs';
    case 'wa_r2_recruiter_live':    return 'https://partner.ostaran.com/recruit/dashboard';
    default: return null;
  }
}

function shortToken(): string {
  const b = new Uint8Array(6);
  crypto.getRandomValues(b);
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function mintCommsLink(supabase: SupabaseClient, row: { target_url: string; channel: string; template_key: string; sequence_key: string; enrolment_id: string; contact_email: string; contact_mobile: string | null; audience: string | null }): Promise<string> {
  const token = shortToken();
  try {
    await supabase.from('comms_link').insert({ token, ...row });
  } catch (err) {
    console.warn('[lifecycle-dispatcher] comms_link mint failed:', (err as Error).message);
  }
  return token;
}

// v14 — course enrol link carries &partner=<code> (sets ost_partner cookie -> discount banner).
function resolveEnrolUrl(ctx: Record<string, unknown>): string {
  const slug = audienceSlug(ctx);
  const code = ((ctx.partner_code as string) || '').trim();
  const partner = code ? `&utm_medium=${encodeURIComponent(code)}&partner=${encodeURIComponent(code)}` : '';
  return `${SITE_BASE}/courses/${slug}?utm_source=lifecycle_s8&utm_campaign=post_masterclass${partner}`;
}

function resolveEnrolUrlS6(ctx: Record<string, unknown>): string {
  const slug = audienceSlug(ctx);
  const code = ((ctx.partner_code as string) || '').trim();
  const partner = code ? `&utm_medium=${encodeURIComponent(code)}&partner=${encodeURIComponent(code)}` : '';
  return `${SITE_BASE}/courses/${slug}?utm_source=lifecycle_s6&utm_campaign=post_webinar_upsell${partner}`;
}

async function isWarmContact(supabase: SupabaseClient, email: string): Promise<boolean> {
  const e = email.toLowerCase();
  const { data: reg } = await supabase.from('qr_landing_registrations').select('id').eq('email', e).limit(1).maybeSingle();
  if (reg) return true;
  const { data: enr } = await supabase.from('student_enrolments').select('id').eq('student_email', e).limit(1).maybeSingle();
  return !!enr;
}

function code_free(ctx: Record<string, unknown>): string {
  const c = ((ctx.partner_code as string) || '').trim();
  return c || 'organic';
}

async function resolveWebinarRegisterUrl(supabase: SupabaseClient, ctx: Record<string, unknown>, email: string, sequenceKey: string): Promise<string> {
  const seqShort = sequenceKey.split('_')[0];
  if (await isWarmContact(supabase, email)) {
    const code = ((ctx.partner_code as string) || '').trim();
    const vp = new URLSearchParams({ utm_source: code_free(ctx), utm_medium: 'email', utm_campaign: `lifecycle_${seqShort}_warm` });
    if (code) vp.set('partner', code);
    return `${SITE_BASE}/videos?${vp.toString()}`;
  }
  let code = ((ctx.partner_code as string) || '').trim();
  if (!code) {
    const { data } = await supabase.from('qr_landing_registrations').select('utm_source').eq('email', email.toLowerCase()).not('utm_source', 'is', null).neq('utm_source', '').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (data?.utm_source) code = String(data.utm_source).trim();
  }
  if (!code) code = 'ARIBOMBAY-0326';
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
  if (sequenceKey.startsWith('e1_') || sequenceKey.startsWith('e2_') || sequenceKey.startsWith('e3_') || sequenceKey.startsWith('e5_') || sequenceKey.startsWith('e6_') || sequenceKey.startsWith('x1_')) {
    vars.webinar_register_url = await resolveWebinarRegisterUrl(supabase, ctx, enrolment.email, sequenceKey);
  }
  if (templateKey === 'wa_e4_resume_pathway' || templateKey === 'wa_e5_contact_reply' || templateKey === 'wa_s9_alumni_referral') {
    vars.audience_label = AUDIENCE_LABEL[(ctx.profession_choice as string) || ''] || 'AI learner';
  }
  if ((templateKey === 'wa_s4_programme_welcome' || templateKey === 'wa_s10_seat_held_v1') && (!vars.course_name || vars.course_name.trim() === '')) {
    vars.course_name = 'your AI programme';
  }
  if (sequenceKey === 's3_paidmc_noshow_reengage') await resolveNoShowVars(supabase, enrolment.email, 'masterclass', vars);
  else if (sequenceKey === 's7_free_webinar_noshow_recovery') await resolveNoShowVars(supabase, enrolment.email, 'webinar', vars);
  if (templateKey === 'wa_s2_complete_payment_v1') vars.masterclass_payment_url = await resolveMasterclassPaymentUrl(supabase, ctx, enrolment.email);
  if (sequenceKey === 'p1_partner_welcome_onboarding' || sequenceKey === 'p2_partner_first_student_referral' || sequenceKey === 'p3_partner_first_commission' || sequenceKey === 'p4_partner_weekly_pulse' || sequenceKey === 'p5_subpartner_added' || sequenceKey === 'p6_partner_dormancy_recovery' || sequenceKey === 'p7_first_referral_activation') {
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

// Push is sent by delegating to the www app's /api/admin/push/send rather than talking to FCM from
// here. That endpoint already holds the working, dependency-free FCM HTTP v1 sender (service-account
// JWT -> OAuth -> per-token POST) and already writes the in-app `notifications` row alongside the
// push, so the bell and the notification screen stay in sync for free. Porting the RSA-SHA256 JWT
// signing into the Deno runtime would duplicate proven code for no gain.
//
// `devices: 0` is a real, expected outcome — most students have not installed the app — and is
// reported back so the caller can log it as a skip rather than a false success.
interface PushResult extends SendResult { devices?: number }

async function sendPush(
  cronKey: string,
  email: string,
  title: string,
  body: string,
  link: string | null,
  kind: string,
): Promise<PushResult> {
  try {
    const res = await fetch(`${SITE_BASE}/api/admin/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cronKey}` },
      body: JSON.stringify({ target: email, title, body, link: link || '/dashboard', kind }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: `push ${res.status}: ${JSON.stringify(data)}` };
    return { ok: true, provider_id: `fcm:${data?.sent ?? 0}/${data?.devices ?? 0}`, devices: data?.devices ?? 0 };
  } catch (err) { return { ok: false, error: (err as Error).message }; }
}

// ── in-app inbox mirror ────────────────────────────────────
// The app's notification bell used to be a push-and-tickets inbox: email and WhatsApp sends wrote
// only to lifecycle_dispatch_log, so a student who had received 72 comms saw 4 rows. Every send on
// the student track now also files an inbox row, making the bell a real record of what we sent.
//
// It has to happen HERE rather than in a DB trigger on the dispatch log, because this is the only
// place the RENDERED text exists — the log stores template_key, and re-rendering from the template
// later would show raw {{first_name}} placeholders for anything not held in the enrolment context.

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&rsquo;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]*(\n[ \t]*)+/g, '\n')
    .trim();
}

// WhatsApp bodies are Meta templates: they use POSITIONAL {{1}}..{{n}} placeholders whose values are
// supplied at send time in aisensy_param_order. renderTemplate only matches named {{like_this}} (its
// pattern requires a leading letter), so a WhatsApp body left every placeholder literal — the inbox
// would have read "{{1}}, your *{{2}}* class is live now! Join here: {{3}}". Resolve them the same
// way the send path does. Asterisks are WhatsApp's bold syntax and are meaningless in the app.
function renderWhatsAppBody(template: any, vars: Record<string, string>): string {
  const order = (template.aisensy_param_order as string[] | null) || [];
  return renderTemplate(template.body_text, vars)
    .replace(/\{\{\s*(\d+)\s*\}\}/g, (_m, d) => {
      const key = order[Number(d) - 1];
      return key ? (vars[key] ?? '') : '';
    })
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/[ \t]{2,}/g, ' ');
}

// Email templates all carry a subject (82/82) but almost never body_text (3/82), so the body comes
// from the HTML. WhatsApp templates are the mirror image: always body_text, never a subject — so the
// first line becomes the title and the remainder the body.
function inboxContent(template: any, vars: Record<string, string>): { title: string; body: string } {
  if (template.channel === 'email') {
    const title = renderTemplate(template.subject, vars).trim() || 'oStaran';
    const text  = renderTemplate(template.body_text, vars).trim()
                  || htmlToText(renderTemplate(template.body_html, vars));
    return { title: title.slice(0, 160), body: text.slice(0, 400) };
  }
  const text  = renderWhatsAppBody(template, vars).trim();
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const first = lines[0] || 'oStaran';
  const rest  = lines.slice(1).join(' ').trim();
  return { title: first.slice(0, 160), body: (rest || text).slice(0, 400) };
}

async function mirrorToInbox(supabase: SupabaseClient, template: any, vars: Record<string, string>, enrolment: any, sequence: any): Promise<void> {
  // Push already files its own row via /api/admin/push/send — mirroring it here would double it.
  // Partner-track notifications are UUID-keyed and written by the partner app's own notifyPartner.
  if (template.channel === 'push') return;
  if ((sequence.track || 'student') !== 'student') return;
  try {
    const { title, body } = inboxContent(template, vars);
    if (!title && !body) return;
    const link = resolveCtaTarget(template.template_key, enrolment.context || {})
                 || ((enrolment.context as Record<string, unknown>)?.cta_target as string)
                 || `${SITE_BASE}/dashboard`;
    await supabase.from('notifications').insert({
      recipient_type: 'student',
      recipient_id: enrolment.email.toLowerCase(),
      kind: String(sequence.sequence_key || 'lifecycle').slice(0, 40),
      title, body, link,
    });
  } catch (err) {
    // An inbox row is a convenience; the message itself already went out. Never fail the send.
    console.warn('[lifecycle-dispatcher] inbox mirror failed:', (err as Error).message);
  }
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

async function processEnrolment(supabase: SupabaseClient, resendKey: string, aiSensyKey: string | null, pushKey: string, enrolmentId: string, dryRun: boolean): Promise<ProcessResult> {
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
  // Three-way, not `email ? email : whatsapp`. The old binary meant any non-email channel was
  // treated as WhatsApp, so a push step would have been consent/suppression-checked against the
  // WhatsApp opt-out and then sent down the AiSensy path with a null campaign.
  const channelKey: 'email' | 'whatsapp' | 'push' =
    template.channel === 'email' ? 'email' : template.channel === 'push' ? 'push' : 'whatsapp';
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
  if (dryRun) return { enrolment_id: enrolmentId, outcome: 'sent', detail: `DRY_RUN ${template.channel} -> ${enrolment.email} via ${template.template_key} (campaign ${template.template_key === 'wa_video_bite' ? biteFor((enrolment.context as Record<string, unknown>)?.profession_choice as string | undefined).campaign : (template.aisensy_campaign_name || 'n/a')}) (vars OK) params=[${((template.aisensy_param_order as string[]) || []).join(',')}]` };
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
  } else if (template.channel === 'push') {
    // A push carries: subject -> notification title, body_text -> body, and the step's CTA as the
    // deep link the tap opens. No template approval anywhere in this path, unlike WhatsApp.
    if (idemSent) result = { ok: true, provider_id: 'idempotent_skip' };
    else {
      const title = renderTemplate(template.subject, vars) || 'oStaran';
      const bodyT = renderTemplate(template.body_text, vars) || '';
      const link  = resolveCtaTarget(template.template_key, enrolment.context || {})
                    || ((enrolment.context as Record<string, unknown>)?.cta_target as string)
                    || `${SITE_BASE}/dashboard`;
      const push = await sendPush(pushKey, enrolment.email, title, bodyT, link, sequence.sequence_key);
      // No registered device is not a failure — it must not burn a retry or trip MAX_FAILURES.
      // Log it honestly as a skip so push coverage is measurable per sequence.
      if (push.ok && (push.devices ?? 0) === 0) {
        await supabase.from('lifecycle_dispatch_log').insert({ enrolment_id: enrolmentId, sequence_id: sequence.id, step_index: step.step_index, channel: 'push', template_key: template.template_key, recipient_email: enrolment.email, recipient_mobile: enrolment.mobile, status: 'skipped', skip_reason: 'no_device', duration_ms: Date.now() - startTs });
        return advanceStep(supabase, enrolment, sequence, step.step_index, dryRun, 'no_device');
      }
      result = push;
    }
  } else {
    if (!aiSensyKey) result = { ok: false, error: 'AISENSY_API_KEY not configured' };
    else if (!enrolment.mobile) {
      await supabase.from('lifecycle_dispatch_log').insert({ enrolment_id: enrolmentId, sequence_id: sequence.id, step_index: step.step_index, channel: 'whatsapp', template_key: template.template_key, recipient_email: enrolment.email, recipient_mobile: null, status: 'skipped', skip_reason: 'no_mobile', duration_ms: Date.now() - startTs });
      return advanceStep(supabase, enrolment, sequence, step.step_index, dryRun, 'no_mobile');
    } else if (idemSent) result = { ok: true, provider_id: 'idempotent_skip' };
    else {
      let campaignName = template.aisensy_campaign_name as string;
      const paramOrder = (template.aisensy_param_order as string[] | null) || [];
      if (template.template_key === 'wa_video_bite') campaignName = biteFor((enrolment.context as Record<string, unknown>)?.profession_choice as string | undefined).campaign;
      if (paramOrder.includes('comms_token') || paramOrder.includes('comms_url')) {
        const ctaTarget = resolveCtaTarget(template.template_key, enrolment.context || {}) || ((enrolment.context as Record<string, unknown>)?.cta_target as string) || null;
        if (ctaTarget) {
          const token = await mintCommsLink(supabase, { target_url: ctaTarget, channel: 'whatsapp', template_key: template.template_key, sequence_key: sequence.sequence_key, enrolment_id: enrolmentId, contact_email: enrolment.email, contact_mobile: enrolment.mobile, audience: ((enrolment.context as Record<string, unknown>)?.profession_choice as string) || null });
          vars.comms_token = token;
          vars.comms_url   = `${LINK_BASE}/l/${token}`;
        }
      }
      const params = paramOrder.map(k => vars[k] ?? '');
      const destination = normalisePhone(enrolment.mobile);
      result = await sendWhatsApp(aiSensyKey, destination, vars.full_name, campaignName, params);
    }
  }
  await supabase.from('lifecycle_dispatch_log').insert({ enrolment_id: enrolmentId, sequence_id: sequence.id, step_index: step.step_index, channel: template.channel, template_key: template.template_key, recipient_email: enrolment.email, recipient_mobile: enrolment.mobile, status: result.ok ? 'sent' : 'failed', provider: template.channel === 'email' ? 'resend' : template.channel === 'push' ? 'fcm' : 'aisensy', provider_message_id: result.provider_id || null, error_message: result.error || null, duration_ms: Date.now() - startTs });
  if (sequence.track === 'partner') {
    try {
      await supabase.from('partner_comms_log').insert({ channel: template.channel, send_mode: 'lifecycle', template_slug: template.template_key, partner_code: vars.partner_code || null, aisensy_campaign: template.aisensy_campaign_name || null, triggered_by: 'lifecycle_dispatcher', triggered_at: new Date().toISOString(), status: result.ok ? 'sent' : 'failed', ref_id: enrolmentId, ref_type: 'lifecycle_enrolment', notes: result.error || null }); } catch (err) { console.warn('[lifecycle-dispatcher] partner_comms_log dual-write failed:', (err as Error).message); }
  }
  if (result.ok) {
    await supabase.from('lifecycle_events').insert({ email: enrolment.email.toLowerCase(), mobile: enrolment.mobile, event_type: template.channel === 'email' ? 'email_sent' : template.channel === 'push' ? 'push_sent' : 'whatsapp_sent', event_source_table: 'lifecycle_dispatch_log', source_row_id: null, track: sequence.track || 'student', metadata: { sequence_key: sequence.sequence_key, step_index: step.step_index, template_key: template.template_key, provider_id: result.provider_id }, backfilled: false });
    if (result.provider_id !== 'idempotent_skip') await mirrorToInbox(supabase, template, vars, enrolment, sequence);
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

// Read-only render of a message for a given enrolment (admin preview). Reuses the exact
// send-path resolution (buildVars/renderTemplate/resolveCtaTarget) but never sends, mints,
// logs, or advances — so it faithfully shows the personalised body + the real link target.
async function handlePreview(supabase: SupabaseClient, enrolmentId: string | undefined, templateKeyOverride: string | undefined): Promise<Response> {
  if (!enrolmentId) return jsonResponse({ error: 'enrolment_id required' }, 400);
  const { data: enrolment } = await supabase.from('lifecycle_sequence_enrolments').select('*').eq('id', enrolmentId).maybeSingle();
  if (!enrolment) return jsonResponse({ error: 'enrolment_not_found' }, 404);
  const { data: sequence } = await supabase.from('lifecycle_sequences').select('*').eq('id', enrolment.sequence_id).maybeSingle();
  let templateKey = templateKeyOverride;
  if (!templateKey) {
    const { data: step } = await supabase.from('lifecycle_sequence_steps').select('template_key').eq('sequence_id', enrolment.sequence_id).eq('step_index', enrolment.current_step_index).maybeSingle();
    templateKey = step?.template_key as string | undefined;
  }
  if (!templateKey) return jsonResponse({ error: 'template_not_resolved' }, 400);
  const { data: template } = await supabase.from('lifecycle_templates').select('*').eq('template_key', templateKey).order('version', { ascending: false }).limit(1).maybeSingle();
  if (!template) return jsonResponse({ error: 'template_not_found', template_key: templateKey }, 404);
  const seqKey = (sequence?.sequence_key as string) || '';
  const vars = await buildVars(supabase, enrolment, template.template_key, seqKey);
  const paramOrder = (template.aisensy_param_order as string[] | null) || [];
  let ctaTarget: string | null = null;
  if (template.channel !== 'email' && (paramOrder.includes('comms_token') || paramOrder.includes('comms_url'))) {
    ctaTarget = resolveCtaTarget(template.template_key, enrolment.context || {}) || ((enrolment.context as Record<string, unknown>)?.cta_target as string) || null;
    if (ctaTarget) { vars.comms_url = ctaTarget; vars.comms_token = '(tracked link minted at send time)'; }
  }
  const missing = validateRequiredVars(template.variables_declared as Record<string, unknown>, vars);
  const resp: Record<string, unknown> = {
    preview: true,
    channel: template.channel,
    template_key: template.template_key,
    sequence_key: seqKey,
    recipient: { email: enrolment.email, mobile: enrolment.mobile, name: vars.full_name || '' },
    missing_vars: missing,
  };
  if (template.channel === 'email') {
    resp.subject   = renderTemplate(template.subject as string, vars);
    resp.body_html = renderTemplate(template.body_html as string, vars);
    resp.body_text = renderTemplate(template.body_text as string, vars);
  } else if (template.channel === 'push') {
    // Preview a push the way it actually appears on the device: title, body, and the deep link a
    // tap opens. Without this branch a push template fell into the WhatsApp arm and rendered a
    // meaningless null campaign with an empty param list.
    resp.push_title = renderTemplate(template.subject as string, vars) || 'oStaran';
    resp.body_text  = renderTemplate(template.body_text as string, vars);
    resp.cta_target = resolveCtaTarget(template.template_key, enrolment.context || {})
                      || ((enrolment.context as Record<string, unknown>)?.cta_target as string)
                      || `${SITE_BASE}/dashboard`;
  } else {
    let campaignName = template.aisensy_campaign_name as string;
    if (template.template_key === 'wa_video_bite') campaignName = biteFor((enrolment.context as Record<string, unknown>)?.profession_choice as string | undefined).campaign;
    resp.aisensy_campaign_name = campaignName;
    resp.body_text = renderTemplate(template.body_text as string, vars);
    resp.params = paramOrder.map(k => ({ name: k, value: vars[k] ?? '' }));
    resp.cta_target = ctaTarget;
  }
  return jsonResponse(resp, 200);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
  const startedAt = Date.now();
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const aiSensyKey = Deno.env.get('AISENSY_API_KEY') || null;
    // /api/admin/push/send accepts CRON_SECRET or the shared transcript_fetch_config.cron_key.
    // Reading the DB key means push needs no new edge-function secret.
    const { data: pcfg } = await supabase.from('transcript_fetch_config').select('cron_key').eq('id', 1).maybeSingle();
    const pushKey = (pcfg?.cron_key as string | undefined) || Deno.env.get('CRON_SECRET') || '';
    if (!resendKey) return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), { status: 500, headers: CORS });
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    if (body.preview === true) return await handlePreview(supabase, body.enrolment_id, body.template_key);
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
      try { results.push(await processEnrolment(supabase, resendKey, aiSensyKey, pushKey, id, dryRun)); }
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
