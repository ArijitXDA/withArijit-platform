-- Service-role-only config holding the cron key (gates the public dispatcher fn).
create table if not exists broadcast_config (
  id       int primary key default 1,
  cron_key text not null,
  constraint broadcast_config_singleton check (id = 1)
);
alter table broadcast_config enable row level security;
insert into broadcast_config (id, cron_key)
values (1, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
on conflict (id) do nothing;

-- Every minute: invoke the dispatcher (Supabase edge function broadcast-dispatcher),
-- passing the cron key (read in-DB) + a global per-tick send cap.
select cron.schedule(
  'broadcast-dispatcher-tick',
  '* * * * *',
  $cron$
  select net.http_post(
    url     := 'https://enszifyeqnwcnxaqrmrq.supabase.co/functions/v1/broadcast-dispatcher',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := jsonb_build_object('key', (select cron_key from broadcast_config where id = 1), 'limit', 120),
    timeout_milliseconds := 60000
  );
  $cron$
);
