create table if not exists pre_db_setup_old_students (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique,
  mobile text,
  source text default 'regn_fees_tracker',
  created_at timestamptz default now()
);
alter table pre_db_setup_old_students enable row level security;
comment on table pre_db_setup_old_students is 'Pre-DB-setup paid students from Regn & Fees Tracker.xlsx (Registered sheet) who are NOT in student_master_table. Names + emails captured; mobiles to be added later. Service-role only (RLS on, no policies). NOT part of student_master_table by design.';
