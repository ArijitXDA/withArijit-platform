-- ════════════════════════════════════════════════════════════════════════════
-- LIFECYCLE — Phase H.2 (part 1): enum additions for inactivity events
-- ════════════════════════════════════════════════════════════════════════════
-- Applied via Supabase MCP `apply_migration` on 2026-05-08.
-- Two ALTER TYPE statements; must be in their own transaction before the
-- following H.2b migration can use these new enum values.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TYPE lifecycle_event_type ADD VALUE IF NOT EXISTS 'inactive_60d';
ALTER TYPE lifecycle_event_type ADD VALUE IF NOT EXISTS 'inactive_90d';
