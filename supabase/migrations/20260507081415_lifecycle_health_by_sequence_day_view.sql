-- ════════════════════════════════════════════════════════════════════════════
-- LIFECYCLE — sequence × day rollup view (Phase D)
-- ════════════════════════════════════════════════════════════════════════════
-- Powers the /admin/lifecycle-status page's mini-timeline table.
-- One row per (sequence_key × day) over the last 30 days, with sent/skipped/failed counts.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.lifecycle_health_by_sequence_day AS
SELECT
  s.sequence_key,
  date_trunc('day', dl.attempted_at AT TIME ZONE 'Asia/Kolkata')::date AS day_ist,
  COUNT(*) FILTER (WHERE dl.status = 'sent')::int    AS sent,
  COUNT(*) FILTER (WHERE dl.status = 'skipped')::int AS skipped,
  COUNT(*) FILTER (WHERE dl.status = 'failed')::int  AS failed,
  COUNT(*)::int                                       AS total
FROM lifecycle_dispatch_log dl
JOIN lifecycle_sequences s ON s.id = dl.sequence_id
WHERE dl.attempted_at > NOW() - INTERVAL '30 days'
GROUP BY s.sequence_key, day_ist
ORDER BY day_ist DESC, s.sequence_key;

COMMENT ON VIEW public.lifecycle_health_by_sequence_day IS
  'Per-day rollup of dispatch_log counts by sequence (IST day boundary). 30-day window. Powers the lifecycle-status admin page mini-timeline.';
