-- Audit log for operator-triggered manual re-sends of lifecycle templates
-- (Part C). The autopilot's per-step idempotency is untouched; this is a
-- separate, deliberate operator path that bypasses it. RLS on, service-role only.
create table if not exists public.manual_comms_sends (
  id                  uuid primary key default gen_random_uuid(),
  admin_id            uuid,
  template_key        text,
  channel             text,                -- 'email' | 'whatsapp'
  recipient_email     text,
  recipient_mobile    text,
  recipient_name      text,
  status              text not null,       -- 'sent' | 'failed' | 'skipped_suppressed'
  skip_reason         text,
  provider_message_id text,
  error_message       text,
  created_at          timestamptz not null default now()
);
create index if not exists idx_manual_comms_sends_created on public.manual_comms_sends (created_at desc);
alter table public.manual_comms_sends enable row level security;
