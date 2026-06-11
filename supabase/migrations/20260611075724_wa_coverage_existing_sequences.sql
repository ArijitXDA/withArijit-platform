-- A. Enrich community_join emit with webinar_register_url (for E1 WA, future enrollees)
CREATE OR REPLACE FUNCTION public.lifecycle_emit_community_join()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  IF NEW.email IS NULL OR LENGTH(TRIM(NEW.email)) = 0 THEN
    RETURN NEW;
  END IF;
  INSERT INTO lifecycle_events (email, mobile, event_type, event_source_table, source_row_id, track, metadata, backfilled)
  VALUES (
    LOWER(NEW.email), NEW.whatsapp, 'community_joined'::lifecycle_event_type, 'community_members', NEW.id, 'student',
    jsonb_build_object(
      'full_name', NEW.display_name,
      'first_name', SPLIT_PART(COALESCE(NEW.display_name,''),' ',1),
      'tier', NEW.tier,
      'enrolment_id', NEW.enrolment_id,
      'webinar_register_url', 'https://webinar.ostaran.com/?utm_source=community'
    ), FALSE
  )
  ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  PERFORM lifecycle_log_trigger_error('lifecycle_emit_community_join', 'community_members', NEW.id, SQLERRM, NULL, NULL, jsonb_build_object('email', NEW.email));
  RAISE WARNING '[lifecycle] community_join trigger error: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- B. Enrich completions tick with referral_url (for S9 WA, future enrollees). Preserves the robustified WHERE.
CREATE OR REPLACE FUNCTION lifecycle_emit_course_completions_tick()
RETURNS jsonb LANGUAGE plpgsql AS $fn$
DECLARE v_inserted int := 0;
BEGIN
  WITH newly_completed AS (
    INSERT INTO lifecycle_events (email, mobile, event_type, event_source_table, source_row_id, track, metadata, occurred_at, backfilled)
    SELECT LOWER(e.student_email), e.student_mobile, 'course_completed'::lifecycle_event_type, 'student_enrolments', e.id, 'student',
      jsonb_build_object(
        'full_name', e.student_name, 'course_name', e.course_name, 'course_id', e.course_id,
        'enrolment_type', e.enrolment_type, 'access_end_date', e.access_end_date, 'amount_paid', e.amount_paid,
        'completion_source', CASE WHEN e.enrolment_status='completed' THEN 'status_completed' ELSE 'cron_access_end_date_passed' END,
        'referral_url', 'https://webinar.ostaran.com/?utm_source=alumni_referral'
      ),
      COALESCE(e.access_end_date::timestamp, NOW())::timestamptz, FALSE
    FROM student_enrolments e
    WHERE e.amount_paid > 0
      AND COALESCE(TRIM(e.student_email),'') <> ''
      AND ((e.is_active = TRUE AND e.access_end_date IS NOT NULL AND e.access_end_date < CURRENT_DATE) OR e.enrolment_status = 'completed')
      AND NOT EXISTS (SELECT 1 FROM lifecycle_events le WHERE le.event_source_table='student_enrolments' AND le.source_row_id=e.id AND le.event_type='course_completed')
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
$fn$;

-- C. Repoint S4 WA to the always-resolved enrol_url (no dashboard_url dependency)
UPDATE lifecycle_templates
  SET aisensy_param_order = ARRAY['first_name','enrol_url'],
      variables_declared = '{"first_name":"string","enrol_url":"string"}'::jsonb
  WHERE template_key='wa_s4_welcome_wa_v1';

-- D. Backfill the 1 existing active S9 enrollee with referral_url so the appended WA won't exit them
UPDATE lifecycle_sequence_enrolments en
SET context = en.context || jsonb_build_object('referral_url','https://webinar.ostaran.com/?utm_source=alumni_referral')
FROM lifecycle_sequences s
WHERE s.id=en.sequence_id AND s.sequence_key='s9_alumni_referral' AND en.status='active' AND NOT (en.context ? 'referral_url');

-- E. Append WA steps at end of E1 (day4), E2 (day8), S9 (day29)
INSERT INTO lifecycle_sequence_steps (sequence_id, step_index, delay_hours, channel, template_key, send_window_start, send_window_end)
SELECT s.id, 3, 96, 'whatsapp'::lifecycle_channel, 'wa_e1_welcome_wa_v1', '09:00'::time,'21:00'::time FROM lifecycle_sequences s WHERE s.sequence_key='e1_community_welcome';
INSERT INTO lifecycle_sequence_steps (sequence_id, step_index, delay_hours, channel, template_key, send_window_start, send_window_end)
SELECT s.id, 3, 192, 'whatsapp'::lifecycle_channel, 'wa_e2_library_wa_v1', '09:00'::time,'21:00'::time FROM lifecycle_sequences s WHERE s.sequence_key='e2_library_nurture';
INSERT INTO lifecycle_sequence_steps (sequence_id, step_index, delay_hours, channel, template_key, send_window_start, send_window_end)
SELECT s.id, 3, 696, 'whatsapp'::lifecycle_channel, 'wa_s9_referral_wa_v1', '09:00'::time,'21:00'::time FROM lifecycle_sequences s WHERE s.sequence_key='s9_alumni_referral';

-- F. S4: insert WA welcome EARLY at step 1 (offset-renumber; the 1 enrollee sits at step 0, unaffected)
UPDATE lifecycle_sequence_steps SET step_index = step_index + 100
  WHERE sequence_id=(SELECT id FROM lifecycle_sequences WHERE sequence_key='s4_welcome_to_programme') AND step_index >= 1;
INSERT INTO lifecycle_sequence_steps (sequence_id, step_index, delay_hours, channel, template_key, send_window_start, send_window_end)
SELECT id, 1, 2, 'whatsapp'::lifecycle_channel, 'wa_s4_welcome_wa_v1', '09:00'::time,'21:00'::time FROM lifecycle_sequences WHERE sequence_key='s4_welcome_to_programme';
UPDATE lifecycle_sequence_steps SET step_index = step_index - 99
  WHERE sequence_id=(SELECT id FROM lifecycle_sequences WHERE sequence_key='s4_welcome_to_programme') AND step_index >= 101;
