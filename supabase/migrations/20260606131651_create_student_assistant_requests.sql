-- Captures things the Assistant Professor (AI tutor) logs on a student's behalf:
--   kind='doubt'      → a question the student wants escalated to the live session
--   kind='membership' → interest in the "Quantum & AI Continued" membership upsell
-- Write path is the service-role agent route only; RLS on with no policies.
create table if not exists public.student_assistant_requests (
  id             uuid primary key default gen_random_uuid(),
  student_email  text not null,
  course_id      text,
  batch_id       text,
  kind           text not null check (kind in ('doubt', 'membership')),
  session_number integer,
  body           text,
  status         text not null default 'open',
  created_at     timestamptz not null default now()
);

create index if not exists idx_student_assistant_requests_email
  on public.student_assistant_requests (student_email, created_at desc);
create index if not exists idx_student_assistant_requests_kind
  on public.student_assistant_requests (kind, status);

alter table public.student_assistant_requests enable row level security;
-- No policies: only the service role (which bypasses RLS) reads/writes this table.
