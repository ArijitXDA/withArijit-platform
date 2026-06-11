-- Paid-masterclass attendees attend the SAME live session as free-webinar attendees,
-- so they need the same live-session reminders (day-before / 1h-before / live-now / post).
--
-- Current behaviour:
--   registration_type=webinar     → emits webinar_registered → s1 reminders ✓
--   registration_type=masterclass → emits masterclass_registered → s2 payment-dropoff only ✗
--
-- New behaviour:
--   registration_type=webinar     → emits webinar_registered only
--   registration_type=masterclass → emits BOTH masterclass_registered AND webinar_registered
--     so the same live-reminder sequence (s1) covers them too.

CREATE OR REPLACE FUNCTION lifecycle_emit_qr_landing_insert()
RETURNS TRIGGER AS $$
DECLARE
  rtype  text := COALESCE(NEW.registration_type, 'webinar');
  ctx    jsonb;
BEGIN
  IF NEW.email IS NULL OR LENGTH(TRIM(NEW.email)) = 0 THEN
    RETURN NEW;
  END IF;

  ctx := jsonb_build_object(
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
    'registration_type',       rtype,
    'payment_status',          NEW.payment_status,
    'masterclass_final_price', NEW.masterclass_final_price
  );

  -- ALWAYS emit webinar_registered — every reg is a live-session attendee,
  -- whether they came via the free webinar funnel or the paid masterclass funnel.
  INSERT INTO lifecycle_events (
    email, mobile, event_type,
    event_source_table, source_row_id,
    track, metadata, backfilled
  ) VALUES (
    LOWER(NEW.email), NEW.mobile,
    'webinar_registered'::lifecycle_event_type,
    'qr_landing_registrations', NEW.id,
    'student', ctx, FALSE
  )
  ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING;

  -- ADDITIONALLY for paid masterclass: emit masterclass_registered so the
  -- payment-dropoff sequence (s2) also kicks in.
  IF rtype = 'masterclass' THEN
    INSERT INTO lifecycle_events (
      email, mobile, event_type,
      event_source_table, source_row_id,
      track, metadata, backfilled
    ) VALUES (
      LOWER(NEW.email), NEW.mobile,
      'masterclass_registered'::lifecycle_event_type,
      'qr_landing_registrations', NEW.id,
      'student', ctx, FALSE
    )
    ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Keep registration alive even if event emission fails (so checkout never breaks),
  -- but loud-warn so it shows up in Postgres logs / Anaant health checks.
  RAISE WARNING '[lifecycle] qr_landing INSERT trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
