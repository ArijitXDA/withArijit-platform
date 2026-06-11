-- Patch the two qr_landing emitter functions to log into lifecycle_trigger_errors
-- so future silent failures get caught within minutes.

CREATE OR REPLACE FUNCTION lifecycle_emit_qr_landing_insert()
RETURNS TRIGGER AS $$
DECLARE
  rtype text := COALESCE(NEW.registration_type, 'webinar');
  ctx   jsonb;
BEGIN
  IF NEW.email IS NULL OR LENGTH(TRIM(NEW.email)) = 0 THEN
    RETURN NEW;
  END IF;

  ctx := jsonb_build_object(
    'full_name', NEW.full_name, 'webinar_date', NEW.webinar_date,
    'webinar_time', NEW.webinar_time, 'course_name', NEW.course_name,
    'course_id', NEW.course_id, 'partner_code', NEW.utm_source,
    'utm_medium', NEW.utm_medium, 'utm_campaign', NEW.utm_campaign,
    'profession_choice', NEW.profession_choice, 'join_token', NEW.join_token,
    'registration_type', rtype, 'payment_status', NEW.payment_status,
    'masterclass_final_price', NEW.masterclass_final_price
  );

  INSERT INTO lifecycle_events (
    email, mobile, event_type, event_source_table, source_row_id,
    track, metadata, backfilled
  ) VALUES (
    LOWER(NEW.email), NEW.mobile, 'webinar_registered'::lifecycle_event_type,
    'qr_landing_registrations', NEW.id, 'student', ctx, FALSE
  )
  ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING;

  IF rtype = 'masterclass' THEN
    INSERT INTO lifecycle_events (
      email, mobile, event_type, event_source_table, source_row_id,
      track, metadata, backfilled
    ) VALUES (
      LOWER(NEW.email), NEW.mobile, 'masterclass_registered'::lifecycle_event_type,
      'qr_landing_registrations', NEW.id, 'student', ctx, FALSE
    )
    ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  PERFORM lifecycle_log_trigger_error(
    'lifecycle_emit_qr_landing_insert',
    'qr_landing_registrations', NEW.id,
    SQLERRM, NULL, NULL,
    jsonb_build_object('email', NEW.email, 'registration_type', NEW.registration_type)
  );
  RAISE WARNING '[lifecycle] qr_landing INSERT trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION lifecycle_emit_qr_landing_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NULL OR LENGTH(TRIM(NEW.email)) = 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.payment_status = 'paid'
     AND (OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
    INSERT INTO lifecycle_events (
      email, mobile, event_type, event_source_table, source_row_id,
      track, metadata, backfilled
    ) VALUES (
      LOWER(NEW.email), NEW.mobile, 'masterclass_paid'::lifecycle_event_type,
      'qr_landing_registrations', NEW.id, 'student',
      jsonb_build_object(
        'full_name', NEW.full_name, 'webinar_date', NEW.webinar_date,
        'webinar_time', NEW.webinar_time, 'course_name', NEW.course_name,
        'partner_code', NEW.utm_source, 'profession_choice', NEW.profession_choice,
        'join_token', NEW.join_token, 'masterclass_final_price', NEW.masterclass_final_price,
        'paid_at', NEW.paid_at, 'razorpay_payment_id', NEW.razorpay_payment_id,
        'registration_type', NEW.registration_type
      ), FALSE
    )
    ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING;
  END IF;

  IF NEW.attendance_confirmed = TRUE
     AND (COALESCE(OLD.attendance_confirmed, FALSE) IS DISTINCT FROM TRUE) THEN
    INSERT INTO lifecycle_events (
      email, mobile, event_type, event_source_table, source_row_id,
      track, metadata, backfilled
    ) VALUES (
      LOWER(NEW.email), NEW.mobile, 'session_attended'::lifecycle_event_type,
      'qr_landing_registrations', NEW.id, 'student',
      jsonb_build_object(
        'full_name', NEW.full_name, 'webinar_date', NEW.webinar_date,
        'webinar_time', NEW.webinar_time, 'course_name', NEW.course_name,
        'partner_code', NEW.utm_source, 'profession_choice', NEW.profession_choice,
        'registration_type', NEW.registration_type, 'attended_at', NEW.attended_at,
        'join_token', NEW.join_token, 'payment_status', NEW.payment_status
      ), FALSE
    )
    ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  PERFORM lifecycle_log_trigger_error(
    'lifecycle_emit_qr_landing_update',
    'qr_landing_registrations', NEW.id,
    SQLERRM, NULL, NULL,
    jsonb_build_object(
      'email', NEW.email,
      'payment_status_change', NEW.payment_status,
      'attendance_change', NEW.attendance_confirmed
    )
  );
  RAISE WARNING '[lifecycle] qr_landing UPDATE trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
