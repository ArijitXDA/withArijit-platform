-- Additive columns on broadcast_contacts (applied to prod). Defaults → no backfill.
-- Promotes fields P1/P2 will filter/segment/track on; everything else stays in raw.
alter table broadcast_contacts
  add column if not exists open_count        int not null default 0,
  add column if not exists click_count       int not null default 0,
  add column if not exists last_opened_at    timestamptz,
  add column if not exists last_clicked_at   timestamptz,
  add column if not exists last_campaign_at  timestamptz,
  add column if not exists complained        boolean not null default false,
  add column if not exists email_status      text not null default 'unknown',
  add column if not exists email_verified_at timestamptz,
  add column if not exists consent_whatsapp  text not null default 'unknown',
  add column if not exists consent_source    text,
  add column if not exists unsubscribed_at   timestamptz,
  add column if not exists converted_at      timestamptz,
  add column if not exists converted_kind    text,
  add column if not exists linkedin_url      text;

create index if not exists broadcast_contacts_email_status_idx on broadcast_contacts (email_status);
create index if not exists broadcast_contacts_converted_idx     on broadcast_contacts (converted_at) where converted_at is not null;
create index if not exists broadcast_contacts_opened_idx        on broadcast_contacts (last_opened_at);
create index if not exists broadcast_contacts_age_idx           on broadcast_contacts (age);
