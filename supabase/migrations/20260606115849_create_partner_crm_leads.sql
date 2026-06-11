create table if not exists partner_crm_leads (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  partner_code text,
  full_name text,
  mobile text,
  email text,
  for_whom text,
  age_group text,
  occupation text,
  status text not null default 'warm',
  registered_at timestamptz,
  engagement_invite_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_pcl_partner on partner_crm_leads(partner_id);
create index if not exists idx_pcl_email on partner_crm_leads(lower(email));
alter table partner_crm_leads enable row level security;

create table if not exists partner_crm_lead_remarks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references partner_crm_leads(id) on delete cascade,
  remark text not null,
  created_by text,
  created_at timestamptz default now()
);
create index if not exists idx_pclr_lead on partner_crm_lead_remarks(lead_id);
alter table partner_crm_lead_remarks enable row level security;

comment on table partner_crm_leads is 'Partner-captured potential leads (pre webinar-registration). RLS on; service-role only — the partner API scopes by partner_id. Mirrored into the engage potential cohort with partner_code.';
