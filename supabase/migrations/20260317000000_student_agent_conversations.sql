-- Create the table (user_id as text to match public.users.user_id)
create table if not exists public.student_agent_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.users(user_id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.student_agent_conversations enable row level security;

-- Index for fast user lookups
create index if not exists idx_student_agent_conv_user_id
  on public.student_agent_conversations(user_id);

-- Updated_at trigger
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_student_agent_conversations_updated_at
  before update on public.student_agent_conversations
  for each row execute procedure public.update_updated_at_column();
