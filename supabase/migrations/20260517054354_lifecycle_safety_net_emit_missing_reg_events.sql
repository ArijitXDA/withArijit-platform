-- Safety net: every 5 min, scan recent qr_landing_registrations and emit any
-- missing webinar_registered / masterclass_registered events. Belt + suspenders
-- in case the INSERT trigger ever regresses (as it did today, silently, for weeks).
--
-- Only scans last 48h of regs to keep it cheap. Backfilled=FALSE so the
-- auto_enrol trigger fires the lifecycle sequences for any missed reg.

CREATE OR REPLACE FUNCTION lifecycle_safety_net_emit_reg_events()
RETURNS TABLE (emitted_count integer) AS $$
DECLARE
  n_webinar    integer := 0;
  n_masterclass integer := 0;
BEGIN
  -- webinar_registered for any recent reg missing one
  WITH ins AS (
    INSERT INTO lifecycle_events (
      email, mobile, event_type, event_source_table, source_row_id,
      track, metadata, backfilled
    )
    SELECT
      LOWER(r.email), r.mobile,
      'webinar_registered'::lifecycle_event_type,
      'qr_landing_registrations', r.id, 'student',
      jsonb_build_object(
        'full_name', r.full_name, 'webinar_date', r.webinar_date,
        'webinar_time', r.webinar_time, 'course_name', r.course_name,
        'course_id', r.course_id, 'partner_code', r.utm_source,
        'utm_medium', r.utm_medium, 'utm_campaign', r.utm_campaign,
        'profession_choice', r.profession_choice, 'join_token', r.join_token,
        'registration_type', COALESCE(r.registration_type, 'webinar'),
        'safety_net_recovered', TRUE
      ),
      FALSE
    FROM qr_landing_registrations r
    WHERE r.created_at > now() - interval '48 hours'
      AND r.email IS NOT NULL AND LENGTH(TRIM(r.email)) > 0
      AND NOT EXISTS (
        SELECT 1 FROM lifecycle_events e
        WHERE e.event_source_table='qr_landing_registrations'
          AND e.source_row_id = r.id
          AND e.event_type='webinar_registered'
      )
    ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO n_webinar FROM ins;

  -- masterclass_registered for any recent masterclass reg missing one
  WITH ins AS (
    INSERT INTO lifecycle_events (
      email, mobile, event_type, event_source_table, source_row_id,
      track, metadata, backfilled
    )
    SELECT
      LOWER(r.email), r.mobile,
      'masterclass_registered'::lifecycle_event_type,
      'qr_landing_registrations', r.id, 'student',
      jsonb_build_object(
        'full_name', r.full_name, 'webinar_date', r.webinar_date,
        'webinar_time', r.webinar_time, 'course_name', r.course_name,
        'course_id', r.course_id, 'partner_code', r.utm_source,
        'profession_choice', r.profession_choice, 'join_token', r.join_token,
        'registration_type', 'masterclass', 'payment_status', r.payment_status,
        'masterclass_final_price', r.masterclass_final_price,
        'safety_net_recovered', TRUE
      ),
      FALSE
    FROM qr_landing_registrations r
    WHERE r.created_at > now() - interval '48 hours'
      AND r.registration_type = 'masterclass'
      AND r.email IS NOT NULL AND LENGTH(TRIM(r.email)) > 0
      AND NOT EXISTS (
        SELECT 1 FROM lifecycle_events e
        WHERE e.event_source_table='qr_landing_registrations'
          AND e.source_row_id = r.id
          AND e.event_type='masterclass_registered'
      )
    ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO n_masterclass FROM ins;

  IF (n_webinar + n_masterclass) > 0 THEN
    RAISE WARNING '[lifecycle-safety-net] Recovered missing events: webinar=%, masterclass=%',
      n_webinar, n_masterclass;
  END IF;

  RETURN QUERY SELECT (n_webinar + n_masterclass);
END;
$$ LANGUAGE plpgsql;

-- Schedule it every 5 minutes (same cadence as the dispatcher).
SELECT cron.schedule(
  'lifecycle-safety-net-emit-reg-events',
  '*/5 * * * *',
  $cron$ SELECT lifecycle_safety_net_emit_reg_events(); $cron$
);
