-- Self-contained tables for the "AI Catch-up — Past Students Exclusive" campaign.
-- Additive: does NOT touch qr_landing_registrations, record_join_click, or any
-- existing webinar/join/comms logic. RLS enabled (service-role only) to keep PII
-- off the public API.

create table if not exists student_catchup_session (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  session_date  date not null,
  session_time  time not null,
  duration_mins int  not null default 60,
  ms_teams_link text,
  created_at    timestamptz default now()
);

create table if not exists student_catchup_invites (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid references student_catchup_session(id),
  full_name        text,
  email            text,
  mobile           text,
  token            uuid not null default gen_random_uuid() unique,
  email_sent_at    timestamptz,
  whatsapp_sent_at timestamptz,
  first_clicked_at timestamptz,
  last_clicked_at  timestamptz,
  click_count      int not null default 0,
  created_at       timestamptz default now()
);

alter table student_catchup_session enable row level security;
alter table student_catchup_invites enable row level security;

-- Atomic click recorder used by /join/catchup/[token]: stamps the click and
-- returns the session's Teams link (or null if not generated yet).
create or replace function catchup_record_click(p_token uuid)
returns text language plpgsql security definer as $$
declare v_link text;
begin
  update student_catchup_invites
     set click_count      = click_count + 1,
         last_clicked_at  = now(),
         first_clicked_at = coalesce(first_clicked_at, now())
   where token = p_token;
  select s.ms_teams_link into v_link
    from student_catchup_invites i
    join student_catchup_session s on s.id = i.session_id
   where i.token = p_token;
  return v_link;
end; $$;
