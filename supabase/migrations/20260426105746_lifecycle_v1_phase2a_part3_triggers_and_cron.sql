-- ============================================================================
-- Lifecycle v1 - Phase 2a Part 3: source-table triggers + auto-enrol + pg_cron
-- ============================================================================
-- This migration wires up the live event pipeline:
--   1. AFTER INSERT/UPDATE triggers on 7 source tables emit lifecycle_events
--   2. AFTER INSERT trigger on lifecycle_events auto-enrols matching sequences
--   3. pg_cron schedules dispatcher tick (every 5 min) and stale-cleanup (daily)
--
-- IMPORTANT: This migration does NOT activate any sequences. All enrolments
-- created by these triggers will sit at status='active' but the dispatcher
-- will refuse to send because lifecycle_sequences.is_active=FALSE.
--
-- Activation is a separate, manual UPDATE statement, run only after smoke test
-- of the trigger pipeline confirms context is captured correctly.
--
-- Every trigger function uses SECURITY DEFINER so it bypasses RLS on
-- lifecycle_events writes (called from anon-owned source-table inserts).
-- Every trigger function has EXCEPTION WHEN OTHERS so a lifecycle bug can
-- never break a source-table INSERT (e.g. registration form submission).
-- ============================================================================

-- =====================================================================
-- 1. EVENT-EMISSION TRIGGERS ON SOURCE TABLES
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1a. qr_landing_registrations INSERT -> webinar_registered | masterclass_registered
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lifecycle_emit_qr_landing_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.email IS NULL OR LENGTH(TRIM(NEW.email)) = 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO lifecycle_events (
    email, mobile, event_type,
    event_source_table, source_row_id,
    track, metadata, backfilled
  ) VALUES (
    LOWER(NEW.email),
    NEW.mobile,
    CASE NEW.registration_type
      WHEN 'webinar'     THEN 'webinar_registered'::lifecycle_event_type
      WHEN 'masterclass' THEN 'masterclass_registered'::lifecycle_event_type
      ELSE                    'webinar_registered'::lifecycle_event_type
    END,
    'qr_landing_registrations',
    NEW.id,
    'student',
    jsonb_build_object(
      'full_name',               NEW.full_name,
      'webinar_date',            NEW.webinar_date,
      'webinar_time',            NEW.webinar_time,
      'course_name',             NEW.course_name,
      'course_id',               NEW.course_id,
      'partner_code',            NEW.utm_source,
      'utm_medium',              NEW.utm_medium,
      'utm_campaign',            NEW.utm_campaign,
      'profession_choice',       NEW.profession_choice,
      'join_token',              NEW.join_token,
      'registration_type',       NEW.registration_type,
      'payment_status',          NEW.payment_status,
      'masterclass_final_price', NEW.masterclass_final_price
    ),
    FALSE
  )
  ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[lifecycle] qr_landing INSERT trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lifecycle_qr_landing_insert ON qr_landing_registrations;
CREATE TRIGGER trg_lifecycle_qr_landing_insert
AFTER INSERT ON qr_landing_registrations
FOR EACH ROW EXECUTE FUNCTION lifecycle_emit_qr_landing_insert();

