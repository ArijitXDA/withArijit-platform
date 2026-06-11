-- Port the 5-stage conversion nudges (reminders system) into lifecycle templates.
-- Emails: conversion_1 has no '(All)' variant → use Working Professional as the generic base;
-- conversion_2..5 use the '(All)' variants. WA bodies (display/render text) from the WP variants;
-- the actual WhatsApp content is the Meta-approved template on AiSensy (nudge_1..5 campaigns).

-- 1. Email nudges: em_s6_nudge1..5_v1 + em_s8_nudge1..5_v1 (same body; enrol_url resolves per-route)
WITH src AS (
  SELECT 1 AS n, subject, body_html FROM student_reminder_templates
   WHERE journey_stage='conversion_1' AND type::text='email' AND student_type='working_professional' AND is_active LIMIT 1
), src2 AS (
  SELECT 2 AS n, subject, body_html FROM student_reminder_templates
   WHERE journey_stage='conversion_2' AND type::text='email' AND student_type='all' AND is_active LIMIT 1
), src3 AS (
  SELECT 3 AS n, subject, body_html FROM student_reminder_templates
   WHERE journey_stage='conversion_3' AND type::text='email' AND student_type='all' AND is_active LIMIT 1
), src4 AS (
  SELECT 4 AS n, subject, body_html FROM student_reminder_templates
   WHERE journey_stage='conversion_4' AND type::text='email' AND student_type='all' AND is_active LIMIT 1
), src5 AS (
  SELECT 5 AS n, subject, body_html FROM student_reminder_templates
   WHERE journey_stage='conversion_5' AND type::text='email' AND student_type='all' AND is_active LIMIT 1
), all_src AS (
  SELECT * FROM src UNION ALL SELECT * FROM src2 UNION ALL SELECT * FROM src3
  UNION ALL SELECT * FROM src4 UNION ALL SELECT * FROM src5
)
INSERT INTO lifecycle_templates (template_key, channel, subject, body_html, variables_declared, is_active)
SELECT
  'em_' || p.pfx || '_nudge' || s.n || '_v1',
  'email'::lifecycle_channel,
  replace(s.subject, '{{name}}', '{{first_name}}'),
  replace(replace(replace(s.body_html, '{{name}}', '{{first_name}}'), '{{join_link}}', '{{enrol_url}}'), '{{enrol_link}}', '{{enrol_url}}'),
  '{"first_name":"string","enrol_url":"string","partner_name":"string"}'::jsonb,
  true
FROM all_src s CROSS JOIN (VALUES ('s6'),('s8')) AS p(pfx);

-- 2. WhatsApp nudges: wa_s6_nudge1..5_v1 + wa_s8_nudge1..5_v1.
--    nudge_1 campaign is delivery-proven → active. nudge_2..5 unverified → inactive
--    (dispatcher skips gracefully + advances) until the operator confirms them live.
--    (Flipped to active 2026-06-11 after Arijit confirmed all 5 campaigns Live in AiSensy.)
WITH wsrc AS (
  SELECT 1 AS n, body_text FROM student_reminder_templates
   WHERE journey_stage='conversion_1' AND type::text='whatsapp' AND student_type='working_professional' AND is_active LIMIT 1
), wsrc2 AS (
  SELECT 2 AS n, body_text FROM student_reminder_templates
   WHERE journey_stage='conversion_2' AND type::text='whatsapp' AND student_type='working_professional' AND is_active LIMIT 1
), wsrc3 AS (
  SELECT 3 AS n, body_text FROM student_reminder_templates
   WHERE journey_stage='conversion_3' AND type::text='whatsapp' AND student_type='working_professional' AND is_active LIMIT 1
), wsrc4 AS (
  SELECT 4 AS n, body_text FROM student_reminder_templates
   WHERE journey_stage='conversion_4' AND type::text='whatsapp' AND student_type='working_professional' AND is_active LIMIT 1
), wsrc5 AS (
  SELECT 5 AS n, body_text FROM student_reminder_templates
   WHERE journey_stage='conversion_5' AND type::text='whatsapp' AND student_type='working_professional' AND is_active LIMIT 1
), all_wsrc AS (
  SELECT * FROM wsrc UNION ALL SELECT * FROM wsrc2 UNION ALL SELECT * FROM wsrc3
  UNION ALL SELECT * FROM wsrc4 UNION ALL SELECT * FROM wsrc5
)
INSERT INTO lifecycle_templates (template_key, channel, subject, body_text, aisensy_campaign_name, aisensy_param_order, variables_declared, is_active)
SELECT
  'wa_' || p.pfx || '_nudge' || s.n || '_v1',
  'whatsapp'::lifecycle_channel,
  NULL,
  replace(replace(replace(s.body_text, '{{name}}', '{{first_name}}'), '{{join_link}}', '{{enrol_url}}'), '{{enrol_link}}', '{{enrol_url}}'),
  CASE s.n
    WHEN 1 THEN 'nudge_1_job_market'
    WHEN 2 THEN 'nudge_2_ai_critical'
    WHEN 3 THEN 'nudge_3_live_classes'
    WHEN 4 THEN 'nudge_4_real_projects'
    WHEN 5 THEN 'nudge_5_ai_portfolio'
  END,
  ARRAY['first_name','student_type_label','enrol_url','enrol_button_suffix'],
  '{"first_name":"string","student_type_label":"string","enrol_url":"string","enrol_button_suffix":"string"}'::jsonb,
  (s.n = 1)
FROM all_wsrc s CROSS JOIN (VALUES ('s6'),('s8')) AS p(pfx);
