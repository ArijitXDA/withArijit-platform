-- Generic key/value app config (clones the proven mentor_config shape).
-- RLS enabled with NO policies => service-role-only access (matches convention).
-- Applied to the shared Supabase project (enszifyeqnwcnxaqrmrq) via MCP; mirrored here.
create table if not exists app_config (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_by  uuid references admin_users(id),
  updated_at  timestamptz not null default now()
);

alter table app_config enable row level security;

-- Manual FX rates: 1 USD/EUR expressed in INR. Edited in /admin/settings and
-- snapshotted onto each order so past receipts never shift when the rate changes.
insert into app_config (key, value, description) values
  ('fx_rates', '{"usd_inr": 140, "eur_inr": 155}'::jsonb,
   'Manual FX: value of 1 USD / 1 EUR in INR. Set in /admin/settings; snapshotted onto orders at purchase.')
on conflict (key) do nothing;