-- ---------------------------------------------------------------------
-- 1b. qr_landing_registrations UPDATE -> masterclass_paid | session_attended
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lifecycle_emit_qr_landing_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.email IS NULL OR LENGTH(TRIM(NEW.email)) = 0 THEN
    RETURN NEW;
  END IF;

  -- masterclass_paid: when payment_status transitions to 'paid'
  IF NEW.payment_status = 'paid'
     AND (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  THEN
    INSERT INTO lifecycle_events (
      email, mobile, event_type,
      event_source_table, source_row_id,
      track, metadata, backfilled
    ) VALUES (
      LOWER(NEW.email), NEW.mobile,
      'masterclass_paid'::lifecycle_event_type,
      'qr_landing_registrations', NEW.id,
      'student',
      jsonb_build_object(
        'full_name',               NEW.full_name,
        'webinar_date',            NEW.webinar_date,
        'webinar_time',            NEW.webinar_time,
        'course_name',             NEW.course_name,
        'partner_code',            NEW.utm_source,
        'profession_choice',       NEW.profession_choice,
        'join_token',              NEW.join_token,
        'masterclass_final_price', NEW.masterclass_final_price,
        'paid_at',                 NEW.paid_at,
        'razorpay_payment_id',     NEW.razorpay_payment_id,
        'registration_type',       NEW.registration_type
      ),
      FALSE
    )
    ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING;
  END IF;

  -- session_attended: when attendance_confirmed transitions to TRUE
  IF NEW.attendance_confirmed = TRUE
     AND (COALESCE(OLD.attendance_confirmed, FALSE) IS DISTINCT FROM TRUE)
  THEN
    INSERT INTO lifecycle_events (
      email, mobile, event_type,
      event_source_table, source_row_id,
      track, metadata, backfilled
    ) VALUES (
      LOWER(NEW.email), NEW.mobile,
      'session_attended'::lifecycle_event_type,
      'qr_landing_registrations', NEW.id,
      'student',
      jsonb_build_object(
        'full_name',         NEW.full_name,
        'webinar_date',      NEW.webinar_date,
        'webinar_time',      NEW.webinar_time,
        'course_name',       NEW.course_name,
        'partner_code',      NEW.utm_source,
        'profession_choice', NEW.profession_choice,
        'registration_type', NEW.registration_type,
        'attended_at',       NEW.attended_at,
        'join_token',        NEW.join_token,
        'payment_status',    NEW.payment_status
      ),
      FALSE
    )
    ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[lifecycle] qr_landing UPDATE trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lifecycle_qr_landing_update ON qr_landing_registrations;
CREATE TRIGGER trg_lifecycle_qr_landing_update
AFTER UPDATE OF payment_status, attendance_confirmed ON qr_landing_registrations
FOR EACH ROW EXECUTE FUNCTION lifecycle_emit_qr_landing_update();

-- ---------------------------------------------------------------------
-- 1c. webinar_ratings INSERT -> session_rated  (NB: cols are varchar, need TEXT casts)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lifecycle_emit_webinar_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.email IS NULL OR LENGTH(TRIM(NEW.email::TEXT)) = 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO lifecycle_events (
    email, mobile, event_type,
    event_source_table, source_row_id,
    track, metadata, backfilled
  ) VALUES (
    LOWER(NEW.email::TEXT),
    NEW.mobile::TEXT,
    'session_rated'::lifecycle_event_type,
    'webinar_ratings', NEW.id,
    'student',
    jsonb_build_object(
      'full_name',   NEW.full_name::TEXT,
      'rating',      NEW.rating,
      'feedback',    NEW.feedback,
      'course_name', NEW.course_name::TEXT,
      'rated_at',    NEW.rated_at,
      'source',      NEW.source::TEXT
    ),
    FALSE
  )
  ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[lifecycle] webinar_rating trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lifecycle_webinar_rating ON webinar_ratings;
CREATE TRIGGER trg_lifecycle_webinar_rating
AFTER INSERT ON webinar_ratings
FOR EACH ROW EXECUTE FUNCTION lifecycle_emit_webinar_rating();

-- ---------------------------------------------------------------------
-- 1d. quiz_responses INSERT -> quiz_completed  (uses 'name' not 'full_name')
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lifecycle_emit_quiz_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.email IS NULL OR LENGTH(TRIM(NEW.email)) = 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO lifecycle_events (
    email, mobile, event_type,
    event_source_table, source_row_id,
    track, metadata, backfilled
  ) VALUES (
    LOWER(NEW.email),
    NEW.mobile,
    'quiz_completed'::lifecycle_event_type,
    'quiz_responses', NEW.id,
    'student',
    jsonb_build_object(
      'full_name',       NEW.name,
      'age',             NEW.age,
      'occupation',      NEW.occupation,
      'score',           NEW.score,
      'readiness_level', NEW.readiness_level,
      'aispot_id',       NEW.aispot_id
    ),
    FALSE
  )
  ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[lifecycle] quiz_response trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lifecycle_quiz_response ON quiz_responses;
CREATE TRIGGER trg_lifecycle_quiz_response
AFTER INSERT ON quiz_responses
FOR EACH ROW EXECUTE FUNCTION lifecycle_emit_quiz_response();

-- ---------------------------------------------------------------------
-- 1e. community_members INSERT -> community_joined  (mobile col = 'whatsapp', name = 'display_name')
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lifecycle_emit_community_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.email IS NULL OR LENGTH(TRIM(NEW.email)) = 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO lifecycle_events (
    email, mobile, event_type,
    event_source_table, source_row_id,
    track, metadata, backfilled
  ) VALUES (
    LOWER(NEW.email),
    NEW.whatsapp,                       -- column is 'whatsapp', not 'mobile'
    'community_joined'::lifecycle_event_type,
    'community_members', NEW.id,
    'student',
    jsonb_build_object(
      'full_name',  NEW.display_name,   -- column is 'display_name'
      'tier',       NEW.tier,
      'expires_at', NEW.expires_at,
      'reg_id',     NEW.reg_id
    ),
    FALSE
  )
  ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[lifecycle] community_join trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lifecycle_community_join ON community_members;
CREATE TRIGGER trg_lifecycle_community_join
AFTER INSERT ON community_members
FOR EACH ROW EXECUTE FUNCTION lifecycle_emit_community_join();

-- ---------------------------------------------------------------------
-- 1f. library_views INSERT -> library_view  (no mobile, no full_name on this table)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lifecycle_emit_library_view()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.email IS NULL OR LENGTH(TRIM(NEW.email)) = 0 THEN
    RETURN NEW;
  END IF;

  -- Only emit successful views (status='success' or similar) to avoid noise from errors
  IF NEW.status NOT IN ('success', 'served', 'ok') THEN
    RETURN NEW;
  END IF;

  INSERT INTO lifecycle_events (
    email, mobile, event_type,
    event_source_table, source_row_id,
    track, metadata, backfilled
  ) VALUES (
    LOWER(NEW.email),
    NULL,                               -- library_views has no mobile
    'library_view'::lifecycle_event_type,
    'library_views', NEW.id,
    'student',
    jsonb_build_object(
      'library_id',   NEW.library_id,
      'viewed_at',    NEW.viewed_at,
      'bytes_served', NEW.bytes_served
    ),
    FALSE
  )
  ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[lifecycle] library_view trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lifecycle_library_view ON library_views;
CREATE TRIGGER trg_lifecycle_library_view
AFTER INSERT ON library_views
FOR EACH ROW EXECUTE FUNCTION lifecycle_emit_library_view();

-- ---------------------------------------------------------------------
-- 1g. resume_submissions INSERT -> resume_submitted
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lifecycle_emit_resume_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.email IS NULL OR LENGTH(TRIM(NEW.email)) = 0 THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.is_spam, FALSE) = TRUE THEN
    RETURN NEW; -- never enrol spam submissions
  END IF;

  INSERT INTO lifecycle_events (
    email, mobile, event_type,
    event_source_table, source_row_id,
    track, metadata, backfilled
  ) VALUES (
    LOWER(NEW.email),
    NEW.mobile,
    'resume_submitted'::lifecycle_event_type,
    'resume_submissions', NEW.id,
    'student',
    jsonb_build_object(
      'full_name',         NEW.full_name,
      'current_city',      NEW.current_city,
      'industry',          NEW.industry,
      'current_job_role',  NEW.current_job_role,
      'years_experience',  NEW.years_experience,
      'target_job_role',   NEW.target_job_role,
      'audience_segment',  NEW.audience_segment,
      'partner_id',        NEW.partner_id,
      'partner_code',      NEW.utm_source
    ),
    FALSE
  )
  ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[lifecycle] resume_submitted trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lifecycle_resume_submitted ON resume_submissions;
