-- Replace partial unique index with a full constraint so ON CONFLICT inference works.
-- PG treats NULL values in unique constraints as distinct, so this is safe for rows
-- without a source_row_id (system events).
DROP INDEX IF EXISTS uq_lifecycle_events_source;
ALTER TABLE lifecycle_events
  ADD CONSTRAINT uq_lifecycle_events_source
  UNIQUE (event_source_table, source_row_id, event_type);
