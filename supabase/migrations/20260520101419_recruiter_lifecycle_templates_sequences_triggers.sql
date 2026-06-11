-- ════════════════════════════════════════════════════════════════════════════
-- Recruiter lifecycle — R1/R2 templates, sequences, steps + emit triggers.
-- Re-attempt with correct ON CONFLICT targets:
--   lifecycle_templates       → UNIQUE (template_key, version)
--   lifecycle_sequences       → UNIQUE (sequence_key)
--   lifecycle_sequence_steps  → UNIQUE (sequence_id, step_index)
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 2. Templates for R1 ────────────────────────────────────────────────────
INSERT INTO public.lifecycle_templates
  (template_key, channel, version, subject, preview_text, body_html, body_text,
   aisensy_campaign_name, aisensy_param_order, variables_declared, is_active)
VALUES
  ('em_r1_recruiter_welcome_v1', 'email', 1,
   'Welcome to ostaran for recruiters, {{first_name}}',
   'Your account is being reviewed — we''ll have you posting jobs within a business day.',
   '<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:Inter,Arial,sans-serif;background:#F0F4FF"><div style="max-width:560px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(14,22,50,0.10)"><div style="background:linear-gradient(135deg,#0E1632,#1a2a5e);padding:32px;text-align:center"><div style="display:inline-block;background:#fff;border-radius:10px;padding:6px 14px;margin-bottom:12px"><span style="color:#0E1632;font-size:13px;font-weight:900;">ostaran for recruiters</span></div><h1 style="color:#fff;font-size:22px;margin:0;font-weight:700">Welcome, {{first_name}}</h1></div><div style="padding:36px 32px;color:#475569;font-size:14px;line-height:1.65"><p>Thanks for signing up <strong>{{company_name}}</strong> on ostaran for recruiters.</p><p><strong>What happens next:</strong></p><ul style="padding-left:18px"><li>Our team will review your account within 1 business day.</li><li>Once approved, you can post jobs and search the candidate database.</li><li>You''ll get email when approval lands.</li></ul><p style="margin-top:20px">In the meantime, <a href="https://www.ostaran.com/recruit/jobs" style="color:#7c3aed;font-weight:600">browse open roles on the public board</a> to see how listings look.</p><div style="text-align:center;margin-top:28px"><a href="https://www.ostaran.com/recruit/signin" style="display:inline-block;background:linear-gradient(135deg,#C49A10,#F0BE3C);color:#0E1632;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px">Sign in to your dashboard</a></div></div><div style="background:#F8FAFF;padding:16px 32px;text-align:center;border-top:1px solid #E2E8F0"><p style="color:#94a3b8;font-size:12px;margin:0">ostaran for recruiters · support@ostaran.com</p></div></div></body></html>',
   'Welcome to ostaran for recruiters, {{first_name}}.

Thanks for signing up {{company_name}}. Our team will review your account within 1 business day. Once approved, you can post jobs and search candidates. You''ll get email when approval lands.

Sign in: https://www.ostaran.com/recruit/signin

— ostaran for recruiters',
   NULL, NULL, '["first_name","company_name"]'::jsonb, true),

  ('em_r1_recruiter_still_reviewing_v1', 'email', 1,
   'Still reviewing your ostaran recruiter account, {{first_name}}',
   'Sit tight — approval usually lands within 1 business day.',
   '<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:Inter,Arial,sans-serif;background:#F0F4FF"><div style="max-width:560px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(14,22,50,0.10)"><div style="background:#0E1632;padding:24px;text-align:center"><span style="color:#fff;font-size:14px;font-weight:700">ostaran for recruiters</span></div><div style="padding:28px;color:#475569;font-size:14px;line-height:1.65"><p>Hi {{first_name}},</p><p>Just a quick note that we''re still reviewing your account for <strong>{{company_name}}</strong>. Approval usually lands within 1 business day; sometimes our team needs a beat longer if we''re verifying the company.</p><p>If you''d like to nudge things along, reply to this email with:</p><ul style="padding-left:18px"><li>A LinkedIn link for {{company_name}}</li><li>The roles you''re looking to fill</li></ul><p>That helps us prioritise.</p><p style="margin-top:20px">— Team ostaran</p></div></div></body></html>',
   'Hi {{first_name}}, still reviewing your ostaran recruiter account for {{company_name}}. Reply with your LinkedIn + roles you''re hiring for to help us prioritise. — Team ostaran',
   NULL, NULL, '["first_name","company_name"]'::jsonb, true),

  ('em_r2_recruiter_approved_v1', 'email', 1,
   '{{first_name}}, your ostaran recruiter account is live ✨',
   'You can now post jobs and search the candidate database.',
   '<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:Inter,Arial,sans-serif;background:#F0F4FF"><div style="max-width:560px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(14,22,50,0.10)"><div style="background:linear-gradient(135deg,#7c3aed,#a78bfa);padding:32px;text-align:center"><div style="display:inline-block;background:#fff;border-radius:10px;padding:6px 14px;margin-bottom:12px"><span style="color:#0E1632;font-size:13px;font-weight:900;">ostaran for recruiters</span></div><h1 style="color:#fff;font-size:24px;margin:0;font-weight:700">You''re approved, {{first_name}} 🎉</h1></div><div style="padding:32px;color:#475569;font-size:14px;line-height:1.65"><p>Your account for <strong>{{company_name}}</strong> is now live on ostaran. You can:</p><ul style="padding-left:18px;margin:12px 0"><li><strong>Post jobs</strong> — they appear on the public board for SEO + organic candidates.</li><li><strong>Search the candidate DB</strong> — faceted by city, skills, exp, education.</li><li><strong>Request to connect</strong> — admin-mediated unlocks during beta.</li></ul><div style="text-align:center;margin-top:24px"><a href="https://www.ostaran.com/recruit/dashboard" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px">Open dashboard</a></div><p style="margin-top:24px;color:#64748b;font-size:13px">Questions or stuck? Just reply — we read every email.</p></div></div></body></html>',
   'You''re approved! Your ostaran recruiter account for {{company_name}} is live. Post jobs, search candidates, request to connect. Dashboard: https://www.ostaran.com/recruit/dashboard',
   NULL, NULL, '["first_name","company_name"]'::jsonb, true)
