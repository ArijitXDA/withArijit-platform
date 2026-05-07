-- ════════════════════════════════════════════════════════════════════════════
-- LIFECYCLE — Sequence S6: Post-Free-Webinar Upsell (Phase C)
-- ════════════════════════════════════════════════════════════════════════════
-- Inserts:
--   - 1 sequence (is_active=FALSE; activated after smoke test)
--   - 4 sequence_steps (T+1h email, T+24h WA, T+72h email, T+168h email)
--   - 4 templates: 3 active emails + 1 inactive WA (pending Meta approval)
--
-- Companion: dispatcher v3 (lifecycle-dispatcher/index.ts) adds buildS6PartnerVars()
-- which sets branched copy variables based on context.partner_code +
-- audience-mapped course discount lookup at send time.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Sequence
INSERT INTO lifecycle_sequences (
  sequence_key, name, description, track, priority,
  trigger_event, trigger_filter, exit_on_events, is_active
) VALUES (
  's6_post_free_webinar_upsell',
  'S6 — Post-Free-Webinar Upsell',
  'Convert free-webinar attendees to paid programme enrolees. Highest-leverage funnel gap.',
  'student',
  2,
  'session_attended',
  '{"registration_type": "webinar"}'::jsonb,
  ARRAY['masterclass_paid', 'masterclass_registered', 'unsubscribed', 'do_not_contact_set']::lifecycle_event_type[],
  FALSE
);

-- 2) Sequence steps
INSERT INTO lifecycle_sequence_steps (
  sequence_id, step_index, template_key, channel,
  delay_hours, send_window_start, send_window_end
)
SELECT s.id, v.step_index, v.template_key, v.channel::lifecycle_channel,
       v.delay_hours, v.send_window_start::time, v.send_window_end::time
FROM lifecycle_sequences s
CROSS JOIN (VALUES
  (0, 'em_s6_attendees_pitch_v1', 'email',    1,   '09:00', '21:00'),
  (1, 'wa_s6_save_seat_v1',       'whatsapp', 24,  '09:00', '21:00'),
  (2, 'em_s6_offer_v1',           'email',    72,  '09:00', '21:00'),
  (3, 'em_s6_last_call_v1',       'email',    168, '09:00', '21:00')
) AS v(step_index, template_key, channel, delay_hours, send_window_start, send_window_end)
WHERE s.sequence_key = 's6_post_free_webinar_upsell';

-- 3) Template: em_s6_attendees_pitch_v1 (T+1h email — active)
INSERT INTO lifecycle_templates (
  template_key, version, channel, is_active,
  subject, body_html, body_text, variables_declared,
  aisensy_campaign_name, aisensy_param_order
) VALUES (
  'em_s6_attendees_pitch_v1', 1, 'email', TRUE,
  $subj$Loved your AI session, {{first_name}}? Here's what's next$subj$,
  $body$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>What's next from oStaran</title></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#07112E,#0D1F4E);padding:32px 40px;text-align:center;">
  <p style="color:#F0BE3C;font-size:13px;margin:0 0 8px;font-weight:bold;">AIwithArijit &times; oStaran</p>
  <h1 style="color:#fff;font-size:24px;margin:0;">What's next, {{first_name}}?</h1>
</td></tr>
<tr><td style="padding:36px 40px;">
  <p style="font-size:15px;color:#374151;margin:0 0 18px;">Hi <strong>{{first_name}}</strong>,</p>
  <p style="font-size:15px;color:#374151;margin:0 0 18px;line-height:1.7;">Hope you got something useful out of today's session.</p>
  <p style="font-size:15px;color:#374151;margin:0 0 18px;line-height:1.7;">If the demo got your attention, the full <strong>5-week AI Mastery programme</strong> is the natural next step &mdash; same content, but hands-on, with you actually building agents and AI workflows in your own work context.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin:22px 0;"><tr><td style="padding:18px 22px;">
    <p style="font-size:14px;color:#374151;line-height:1.7;margin:0;">{{s6_pitch_block}}</p>
  </td></tr></table>
  <div style="text-align:center;margin:26px 0 12px;">
    <a href="{{enrol_url}}" style="display:inline-block;background:#07112E;color:#F0BE3C;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:bold;border:2px solid #F0BE3C;">See your programme &rarr;</a>
  </div>
  <p style="font-size:14px;color:#6b7280;margin:24px 0 0;line-height:1.7;">If now's not the right time, no stress. We do these every Sunday and your spot here is yours whenever you want it.</p>
  <p style="font-size:14px;color:#374151;margin:22px 0 0;">&mdash; The oStaran Team</p>
</td></tr>
<tr><td style="background:#f9fafb;padding:14px 40px;text-align:center;border-top:1px solid #e5e7eb;">
  <p style="font-size:11px;color:#9ca3af;margin:0;"><a href="{{unsubscribe_url}}" style="color:#9ca3af;">Unsubscribe</a></p>
</td></tr>
</table></td></tr></table>
</body></html>$body$,
  NULL,
  '{"first_name":"string","enrol_url":"string","unsubscribe_url":"string","s6_pitch_block":"string"}'::jsonb,
  NULL, NULL
);

