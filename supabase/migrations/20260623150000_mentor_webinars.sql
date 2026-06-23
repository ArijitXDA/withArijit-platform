-- Mentor self-service webinars + registration capture (separate from the oStaran
-- qr_landing webinar funnel). RLS-on; all access via server routes (service role).
create table if not exists mentor_webinars (
  id              uuid primary key default gen_random_uuid(),
  course_id       uuid references awa_courses(id) on delete cascade,
  owner_mentor_id uuid references mentors(id) on delete cascade,
  title           text not null,
  scheduled_at    timestamptz not null,
  duration_mins   integer not null default 60,
  meeting_link    text,
  slug            text unique not null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists idx_mentor_webinars_mentor on mentor_webinars (owner_mentor_id);
create index if not exists idx_mentor_webinars_course on mentor_webinars (course_id);
alter table mentor_webinars enable row level security;

create table if not exists mentor_webinar_registrations (
  id            uuid primary key default gen_random_uuid(),
  webinar_id    uuid references mentor_webinars(id) on delete cascade,
  full_name     text not null,
  email         text not null,
  mobile        text,
  registered_at timestamptz not null default now(),
  reminded_at   timestamptz
);
create index if not exists idx_mwr_webinar on mentor_webinar_registrations (webinar_id);
create unique index if not exists uq_mwr_webinar_email on mentor_webinar_registrations (webinar_id, lower(email));
alter table mentor_webinar_registrations enable row level security;