ON CONFLICT (template_key, version) DO UPDATE SET
  subject = EXCLUDED.subject, body_html = EXCLUDED.body_html,
  body_text = EXCLUDED.body_text, preview_text = EXCLUDED.preview_text,
  is_active = EXCLUDED.is_active, updated_at = now();


-- ─── 3. Sequences ──────────────────────────────────────────────────────────
INSERT INTO public.lifecycle_sequences
  (sequence_key, name, description, track, trigger_event, trigger_filter,
   exit_on_events, is_active, version, priority)
VALUES
  ('r1_recruiter_welcome_verification',
   'R1 — Recruiter Welcome & Verification',
   'On signup: welcome immediately, then a 48h "still reviewing" nudge if not yet approved. Exits as soon as recruiter_approved fires.',
   'recruiter'::lifecycle_track, 'recruiter_signed_up'::lifecycle_event_type,
   '{}'::jsonb,
   ARRAY['recruiter_approved'::lifecycle_event_type,'unsubscribed'::lifecycle_event_type,'do_not_contact_set'::lifecycle_event_type],
   true, 1, 100),

  ('r2_recruiter_approved',
   'R2 — Recruiter Approval Landed',
   'On approval: send the "you are live" email immediately. Single-step sequence — purely transactional.',
   'recruiter'::lifecycle_track, 'recruiter_approved'::lifecycle_event_type,
   '{}'::jsonb,
   ARRAY['unsubscribed'::lifecycle_event_type,'do_not_contact_set'::lifecycle_event_type],
   true, 1, 100)
ON CONFLICT (sequence_key) DO UPDATE SET
  description = EXCLUDED.description,
  exit_on_events = EXCLUDED.exit_on_events,
  is_active = EXCLUDED.is_active,
  updated_at = now();


-- ─── 4. Sequence steps ─────────────────────────────────────────────────────
WITH r1 AS (SELECT id FROM lifecycle_sequences WHERE sequence_key='r1_recruiter_welcome_verification')
INSERT INTO public.lifecycle_sequence_steps
  (sequence_id, step_index, delay_hours, channel, template_key, conditions)
SELECT r1.id, 0, 0,  'email'::lifecycle_channel, 'em_r1_recruiter_welcome_v1',         '{}'::jsonb FROM r1
UNION ALL
SELECT r1.id, 1, 48, 'email'::lifecycle_channel, 'em_r1_recruiter_still_reviewing_v1', '{}'::jsonb FROM r1
ON CONFLICT (sequence_id, step_index) DO UPDATE SET
  delay_hours = EXCLUDED.delay_hours, channel = EXCLUDED.channel,
  template_key = EXCLUDED.template_key, updated_at = now();