-- 4) Template: wa_s6_save_seat_v1 (INACTIVE — Meta pending)
INSERT INTO lifecycle_templates (
  template_key, version, channel, is_active,
  subject, body_html, body_text, variables_declared,
  aisensy_campaign_name, aisensy_param_order
) VALUES (
  'wa_s6_save_seat_v1', 1, 'whatsapp', FALSE,
  NULL,
  NULL,
  $body$Hi {{first_name}}, hope yesterday's session was useful! The 5-week AI Mastery programme covers what we touched on, hands-on. Your audience-specific page: {{enrol_url}}

{{s6_wa_partner_line}}

Reply STOP to unsubscribe.$body$,
  '{"first_name":"string","enrol_url":"string","s6_wa_partner_line":"string"}'::jsonb,
  'lifecycle_s6_save_seat_v1',
  ARRAY['first_name', 'enrol_url', 's6_wa_partner_line']
);

-- 5) Template: em_s6_offer_v1 (T+72h — active)
INSERT INTO lifecycle_templates (
  template_key, version, channel, is_active,
  subject, body_html, body_text, variables_declared,
  aisensy_campaign_name, aisensy_param_order
) VALUES (
  'em_s6_offer_v1', 1, 'email', TRUE,
  $subj${{first_name}}, the deeper programme — pricing inside$subj$,
  $body$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>The deeper programme</title></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#07112E,#0D1F4E);padding:32px 40px;text-align:center;">
  <p style="color:#F0BE3C;font-size:13px;margin:0 0 8px;font-weight:bold;">AIwithArijit &times; oStaran</p>
  <h1 style="color:#fff;font-size:22px;margin:0;">The deeper programme &mdash; pricing inside</h1>
</td></tr>
<tr><td style="padding:36px 40px;">
  <p style="font-size:15px;color:#374151;margin:0 0 18px;">Hi <strong>{{first_name}}</strong>,</p>
  <p style="font-size:15px;color:#374151;margin:0 0 18px;line-height:1.7;">Quick reminder &mdash; if Sunday's session sparked something, here's the deeper programme that goes with it.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;margin:22px 0;"><tr><td style="padding:18px 22px;">
    <p style="font-size:14px;color:#374151;line-height:1.7;margin:0;">{{s6_offer_block}}</p>
  </td></tr></table>
  <p style="font-size:14px;color:#374151;margin:0 0 6px;font-weight:bold;">A few specifics that come up:</p>
  <ul style="color:#374151;font-size:14px;margin:0 0 18px;padding-left:20px;line-height:1.85;">
    <li><strong>Hands-on, not just lectures</strong> &mdash; every week ends with you having shipped something real</li>
    <li><strong>Cohort-based</strong> &mdash; small groups, peers from similar profiles</li>
    <li><strong>Lifetime access</strong> to the curriculum + alumni community</li>
  </ul>
  <div style="text-align:center;margin:26px 0 12px;">
    <a href="{{enrol_url}}" style="display:inline-block;background:#07112E;color:#F0BE3C;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:bold;border:2px solid #F0BE3C;">Lock in your seat &rarr;</a>
  </div>
  <p style="font-size:14px;color:#6b7280;margin:22px 0 0;line-height:1.7;">Questions? Just reply to this email.</p>
  <p style="font-size:14px;color:#374151;margin:22px 0 0;">&mdash; The oStaran Team</p>
</td></tr>
<tr><td style="background:#f9fafb;padding:14px 40px;text-align:center;border-top:1px solid #e5e7eb;">
  <p style="font-size:11px;color:#9ca3af;margin:0;"><a href="{{unsubscribe_url}}" style="color:#9ca3af;">Unsubscribe</a></p>
</td></tr>
</table></td></tr></table>
</body></html>$body$,
  NULL,
  '{"first_name":"string","enrol_url":"string","unsubscribe_url":"string","s6_offer_block":"string"}'::jsonb,
  NULL, NULL
);

