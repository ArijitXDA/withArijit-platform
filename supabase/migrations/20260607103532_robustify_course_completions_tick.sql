-- Make the completion emit catch BOTH signals (access window ended OR
-- enrolment_status='completed') so no completer leaks regardless of how
-- completion was recorded. Adds a per-run rate cap + occurred_at null-guard.
-- Behaviour-preserving for the existing access-window path.
-- NOTE: superseded on 2026-06-11 by wa_coverage_existing_sequences, which adds
-- referral_url to the emit metadata. Kept as-applied for the migration record.
CREATE OR REPLACE FUNCTION public.lifecycle_emit_course_completions_tick()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_inserted int := 0;
BEGIN
  WITH newly_completed AS (
    INSERT INTO lifecycle_events (email, mobile, event_type, event_source_table, source_row_id, track, metadata, occurred_at, backfilled)
    SELECT LOWER(e.student_email), e.student_mobile, 'course_completed'::lifecycle_event_type,
      'student_enrolments', e.id, 'student',
      jsonb_build_object(
        'full_name', e.student_name, 'course_name', e.course_name, 'course_id', e.course_id,
        'enrolment_type', e.enrolment_type, 'access_end_date', e.access_end_date, 'amount_paid', e.amount_paid,
        'completion_source', CASE WHEN e.enrolment_status='completed' THEN 'status_completed' ELSE 'cron_access_end_date_passed' END
      ),
      COALESCE(e.access_end_date::timestamp, NOW())::timestamptz,
      FALSE
    FROM student_enrolments e
    WHERE e.amount_paid > 0
      AND COALESCE(TRIM(e.student_email),'') <> ''
      AND (
            (e.is_active = TRUE AND e.access_end_date IS NOT NULL AND e.access_end_date < CURRENT_DATE)
            OR e.enrolment_status = 'completed'
          )
      AND NOT EXISTS (
        SELECT 1 FROM lifecycle_events le
        WHERE le.event_source_table='student_enrolments' AND le.source_row_id=e.id AND le.event_type='course_completed'
      )
    LIMIT 100
    ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted FROM newly_completed;
  RETURN jsonb_build_object('tick_at', NOW(), 'newly_completed', v_inserted);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[lifecycle_emit_course_completions_tick] %', SQLERRM;
  RETURN jsonb_build_object('error', SQLERRM, 'tick_at', NOW());
END;
$function$;
