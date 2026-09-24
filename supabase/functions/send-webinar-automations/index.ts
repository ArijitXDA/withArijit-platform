import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * send-webinar-automations v17
 * v17: MODE 3 (live_now) hardening — add per-registrant dedup
 *      (live_now_whatsapp_sent) so a registrant is never sent the "live now"
 *      WhatsApp twice even if two sessions share the same (date, time), and add
 *      .eq('status','scheduled') to the session query (matches MODE 2) so
 *      cancelled/completed sessions never fire. No other mode changed.
 *
 * V2 campaign rollout round 2:
 *   - MODE 2 (countdown):  try webinar_countdown_reminder_v2 first (6 params incl. {{3}}=hours),
 *                          fall back to v1 (5 params) if AiSensy says 'not found'
 *   - MODE 4 (feedback):   try webinar_feedback_request_v2 first (3 params),
 *                          fall back to v1 (3 params, same count, different name)
 *   - MODE 5 (noshow):     already v2-first-with-fallback in v11, retained as-is
 *
 * Self-healing: during the AiSensy pending-approval window, v2 attempts return
 * 'campaign not found', we silently fall back to v1, and users get messages.
 * Once v2 is approved, v2 calls succeed and v1 is never hit.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const AISENSY_URL   = 'https://backend.aisensy.com/campaign/t1/api/v2';
const JOIN_BASE     = 'https://partner.ostaran.com/join';
const COURSES_BASE  = 'https://www.ostaran.com/courses';
const REGISTER_URL  = 'https://webinar.ostaran.com';
const FEEDBACK_URL  = 'https://webinar.ostaran.com/webinar_ratings';
const NUDGE_COOLDOWN_DAYS_AFTER_NOSHOW = 3;

