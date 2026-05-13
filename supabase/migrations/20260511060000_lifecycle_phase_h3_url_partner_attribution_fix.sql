-- ════════════════════════════════════════════════════════════════════════════
-- LIFECYCLE — Phase H.3: URL partner attribution fix
-- ════════════════════════════════════════════════════════════════════════════
-- Applied via Supabase MCP `apply_migration` on 2026-05-11.
--
-- Problem:
--   8 email templates linked recipients to a hardcoded URL with the
--   ARIBOMBAY-0326 partner code baked in:
--     https://webinar.ostaran.com/?utm_source=ARIBOMBAY-0326&...
--   Recipients of E5/E6/X1 nurture emails were therefore re-attributed to
--   ARIBOMBAY-0326 even when their contact record carried a different
--   referring_partner_code. That silently leaked attribution back to the
--   default partner.
--
-- Fix:
--   REGEXP_REPLACE the hardcoded URL pattern with the
--   {{webinar_register_url}} merge field. The dispatcher already resolves
--   this per-contact via resolveWebinarRegisterUrl() (added in lifecycle-
--   dispatcher v4), using the contact's referring_partner_code and falling
--   back to ARIBOMBAY-0326 only for genuinely partnerless contacts.
--
--   Also extends variables_declared so the per-template variable contract
--   matches the new merge field.
--
-- Templates updated (8):
--   em_e5_one_more_v1, em_e5_received_v1
--   em_e6_been_a_while_v1, em_e6_quiet_exit_v1, em_e6_what_changed_v1
--   em_x1_goodbye_v1, em_x1_one_chance_v1, em_x1_still_interested_v1
--
-- Full canonical SQL stored in supabase_migrations.schema_migrations.statements
-- WHERE version = '20260511060000'.
-- ════════════════════════════════════════════════════════════════════════════

UPDATE lifecycle_templates
SET
  body_html = REGEXP_REPLACE(
    body_html,
    'https://webinar\.ostaran\.com/\?utm_source=ARIBOMBAY-0326&utm_medium=email&utm_campaign=lifecycle_(e5|e6|x1)',
    '{{webinar_register_url}}',
    'g'
  ),
  variables_declared = CASE
    WHEN variables_declared ? 'webinar_register_url'
      THEN variables_declared
    ELSE variables_declared || '{"webinar_register_url": "string"}'::jsonb
  END,
  updated_at = NOW()
WHERE template_key IN (
  'em_e5_one_more_v1',
  'em_e5_received_v1',
  'em_e6_been_a_while_v1',
  'em_e6_quiet_exit_v1',
  'em_e6_what_changed_v1',
  'em_x1_goodbye_v1',
  'em_x1_one_chance_v1',
  'em_x1_still_interested_v1'
);
