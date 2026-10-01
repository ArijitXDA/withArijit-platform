-- =====================================================================================
-- 20260930130000_comms_hardening_applied.sql
--
-- RECORD of auto-comms hardening applied to production by hand (execute_sql) on
-- 2026-09-30 / 2026-10-01, written down here so a branch / `supabase db reset` / disaster
-- rebuild reproduces production. Every statement is IDEMPOTENT (CREATE OR REPLACE, guarded
-- UPDATEs, DISABLE TRIGGER). cron.job schedule changes cannot be migrated and are listed in
-- the comment block at the bottom.
--
-- Source of the audit + rationale: memory/reference_comms_rework_audit_2026_09_30.md
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Membership pause tick on the IST calendar (so cron job 30 can run in the morning
--    without pausing paying members earlier than before: pause lands on IST day E+4,
--    09:45 IST instead of 04:15 IST — never earlier).
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.membership_pause_lapsed_tick()
 RETURNS void
 LANGUAGE sql
AS $function$
  update student_enrolments se
     set enrolment_status = 'paused', is_active = false, updated_at = now()
    from awa_courses c
   where se.course_id = c.id
     and c.tenure_type = 'monthly'
     and se.enrolment_status = 'active'
     and (se.access_end_date is null
          or se.access_end_date < ((now() at time zone 'Asia/Kolkata')::date - 3))
     and not exists (
       select 1 from student_enrolments se2
        where se2.student_email = se.student_email
          and se2.course_id     = se.course_id
          and se2.access_end_date >= (now() at time zone 'Asia/Kolkata')::date
     );
$function$;