function normalisePhone(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10) return '91' + d;
  if (d.length === 11 && d.startsWith('0')) return '91' + d.slice(1);
  if (d.length === 12 && d.startsWith('91')) return d;
  return '+' + d;
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${days[dt.getUTCDay()]}, ${d} ${months[m - 1]} ${y}`;
}

function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** Compute whole hours between `now` and the webinar start in IST.
 * Returns a non-negative integer (floor). Used for countdown_v2 {{3}} hours param. */
function hoursUntilWebinar(webinarDate: string, webinarTime: string): number {
  const [y, m, d] = webinarDate.split('-').map(Number);
  const [hh, mm]  = (webinarTime || '11:00').split(':').map(Number);
  // Convert IST datetime to UTC ms
  const webinarUtcMs = Date.UTC(y, m - 1, d, hh - 5, mm - 30, 0);
  const diffMs = webinarUtcMs - Date.now();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (60 * 60 * 1000));
}

function courseSlug(courseName: string): string {
  const lower = (courseName || '').toLowerCase();
  if (lower.includes('school'))                                       return 'ai-mastery-for-school-students';
  if (lower.includes('homemaker') || lower.includes('career return')) return 'ai-mastery-for-homemakers';
  if (lower.includes('leader') || lower.includes('executive') ||
      lower.includes('senior') || lower.includes('cxo'))              return 'ai-mastery-for-leaders';
  if (lower.includes('entrepreneur') || lower.includes('business'))   return 'ai-mastery-for-entrepreneurs';
  if (lower.includes('working professional') || lower.includes('professional') ||
      lower.includes('corporate'))                                    return 'ai-mastery-for-working-professionals';
  if (lower.includes('student') || lower.includes('fresh') ||
      lower.includes('graduate') || lower.includes('college') ||
      lower.includes('job seeker'))                                   return 'ai-mastery-for-students';
  if (lower.includes('quantum'))                                      return 'quantum-computing-and-ai';
  if (lower.includes('agentic') || lower.includes('vibe'))            return 'agentic-ai-development';
  return 'ai-mastery-programme';
}

async function sendWA(
  key: string, campaign: string, mobile: string, name: string, params: string[],
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const destination = normalisePhone(mobile);
  if (!destination || destination.replace(/\D/g, '').length < 7)
    return { ok: false, error: `Invalid phone: ${mobile}` };

  const res = await fetch(AISENSY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: key, campaignName: campaign, destination,
      userName: name, source: 'webinar_automation', templateParams: params,
    }),
  });
  const data = await res.json();
  return res.ok
    ? { ok: true, id: data?.submitted_message_id ?? data?.id ?? '' }
    : { ok: false, error: JSON.stringify(data) };
}

/** Try v2 first; on 'not found'/invalid-campaign error, fall back to v1.
 * Only falls back on campaign-identity errors — NOT on rate limits or other API errors,
 * so we don't burn double credits on transient failures. */
async function sendWAWithV2Fallback(
  key: string,
  v2Campaign: string, v2Params: string[],
  v1Campaign: string, v1Params: string[],
  mobile: string, name: string,
): Promise<{ ok: boolean; id?: string; error?: string; used_campaign: string }> {
  const v2Result = await sendWA(key, v2Campaign, mobile, name, v2Params);
  if (v2Result.ok) return { ...v2Result, used_campaign: v2Campaign };

  const e = (v2Result.error || '').toLowerCase();
  const isCampaignNotFound =
    e.includes('not found') ||
    e.includes('does not exist') ||
    e.includes('invalid campaign') ||
    e.includes('no campaign');

  if (!isCampaignNotFound) {
    // Some other error (rate limit, bad phone, etc.) — don't retry with v1
    return { ...v2Result, used_campaign: v2Campaign };
  }

  const v1Result = await sendWA(key, v1Campaign, mobile, name, v1Params);
  return { ...v1Result, used_campaign: v1Campaign };
}

async function logFollowup(
  supabase: any,
  params: {
    reg: any;
    mode: string;
    journey_stage: string;
    campaign: string;
    status: 'sent' | 'failed' | 'skipped';
    error?: string;
    message_id?: string;
  }
) {
  try {
    const studentType = TYPE_MAP[params.reg.profession_choice] || 'working_professional';
    const { error } = await supabase.from('student_followup_log').insert({
      student_email:  params.reg.email,
      student_name:   params.reg.full_name,
      student_mobile: params.reg.mobile || null,
      student_type:   studentType,
      partner_code:   params.reg.utm_source || null,
      template_name:  `auto:${params.campaign}`,
      journey_stage:  params.journey_stage,
      channel:        'whatsapp',
      webinar_date:   params.reg.webinar_date || null,   // date column: pass raw 'YYYY-MM-DD', not a JS Date
      status:         params.status,
      triggered_by:   'system',                          // was 'cron' — violated the triggered_by CHECK (admin|partner|webhook|system), so every insert silently failed
      error_message:  params.error || null,
      sent_at:        params.status === 'sent' ? new Date().toISOString() : null,
    });
    // supabase-js .insert() does NOT throw on a DB error — it returns { error }. Surface it.
    if (error && !error.message?.includes('duplicate')) {
      console.error('[followup_log]', params.mode, params.journey_stage, error.message);
    }
  } catch (e: any) {
    if (!e.message?.includes('duplicate')) console.error('[followup_log]', e.message);
  }
}

const TYPE_MAP: Record<string, string> = {
  working_professional:    'working_professional',
  college_student:         'college_student',
  job_seeker:              'job_seeker',
  school_student:          'school_student',
  tech_developer:          'tech_developer',
  data_engineer_scientist: 'tech_developer',
  home_maker:              'working_professional',
  other:                   'working_professional',
};
const TYPE_LABELS: Record<string, string> = {
  working_professional: 'Working Professional',
  college_student:      'College Student',
  job_seeker:           'Job Seeker',
  school_student:       'School Student',
  tech_developer:       'Tech Developer',
};

const NUDGE_CAMPAIGNS = [
  'nudge_1_job_market',
  'nudge_2_ai_critical',
  'nudge_3_live_classes',
  'nudge_4_real_projects',
  'nudge_5_ai_portfolio',
];
const NUDGE_DAY = [1, 3, 5, 7, 9];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const aiSensyKey = Deno.env.get('AISENSY_API_KEY') ?? '';

  const body = await req.json().catch(() => ({}));
  const { mode, record } = body;

  const log = (msg: string) => console.log(`[${mode}] ${msg}`);

  try {
    // ══ MODE 1: REGISTRATION CONFIRMATION ═════════════════════════
    if (mode === 'registration_confirmation') {
      if (!record) return new Response(JSON.stringify({ error: 'No record' }), { status: 400, headers: CORS });
      if (record.whatsapp_sent)
        return new Response(JSON.stringify({ skipped: 'whatsapp_sent already true' }), { status: 200, headers: CORS });
      if (!record.mobile)
        return new Response(JSON.stringify({ skipped: 'no mobile' }), { status: 200, headers: CORS });

      const joinLink = record.join_token ? `${JOIN_BASE}/${record.join_token}` : REGISTER_URL;
      const params = [
        record.full_name?.split(' ')[0] || 'there',
        record.course_name || 'AI Certification Webinar',
        record.webinar_date ? fmtDate(record.webinar_date) : 'TBD',
        record.webinar_time ? fmtTime(record.webinar_time) : '11:00 AM',
        joinLink,
      ];

      const result = await sendWA(aiSensyKey, 'webinar_registration_confirmation_v2',
                                  record.mobile, record.full_name || 'Student', params);

      // Only mark confirmed when the send actually succeeded — else a WCC/transient
      // failure flips whatsapp_sent=true and MODE 1's early-return never retries it.
      if (result.ok) {
        await supabase.from('qr_landing_registrations')
          .update({ whatsapp_sent: true }).eq('id', record.id);
      }

      await logFollowup(supabase, {
        reg: record, mode, journey_stage: 'pre_webinar',
        campaign: 'webinar_registration_confirmation_v2',
        status: result.ok ? 'sent' : 'failed',
        error: result.error, message_id: result.id,
      });

      log(`→ ${record.email}: ${result.ok ? 'sent' : result.error}`);
      return new Response(JSON.stringify({ mode, result }), { status: 200, headers: CORS });
    }

    // ══ MODE 2: COUNTDOWN REMINDER — v12: v2 with fallback ══════════════
    if (mode === 'countdown_reminder') {
      const nowIST      = new Date(Date.now() + 5.5 * 3600000);
      const tomorrowIST = new Date(nowIST); tomorrowIST.setDate(tomorrowIST.getDate() + 1);
      const tomorrowDate = tomorrowIST.toISOString().split('T')[0];

      const { data: sessions } = await supabase
        .from('awa_webinar_sessions')
        .select('id, course_name, webinar_date, webinar_time, ms_teams_link, meeting_link, countdown_sent_at')
        .eq('webinar_date', tomorrowDate)
        .is('countdown_sent_at', null)
        .eq('status', 'scheduled');

      let sent = 0, failed = 0, skipped = 0;

      for (const session of (sessions ?? [])) {
        const { data: regs } = await supabase
          .from('qr_landing_registrations')
          .select('id, full_name, mobile, email, join_token, course_name, webinar_date, webinar_time, profession_choice, utm_source')
          .eq('webinar_date', session.webinar_date)
          .eq('webinar_time', session.webinar_time)
          .eq('reminder_whatsapp_sent', false)
          .not('mobile', 'is', null);

        for (const reg of (regs ?? [])) {
          if (!reg.mobile) { skipped++; continue; }
          const joinLink = reg.join_token
            ? `${JOIN_BASE}/${reg.join_token}`
            : session.ms_teams_link || session.meeting_link || REGISTER_URL;

          const firstName = reg.full_name?.split(' ')[0] || 'there';
          const courseName = session.course_name || reg.course_name || 'AI Certification Webinar';
          const hours = String(hoursUntilWebinar(session.webinar_date, session.webinar_time));
          const dateStr = fmtDate(session.webinar_date);
          const timeStr = fmtTime(session.webinar_time);

          // v2: {{1}} name, {{2}} course, {{3}} hours, {{4}} date, {{5}} time, {{6}} join_link
          const paramsV2 = [firstName, courseName, hours, dateStr, timeStr, joinLink];
          // v1: {{1}} name, {{2}} course, {{3}} date, {{4}} time, {{5}} join_link
          const paramsV1 = [firstName, courseName, dateStr, timeStr, joinLink];

          const r = await sendWAWithV2Fallback(
            aiSensyKey,
            'webinar_countdown_reminder_v2', paramsV2,
            'webinar_countdown_reminder',    paramsV1,
            reg.mobile, reg.full_name || 'Student',
          );

          if (r.ok) {
            sent++;
            await supabase.from('qr_landing_registrations').update({
              reminder_whatsapp_sent: true,
              reminder_whatsapp_sent_at: new Date().toISOString(),
            }).eq('id', reg.id);
          } else { failed++; }

          await logFollowup(supabase, {
            reg, mode, journey_stage: 'pre_webinar',
            campaign: r.used_campaign,
            status: r.ok ? 'sent' : 'failed',
            error: r.error, message_id: r.id,
          });
        }

        await supabase.from('awa_webinar_sessions')
          .update({ countdown_sent_at: new Date().toISOString() }).eq('id', session.id);
      }

      log(`sessions=${sessions?.length ?? 0} sent=${sent} failed=${failed} skipped=${skipped}`);
      return new Response(JSON.stringify({ mode, sessions: sessions?.length ?? 0, sent, failed, skipped }),
                          { status: 200, headers: CORS });
    }

    // ══ MODE 3: LIVE NOW ══════════════════════════════════
    if (mode === 'live_now') {
      const nowIST    = new Date(Date.now() + 5.5 * 3600000);
      const todayDate = nowIST.toISOString().split('T')[0];
      const nowMins   = nowIST.getHours() * 60 + nowIST.getMinutes();

      const { data: sessions } = await supabase
        .from('awa_webinar_sessions')
        .select('id, course_name, webinar_date, webinar_time, ms_teams_link, meeting_link, live_notified_at')
        .eq('webinar_date', todayDate)
        .is('live_notified_at', null)
        .eq('status', 'scheduled');

      let sent = 0, failed = 0, skipped = 0;

      for (const session of (sessions ?? [])) {
        const [h, m] = session.webinar_time.split(':').map(Number);
        const diff   = (h * 60 + m) - nowMins;
        if (diff < -5 || diff > 5) { skipped++; continue; }

        const { data: regs } = await supabase
          .from('qr_landing_registrations')
          .select('id, full_name, mobile, email, join_token, course_name, profession_choice, utm_source, webinar_date')
          .eq('webinar_date', session.webinar_date)
          .eq('webinar_time', session.webinar_time)
          .eq('live_now_whatsapp_sent', false)
          .not('mobile', 'is', null);

        for (const reg of (regs ?? [])) {
          if (!reg.mobile) continue;
          const joinLink = reg.join_token
            ? `${JOIN_BASE}/${reg.join_token}`
            : session.ms_teams_link || REGISTER_URL;
          const params = [
            reg.full_name?.split(' ')[0] || 'there',
            session.course_name || 'AI Certification Webinar',
            joinLink,
          ];
          const r = await sendWA(aiSensyKey, 'webinar_live_now',
                                 reg.mobile, reg.full_name || 'Student', params);
          if (r.ok) {
            sent++;
            await supabase.from('qr_landing_registrations').update({
              live_now_whatsapp_sent: true,
              live_now_whatsapp_sent_at: new Date().toISOString(),
            }).eq('id', reg.id);
          } else failed++;

          await logFollowup(supabase, {
            reg, mode, journey_stage: 'pre_webinar',
            campaign: 'webinar_live_now',
            status: r.ok ? 'sent' : 'failed',
            error: r.error, message_id: r.id,
          });
        }

        await supabase.from('awa_webinar_sessions')
          .update({ live_notified_at: new Date().toISOString() }).eq('id', session.id);
      }

      log(`sessions=${sessions?.length ?? 0} sent=${sent} failed=${failed} skipped=${skipped}`);
      return new Response(JSON.stringify({ mode, sent, failed, skipped }),
                          { status: 200, headers: CORS });
    }

    // ══ MODE 4: FEEDBACK REQUEST — v12: v2 with fallback ══════════════════
    if (mode === 'feedback_request') {
      const nowIST    = new Date(Date.now() + 5.5 * 3600000);
      const todayDate = nowIST.toISOString().split('T')[0];
      const nowMins   = nowIST.getHours() * 60 + nowIST.getMinutes();

      const { data: sessions } = await supabase
        .from('awa_webinar_sessions')
        .select('id, course_name, webinar_date, webinar_time, duration_minutes, feedback_sent_at')
        .eq('webinar_date', todayDate)
        .is('feedback_sent_at', null);

      let sent = 0, failed = 0, skipped = 0;

      for (const session of (sessions ?? [])) {
        const [h, m]   = session.webinar_time.split(':').map(Number);
        const duration = session.duration_minutes ?? 120;
        const fireMins = h * 60 + m + duration + 90;
        const diff     = nowMins - fireMins;
        if (diff < 0 || diff > 60) { skipped++; continue; }

        const { data: regs } = await supabase
          .from('qr_landing_registrations')
          .select('id, full_name, mobile, email, course_name, profession_choice, utm_source, webinar_date, attendance_confirmed, post_webinar_email_sent')
          .eq('webinar_date', session.webinar_date)
          .eq('webinar_time', session.webinar_time)
          .eq('post_webinar_email_sent', false)
          .eq('attendance_confirmed', true)
          .not('mobile', 'is', null);

        for (const reg of (regs ?? [])) {
          if (!reg.mobile) continue;
          // Both v2 and v1 take 3 params: {{1}} name, {{2}} course, {{3}} feedback_url
          const params = [
            reg.full_name?.split(' ')[0] || 'there',
            session.course_name || 'AI Certification Webinar',
            FEEDBACK_URL,
          ];

          const r = await sendWAWithV2Fallback(
            aiSensyKey,
            'webinar_feedback_request_v2', params,
            'webinar_feedback_request',    params,
            reg.mobile, reg.full_name || 'Student',
          );

          if (r.ok) {
            sent++;
            await supabase.from('qr_landing_registrations')
              .update({ post_webinar_email_sent: true }).eq('id', reg.id);
          } else failed++;

          await logFollowup(supabase, {
            reg, mode, journey_stage: 'post_webinar_feedback',
            campaign: r.used_campaign,
            status: r.ok ? 'sent' : 'failed',
            error: r.error, message_id: r.id,
          });
        }

        await supabase.from('awa_webinar_sessions')
          .update({ feedback_sent_at: new Date().toISOString() }).eq('id', session.id);
      }

      log(`sessions=${sessions?.length ?? 0} sent=${sent} failed=${failed} skipped=${skipped}`);
      return new Response(JSON.stringify({ mode, sent, failed, skipped }),
                          { status: 200, headers: CORS });
    }

    // ══ MODE 5: NO-SHOW RE-ENGAGE (v2 with fallback — retained from v11) ═══════════
    if (mode === 'noshow_reengage') {
      const nowIST       = new Date(Date.now() + 5.5 * 3600000);
      const yesterdayIST = new Date(nowIST); yesterdayIST.setDate(yesterdayIST.getDate() - 1);
      const yesterdayDate = yesterdayIST.toISOString().split('T')[0];
      const todayDate     = nowIST.toISOString().split('T')[0];

      const { data: noShows } = await supabase
        .from('qr_landing_registrations')
        .select('id, full_name, mobile, email, course_id, course_name, profession_choice, utm_source, webinar_date, attendance_confirmed, join_token')
        .eq('webinar_date', yesterdayDate)
        .eq('attendance_confirmed', false)
        .eq('no_show_nudge_sent', false)
        .not('mobile', 'is', null);

      const courseIds = Array.from(new Set((noShows ?? []).map((r: any) => r.course_id).filter(Boolean)));
      const nextByCourse: Record<string, { date: string; time: string | null }> = {};
      if (courseIds.length > 0) {
        const { data: canonNext } = await supabase
          .from('awa_webinar_sessions')
          .select('course_id, webinar_date, webinar_time')
          .in('course_id', courseIds)
          .gte('webinar_date', todayDate)
          .eq('status', 'scheduled')
          .in('session_type', ['student', 'both'])
          .order('webinar_date', { ascending: true })
          .order('webinar_time', { ascending: true });
        for (const w of (canonNext ?? [])) {
          if (!nextByCourse[w.course_id]) nextByCourse[w.course_id] = { date: w.webinar_date, time: w.webinar_time };
        }
        const missing = courseIds.filter(c => !nextByCourse[c]);
        if (missing.length > 0) {
          const { data: legacyNext } = await supabase
            .from('qr_landing_webinar_links')
            .select('course_id, webinar_date, webinar_time')
            .in('course_id', missing)
            .gte('webinar_date', todayDate)
            .eq('is_active', true)
            .order('webinar_date', { ascending: true })
            .order('webinar_time', { ascending: true });
          for (const w of (legacyNext ?? [])) {
            if (!nextByCourse[w.course_id]) nextByCourse[w.course_id] = { date: w.webinar_date, time: w.webinar_time };
          }
        }
      }

      let sent = 0, failed = 0, skipped = 0, skippedNoFuture = 0;

      for (const reg of (noShows ?? [])) {
        if (!reg.mobile) { skipped++; continue; }

        const next = reg.course_id ? nextByCourse[reg.course_id] : null;
        if (!next) {
          skippedNoFuture++;
          await logFollowup(supabase, {
            reg, mode, journey_stage: 'post_webinar_noshow',
            campaign: 'webinar_noshow_reengage_v2',
            status: 'skipped',
            error: 'No future session scheduled for this course — send suppressed.',
          });
          continue;
        }

        const joinLink = reg.join_token
          ? `${JOIN_BASE}/${reg.join_token}?ref=noshow`
          : REGISTER_URL;

        const joinTokenSuffix = joinLink.includes('/join/')
          ? joinLink.split('/join/')[1] || 'ref=noshow'
          : 'ref=noshow';

        const firstName = reg.full_name?.split(' ')[0] || 'there';
        const courseName = reg.course_name || 'AI Certification Webinar';

        // v2: {{1}} name, {{2}} course, {{3}} next_date, {{4}} next_time, {{5}} join_link
        const paramsV2 = [
          firstName, courseName,
          fmtDate(next.date),
          next.time ? fmtTime(next.time) : 'TBD',
          joinLink,
        ];
        // v1: {{1}} name, {{2}} course, {{3}} next_date, {{4}} join_link, {{5}} token_suffix
        const paramsV1 = [
          firstName, courseName,
          fmtDate(next.date),
          joinLink,
          joinTokenSuffix,
        ];

        const r = await sendWAWithV2Fallback(
          aiSensyKey,
          'webinar_noshow_reengage_v2', paramsV2,
          'webinar_noshow_reengage',    paramsV1,
          reg.mobile, reg.full_name || 'Student',
        );

        if (r.ok) {
          sent++;
          await supabase.from('qr_landing_registrations').update({
            no_show_nudge_sent:    true,
            no_show_nudge_sent_at: new Date().toISOString(),
          }).eq('id', reg.id);
        } else failed++;

        await logFollowup(supabase, {
          reg, mode, journey_stage: 'post_webinar_noshow',
          campaign: r.used_campaign,
          status: r.ok ? 'sent' : 'failed',
          error: r.error, message_id: r.id,
        });
      }

      log(`no_shows=${noShows?.length ?? 0} sent=${sent} failed=${failed} skipped=${skipped} skipped_no_future=${skippedNoFuture}`);
      return new Response(JSON.stringify({
        mode, no_shows: noShows?.length ?? 0,
        sent, failed, skipped, skipped_no_future_session: skippedNoFuture,
      }), { status: 200, headers: CORS });
    }

    // ══ MODE 6: NUDGE DRIP ═══════════════════════════════════
    if (mode === 'nudge_drip') {
      const nowIST    = new Date(Date.now() + 5.5 * 3600000);
      const todayDate = nowIST.toISOString().split('T')[0];
      const cutoff10  = new Date(nowIST); cutoff10.setDate(cutoff10.getDate() - 15);
      const cutoffDate = cutoff10.toISOString().split('T')[0];

      const { data: prospects } = await supabase
        .from('qr_landing_registrations')
        .select('id, full_name, mobile, email, course_name, webinar_date, profession_choice, utm_source, nudge_last_sent, no_show_nudge_sent, no_show_nudge_sent_at')
        .eq('is_enrolled', false)
        .gte('webinar_date', cutoffDate)
        .lt('webinar_date', todayDate)
        .not('mobile', 'is', null);

      let sent = 0, failed = 0, skipped = 0, skippedCooldown = 0;
      const results: any[] = [];

      const cooldownMs = NUDGE_COOLDOWN_DAYS_AFTER_NOSHOW * 24 * 3600 * 1000;

      for (const reg of (prospects ?? [])) {
        if (!reg.mobile) { skipped++; continue; }

        if (reg.no_show_nudge_sent_at) {
          const since = Date.now() - new Date(reg.no_show_nudge_sent_at).getTime();
          if (since >= 0 && since < cooldownMs) {
            skippedCooldown++;
            results.push({
              email: reg.email, status: 'skipped',
              reason: `No-show nudge sent ${Math.floor(since / (24 * 3600 * 1000))}d ago — cooldown ${NUDGE_COOLDOWN_DAYS_AFTER_NOSHOW}d`,
            });
            continue;
          }
        }

        const webinarDate = new Date(reg.webinar_date + 'T00:00:00');
        const daysSince   = Math.floor(
          (nowIST.getTime() - webinarDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        const lastSent = reg.nudge_last_sent ?? 0;
        let nudgeIndex = -1;
        for (let i = NUDGE_DAY.length - 1; i >= 0; i--) {
          if (daysSince >= NUDGE_DAY[i] && lastSent < i + 1) {
            nudgeIndex = i;
            break;
          }
        }
        if (nudgeIndex === -1) { skipped++; continue; }

        const campaign    = NUDGE_CAMPAIGNS[nudgeIndex];
        const studentType = TYPE_MAP[reg.profession_choice] || 'working_professional';
        const stLabel     = TYPE_LABELS[studentType] || 'Professional';
        const partnerCode = reg.utm_source || '';

        const slug       = courseSlug(reg.course_name || '');
        const linkParams = new URLSearchParams();
        if (partnerCode) linkParams.set('partner', partnerCode);
        if (reg.email)   linkParams.set('email', reg.email);
        if (reg.full_name) linkParams.set('name', reg.full_name);
        if (reg.mobile)  linkParams.set('mobile', reg.mobile);
        linkParams.set('enrol', '1');
        const enrolLink    = `${COURSES_BASE}/${slug}?${linkParams.toString()}`;

        const suffixParams = new URLSearchParams();
        if (partnerCode) suffixParams.set('partner', partnerCode);
        if (reg.email)   suffixParams.set('email', reg.email);
        if (reg.full_name) suffixParams.set('name', reg.full_name);
        if (reg.mobile)  suffixParams.set('mobile', reg.mobile);
        suffixParams.set('enrol', '1');
        const enrolSuffix  = suffixParams.toString();

        const params = [
          reg.full_name?.split(' ')[0] || 'there',
          stLabel,
          enrolLink,
          enrolSuffix,
        ];
        const r = await sendWA(aiSensyKey, campaign, reg.mobile,
                               reg.full_name || 'Student', params);

        if (r.ok) {
          sent++;
          await supabase.from('qr_landing_registrations').update({
            nudge_last_sent: nudgeIndex + 1,
            nudge_last_sent_at: new Date().toISOString(),
          }).eq('id', reg.id);
        } else failed++;

        await logFollowup(supabase, {
          reg, mode, journey_stage: `conversion_${nudgeIndex + 1}`,
          campaign, status: r.ok ? 'sent' : 'failed',
          error: r.error, message_id: r.id,
        });

        results.push({ email: reg.email, nudge: nudgeIndex + 1, campaign,
                       days_since: daysSince, status: r.ok ? 'sent' : 'failed',
                       error: r.error });
      }

      log(`prospects=${prospects?.length ?? 0} sent=${sent} failed=${failed} skipped=${skipped} cooldown_skip=${skippedCooldown}`);
      return new Response(JSON.stringify({
        mode, prospects: prospects?.length ?? 0,
        sent, failed, skipped, skipped_noshow_cooldown: skippedCooldown, results,
      }), { status: 200, headers: CORS });
    }

    return new Response(JSON.stringify({ error: `Unknown mode: ${mode}` }),
                        { status: 400, headers: CORS });

  } catch (err: any) {
    console.error(`[send-webinar-automations/${mode}]`, err.message);
    return new Response(JSON.stringify({ error: err.message }),
                        { status: 500, headers: CORS });
  }
});
