-- Generalize the single-purpose catch-up tool into a reusable Sessions+Campaigns
-- engagement system. Additive to the live app; the production /join/[token] +
-- record_join_click + comms engine remain untouched. The old catch-up tables had
-- no sent invites, so they're cleanly replaced.

drop table if exists student_catchup_invites;
drop table if exists student_catchup_session;
drop function if exists catchup_record_click(uuid);

create table if not exists engagement_sessions (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  session_date  date not null,
  session_time  time not null,
  duration_mins int  not null default 60,
  ms_teams_link text,
  status        text not null default 'scheduled',
  created_at    timestamptz default now()
);

create table if not exists engagement_campaigns (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid references engagement_sessions(id) on delete cascade,
  cohort_key    text not null,
  name          text,
  sender_from   text not null default 'oStaran AI Education <ai@ostaran.com>',
  email_subject text,
  email_body    text,
  whatsapp_body text,
  created_at    timestamptz default now()
);

create table if not exists engagement_invites (
  id               uuid primary key default gen_random_uuid(),
  campaign_id      uuid references engagement_campaigns(id) on delete cascade,
  session_id       uuid references engagement_sessions(id),
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
create index if not exists idx_engagement_invites_campaign on engagement_invites(campaign_id);

alter table engagement_sessions  enable row level security;
alter table engagement_campaigns enable row level security;
alter table engagement_invites   enable row level security;

create or replace function engagement_record_click(p_token uuid)
returns text language plpgsql security definer as $$
declare v_link text;
begin
  update engagement_invites
     set click_count = click_count + 1,
         last_clicked_at = now(),
         first_clicked_at = coalesce(first_clicked_at, now())
   where token = p_token;
  select s.ms_teams_link into v_link
    from engagement_invites i join engagement_sessions s on s.id = i.session_id
   where i.token = p_token;
  return v_link;
end; $$;
