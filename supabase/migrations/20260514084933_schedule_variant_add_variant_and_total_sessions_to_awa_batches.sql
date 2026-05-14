-- ════════════════════════════════════════════════════════════════════════════
-- SCHEDULE VARIANTS — Phase 1: per-batch duration variant
-- ════════════════════════════════════════════════════════════════════════════
-- Applied via Supabase MCP `apply_migration` on 2026-05-14.
--
-- Each course/track now ships in two delivery shapes. A "batch" already IS a
-- cohort, so the variant is a batch-level attribute — not a course-level one.
--   long26   = 26 sessions x 60 min, one weekly weekend session
--   weekend9 = 9 sessions x 120 min, one weekly weekend session (intensive)
-- awa_batches.duration_mins already varies per batch; this adds the variant tag
-- and the authoritative per-batch session count. awa_courses.total_sessions
-- remains the long-format reference only.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE awa_batches
  ADD COLUMN IF NOT EXISTS variant text NOT NULL DEFAULT 'long26'
       CHECK (variant IN ('long26','weekend9')),
  ADD COLUMN IF NOT EXISTS total_sessions integer NOT NULL DEFAULT 26;

COMMENT ON COLUMN awa_batches.variant IS
  'Delivery shape: long26 = 26x60min weekly; weekend9 = 9x120min weekend-intensive.';
COMMENT ON COLUMN awa_batches.total_sessions IS
  'Authoritative live-session count for this batch (9 for weekend9, 26 for long26). '
  'awa_courses.total_sessions remains the long-format reference only.';
