-- ─────────────────────────────────────────────────────────────────────────
-- lifecycle_trigger_errors  + Anaant view
-- ─────────────────────────────────────────────────────────────────────────
-- All lifecycle emitter functions currently have EXCEPTION WHEN OTHERS clauses
-- that swallow errors to RAISE WARNING — which is invisible to anything
-- outside Postgres logs. This is exactly how today's 24-day silent failure
-- went undetected. We now log every caught exception into a table so the
-- next regression is detectable in <5 min via Anaant.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lifecycle_trigger_errors (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at         timestamptz NOT NULL DEFAULT now(),
  function_name       text NOT NULL,
  source_table        text,
  source_row_id       uuid,
  error_message       text NOT NULL,
  error_detail        text,
  hint                text,
  context             jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_trigger_errors_occurred
  ON lifecycle_trigger_errors (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_lifecycle_trigger_errors_function
  ON lifecycle_trigger_errors (function_name, occurred_at DESC);

-- Helper: any emitter function can call this from its EXCEPTION block.
-- Wrapped in its own BEGIN/EXCEPTION so even logging failure can't crash a write.
CREATE OR REPLACE FUNCTION lifecycle_log_trigger_error(
  p_function_name text,
  p_source_table  text,
  p_source_row_id uuid,
  p_error_message text,
  p_error_detail  text DEFAULT NULL,
  p_hint          text DEFAULT NULL,
  p_context       jsonb DEFAULT '{}'::jsonb
) RETURNS void AS $$
BEGIN
  INSERT INTO lifecycle_trigger_errors (
    function_name, source_table, source_row_id, error_message, error_detail, hint, context
  ) VALUES (
    p_function_name, p_source_table, p_source_row_id, p_error_message, p_error_detail, p_hint, p_context
  );
EXCEPTION WHEN OTHERS THEN
  -- If even logging fails, fall back to RAISE WARNING so it's at least in Postgres logs.
  RAISE WARNING '[lifecycle_log_trigger_error] failed to log: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ─── Anaant view: trigger errors in the last 24 hours
CREATE OR REPLACE VIEW v_anaant_lifecycle_trigger_errors_24h AS
SELECT
  function_name,
  COUNT(*)                                AS errors_24h,
  MIN(occurred_at)                        AS first_at,
  MAX(occurred_at)                        AS last_at,
  -- Top error message (most common)
  (array_agg(error_message ORDER BY occurred_at DESC))[1] AS sample_message
FROM lifecycle_trigger_errors
WHERE occurred_at > now() - interval '24 hours'
GROUP BY function_name
ORDER BY errors_24h DESC;

COMMENT ON VIEW v_anaant_lifecycle_trigger_errors_24h IS
  'Anaant agent reads this to surface silent trigger failures. Empty result = healthy.';