WITH r2 AS (SELECT id FROM lifecycle_sequences WHERE sequence_key='r2_recruiter_approved')
INSERT INTO public.lifecycle_sequence_steps
  (sequence_id, step_index, delay_hours, channel, template_key, conditions)
SELECT r2.id, 0, 0, 'email'::lifecycle_channel, 'em_r2_recruiter_approved_v1', '{}'::jsonb FROM r2
ON CONFLICT (sequence_id, step_index) DO UPDATE SET
  delay_hours = EXCLUDED.delay_hours, channel = EXCLUDED.channel,
  template_key = EXCLUDED.template_key, updated_at = now();


-- ─── 5. Emit triggers on recruiters table ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.lifecycle_emit_recruiter_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.work_email IS NULL OR LENGTH(TRIM(NEW.work_email)) = 0 THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.is_spam, FALSE) = TRUE THEN RETURN NEW; END IF;

  INSERT INTO lifecycle_events (
    email, mobile, event_type, event_source_table, source_row_id,
    track, metadata, backfilled
  ) VALUES (
    LOWER(NEW.work_email),
    NEW.mobile,
    'recruiter_signed_up'::lifecycle_event_type,
    'recruiters', NEW.id,
    'recruiter'::lifecycle_track,
    jsonb_build_object(
      'first_name',     split_part(NEW.contact_name, ' ', 1),
      'contact_name',   NEW.contact_name,
      'company_name',   NEW.company_name,
      'company_website', NEW.company_website,
      'industry',       NEW.industry,
      'hq_city',        NEW.hq_city,
      'hiring_volume',  NEW.hiring_volume,
      'utm_source',     NEW.utm_source,
      'utm_campaign',   NEW.utm_campaign
    ),
    FALSE
  )
  ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[lifecycle] recruiter_signed_up trigger error: %', SQLERRM;
  BEGIN
    INSERT INTO lifecycle_trigger_errors (event_source_table, source_row_id, event_type, error_message)
      VALUES ('recruiters', NEW.id, 'recruiter_signed_up', SQLERRM);
  EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recruiters_emit_signup ON public.recruiters;
CREATE TRIGGER recruiters_emit_signup
  AFTER INSERT ON public.recruiters
  FOR EACH ROW EXECUTE FUNCTION public.lifecycle_emit_recruiter_signup();


CREATE OR REPLACE FUNCTION public.lifecycle_emit_recruiter_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.status = 'active' AND COALESCE(OLD.status, '') <> 'active' THEN
    IF NEW.work_email IS NULL OR LENGTH(TRIM(NEW.work_email)) = 0 THEN
      RETURN NEW;
    END IF;
    IF COALESCE(NEW.is_spam, FALSE) = TRUE THEN RETURN NEW; END IF;

    INSERT INTO lifecycle_events (
      email, mobile, event_type, event_source_table, source_row_id,
      track, metadata, backfilled
    ) VALUES (
      LOWER(NEW.work_email),
      NEW.mobile,
      'recruiter_approved'::lifecycle_event_type,
      'recruiters', NEW.id,
      'recruiter'::lifecycle_track,
      jsonb_build_object(
        'first_name',   split_part(NEW.contact_name, ' ', 1),
        'contact_name', NEW.contact_name,
        'company_name', NEW.company_name,
        'approved_at',  NEW.approved_at,
        'approved_by',  NEW.approved_by
      ),
      FALSE
    )
    ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[lifecycle] recruiter_approved trigger error: %', SQLERRM;
  BEGIN
    INSERT INTO lifecycle_trigger_errors (event_source_table, source_row_id, event_type, error_message)
      VALUES ('recruiters', NEW.id, 'recruiter_approved', SQLERRM);
  EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recruiters_emit_approved ON public.recruiters;
CREATE TRIGGER recruiters_emit_approved
  AFTER UPDATE OF status ON public.recruiters
  FOR EACH ROW EXECUTE FUNCTION public.lifecycle_emit_recruiter_approved();


COMMENT ON FUNCTION public.lifecycle_emit_recruiter_signup() IS
  'Fires R1 sequence (welcome + 48h reviewing nudge) on recruiter signup.';
COMMENT ON FUNCTION public.lifecycle_emit_recruiter_approved() IS
  'Fires R2 sequence (approval landed) when recruiters.status transitions to active.';
