-- ═══════════════════════════════════════════════════════════════════════════
-- Cold-email Broadcast Engine — foundation schema (v1: email-only + funnel)
-- broadcast_* tables kept separate from warm event-sourced contacts.
-- All RLS-on with NO policies → service-role only (mirrors engagement_* tables).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists broadcast_imports (
  id              uuid primary key default gen_random_uuid(),
  filename        text,
  source          text,
  uploaded_by     uuid,
  uploaded_by_name text,
  column_map      jsonb  not null default '{}'::jsonb,
  rows_total      int    not null default 0,
  rows_imported   int    not null default 0,
  rows_updated    int    not null default 0,
  rows_duplicate  int    not null default 0,
  rows_invalid    int    not null default 0,
  rows_suppressed int    not null default 0,
  status          text   not null default 'processing',
  created_at      timestamptz not null default now()
);

create table if not exists broadcast_contacts (
  id               uuid primary key default gen_random_uuid(),
  email            text,
  phone_e164       text,
  name             text,
  age              int,
  gender           text,
  location         text,
  city             text,
  country          text,
  occupation       text,
  company_college  text,
  source           text,
  import_id        uuid references broadcast_imports(id) on delete set null,
  tags             text[] not null default '{}',
  raw              jsonb  not null default '{}'::jsonb,
  consent_email    text   not null default 'unknown',
  unsub_email      boolean not null default false,
  hard_bounced     boolean not null default false,
  last_sent_at     timestamptz,
  email_sent_count int    not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint broadcast_contacts_email_key unique (email)
);
create index if not exists broadcast_contacts_phone_idx      on broadcast_contacts (phone_e164) where phone_e164 is not null;
create index if not exists broadcast_contacts_city_idx       on broadcast_contacts (lower(city));
create index if not exists broadcast_contacts_country_idx    on broadcast_contacts (lower(country));
create index if not exists broadcast_contacts_occupation_idx on broadcast_contacts (lower(occupation));
create index if not exists broadcast_contacts_source_idx     on broadcast_contacts (source);
create index if not exists broadcast_contacts_import_idx     on broadcast_contacts (import_id);
create index if not exists broadcast_contacts_unsub_idx      on broadcast_contacts (unsub_email);

create table if not exists broadcast_campaigns (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  type             text not null default 'custom',
  channel          text not null default 'email',
  from_name        text,
  from_email       text,
  subject          text,
  preheader        text,
  body_html        text,
  landing_url      text,
  segment          jsonb not null default '{}'::jsonb,
  status           text not null default 'draft',
  throttle_per_hour int not null default 500,
  scheduled_at     timestamptz,
  created_by       uuid,
  created_by_name  text,
  stats            jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists broadcast_campaigns_status_idx on broadcast_campaigns (status);

create table if not exists broadcast_sends (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references broadcast_campaigns(id) on delete cascade,
  contact_id    uuid not null references broadcast_contacts(id) on delete cascade,
  send_token    uuid not null default gen_random_uuid(),
  email         text,
  status        text not null default 'queued',
  provider_message_id text,
  error         text,
  queued_at     timestamptz not null default now(),
  sent_at       timestamptz,
  delivered_at  timestamptz,
  opened_at     timestamptz,
  clicked_at    timestamptz,
  open_count    int not null default 0,
  click_count   int not null default 0,
  constraint broadcast_sends_campaign_contact_key unique (campaign_id, contact_id),
  constraint broadcast_sends_token_key unique (send_token)
);
create index if not exists broadcast_sends_campaign_status_idx on broadcast_sends (campaign_id, status);

create table if not exists broadcast_events (
  id          bigint generated always as identity primary key,
  send_id     uuid references broadcast_sends(id) on delete cascade,
  campaign_id uuid references broadcast_campaigns(id) on delete cascade,
  contact_id  uuid references broadcast_contacts(id) on delete set null,
  type        text not null,
  url         text,
  ip          text,
  ua          text,
  meta        jsonb not null default '{}'::jsonb,
  ts          timestamptz not null default now()
);
create index if not exists broadcast_events_campaign_type_idx on broadcast_events (campaign_id, type);
create index if not exists broadcast_events_send_idx          on broadcast_events (send_id);
create index if not exists broadcast_events_contact_idx       on broadcast_events (contact_id);

alter table broadcast_imports   enable row level security;
alter table broadcast_contacts  enable row level security;
alter table broadcast_campaigns enable row level security;
alter table broadcast_sends     enable row level security;
alter table broadcast_events    enable row level security;