-- -------------------------------------------------------------------------------------
-- 2. No-show tick: IST-correct (webinar_date/time are IST wall-clock; DB TimeZone is UTC) and a
--    24-168h lookback so a few missed nightly runs no longer lose a whole cohort. Idempotent via
--    its NOT EXISTS guards (a registration is never emitted twice). Locked to service_role: the
--    function is SECURITY DEFINER and was executable by the public anon key.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lifecycle_emit_free_webinar_noshow_tick()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_inserted int := 0;
BEGIN
  WITH no_shows AS (
    INSERT INTO lifecycle_events (
      email, mobile, event_type,
      event_source_table, source_row_id,
      track, metadata, occurred_at, backfilled
    )
    SELECT
      LOWER(TRIM(qr.email)),
      qr.mobile,
      'session_no_show'::lifecycle_event_type,
      'qr_landing_registrations',
      qr.id,
      'student',
      jsonb_build_object(
        'first_name',           SPLIT_PART(COALESCE(qr.full_name, ''), ' ', 1),
        'full_name',            qr.full_name,
        'registration_type',    qr.registration_type,
        'webinar_date',         qr.webinar_date,
        'webinar_time',         qr.webinar_time,
        'utm_source',           qr.utm_source,
        'utm_campaign',         qr.utm_campaign,
        'registered_at',        qr.registered_at,
        'hours_since_webinar',  EXTRACT(EPOCH FROM (NOW() - ((qr.webinar_date + COALESCE(qr.webinar_time, '00:00'::time)) AT TIME ZONE 'Asia/Kolkata')))::int / 3600
      ),
      NOW(),
      FALSE
    FROM qr_landing_registrations qr
    WHERE qr.registration_type = 'webinar'
      AND qr.email IS NOT NULL
      AND TRIM(qr.email) <> ''
      AND qr.webinar_date IS NOT NULL
      AND ((qr.webinar_date + COALESCE(qr.webinar_time, '00:00'::time)) AT TIME ZONE 'Asia/Kolkata')
            BETWEEN NOW() - INTERVAL '168 hours' AND NOW() - INTERVAL '24 hours'
      AND COALESCE(qr.attendance_confirmed, FALSE) = FALSE
      AND qr.attended_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM lifecycle_events le
        WHERE le.event_source_table = 'qr_landing_registrations'
          AND le.source_row_id = qr.id
          AND le.event_type = 'session_no_show'
      )
      AND NOT EXISTS (
        SELECT 1 FROM lifecycle_events le
        WHERE le.event_source_table = 'qr_landing_registrations'
          AND le.source_row_id = qr.id
          AND le.event_type = 'session_attended'
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted FROM no_shows;

  RETURN jsonb_build_object(
    'tick_at',  NOW(),
    'no_shows_emitted', v_inserted
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[lifecycle_emit_free_webinar_noshow_tick] %', SQLERRM;
  RETURN jsonb_build_object('error', SQLERRM, 'tick_at', NOW());
END;
$function$;

REVOKE ALL ON FUNCTION public.lifecycle_emit_free_webinar_noshow_tick() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lifecycle_emit_free_webinar_noshow_tick() TO service_role;

-- -------------------------------------------------------------------------------------
-- 3. Skip-elapsed trigger: s6 / s6b added to the exemption list (their step 0 is now anchored to the
--    webinar start, so a late or stale-dated attendance must still play the whole drip from step 0).
--    s1 behaviour is unchanged (the IN list is keyed by sequence id).
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lifecycle_skip_elapsed_anchored_steps()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_grace   constant interval := interval '20 minutes';
  v_step    record;
  v_anchor  timestamptz;
  v_first   int := null;
  v_next    timestamptz := null;
  v_wd      text := new.context->>'webinar_date';
  v_wt      text := new.context->>'webinar_time';
begin
  if new.status <> 'active' then return new; end if;

  -- No-show recovery sequences are triggered 24-72h AFTER the webinar, so their
  -- webinar+24h "we missed you" steps are always elapsed at enrolment; fast-forwarding
  -- would delete that entire touch (only ~1% of no-shows ever got it). Let them play
  -- from step 0 -- past anchors are clamped to now() downstream, so they send at once.
  -- (exemption added 2026-09-25)
  -- 2026-09-30: s6 / s6b added. Their step 0 is now anchored to webinar start + offset (so the
  -- pitch / rating ask land AFTER the session); a late or stale-dated attendance event must still
  -- play the whole drip from step 0 (clamped to now, inside the send window), never be completed.
  if new.sequence_id in (
       '0ef770e4-36fe-45c1-922b-d2e90bfa0388',  -- s7_free_webinar_noshow_recovery
       'f6de1b26-2d42-4ca1-b40f-ca5116f969f2',  -- s3_paidmc_noshow_reengage
       '12a2731e-2fae-4868-9638-e32d648897a7',  -- s6_post_free_webinar_upsell
       'f3bfbcba-1ac2-4c3c-88e6-b320974e6f18'   -- s6b_webinar_rate_for_cert
     ) then
    return new;
  end if;

  if v_wd is null or v_wt is null then return new; end if;
  if v_wd !~ '^\d{4}-\d{2}-\d{2}$' or v_wt !~ '^\d{1,2}:\d{2}' then return new; end if;

  for v_step in
    select step_index, anchor_offset_hours
    from lifecycle_sequence_steps
    where sequence_id = new.sequence_id and absolute_anchor = 'webinar_date'
    order by step_index
  loop
    v_anchor := ((v_wd || ' ' || v_wt)::timestamp at time zone 'Asia/Kolkata')
                + (coalesce(v_step.anchor_offset_hours, 0) * interval '1 hour');
    -- First step still worth sending: its moment is in the future, or only just passed.
    if v_anchor >= now() - v_grace then
      v_first := v_step.step_index;
      v_next  := greatest(v_anchor, now());
      exit;
    end if;
  end loop;

  -- No anchored steps at all: leave the enrolment exactly as it was.
  if not exists (select 1 from lifecycle_sequence_steps
                 where sequence_id = new.sequence_id and absolute_anchor = 'webinar_date') then
    return new;
  end if;

  if v_first is null then
    -- Every reminder for this session is in the past. Enrolling would only produce stale messages.
    new.status      := 'completed';
    new.exit_reason := 'all_anchored_steps_elapsed';
    new.next_send_at := null;
  elsif v_first > coalesce(new.current_step_index, 0) then
    new.current_step_index := v_first;
    new.next_send_at       := v_next;
  end if;

  return new;
end $function$;

-- -------------------------------------------------------------------------------------
-- 4. Post-webinar messages no longer fire DURING the live session: s6 pitch email = webinar start + 2h,
--    s6b rating WhatsApp = webinar start + 3h (conditional: only while step 0 is still unanchored).
-- -------------------------------------------------------------------------------------
UPDATE lifecycle_sequence_steps st
   SET absolute_anchor = 'webinar_date', anchor_offset_hours = 2
  FROM lifecycle_sequences s
 WHERE s.id = st.sequence_id AND s.sequence_key = 's6_post_free_webinar_upsell'
   AND st.step_index = 0 AND st.absolute_anchor IS NULL;

UPDATE lifecycle_sequence_steps st
   SET absolute_anchor = 'webinar_date', anchor_offset_hours = 3
  FROM lifecycle_sequences s
 WHERE s.id = st.sequence_id AND s.sequence_key = 's6b_webinar_rate_for_cert'
   AND st.step_index = 0 AND st.absolute_anchor IS NULL;

-- -------------------------------------------------------------------------------------
-- 5. Duplicate registration-confirmation WhatsApp: the older second AFTER INSERT trigger is disabled
--    (on_new_registration_send_wa -> send-webinar-automations MODE 1 remains the single path).
-- -------------------------------------------------------------------------------------
ALTER TABLE public.qr_landing_registrations DISABLE TRIGGER wa_registration_confirmation_trigger;

-- =====================================================================================
-- NOT in this file (cron.job state, applied with cron.alter_job; re-apply by hand if rebuilding):
--   job 23 lifecycle-stale-cleanup   command -> exits only OVERDUE enrolments (exit_reason 'stale_overdue_14d'):
--        UPDATE lifecycle_sequence_enrolments SET status='exited', exit_reason='stale_overdue_14d', next_send_at=NULL, updated_at=NOW()
--         WHERE status='active' AND ((next_send_at IS NOT NULL AND next_send_at < NOW() - INTERVAL '14 days')
--            OR (next_send_at IS NULL AND COALESCE(last_attempt_at, enrolled_at) < NOW() - INTERVAL '14 days'));
--   schedules (UTC): 15 '0 4 * * 1' | 16 '30 7 1 * *' | 57 '0 5 * * 1' | 24 '20 6 * * *' | 25 '35 6 * * *' | 28 '45 3 * * *'
--                    | 30 '15 4 * * *' | 23 '40 3 * * *' | 26 '0 9 * * *' | 45 '30 9 * * *'
--   job 54 (p13 monthly tip) held: active=false, re-enabled by one-off job 'p13-hold-release' (0 4 2 10 *).
-- =====================================================================================