CREATE TRIGGER trg_lifecycle_resume_submitted
AFTER INSERT ON resume_submissions
FOR EACH ROW EXECUTE FUNCTION lifecycle_emit_resume_submitted();

-- ---------------------------------------------------------------------
-- 1h. student_enrolments INSERT -> course_enrolled  (paid + active filter)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lifecycle_emit_course_enrolled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.student_email IS NULL OR LENGTH(TRIM(NEW.student_email)) = 0 THEN
    RETURN NEW;
  END IF;
  -- Only emit for active, paid enrolments (skip drafts / cancelled / unpaid)
  IF COALESCE(NEW.is_active, FALSE) = FALSE OR COALESCE(NEW.amount_paid, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO lifecycle_events (
    email, mobile, event_type,
    event_source_table, source_row_id,
    track, metadata, backfilled
  ) VALUES (
    LOWER(NEW.student_email),
    NEW.student_mobile,
    'course_enrolled'::lifecycle_event_type,
    'student_enrolments', NEW.id,
    'student',
    jsonb_build_object(
      'full_name',       NEW.student_name,
      'course_name',     NEW.course_name,
      'course_id',       NEW.course_id,
      'enrolment_type', NEW.enrolment_type,
      'amount_paid',     NEW.amount_paid,
      'partner_id',      NEW.partner_id,
      'student_reg_id',  NEW.student_reg_id,
      'payment_date',    NEW.payment_date
    ),
    FALSE
  )
  ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[lifecycle] course_enrolled trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lifecycle_course_enrolled ON student_enrolments;
CREATE TRIGGER trg_lifecycle_course_enrolled
AFTER INSERT ON student_enrolments
FOR EACH ROW EXECUTE FUNCTION lifecycle_emit_course_enrolled();

-- =====================================================================
-- 2. AUTO-ENROL TRIGGER ON lifecycle_events
-- =====================================================================
-- Fires after every NEW lifecycle_events INSERT.
-- For each active sequence whose trigger_event matches AND whose
-- trigger_filter is contained in the event's metadata, insert a fresh
-- enrolment unless one already exists active for the (sequence, email).
--
-- Uses ON CONFLICT DO NOTHING as belt-and-braces against any race that
-- slips past the EXISTS check.
-- =====================================================================
CREATE OR REPLACE FUNCTION lifecycle_auto_enrol()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  seq RECORD;
  filter_jsonb JSONB;
BEGIN
  -- Backfilled events never trigger enrolments
  IF COALESCE(NEW.backfilled, FALSE) = TRUE THEN
    RETURN NEW;
  END IF;
  -- Skip if no email (can't deliver anything)
  IF NEW.email IS NULL OR LENGTH(TRIM(NEW.email)) = 0 THEN
    RETURN NEW;
  END IF;
  -- Skip dispatcher-emitted events (email_sent / whatsapp_sent) so we
  -- don't accidentally start meta-sequences when a step sends.
  IF NEW.event_type IN ('email_sent'::lifecycle_event_type, 'whatsapp_sent'::lifecycle_event_type) THEN
    RETURN NEW;
  END IF;

  FOR seq IN
    SELECT id, sequence_key, trigger_filter
    FROM lifecycle_sequences
    WHERE is_active = TRUE
      AND trigger_event = NEW.event_type
  LOOP
    filter_jsonb := COALESCE(seq.trigger_filter, '{}'::jsonb);

    -- Filter check: empty filter matches everything; otherwise metadata must contain it
    IF filter_jsonb <> '{}'::jsonb AND NOT (NEW.metadata @> filter_jsonb) THEN
      CONTINUE;
    END IF;

    -- Skip if active enrolment already exists for this (sequence, email)
    IF EXISTS (
      SELECT 1 FROM lifecycle_sequence_enrolments
      WHERE sequence_id = seq.id
        AND LOWER(email) = LOWER(NEW.email)
        AND status = 'active'
    ) THEN
      CONTINUE;
    END IF;

    -- Skip if email is fully suppressed (any channel)
    IF EXISTS (
      SELECT 1 FROM lifecycle_suppression
      WHERE LOWER(email) = LOWER(NEW.email)
    ) THEN
      CONTINUE;
    END IF;

    BEGIN
      INSERT INTO lifecycle_sequence_enrolments (
        sequence_id, email, mobile, context,
        enrolled_at, current_step_index, status, next_send_at
      ) VALUES (
        seq.id,
        LOWER(NEW.email),
        NEW.mobile,
        NEW.metadata,
        NOW(),
        0,
        'active',
        NOW()
      );
    EXCEPTION WHEN unique_violation THEN
      -- Race lost: another concurrent transaction beat us. Safe to ignore.
      NULL;
    WHEN OTHERS THEN
      RAISE WARNING '[lifecycle] auto_enrol INSERT failed for seq=% email=%: %',
        seq.sequence_key, NEW.email, SQLERRM;
    END;
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[lifecycle] auto_enrol outer error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lifecycle_auto_enrol ON lifecycle_events;
CREATE TRIGGER trg_lifecycle_auto_enrol
AFTER INSERT ON lifecycle_events
FOR EACH ROW EXECUTE FUNCTION lifecycle_auto_enrol();

-- =====================================================================
-- 3. PG_CRON SCHEDULES
-- =====================================================================

-- Drop pre-existing entries with the same name (idempotent re-runs)
DO $$
BEGIN
  PERFORM cron.unschedule(jobname) FROM cron.job
   WHERE jobname IN ('lifecycle-dispatcher-tick', 'lifecycle-stale-cleanup');
END $$;

-- Tick: every 5 minutes, dispatcher processes up to 50 due enrolments
SELECT cron.schedule(
  'lifecycle-dispatcher-tick',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url     := 'https://enszifyeqnwcnxaqrmrq.supabase.co/functions/v1/lifecycle-dispatcher',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := '{"limit":50}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);

-- Stale cleanup: daily at 21:30 UTC = 03:00 IST.
-- Exits enrolments stuck active with no progress for 14+ days.
SELECT cron.schedule(
  'lifecycle-stale-cleanup',
  '30 21 * * *',
  $cron$
  UPDATE lifecycle_sequence_enrolments
  SET status       = 'exited',
      exit_reason  = 'stale_no_progress_14d',
      next_send_at = NULL,
      updated_at   = NOW()
  WHERE status = 'active'
    AND COALESCE(last_attempt_at, enrolled_at) < NOW() - INTERVAL '14 days';
  $cron$
);

-- =====================================================================
-- DONE. Sequences are still inactive.
-- Final activation step (run manually after smoke test):
--   UPDATE lifecycle_sequences SET is_active = TRUE
--   WHERE sequence_key IN ('s1_free_webinar_attendance',
--                          's8_post_paid_masterclass_enrol');
-- =====================================================================
