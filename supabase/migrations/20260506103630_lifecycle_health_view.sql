-- ════════════════════════════════════════════════════════════════════════════
-- LIFECYCLE HEALTH — observability views for the comms engine (roadmap-B)
-- ════════════════════════════════════════════════════════════════════════════
-- Two views:
--   lifecycle_health              — single-row snapshot of operational metrics
--   lifecycle_health_skip_reasons — multi-row breakdown of dispatch_log skips
--
-- Both are SECURITY INVOKER (default), so the caller's RLS applies.
-- Service-role callers see everything. Admin-readable RLS on the underlying
-- lifecycle_* tables already exists (per Phase 1 §3.4) and views inherit that.
--
-- Pure-read, recomputed at query time. Cheap on current data volumes; swap to
-- materialised views if scan times ever exceed ~50ms.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.lifecycle_health AS
SELECT
  -- Sequences
  (SELECT COUNT(*)::int FROM lifecycle_sequences)                                AS sequences_total,
  (SELECT COUNT(*)::int FROM lifecycle_sequences WHERE is_active)                AS sequences_active,

  -- Enrolments by status
  (SELECT COUNT(*)::int FROM lifecycle_sequence_enrolments)                                  AS enrolments_total,
  (SELECT COUNT(*)::int FROM lifecycle_sequence_enrolments WHERE status='active')            AS enrolments_active,
  (SELECT COUNT(*)::int FROM lifecycle_sequence_enrolments WHERE status='paused')            AS enrolments_paused,
  (SELECT COUNT(*)::int FROM lifecycle_sequence_enrolments WHERE status='exited')            AS enrolments_exited,
  (SELECT COUNT(*)::int FROM lifecycle_sequence_enrolments WHERE status='completed')         AS enrolments_completed,
  (SELECT COUNT(*)::int FROM lifecycle_sequence_enrolments WHERE status='failed')            AS enrolments_failed,

  -- Dispatch log — last 24h
  (SELECT COUNT(*)::int FROM lifecycle_dispatch_log WHERE attempted_at > NOW() - INTERVAL '24 hours' AND status='sent')    AS dispatch_24h_sent,
  (SELECT COUNT(*)::int FROM lifecycle_dispatch_log WHERE attempted_at > NOW() - INTERVAL '24 hours' AND status='skipped') AS dispatch_24h_skipped,
  (SELECT COUNT(*)::int FROM lifecycle_dispatch_log WHERE attempted_at > NOW() - INTERVAL '24 hours' AND status='failed')  AS dispatch_24h_failed,

  -- Dispatch log — last 7 days
  (SELECT COUNT(*)::int FROM lifecycle_dispatch_log WHERE attempted_at > NOW() - INTERVAL '7 days' AND status='sent')    AS dispatch_7d_sent,
  (SELECT COUNT(*)::int FROM lifecycle_dispatch_log WHERE attempted_at > NOW() - INTERVAL '7 days' AND status='skipped') AS dispatch_7d_skipped,
  (SELECT COUNT(*)::int FROM lifecycle_dispatch_log WHERE attempted_at > NOW() - INTERVAL '7 days' AND status='failed')  AS dispatch_7d_failed,

  -- Suppression
  (SELECT COUNT(*)::int FROM lifecycle_suppression)                                                          AS suppression_total,
  (SELECT COUNT(*)::int FROM lifecycle_suppression WHERE 'email'::lifecycle_channel    = ANY(channels))      AS suppression_email,
  (SELECT COUNT(*)::int FROM lifecycle_suppression WHERE 'whatsapp'::lifecycle_channel = ANY(channels))      AS suppression_whatsapp,

  -- Recent activity
  (SELECT MAX(attempted_at) FROM lifecycle_dispatch_log)                                            AS last_dispatch_attempt_at,
  (SELECT MAX(occurred_at)  FROM lifecycle_events WHERE NOT backfilled)                             AS last_organic_event_at,
  (SELECT COUNT(*)::int     FROM lifecycle_events WHERE NOT backfilled
     AND occurred_at > NOW() - INTERVAL '24 hours')                                                 AS organic_events_24h,
  (SELECT COUNT(*)::int     FROM lifecycle_events WHERE NOT backfilled
     AND occurred_at > NOW() - INTERVAL '7 days')                                                   AS organic_events_7d,

  -- Cron
  (SELECT COUNT(*)::int FROM cron.job WHERE jobname LIKE 'lifecycle-%' AND active)                  AS cron_jobs_active,

  -- Snapshot timestamp
  NOW() AS as_of;

COMMENT ON VIEW public.lifecycle_health IS
  'Single-row operational snapshot of the lifecycle comms engine — sequences, enrolments by status, dispatch counts (24h/7d), suppression totals, recent activity, cron state. Recomputed at query time.';

-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.lifecycle_health_skip_reasons AS
SELECT
  COALESCE(skip_reason, '(no_reason)') AS skip_reason,
  COUNT(*)::int                        AS occurrences_7d,
  MAX(attempted_at)                    AS most_recent_at
FROM lifecycle_dispatch_log
WHERE status = 'skipped'
  AND attempted_at > NOW() - INTERVAL '7 days'
GROUP BY skip_reason
ORDER BY occurrences_7d DESC, most_recent_at DESC;

COMMENT ON VIEW public.lifecycle_health_skip_reasons IS
  'Top skip reasons over the past 7 days. Useful for spotting expected `template_inactive_aisensy_pending` vs data-quality `missing_critical_vars:*` growth.';
