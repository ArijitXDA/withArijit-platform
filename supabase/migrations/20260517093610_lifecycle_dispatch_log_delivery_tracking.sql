-- Delivery-tracking columns on lifecycle_dispatch_log
-- Today's discovery: AiSensy accepts the request and returns a provider_message_id
-- (so our dispatcher logs "sent"), but Meta/WhatsApp can still fail to deliver
-- (e.g. recipient not on WhatsApp). 11/20 messages today were in that bucket
-- with no visibility on our side. These columns + the /aisensy-webhook edge fn
-- close the gap so we know what actually reached the recipient.

ALTER TABLE lifecycle_dispatch_log
  ADD COLUMN IF NOT EXISTS delivery_status text,          -- 'sent' (default) | 'delivered' | 'read' | 'failed'
  ADD COLUMN IF NOT EXISTS delivered_at    timestamptz,
  ADD COLUMN IF NOT EXISTS read_at         timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at       timestamptz,
  ADD COLUMN IF NOT EXISTS failure_reason  text,
  ADD COLUMN IF NOT EXISTS webhook_payload jsonb;          -- raw payload for debugging

CREATE INDEX IF NOT EXISTS idx_dispatch_log_provider_message_id
  ON lifecycle_dispatch_log (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dispatch_log_delivery_status
  ON lifecycle_dispatch_log (delivery_status, attempted_at DESC)
  WHERE delivery_status IS NOT NULL;

-- Anaant view: today's delivery health per template
CREATE OR REPLACE VIEW v_anaant_wa_delivery_health_today AS
SELECT
  template_key,
  COUNT(*) AS total_sent,
  COUNT(*) FILTER (WHERE delivery_status='delivered') AS delivered,
  COUNT(*) FILTER (WHERE delivery_status='read')      AS read,
  COUNT(*) FILTER (WHERE delivery_status='failed')    AS failed,
  COUNT(*) FILTER (WHERE delivery_status IS NULL)     AS unknown_no_webhook,
  ROUND(100.0 * COUNT(*) FILTER (WHERE delivery_status='delivered' OR delivery_status='read')
                / NULLIF(COUNT(*), 0), 1) AS delivery_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE delivery_status='failed')
                / NULLIF(COUNT(*), 0), 1) AS failure_pct
FROM lifecycle_dispatch_log
WHERE channel = 'whatsapp'
  AND attempted_at::date = current_date
  AND status = 'sent'
GROUP BY template_key
ORDER BY total_sent DESC;

COMMENT ON VIEW v_anaant_wa_delivery_health_today IS
  'Per-template WA delivery health for today. unknown_no_webhook >0 means the AiSensy webhook hasn''t been configured yet or hasn''t fired for those messages.';
