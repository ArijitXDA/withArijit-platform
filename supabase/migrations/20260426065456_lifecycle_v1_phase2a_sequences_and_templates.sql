-- ════════════════════════════════════════════════════════════════════════════
-- LIFECYCLE PHASE 2a — Seed sequences (S1, S8) + email/WA templates
-- ════════════════════════════════════════════════════════════════════════════
-- Adds 2 sequences, 11 steps total, 8 templates.
-- All sequences begin INACTIVE — flip is_active=TRUE only after Part 3 testing.
-- All templates begin INACTIVE except the email ones we're confident about
-- (we'll mark active=true once we've previewed them in admin UI).
-- WhatsApp templates stay inactive until AiSensy approval comes through.
--
-- AUDIENCE → COURSE SLUG MAPPING (for dispatcher's {{enrol_url}} resolver):
--   working_professional      → ai-mastery-for-working-professionals
--   college_student           → ai-mastery-for-students
--   job_seeker                → ai-mastery-for-students
--   school_student            → ai-mastery-for-school-students
--   tech_developer            → agentic-ai-development
--   data_engineer_scientist   → agentic-ai-development
--   home_maker                → ai-mastery-for-homemakers
--   other / NULL              → ai-mastery-programme (default)
-- Base URL: https://www.ostaran.com/courses/{slug}
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. EMAIL TEMPLATES ────────────────────────────────────────────────────

-- ─ S8 step 0: T+0h, immediately after paid masterclass attendance ─
INSERT INTO lifecycle_templates (template_key, channel, version, subject, preview_text, body_html, variables_declared, is_active)
VALUES (
  'em_s8_thank_you_v1',
  'email',
  1,
  'Thank you for attending the masterclass, {{first_name}} — your enrolment offer is live',
  'Your masterclass-attendee pricing is unlocked. Here is what happens next.',
$html$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Thank you for attending</title></head>
<body style="margin:0;padding:0;background:#0a0d14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#e2e8f0;">
<div style="max-width:580px;margin:0 auto;padding:32px 16px;">
  <div style="background:#12172a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
    <div style="background:linear-gradient(135deg,#064e3b,#065f46 60%,#047857);padding:32px;text-align:center;">
      <div style="font-size:13px;color:#a7f3d0;margin-bottom:6px;">Masterclass Attendee</div>
      <div style="font-size:22px;font-weight:900;color:#fff;">o<span style="color:#6ee7b7;">Staran</span> &times; AIwithArijit</div>
    </div>
    <div style="padding:32px;">
      <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 8px;line-height:1.3;">Thank you for showing up, {{first_name}}.</h1>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 16px;">Attending the live masterclass is the first real step. You saw what AI tools can actually do. You worked alongside other paid attendees. You asked your questions live. That puts you ahead of 99% of the people thinking about &ldquo;maybe learning AI someday&rdquo;.</p>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 16px;">Now the question is: do you want to keep going?</p>
      <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:20px 24px;margin:24px 0;">
        <p style="color:#6ee7b7;font-size:13px;text-transform:uppercase;letter-spacing:.5px;margin:0 0 6px;">Your Masterclass-Attendee Offer</p>
        <p style="color:#fff;font-size:18px;font-weight:700;margin:0 0 8px;">Full AI Certification Programme &mdash; locked at attendee pricing for 7 days</p>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0;">Live cohort sessions, complete portfolio of deployed projects, globally recognised certificate, lifetime access to materials.</p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="{{enrol_url}}" style="display:inline-block;background:linear-gradient(135deg,#059669,#047857);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;">Lock In My Enrolment &rarr;</a>
      </div>
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:24px 0 0;"><strong style="color:#fff;">Why now?</strong></p>
      <ul style="color:#94a3b8;font-size:14px;line-height:2;padding-left:20px;margin:8px 0 16px;">
        <li>Cohorts fill in days, not weeks &mdash; first-come, first-served on batch slots</li>
        <li>Your attendee pricing is honoured for 7 days only</li>
        <li>The next batch starts soon &mdash; if you defer, you defer the certificate too</li>
      </ul>
      <p style="color:#475569;font-size:13px;line-height:1.7;margin:24px 0 0;">Have a specific question before you decide? Reply to this email &mdash; I read every one personally.</p>
      <div style="margin-top:28px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
        <div style="color:#fff;font-weight:700;font-size:14px;">Arijit Chowdhury</div>
        <div style="color:#64748b;font-size:12px;margin-top:2px;">Trainer &amp; Founder &middot; oStaran AI Education Platform</div>
      </div>
    </div>
    <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
      <p style="color:#475569;font-size:12px;margin:0;">You attended the AI Masterclass on {{webinar_date_display}}.</p>
      <p style="color:#475569;font-size:11px;margin:4px 0 0;"><a href="{{unsubscribe_url}}" style="color:#475569;">Unsubscribe</a></p>
    </div>
  </div>
</div>
</body></html>$html$,
  '{"first_name":"string","webinar_date_display":"string","enrol_url":"string","unsubscribe_url":"string"}'::jsonb,
  TRUE
);

-- ─ S8 step 2: T+72h, FAQ email ─
INSERT INTO lifecycle_templates (template_key, channel, version, subject, preview_text, body_html, variables_declared, is_active)
VALUES (
  'em_s8_faq_v1',
  'email',
  1,
  '{{first_name}}, three questions every masterclass attendee asks before enrolling',
  'Time commitment, certificate value, how the cohort actually runs.',
$html$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>FAQ</title></head>
<body style="margin:0;padding:0;background:#0a0d14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#e2e8f0;">
<div style="max-width:580px;margin:0 auto;padding:32px 16px;">
  <div style="background:#12172a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
    <div style="background:linear-gradient(135deg,#1e1b4b,#312e81 60%,#4c1d95);padding:28px;text-align:center;">
      <div style="font-size:20px;font-weight:900;color:#fff;">o<span style="color:#818cf8;">Staran</span> &times; AIwithArijit</div>
    </div>
    <div style="padding:32px;">
      <h1 style="color:#fff;font-size:21px;font-weight:800;margin:0 0 16px;line-height:1.35;">Hi {{first_name}}, three questions I hear every week from masterclass attendees</h1>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 20px;">If you are sitting on the enrolment decision, the friction is almost always one of these three things. Let me address them directly.</p>
      <div style="background:rgba(99,102,241,0.06);border-left:3px solid #6366f1;border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0;">
        <p style="color:#c7d2fe;font-size:14px;font-weight:700;margin:0 0 8px;">1. &ldquo;How much time per week?&rdquo;</p>
        <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0;">2 live sessions per week (90 min each), plus 2&ndash;3 hours of project work you can do on your own schedule. About 7 hours total. Most students do this around their day job. The recordings are yours forever, so missed sessions are not the end of the world.</p>
      </div>
      <div style="background:rgba(99,102,241,0.06);border-left:3px solid #6366f1;border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0;">
        <p style="color:#c7d2fe;font-size:14px;font-weight:700;margin:0 0 8px;">2. &ldquo;Does the certificate actually mean anything?&rdquo;</p>
        <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0;">It is not a participation certificate. You build a portfolio of deployed AI projects you can demo in interviews. The certificate signals to recruiters that you have done real work, not just watched videos. Past students have used it to negotiate raises, close consulting deals, and land AI-specific roles.</p>
      </div>
      <div style="background:rgba(99,102,241,0.06);border-left:3px solid #6366f1;border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0;">
        <p style="color:#c7d2fe;font-size:14px;font-weight:700;margin:0 0 8px;">3. &ldquo;Will I keep up if I am not technical?&rdquo;</p>
        <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0;">Yes. The masterclass you just attended is representative of the teaching style. We start where you are. The whole point of the programme is to get you comfortable building real AI tools whether or not you have written code before.</p>
      </div>
      <div style="text-align:center;margin:32px 0;">
        <a href="{{enrol_url}}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;">Reserve My Cohort Seat &rarr;</a>
      </div>
      <p style="color:#475569;font-size:13px;line-height:1.7;margin:16px 0 0;">Still on your mind something else? Just reply &mdash; I will answer within a day.</p>
      <div style="margin-top:28px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
        <div style="color:#fff;font-weight:700;font-size:14px;">Arijit Chowdhury</div>
        <div style="color:#64748b;font-size:12px;margin-top:2px;">Founder &middot; oStaran AI Education Platform</div>
      </div>
    </div>
    <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
      <p style="color:#475569;font-size:11px;margin:0;"><a href="{{unsubscribe_url}}" style="color:#475569;">Unsubscribe</a></p>
    </div>
  </div>
</div>
</body></html>$html$,
  '{"first_name":"string","enrol_url":"string","unsubscribe_url":"string"}'::jsonb,
  TRUE
);

-- ─ S8 step 4: T+168h (Day 7), final last-call email ─
INSERT INTO lifecycle_templates (template_key, channel, version, subject, preview_text, body_html, variables_declared, is_active)
VALUES (
  'em_s8_last_call_v1',
  'email',
  1,
  'Last email from me, {{first_name}} &mdash; your masterclass-attendee offer expires tonight',
  'After tonight, you would enrol at standard pricing. This is the closing window.',
$html$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Last call</title></head>
<body style="margin:0;padding:0;background:#0a0d14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#e2e8f0;">
<div style="max-width:580px;margin:0 auto;padding:32px 16px;">
  <div style="background:#12172a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
    <div style="background:linear-gradient(135deg,#7f1d1d,#991b1b 60%,#b91c1c);padding:28px;text-align:center;">
      <div style="font-size:13px;color:#fecaca;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px;">Final Notice</div>
      <div style="font-size:20px;font-weight:900;color:#fff;">Your offer closes tonight</div>
    </div>
    <div style="padding:32px;">
      <p style="color:#e2e8f0;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi {{first_name}},</p>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 16px;">This is the last email I will send you about your masterclass-attendee offer.</p>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 16px;">A week ago you attended the live AI masterclass on {{webinar_date_display}}. I locked your enrolment pricing for 7 days as a thank-you for showing up. That window closes at midnight tonight (IST).</p>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 24px;">After tonight, the next time you look at the programme you would enrol at standard pricing &mdash; same as everyone who did not attend the masterclass.</p>
      <div style="background:rgba(220,38,38,0.08);border:1px solid rgba(220,38,38,0.25);border-radius:12px;padding:20px 24px;margin:24px 0;">
        <p style="color:#fca5a5;font-size:13px;text-transform:uppercase;letter-spacing:.5px;margin:0 0 8px;">What you lock in if you enrol today</p>
        <ul style="color:#94a3b8;font-size:14px;line-height:1.9;margin:0;padding-left:20px;">
          <li>Attendee pricing &mdash; honoured only until midnight</li>
          <li>Your seat in the next batch (small cohort, fills fast)</li>
          <li>Full programme: live sessions, projects, certificate, lifetime access</li>
        </ul>
      </div>
      <div style="text-align:center;margin:32px 0;">
        <a href="{{enrol_url}}" style="display:inline-block;background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;text-decoration:none;padding:16px 40px;border-radius:10px;font-weight:800;font-size:16px;box-shadow:0 4px 14px rgba(220,38,38,0.4);">Enrol Before Midnight &rarr;</a>
      </div>
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:24px 0 0;">If the timing genuinely is not right for you &mdash; truly, no judgment. Life has its own seasons. I will not chase you after this. But if something specific is holding you back that I might be able to help with, just hit reply and tell me. I read everything.</p>
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:16px 0 0;">Either way, thank you for being part of the masterclass. Good luck on your AI journey.</p>
      <div style="margin-top:28px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
        <div style="color:#fff;font-weight:700;font-size:14px;">Arijit Chowdhury</div>
        <div style="color:#64748b;font-size:12px;margin-top:2px;">Founder &middot; oStaran AI Education Platform</div>
      </div>
    </div>
    <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
      <p style="color:#475569;font-size:11px;margin:0;"><a href="{{unsubscribe_url}}" style="color:#475569;">Unsubscribe</a></p>
    </div>
  </div>
</div>
</body></html>$html$,
  '{"first_name":"string","webinar_date_display":"string","enrol_url":"string","unsubscribe_url":"string"}'::jsonb,
  TRUE
);

-- ─ S1 step 1: webinar_date - 24h, day-before reminder email ─
INSERT INTO lifecycle_templates (template_key, channel, version, subject, preview_text, body_html, variables_declared, is_active)
VALUES (
  'em_s1_day_before_v1',
  'email',
  1,
  'Tomorrow {{webinar_time_display}} IST &mdash; your free AI Webinar with Arijit',
  'A few quick things to make sure you get the most from tomorrow.',
$html$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Tomorrow</title></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#07112E,#0D1F4E);padding:32px 40px;text-align:center;">
  <p style="color:#F0BE3C;font-size:13px;margin:0 0 8px;font-weight:bold;">AIwithArijit &times; oStaran</p>
  <h1 style="color:#fff;font-size:24px;margin:0 0 4px;">Tomorrow &mdash; {{webinar_time_display}} IST</h1>
  <p style="color:#94a3b8;font-size:14px;margin:0;">Your free AI Certification Webinar</p>
</td></tr>
<tr><td style="padding:36px 40px;">
  <p style="font-size:15px;color:#374151;margin:0 0 20px;">Hi <strong>{{first_name}}</strong>,</p>
  <p style="font-size:15px;color:#374151;margin:0 0 20px;">Quick reminder: your free <strong>AI Certification Webinar</strong> is tomorrow, <strong>{{webinar_date_display}}</strong> at <strong>{{webinar_time_display}} IST</strong>.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin-bottom:24px;"><tr><td style="padding:20px 24px;">
    <p style="font-size:13px;color:#0369a1;text-transform:uppercase;letter-spacing:.5px;margin:0 0 6px;">What to expect</p>
    <ul style="color:#374151;font-size:14px;margin:0;padding-left:20px;line-height:1.9;">
      <li>90 minutes &mdash; live, hands-on, with real demos</li>
      <li>You will build a working AI project during the session</li>
      <li>GenAI, Copilot, LLMs, Agentic AI &mdash; all covered</li>
      <li>Live Q&amp;A &mdash; no canned answers</li>
    </ul>
  </td></tr></table>
  <div style="text-align:center;margin:24px 0;">
    <a href="{{join_link}}" style="display:inline-block;background:#07112E;color:#F0BE3C;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:bold;border:2px solid #F0BE3C;">Join the Webinar &rarr;</a>
    <p style="font-size:12px;color:#6b7280;margin:8px 0 0;">Bookmark this link &mdash; same link tomorrow</p>
  </div>
  <p style="font-size:14px;color:#6b7280;margin:24px 0 8px;"><strong style="color:#374151;">A small ask:</strong></p>
  <p style="font-size:14px;color:#6b7280;line-height:1.7;margin:0 0 16px;">Block your calendar now. The webinar is most useful if you can give it 90 uninterrupted minutes &mdash; phone away, second monitor for the demos. The people who show up fully engaged get the most out of it.</p>
  <p style="font-size:14px;color:#374151;margin:24px 0 0;">See you tomorrow,<br><strong>Arijit Chowdhury</strong></p>
</td></tr>
<tr><td style="background:#f9fafb;padding:16px 40px;text-align:center;border-top:1px solid #e5e7eb;">
  <p style="font-size:11px;color:#9ca3af;margin:0;">You registered for the webinar on {{registered_at_display}}.</p>
  <p style="font-size:11px;color:#9ca3af;margin:4px 0 0;"><a href="{{unsubscribe_url}}" style="color:#9ca3af;">Unsubscribe</a></p>
</td></tr>
</table></td></tr></table>
</body></html>$html$,
  '{"first_name":"string","webinar_date_display":"string","webinar_time_display":"string","registered_at_display":"string","join_link":"string","unsubscribe_url":"string"}'::jsonb,
  TRUE
);

-- ─ S1 step 5: webinar_date + 24h, post-webinar email (branches at send time) ─
INSERT INTO lifecycle_templates (template_key, channel, version, subject, preview_text, body_html, variables_declared, is_active)
VALUES (
  'em_s1_post_webinar_v1',
  'email',
  1,
  '{{first_name}}, a quick recap and what is next',
  'Your AI journey starts with one decision after the webinar.',
$html$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>What is next</title></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#07112E,#0D1F4E);padding:32px 40px;text-align:center;">
  <p style="color:#F0BE3C;font-size:13px;margin:0 0 8px;font-weight:bold;">AIwithArijit &times; oStaran</p>
  <h1 style="color:#fff;font-size:22px;margin:0;">{{post_webinar_headline}}</h1>
</td></tr>
<tr><td style="padding:36px 40px;">
  <p style="font-size:15px;color:#374151;margin:0 0 16px;">Hi <strong>{{first_name}}</strong>,</p>
  <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">{{post_webinar_intro}}</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 8px 8px 0;margin:20px 0;"><tr><td style="padding:18px 24px;">
    <p style="font-size:14px;color:#166534;font-weight:700;margin:0 0 8px;">If you want to keep building</p>
    <p style="font-size:14px;color:#374151;line-height:1.7;margin:0;">The full AI Certification Programme picks up where the webinar left off. Live cohort, real projects, certificate that recruiters recognise.</p>
  </td></tr></table>
  <div style="text-align:center;margin:24px 0;">
    <a href="{{enrol_url}}" style="display:inline-block;background:#07112E;color:#F0BE3C;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:bold;border:2px solid #F0BE3C;">See the Programme &rarr;</a>
  </div>
  <p style="font-size:14px;color:#6b7280;line-height:1.7;margin:20px 0 0;">If you have questions about the programme &mdash; whether it is a fit for your role, time commitment, anything &mdash; reply to this email. I respond personally.</p>
  <p style="font-size:14px;color:#374151;margin:20px 0 0;">Warm regards,<br><strong>Arijit Chowdhury</strong></p>
</td></tr>
<tr><td style="background:#f9fafb;padding:16px 40px;text-align:center;border-top:1px solid #e5e7eb;">
  <p style="font-size:11px;color:#9ca3af;margin:0;">You registered for the webinar on {{webinar_date_display}}.</p>
  <p style="font-size:11px;color:#9ca3af;margin:4px 0 0;"><a href="{{unsubscribe_url}}" style="color:#9ca3af;">Unsubscribe</a></p>
</td></tr>
</table></td></tr></table>
</body></html>$html$,
  '{"first_name":"string","webinar_date_display":"string","post_webinar_headline":"string","post_webinar_intro":"string","enrol_url":"string","unsubscribe_url":"string"}'::jsonb,
  TRUE
);

-- ─── 2. WHATSAPP TEMPLATE SPECS (text only — submit to AiSensy after engine validated) ──

INSERT INTO lifecycle_templates (template_key, channel, version, body_text, aisensy_campaign_name, aisensy_param_order, variables_declared, is_active)
VALUES (
  'wa_s8_offer_reminder_v1',
  'whatsapp',
  1,
  $wa$Hi {{1}},

You attended the AI Masterclass on {{2}} - real recognition for actually showing up.

Your *masterclass-attendee enrolment offer* is now active. It is locked at attendee pricing for 7 days only - then it goes to standard.

Lock your seat in the next cohort: {{3}}

Reply with any question - I read these myself.

- Arijit$wa$,
  'lifecycle_s8_offer_reminder_v1',
  ARRAY['first_name','webinar_date_display','enrol_url']::TEXT[],
  '{"first_name":"string","webinar_date_display":"string","enrol_url":"string"}'::jsonb,
  FALSE
);

INSERT INTO lifecycle_templates (template_key, channel, version, body_text, aisensy_campaign_name, aisensy_param_order, variables_declared, is_active)
VALUES (
  'wa_s8_48h_left_v1',
  'whatsapp',
  1,
  $wa$Hi {{1}},

48 hours left on your masterclass-attendee enrolment offer. After that, the cohort opens at standard pricing.

If you are still on the fence, reply with what is holding you back - I will help you think it through.

Or lock your seat: {{2}}

- Arijit$wa$,
  'lifecycle_s8_48h_left_v1',
  ARRAY['first_name','enrol_url']::TEXT[],
  '{"first_name":"string","enrol_url":"string"}'::jsonb,
  FALSE
);

INSERT INTO lifecycle_templates (template_key, channel, version, body_text, aisensy_campaign_name, aisensy_param_order, variables_declared, is_active)
VALUES (
  'wa_s1_day_before_v1',
  'whatsapp',
  1,
  $wa$Hi {{1}},

Quick reminder - your free AI Certification Webinar is *tomorrow {{2}} at {{3}} IST*.

90 minutes, hands-on, build a working AI project live with us.

Save the join link now: {{4}}

See you tomorrow!
- Arijit$wa$,
  'lifecycle_s1_day_before_v1',
  ARRAY['first_name','webinar_date_display','webinar_time_display','join_link']::TEXT[],
  '{"first_name":"string","webinar_date_display":"string","webinar_time_display":"string","join_link":"string"}'::jsonb,
  FALSE
);

INSERT INTO lifecycle_templates (template_key, channel, version, body_text, aisensy_campaign_name, aisensy_param_order, variables_declared, is_active)
VALUES (
  'wa_s1_one_hour_v1',
  'whatsapp',
  1,
  $wa$Hi {{1}},

Your AI Webinar starts in *1 hour* - {{2}} IST.

Get your laptop ready. We are doing real builds today, not slides.

Join: {{3}}

- Arijit$wa$,
  'lifecycle_s1_one_hour_v1',
  ARRAY['first_name','webinar_time_display','join_link']::TEXT[],
  '{"first_name":"string","webinar_time_display":"string","join_link":"string"}'::jsonb,
  FALSE
);

INSERT INTO lifecycle_templates (template_key, channel, version, body_text, aisensy_campaign_name, aisensy_param_order, variables_declared, is_active)
VALUES (
  'wa_s1_live_now_v1',
  'whatsapp',
  1,
  $wa${{1}}, we are *LIVE now*!

Join here: {{2}}

See you in the room!
- Arijit$wa$,
  'lifecycle_s1_live_now_v1',
  ARRAY['first_name','join_link']::TEXT[],
  '{"first_name":"string","join_link":"string"}'::jsonb,
  FALSE
);

-- ─── 3. SEQUENCES ──────────────────────────────────────────────────────────

INSERT INTO lifecycle_sequences (sequence_key, name, description, track, trigger_event, trigger_filter, exit_on_events, is_active, version, priority)
VALUES (
  's8_post_paid_masterclass_enrol',
  'S8 — Post-Paid-Masterclass Enrol Push',
  'Triggered when a paid masterclass attendee shows up. 5 steps over 7 days, mixed email + WA, ending with a hard-deadline final email.',
  'student',
  'session_attended',
  '{"registration_type":"masterclass"}'::jsonb,
  ARRAY['course_enrolled','unsubscribed','do_not_contact_set']::lifecycle_event_type[],
  FALSE,  -- INACTIVE until Phase 2a Part 3 testing complete
  1,
  1
);

INSERT INTO lifecycle_sequences (sequence_key, name, description, track, trigger_event, trigger_filter, exit_on_events, is_active, version, priority)
VALUES (
  's1_free_webinar_attendance',
  'S1 — Free Webinar Attendance Push',
  'Triggered on free webinar registration. Steps anchored to webinar_date: day-before email + WA, 1h, live, post-webinar. Step 0 (confirmation) added in subsequent migration.',
  'student',
  'webinar_registered',
  '{"registration_type":"webinar"}'::jsonb,
  ARRAY['unsubscribed','do_not_contact_set']::lifecycle_event_type[],
  FALSE,
  1,
  1
);

-- ─── 4. SEQUENCE STEPS ─────────────────────────────────────────────────────

-- S8 steps (delay_hours = cumulative hours from enrolment)
INSERT INTO lifecycle_sequence_steps (sequence_id, step_index, delay_hours, channel, template_key, send_window_start, send_window_end)
SELECT id, 0,   0, 'email',    'em_s8_thank_you_v1',     '09:00','21:00' FROM lifecycle_sequences WHERE sequence_key = 's8_post_paid_masterclass_enrol';
INSERT INTO lifecycle_sequence_steps (sequence_id, step_index, delay_hours, channel, template_key, send_window_start, send_window_end)
SELECT id, 1,  24, 'whatsapp', 'wa_s8_offer_reminder_v1','09:00','21:00' FROM lifecycle_sequences WHERE sequence_key = 's8_post_paid_masterclass_enrol';
INSERT INTO lifecycle_sequence_steps (sequence_id, step_index, delay_hours, channel, template_key, send_window_start, send_window_end)
SELECT id, 2,  72, 'email',    'em_s8_faq_v1',           '09:00','21:00' FROM lifecycle_sequences WHERE sequence_key = 's8_post_paid_masterclass_enrol';
INSERT INTO lifecycle_sequence_steps (sequence_id, step_index, delay_hours, channel, template_key, send_window_start, send_window_end)
SELECT id, 3, 144, 'whatsapp', 'wa_s8_48h_left_v1',      '09:00','21:00' FROM lifecycle_sequences WHERE sequence_key = 's8_post_paid_masterclass_enrol';
INSERT INTO lifecycle_sequence_steps (sequence_id, step_index, delay_hours, channel, template_key, send_window_start, send_window_end)
SELECT id, 4, 168, 'email',    'em_s8_last_call_v1',     '09:00','21:00' FROM lifecycle_sequences WHERE sequence_key = 's8_post_paid_masterclass_enrol';

-- S1 steps (anchored absolute to webinar_date)
-- Step 0 (em_s1_confirmation_v1) is added in the next migration: lifecycle_v1_phase2a_add_s1_step0_confirmation
INSERT INTO lifecycle_sequence_steps (sequence_id, step_index, delay_hours, absolute_anchor, anchor_offset_hours, channel, template_key, send_window_start, send_window_end)
SELECT id, 1, 0, 'webinar_date', -24, 'email',    'em_s1_day_before_v1',    '09:00','21:00' FROM lifecycle_sequences WHERE sequence_key = 's1_free_webinar_attendance';
INSERT INTO lifecycle_sequence_steps (sequence_id, step_index, delay_hours, absolute_anchor, anchor_offset_hours, channel, template_key, send_window_start, send_window_end)
SELECT id, 2, 0, 'webinar_date', -24, 'whatsapp', 'wa_s1_day_before_v1',    '09:00','21:00' FROM lifecycle_sequences WHERE sequence_key = 's1_free_webinar_attendance';
INSERT INTO lifecycle_sequence_steps (sequence_id, step_index, delay_hours, absolute_anchor, anchor_offset_hours, channel, template_key, send_window_start, send_window_end)
SELECT id, 3, 0, 'webinar_date',  -1, 'whatsapp', 'wa_s1_one_hour_v1',      '09:00','22:00' FROM lifecycle_sequences WHERE sequence_key = 's1_free_webinar_attendance';
INSERT INTO lifecycle_sequence_steps (sequence_id, step_index, delay_hours, absolute_anchor, anchor_offset_hours, channel, template_key, send_window_start, send_window_end)
SELECT id, 4, 0, 'webinar_date',   0, 'whatsapp', 'wa_s1_live_now_v1',      '09:00','22:00' FROM lifecycle_sequences WHERE sequence_key = 's1_free_webinar_attendance';
INSERT INTO lifecycle_sequence_steps (sequence_id, step_index, delay_hours, absolute_anchor, anchor_offset_hours, channel, template_key, send_window_start, send_window_end)
SELECT id, 5, 0, 'webinar_date',  24, 'email',    'em_s1_post_webinar_v1',  '09:00','21:00' FROM lifecycle_sequences WHERE sequence_key = 's1_free_webinar_attendance';
