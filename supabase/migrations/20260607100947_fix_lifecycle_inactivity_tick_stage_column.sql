-- Fix: function referenced cp.stage (nonexistent) → errored every run, so
-- inactive_60d/inactive_90d events (which trigger e6/x1 cold-lead re-engagement)
-- were never emitted. Correct column is stage_reached. Also add a per-run rate
-- cap (oldest-first) so a sudden working state can't blast the whole backlog.
CREATE OR REPLACE FUNCTION public.lifecycle_emit_inactivity_tick()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_inactive_60_inserted int := 0;
  v_inactive_90_inserted int := 0;
BEGIN
  -- 60-day inactive (warm-but-cooling) → e6_cold_lead_rewarm
  WITH recently_inactive AS (
    INSERT INTO lifecycle_events (email, mobile, event_type, event_source_table, source_row_id, track, metadata, occurred_at, backfilled)
    SELECT cp.email, cp.mobile, 'inactive_60d'::lifecycle_event_type, 'cron_inactivity', gen_random_uuid(), 'student',
      jsonb_build_object('full_name', cp.name, 'last_event_at', cp.last_event_at, 'last_event_type', cp.last_event_type, 'lead_score', cp.lead_score, 'stage', cp.stage_reached, 'days_since_active', EXTRACT(DAY FROM NOW() - cp.last_event_at)::int),
      NOW(), FALSE
    FROM lifecycle_contact_profile cp
    WHERE cp.last_event_at IS NOT NULL
      AND cp.last_event_at < NOW() - INTERVAL '60 days'
      AND cp.last_event_at >= NOW() - INTERVAL '90 days'
      AND cp.lead_score >= 30
      AND cp.is_suppressed = FALSE
      AND NOT EXISTS (SELECT 1 FROM lifecycle_events le WHERE le.email = cp.email AND le.event_type = 'inactive_60d' AND le.occurred_at > NOW() - INTERVAL '180 days')
    ORDER BY cp.last_event_at ASC
    LIMIT 100
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inactive_60_inserted FROM recently_inactive;

  -- 90-day inactive (effectively-lost; aggressive last-call) → x1_cold_reengagement
  WITH lost_contacts AS (
    INSERT INTO lifecycle_events (email, mobile, event_type, event_source_table, source_row_id, track, metadata, occurred_at, backfilled)
    SELECT cp.email, cp.mobile, 'inactive_90d'::lifecycle_event_type, 'cron_inactivity', gen_random_uuid(), 'student',
      jsonb_build_object('full_name', cp.name, 'last_event_at', cp.last_event_at, 'last_event_type', cp.last_event_type, 'lead_score', cp.lead_score, 'stage', cp.stage_reached, 'days_since_active', EXTRACT(DAY FROM NOW() - cp.last_event_at)::int),
      NOW(), FALSE
    FROM lifecycle_contact_profile cp
    WHERE cp.last_event_at IS NOT NULL
      AND cp.last_event_at < NOW() - INTERVAL '90 days'
      AND cp.is_suppressed = FALSE
      AND NOT EXISTS (SELECT 1 FROM lifecycle_events le WHERE le.email = cp.email AND le.event_type = 'inactive_90d' AND le.occurred_at > NOW() - INTERVAL '180 days')
    ORDER BY cp.last_event_at ASC
    LIMIT 100
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inactive_90_inserted FROM lost_contacts;

  RETURN jsonb_build_object('tick_at', NOW(), 'inactive_60d_emitted', v_inactive_60_inserted, 'inactive_90d_emitted', v_inactive_90_inserted);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[lifecycle_emit_inactivity_tick] %', SQLERRM;
  RETURN jsonb_build_object('error', SQLERRM, 'tick_at', NOW());
END;
$function$;