-- 6) Template: em_s6_last_call_v1 (T+168h — active)
INSERT INTO lifecycle_templates (
  template_key, version, channel, is_active,
  subject, body_html, body_text, variables_declared,
  aisensy_campaign_name, aisensy_param_order
) VALUES (
  'em_s6_last_call_v1', 1, 'email', TRUE,
  $subj${{first_name}}, last call from oStaran$subj$,
  $body$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Last call from oStaran</title></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#07112E,#0D1F4E);padding:32px 40px;text-align:center;">
  <p style="color:#F0BE3C;font-size:13px;margin:0 0 8px;font-weight:bold;">AIwithArijit &times; oStaran</p>
  <h1 style="color:#fff;font-size:24px;margin:0;">Last call</h1>
</td></tr>
<tr><td style="padding:36px 40px;">
  <p style="font-size:15px;color:#374151;margin:0 0 18px;">Hi <strong>{{first_name}}</strong>,</p>
  <p style="font-size:15px;color:#374151;margin:0 0 18px;line-height:1.7;">One last note from us.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fee2e2;border:1px solid #fecaca;border-radius:8px;margin:22px 0;"><tr><td style="padding:18px 22px;">
    <p style="font-size:14px;color:#374151;line-height:1.7;margin:0;">{{s6_lastcall_block}}</p>
  </td></tr></table>
  <p style="font-size:15px;color:#374151;margin:0 0 18px;line-height:1.7;">If the timing isn't right, that's fine &mdash; we'll catch you on the next webinar. But if you're on the fence, this is the moment to decide.</p>
  <div style="text-align:center;margin:26px 0 12px;">
    <a href="{{enrol_url}}" style="display:inline-block;background:#07112E;color:#F0BE3C;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:bold;border:2px solid #F0BE3C;">Take the next step &rarr;</a>
  </div>
  <p style="font-size:14px;color:#6b7280;margin:22px 0 0;line-height:1.7;">No more emails from us in this thread after this one.</p>
  <p style="font-size:14px;color:#374151;margin:22px 0 0;">&mdash; The oStaran Team</p>
</td></tr>
<tr><td style="background:#f9fafb;padding:14px 40px;text-align:center;border-top:1px solid #e5e7eb;">
  <p style="font-size:11px;color:#9ca3af;margin:0;"><a href="{{unsubscribe_url}}" style="color:#9ca3af;">Unsubscribe</a></p>
</td></tr>
</table></td></tr></table>
</body></html>$body$,
  NULL,
  '{"first_name":"string","enrol_url":"string","unsubscribe_url":"string","s6_lastcall_block":"string"}'::jsonb,
  NULL, NULL
);
