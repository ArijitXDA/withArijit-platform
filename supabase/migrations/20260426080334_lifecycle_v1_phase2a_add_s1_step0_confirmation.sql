-- ════════════════════════════════════════════════════════════════════════════
-- LIFECYCLE PHASE 2A — ADD S1 STEP 0 (CONFIRMATION EMAIL, PARALLEL WITH MAKE)
-- ════════════════════════════════════════════════════════════════════════════
-- Per Apr 2026 decision: lifecycle adds its own confirmation email at T+0h
-- to run in parallel with Make scenario 8297974 ("webinar reg email").
-- For an initial period users will receive 2 confirmation emails (Make's +
-- lifecycle's). Once metrics show one is preferred, deactivate the other.
--
-- Style matches existing em_s1_day_before_v1: navy (#07112E) + gold (#F0BE3C),
-- Arial, 600px responsive table, AIwithArijit × oStaran wordmark.
-- Variables aligned with existing convention:
--   first_name, webinar_date_display, webinar_time_display,
--   join_link, registered_at_display, unsubscribe_url
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Add the confirmation email template ────────────────────────────────

INSERT INTO lifecycle_templates (
  template_key, channel, version, subject, preview_text,
  body_html, body_text, variables_declared, is_active
) VALUES (
  'em_s1_confirmation_v1', 'email', 1,
  'You are in, {{first_name}} &mdash; {{webinar_date_display}}, {{webinar_time_display}} IST',
  'Save your join link now &mdash; we will remind you 24h and 1h before.',
$html$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>You are registered</title></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#07112E,#0D1F4E);padding:32px 40px;text-align:center;">
  <p style="color:#F0BE3C;font-size:13px;margin:0 0 8px;font-weight:bold;">AIwithArijit &times; oStaran</p>
  <h1 style="color:#fff;font-size:24px;margin:0 0 4px;">You are registered</h1>
  <p style="color:#94a3b8;font-size:14px;margin:0;">{{webinar_date_display}} &mdash; {{webinar_time_display}} IST</p>
</td></tr>
<tr><td style="padding:36px 40px;">
  <p style="font-size:15px;color:#374151;margin:0 0 20px;">Hi <strong>{{first_name}}</strong>,</p>
  <p style="font-size:15px;color:#374151;margin:0 0 20px;">Your spot is locked in for the free <strong>AI Certification Webinar</strong> on <strong>{{webinar_date_display}}</strong> at <strong>{{webinar_time_display}} IST</strong>. 90 minutes, live, hands-on.</p>
  <div style="text-align:center;margin:24px 0;">
    <a href="{{join_link}}" style="display:inline-block;background:#07112E;color:#F0BE3C;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:bold;border:2px solid #F0BE3C;">Save my join link &rarr;</a>
    <p style="font-size:12px;color:#6b7280;margin:8px 0 0;">Bookmark this &mdash; same link on the day</p>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin:24px 0;"><tr><td style="padding:20px 24px;">
    <p style="font-size:13px;color:#0369a1;text-transform:uppercase;letter-spacing:.5px;margin:0 0 6px;">What happens next</p>
    <ul style="color:#374151;font-size:14px;margin:0;padding-left:20px;line-height:1.9;">
      <li>I will email you again 24 hours before the session</li>
      <li>You will get a WhatsApp nudge 1 hour before we go live</li>
      <li>And a final ping the moment we start &mdash; you will not miss it</li>
    </ul>
  </td></tr></table>
  <p style="font-size:14px;color:#6b7280;margin:24px 0 8px;"><strong style="color:#374151;">One small request:</strong></p>
  <p style="font-size:14px;color:#6b7280;line-height:1.7;margin:0 0 16px;">Block 90 minutes on your calendar now. The webinar is most useful if you can give it your full attention &mdash; phone away, second monitor for the demos if you have one. The people who show up fully engaged are the ones who walk away with something they can use the same day.</p>
  <p style="font-size:14px;color:#374151;margin:24px 0 0;">See you on the day,<br><strong>Arijit Chowdhury</strong></p>
</td></tr>
<tr><td style="background:#f9fafb;padding:16px 40px;text-align:center;border-top:1px solid #e5e7eb;">
  <p style="font-size:11px;color:#9ca3af;margin:0;">You registered on {{registered_at_display}}.</p>
  <p style="font-size:11px;color:#9ca3af;margin:4px 0 0;"><a href="{{unsubscribe_url}}" style="color:#9ca3af;">Unsubscribe</a></p>
</td></tr>
</table></td></tr></table>
</body></html>$html$,
  NULL,
  '{"first_name":"string","webinar_date_display":"string","webinar_time_display":"string","join_link":"string","registered_at_display":"string","unsubscribe_url":"string"}'::jsonb,
  TRUE
);

-- ─── 2. Add S1 step 0 (T+0h confirmation, immediate window) ────────────────

INSERT INTO lifecycle_sequence_steps (
  sequence_id, step_index,
  delay_hours, absolute_anchor, anchor_offset_hours,
  send_window_start, send_window_end,
  channel, template_key, conditions
)
SELECT
  id, 0,
  0, NULL, NULL,
  '00:00', '23:59',           -- always-on window: confirmations should fire instantly regardless of time
  'email', 'em_s1_confirmation_v1', '{}'::jsonb
FROM lifecycle_sequences
WHERE sequence_key = 's1_free_webinar_attendance';
