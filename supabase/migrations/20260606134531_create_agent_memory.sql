-- Durable, compact per-user memory an agent carries across conversations.
-- notes is an append-only array of {note, at}; the agent reads it at the start
-- of each chat and writes to it via a remember() tool. RLS on; service-role only.
create table if not exists public.agent_memory (
  id         uuid primary key default gen_random_uuid(),
  agent      text not null,          -- 'ask_ana' | 'assistant_professor'
  user_key   text not null,          -- partner_id (uuid text) or student_email
  notes      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (agent, user_key)
);

alter table public.agent_memory enable row level security;
