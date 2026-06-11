-- Trigger-emitter idempotency fix (2026-05-17)
--
-- trg_lifecycle_qr_landing_insert + trg_lifecycle_qr_landing_update both used
--   ON CONFLICT (event_source_table, source_row_id, event_type) DO NOTHING
-- but the matching unique index never existed, so EVERY trigger invocation
-- raised "no unique or exclusion constraint" — silently swallowed by their
-- EXCEPTION WHEN OTHERS handler. Result: zero webinar_registered events
-- emitted naturally; lifecycle comms never fired for new registrations.
--
-- This adds the constraint the trigger code already assumed exists.
-- Partial index — only rows that have a source_row_id (most do).
CREATE UNIQUE INDEX IF NOT EXISTS uq_lifecycle_events_source
ON lifecycle_events (event_source_table, source_row_id, event_type)
WHERE source_row_id IS NOT NULL;
