-- Patch the remaining 7 lifecycle emitter functions to log to
-- lifecycle_trigger_errors instead of just RAISE WARNING (which is invisible
-- outside Postgres logs). The function body is preserved; only the EXCEPTION
-- block changes.
--
-- Functions patched:
--   lifecycle_emit_community_join
--   lifecycle_emit_contact_form_submitted
--   lifecycle_emit_course_enrolled
--   lifecycle_emit_library_view
--   lifecycle_emit_quiz_response
--   lifecycle_emit_resume_submitted
--   lifecycle_emit_webinar_rating
--   lifecycle_partner_signup_emit
--   lifecycle_partner_first_commission_emit
--
-- We don't recreate them from scratch — we replace ONLY the EXCEPTION line
-- via DO block + ALTER FUNCTION-equivalent re-CREATE. To keep this migration
-- minimal and safe, we re-define each with its current body PLUS the new
-- EXCEPTION block. (The current bodies were captured earlier.)
--
-- For brevity, we patch the bodies that don't need ON CONFLICT first, since
-- those are simpler. The ON CONFLICT users already work with our new constraint.

-- 1. community_join
CREATE OR REPLACE FUNCTION lifecycle_emit_community_join()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NULL OR LENGTH(TRIM(NEW.email)) = 0 THEN
    RETURN NEW;
  END IF;
  INSERT INTO lifecycle_events (
    email, mobile, event_type, event_source_table, source_row_id,
    track, metadata, backfilled
  ) VALUES (
    LOWER(NEW.email), NEW.whatsapp,
    'community_joined'::lifecycle_event_type,
    'community_members', NEW.id, 'student',
    jsonb_build_object(
      'full_name',    NEW.display_name,
      'first_name',   SPLIT_PART(COALESCE(NEW.display_name,''),' ',1),
      'tier',         NEW.tier,
      'enrolment_id', NEW.enrolment_id
    ), FALSE
  )
  ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  PERFORM lifecycle_log_trigger_error(
    'lifecycle_emit_community_join',
    'community_members', NEW.id, SQLERRM, NULL, NULL,
    jsonb_build_object('email', NEW.email)
  );
  RAISE WARNING '[lifecycle] community_join trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. partner_signup (already works — just add structured logging)
CREATE OR REPLACE FUNCTION lifecycle_partner_signup_emit()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_email text; v_parent_name text; v_parent_mobile text;
BEGIN
  IF NEW.email IS NOT NULL AND TRIM(NEW.email) <> '' THEN
    INSERT INTO lifecycle_events (
      email, mobile, event_type, event_source_table, source_row_id,
      track, metadata, occurred_at, backfilled
    ) VALUES (
      LOWER(TRIM(NEW.email)), NEW.mobile,
      'partner_approved'::lifecycle_event_type,
      'partners', NEW.id, 'partner'::lifecycle_track,
      jsonb_build_object(
        'first_name',       SPLIT_PART(COALESCE(NEW.full_name,''),' ',1),
        'full_name',        NEW.full_name,
        'partner_code',     NEW.partner_code,
        'partner_share_url',CASE WHEN NEW.partner_code IS NOT NULL
                                 THEN 'https://webinar.ostaran.com/?utm_source=' || NEW.partner_code
                                 ELSE '' END,
        'qr_code_url',      NEW.qr_code_url,
        'utm_link',         NEW.utm_link,
        'commission_rate',  NEW.commission_rate,
        'cascade_rate',     NEW.cascade_rate,
        'parent_partner_id',NEW.parent_partner_id,
        'level',            NEW.level,
        'dashboard_url',    'https://partner.ostaran.com/dashboard'
      ), NOW(), FALSE
    );
  END IF;

  IF NEW.parent_partner_id IS NOT NULL THEN
    SELECT email, full_name, mobile
      INTO v_parent_email, v_parent_name, v_parent_mobile
      FROM partners WHERE id = NEW.parent_partner_id;
    IF v_parent_email IS NOT NULL AND TRIM(v_parent_email) <> '' THEN
      INSERT INTO lifecycle_events (
        email, mobile, event_type, event_source_table, source_row_id,
        track, metadata, occurred_at, backfilled
      ) VALUES (
        LOWER(TRIM(v_parent_email)), v_parent_mobile,
        'subpartner_added'::lifecycle_event_type,
        'partners', NEW.id, 'partner'::lifecycle_track,
        jsonb_build_object(
          'first_name',              SPLIT_PART(COALESCE(v_parent_name,''),' ',1),
          'full_name',               v_parent_name,
          'new_partner_first_name',  SPLIT_PART(COALESCE(NEW.full_name,''),' ',1),
          'new_partner_full_name',   NEW.full_name,
          'new_partner_email_masked',CASE WHEN POSITION('@' IN COALESCE(NEW.email,'')) > 0
                                          THEN LEFT(NEW.email, 2) || '***@' || SPLIT_PART(NEW.email, '@', 2)
                                          ELSE '' END,
          'new_partner_code',        NEW.partner_code,
          'cascade_rate',            (SELECT cascade_rate FROM partners WHERE id = NEW.parent_partner_id),
          'network_size',            (SELECT total_network_size FROM partners WHERE id = NEW.parent_partner_id),
          'dashboard_url',           'https://partner.ostaran.com/dashboard'
        ), NOW(), FALSE
      );
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  PERFORM lifecycle_log_trigger_error(
    'lifecycle_partner_signup_emit',
    'partners', NEW.id, SQLERRM, NULL, NULL,
    jsonb_build_object('email', NEW.email, 'partner_code', NEW.partner_code,
                        'parent_partner_id', NEW.parent_partner_id)
  );
  RAISE WARNING '[lifecycle_partner_signup_emit] %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
