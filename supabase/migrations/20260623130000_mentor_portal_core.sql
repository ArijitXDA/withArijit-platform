-- 20260623130000_mentor_portal_core.sql
-- Mentor portal Phase 1 — data model. ADDITIVE / SAFE on live prod.
-- All new tables + nullable/defaulted columns + idempotent (IF NOT EXISTS).
-- owner_mentor_id IS NULL everywhere = oStaran's own (existing courses/flows untouched).
-- New tables ship RLS-on with zero policy (service-role-only). Money in new
-- financial tables is bigint PAISE.

begin;

-- ============================================================
-- 1. mentors (canonical identity; folds profile + payout + agreement)
-- ============================================================
create table if not exists mentors (
  id                    uuid primary key default gen_random_uuid(),
  mentor_code           text unique,
  admin_user_id         uuid references admin_users(id) on delete set null, -- circular pair; mentors inserted first w/ NULL
  email                 text not null,
  full_name             text not null,
  mobile                text,
  status                text not null default 'invited',  -- invited|kyc_pending|active|paused|offboarded
  invited_at            timestamptz default now(),
  activated_at          timestamptz,
  paused_at             timestamptz,
  -- KYC / tax
  pan                   text,
  gstin                 text,
  is_gst_registered     boolean default false,
  legal_name            text,
  institute             text,
  billing_address       text,
  state_code            text,
  -- bank / payout (snapshotted into the payout request at pay time)
  bank_account_name     text,
  bank_account_number   text,
  bank_ifsc             text,
  upi_id                text,
  payout_min_threshold_paise bigint default 200000,        -- per-mentor; NULL -> global mentor_config
  -- per-mentor guardrail overrides (NULL -> global mentor_config)
  min_price_floor_paise bigint,
  max_discount_pct      numeric,                            -- whole-percent (e.g. 40), matches awa_courses.discount_percent
  split_bps             integer,                            -- mentor share bps; NULL -> global 5000
  -- agreement
  agreement_version     text,
  agreement_signed_at   timestamptz,
  agreement_ip          text,
  agreement_doc_url     text,
  -- profile -> feeds awa_courses.trainer_* (same shapes/scales as live awa_courses)
  trainer_title         text,
  trainer_location      text,
  trainer_bio           text,
  trainer_photo_url     text,
  trainer_linkedin      text,
  trainer_credentials   jsonb,
  trainer_research_areas jsonb,
  notes                 text,
  created_by            uuid references admin_users(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create unique index if not exists idx_mentors_email_lower on mentors (lower(email));
create index if not exists idx_mentors_admin_user on mentors (admin_user_id);
create index if not exists idx_mentors_status on mentors (status);
alter table mentors enable row level security;  -- service-role only (no policy = deny anon)

-- ============================================================
-- 2. mentor_config (global guardrails; RLS-on so NOT anon-readable)
-- ============================================================
create table if not exists mentor_config (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_by  uuid references admin_users(id),
  updated_at  timestamptz not null default now()
);
alter table mentor_config enable row level security;
insert into mentor_config (key, value, description) values
  ('mentor_split_bps',            '{"mentor_bps":5000,"ostaran_bps":5000}'::jsonb, 'Default revenue split (basis points) mentor/oStaran'),
  ('mentor_price_floor_paise',    '{"min_price_paise":200000}'::jsonb,             'Global minimum sellable price (paise)'),
  ('mentor_discount_cap_pct',     '{"max_discount_pct":40}'::jsonb,                'Global max discount % (whole-percent scale)'),
  ('mentor_payout_min_threshold_paise','{"amount_paise":200000}'::jsonb,           'Global monthly payout minimum (paise)')
on conflict (key) do nothing;

-- ============================================================
-- 3. admin_users link (role='mentor' is plain text; no enum change)
-- ============================================================
alter table admin_users
  add column if not exists mentor_id uuid references mentors(id) on delete set null;
create index if not exists idx_admin_users_mentor on admin_users (mentor_id);

-- ============================================================
-- 4. awa_courses: authoritative owner + co-instructors + review status
-- ============================================================
alter table awa_courses
  add column if not exists owner_mentor_id uuid references mentors(id) on delete restrict,
  add column if not exists co_instructors  jsonb,
  add column if not exists review_status   text default 'draft';  -- is_active stays the live switch for now
create index if not exists idx_awa_courses_owner_mentor on awa_courses (owner_mentor_id) where owner_mentor_id is not null;

-- ============================================================
-- 5. awa_batches: denormalized owner + custom-format flags
-- ============================================================
alter table awa_batches
  add column if not exists owner_mentor_id  uuid references mentors(id) on delete restrict,
  add column if not exists is_custom_format boolean default false,
  add column if not exists session_days     jsonb;
create index if not exists idx_awa_batches_owner_mentor on awa_batches (owner_mentor_id) where owner_mentor_id is not null;

-- ============================================================
-- 6. student_enrolments: denormalized + frozen owner (revenue integrity)
-- ============================================================
alter table student_enrolments
  add column if not exists owner_mentor_id uuid references mentors(id) on delete restrict;
create index if not exists idx_enrol_owner_mentor on student_enrolments (owner_mentor_id) where owner_mentor_id is not null;
create index if not exists idx_enrol_owner_active on student_enrolments (owner_mentor_id, is_active) where owner_mentor_id is not null;

-- ============================================================
-- 7. Triggers: stamp owner_mentor_id from the parent course on insert,
--    so public enrolment/payment paths can NEVER omit it. Only sets when NULL;
--    oStaran courses (course.owner_mentor_id NULL) stay NULL.
-- ============================================================
create or replace function mentor_stamp_owner_from_course()
returns trigger language plpgsql as $$
begin
  if new.owner_mentor_id is null and new.course_id is not null then
    select c.owner_mentor_id into new.owner_mentor_id
      from awa_courses c where c.id = new.course_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_stamp_owner_batches on awa_batches;
create trigger trg_stamp_owner_batches
  before insert on awa_batches
  for each row execute function mentor_stamp_owner_from_course();

drop trigger if exists trg_stamp_owner_enrolments on student_enrolments;
create trigger trg_stamp_owner_enrolments
  before insert on student_enrolments
  for each row execute function mentor_stamp_owner_from_course();

-- ============================================================
-- 8. mentor_payout_ledger (append-only, bigint paise, payment-event idempotent)
-- ============================================================
create table if not exists mentor_payout_ledger (
  id                  bigint generated always as identity primary key,
  created_at          timestamptz not null default now(),
  owner_mentor_id     uuid references mentors(id) on delete restrict,  -- NULL = oStaran-own (mentor share = 0)
  enrolment_id        uuid references student_enrolments(id) on delete set null,
  course_id           uuid references awa_courses(id) on delete set null,
  batch_id            uuid references awa_batches(id) on delete set null,
  partner_id          uuid references partners(id),
  entry_type          text not null default 'enrolment_accrual',
    -- enrolment_accrual|commission_adjustment|refund_reversal|chargeback_reversal|dispute_fee|payout_settlement|manual_adjustment
  reverses_id         bigint references mentor_payout_ledger(id),
  event_ref           text,                         -- gateway payment_id / refund_id / payout id
  idempotency_key     text not null,                -- entry_type||':'||event_ref
  -- money (PAISE, bigint). Each row independently satisfies mentor+ostaran=net.
  gross_paise         bigint not null default 0,
  gst_paise           bigint not null default 0,
  commission_paise    bigint not null default 0,    -- = SUM(commission_ledger) for enrolment (actually incurred)
  net_paise           bigint not null default 0,    -- gross - gst - commission (no gateway-fee line)
  split_bps           integer not null default 5000,
  mentor_paise        bigint not null default 0,    -- + payable / - clawback
  ostaran_paise       bigint not null default 0,    -- = net - mentor (signed residual)
  is_self_sold        boolean default false,
  settlement_state    text not null default 'accrued',  -- accrued|settled|void
  payout_request_id   uuid,                         -- FK added below after that table exists
  calc_snapshot       jsonb,
  reversal_reason     text,
  notes               text,
  created_by          uuid references admin_users(id),
  updated_at          timestamptz not null default now()
);
create unique index if not exists uq_mpl_idempotency on mentor_payout_ledger (idempotency_key);
create index if not exists idx_mpl_owner_state on mentor_payout_ledger (owner_mentor_id, settlement_state);
create index if not exists idx_mpl_enrolment on mentor_payout_ledger (enrolment_id);
create index if not exists idx_mpl_payout_req on mentor_payout_ledger (payout_request_id);
alter table mentor_payout_ledger enable row level security;

-- ============================================================
-- 9. mentor_payout_requests (dedicated; payout_requests.partner_id is NOT NULL on
--    live, so it cannot be reused additively). Mirrors its TDS/GST/snapshot shape.
-- ============================================================
create table if not exists mentor_payout_requests (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  mentor_id             uuid not null references mentors(id) on delete restrict,
  period_from           date not null,
  period_to             date not null,
  status                text not null default 'pending_invoice',
    -- pending_invoice|invoice_received|approved|paid|failed|rejected
  ledger_ids            bigint[] not null default '{}',
  gross_mentor_paise    bigint not null default 0,
  tds_rate              numeric not null default 10,
  tds_section           text    not null default '194J',
  tds_paise             bigint  not null default 0,
  mentor_gst_paise      bigint  not null default 0,
  net_payable_paise     bigint  not null default 0,
  mentor_invoice_number text,
  mentor_invoice_url    text,
  bank_name_snapshot    text,
  bank_account_snapshot text,
  bank_ifsc_snapshot    text,
  upi_snapshot          text,
  pan_snapshot          text,
  gstin_snapshot        text,
  razorpay_payout_id    text,
  payment_ref           text,
  paid_at               timestamptz,
  approved_by           uuid references admin_users(id),
  approved_at           timestamptz,
  admin_notes           text,
  rejection_reason      text,
  created_by            uuid references admin_users(id)
);
create unique index if not exists uq_mpr_mentor_period on mentor_payout_requests (mentor_id, period_from);
create index if not exists idx_mpr_mentor_status on mentor_payout_requests (mentor_id, status);
alter table mentor_payout_requests enable row level security;

-- wire the ledger -> payout request FK (table now exists)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'mpl_payout_request_fk') then
    alter table mentor_payout_ledger
      add constraint mpl_payout_request_fk
      foreign key (payout_request_id) references mentor_payout_requests(id) on delete set null;
  end if;
end $$;

commit;
