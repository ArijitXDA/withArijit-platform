-- =====================================================================================
-- 20260930120000_partner_comms_pause_and_engine_alerts.sql
--
-- PHASE 1 / ASSIGNMENT B  -  DB layer for (1) the manual per-partner WhatsApp pause and
-- (2) engine alerts. PREPARED, NOT YET APPLIED. Additive only: with zero rows in
-- partner_comms_pause it changes no runtime behaviour, and the live dispatcher (v24)
-- ignores everything here (it reads lifecycle_sequences with select('*'), so the new
-- comms_class column simply rides along unused until dispatcher v25 reads it).
--
-- Founder decisions implemented (2026-09-30):
--   3) pause is WhatsApp-via-AiSensy FIRST (email_paused is reserved, UI ships WA-only)
--   4) SUGGEST-ONLY preset: unresponsive = no sign-in / dashboard activity for 30+ days;
--      earners, partners with < 30 days tenure and partners currently referring are
--      never suggested; referral activity is exposed so the admin can see it
--   5) transactional sequences are EXEMPT from a 'promotional'-scope pause
--
-- OBJECTS
--   1. public.partner_comms_pause       service-role-only pause state, one row per partner.
--                                       NOT columns on partners: policy partner_read_own lets
--                                       a partner SELECT their own full row, which would leak
--                                       the admin's reason/note.
--   2. lifecycle_sequences.comms_class  'transactional' | 'promotional' (default promotional),
--                                       backfilled 'transactional' for the 8 exempt sequences.
--   3. public.partner_wa_pause_state()  what the dispatcher calls: 'promotional' | 'all' | NULL.
--   4. public.v_partner_engagement      admin engagement/suggestion view (service-role only).
--   5. public.lifecycle_engine_alerts   append-only alert log (circuit breaker, plan lapse...).
--   6. (no extra index)                 the dispatcher lookup is partners_email_lower_key
--                                       (unique, lower(email)) -> partner_comms_pause PK.
--                                       Verified by EXPLAIN: Index Scan on partners_email_lower_key.
--
-- SECURITY (Supabase default-grants landmine, see memory reference_supabase_rpc_grants):
-- new public objects are auto-granted to anon + authenticated, and "revoke from public" alone
-- does NOT remove that. Every new object below revokes public, anon AND authenticated and
-- grants service_role only. Section 6 re-checks this at the end and RAISES (aborting the
-- migration when applied in one transaction) if anything is still exposed.
--
-- PARTNER-TRACK SEQUENCE CLASSIFICATION (all 17 live partner-track keys, verified 2026-09-30)
--   transactional (exempt from a promotional-scope pause):
--     p2_partner_first_student_referral   p3_partner_first_commission   p5_subpartner_added
--     p8_hot_lead_partner_alert           p9_payout_confirmation        pm1_partner_monthly_statement
--     mn1_mentor_enrolment                mnc1_mentor_course_live
--   promotional (honour the pause) - the column default, left untouched:
--     p1_partner_welcome_onboarding   p4_partner_weekly_pulse   p6_partner_dormancy_recovery
--     p7_first_referral_activation    p9_webinar_invite         p10_partner_signin_reactivation
--     p11_partner_referral_volume     p12_partner_grow_network  p13_partner_monthly_tip
--   NB: there are TWO p9 sequences - p9_payout_confirmation (exempt) and p9_webinar_invite
--   (pausable). Student-track (35) and recruiter-track (2) sequences keep the default; the
--   pause gate only ever consults track='partner', so their class is currently informational.
--
-- APPLY: in ONE transaction (supabase apply_migration, `supabase db push`, or a single
-- execute_sql call containing the whole file). SET LOCAL lock_timeout makes the two statements
-- that need a brief lock on live tables (FK creation, ALTER TABLE lifecycle_sequences) fail
-- fast instead of queueing behind a long query and stalling the dispatcher; if you ever see
-- "canceling statement due to lock timeout", nothing was applied - just re-run.
-- IDEMPOTENT: safe to re-run (IF NOT EXISTS / CREATE OR REPLACE / conditional UPDATE).
-- ROLLBACK: phase1/migration_rollback.sql - revert dispatcher v25 -> v24 FIRST.
-- VERIFY:   phase1/migration_verify.sql
-- =====================================================================================


-- -------------------------------------------------------------------------------------
-- 1. public.partner_comms_pause
-- -------------------------------------------------------------------------------------
set local lock_timeout = '5s';   -- FK creation briefly locks partners + admin_users

create table if not exists public.partner_comms_pause (
  partner_id    uuid        primary key references public.partners(id) on delete cascade,
  wa_paused     boolean     not null default false,
  -- 'promotional' = pause only promotional sequences (transactional ones still send);
  -- 'all'         = hard stop, also blocks transactional WhatsApp (complaint / bad number / asked to stop)
  wa_scope      text        not null default 'promotional'
                            check (wa_scope in ('promotional', 'all')),
  email_paused  boolean     not null default false,   -- RESERVED: v1 UI + dispatcher are WhatsApp-only
  reason        text        check (reason in ('unresponsive', 'partner_requested', 'bad_number',
                                              'complaint', 'on_break', 'other')),
  note          text,
  source        text        not null default 'manual'
                            check (source in ('manual', 'bulk', 'partner_self', 'auto_policy')),
  paused_at     timestamptz,
  paused_by     uuid        references public.admin_users(id) on delete set null,
  paused_until  timestamptz,                          -- NULL = indefinite; expiry enforced at send time
  resumed_at    timestamptz,
  resumed_by    uuid        references public.admin_users(id) on delete set null,
  updated_at    timestamptz not null default now()
);

-- keep updated_at honest regardless of which code path writes the row (generic helper already in the DB)
drop trigger if exists partner_comms_pause_set_updated_at on public.partner_comms_pause;
create trigger partner_comms_pause_set_updated_at
  before update on public.partner_comms_pause
  for each row execute function public.set_updated_at();

-- service-role only: RLS on with ZERO policies + no grants to anon/authenticated
-- (service_role has BYPASSRLS, so the dispatcher and the admin API keep working)
alter table public.partner_comms_pause enable row level security;
revoke all on table public.partner_comms_pause from public, anon, authenticated;
grant select, insert, update, delete on table public.partner_comms_pause to service_role;

comment on table public.partner_comms_pause is
  'Per-partner communications pause (service-role only; RLS on, no policies). One row per partner. wa_paused + wa_scope drive the dispatcher gate via partner_wa_pause_state(); paused_until NULL = indefinite, an elapsed paused_until means the pause has lapsed (nothing to clean up). History lives in admin_audit_log. email_paused is reserved. Deliberately NOT columns on partners (partner_read_own RLS would expose reason/note to the partner).';
comment on column public.partner_comms_pause.wa_scope is
  'promotional = pause promotional sequences only; sequences whose lifecycle_sequences.comms_class is transactional (payout confirmation, hot-lead alert, statement...) still send. all = hard stop that also blocks those.';


-- -------------------------------------------------------------------------------------
-- 2. lifecycle_sequences.comms_class  (+ backfill of the 8 exempt partner sequences)
--    Additive; the default keeps every existing and future sequence 'promotional', so the
--    only rows that change are the 8 named below.
-- -------------------------------------------------------------------------------------
set local lock_timeout = '5s';   -- ALTER TABLE needs a brief ACCESS EXCLUSIVE lock (metadata-only, 54 rows)

alter table public.lifecycle_sequences
  add column if not exists comms_class text not null default 'promotional'
  check (comms_class in ('transactional', 'promotional'));

comment on column public.lifecycle_sequences.comms_class is
  'transactional = service/statement/alert messages that a promotional-scope pause must NOT block; promotional = everything else (default). Consumed by the dispatcher partner-pause gate; only track=partner sequences are gated today.';

update public.lifecycle_sequences
   set comms_class = 'transactional'
 where sequence_key in (
         'p2_partner_first_student_referral',
         'p3_partner_first_commission',
         'p5_subpartner_added',
         'p8_hot_lead_partner_alert',
         'p9_payout_confirmation',
         'pm1_partner_monthly_statement',
         'mn1_mentor_enrolment',
         'mnc1_mentor_course_live'
       )
   and comms_class is distinct from 'transactional';


-- -------------------------------------------------------------------------------------
-- 3. public.partner_wa_pause_state(p_email)  -> 'promotional' | 'all' | NULL
--    NULL = not paused (no partner with that email, no pause row, wa_paused=false, or paused_until elapsed).
--    Keyed on lower(partners.email) = the unique index partners_email_lower_key (never on mobile: not unique).
--    SECURITY DEFINER so it can read the locked table; callable by service_role ONLY.
-- -------------------------------------------------------------------------------------
create or replace function public.partner_wa_pause_state(p_email text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
           when c.wa_paused and (c.paused_until is null or c.paused_until > now()) then c.wa_scope
         end
    from public.partners p
    join public.partner_comms_pause c on c.partner_id = p.id
   where lower(p.email) = lower(btrim(p_email))
   limit 1
$$;

revoke all     on function public.partner_wa_pause_state(text) from public, anon, authenticated;
grant  execute on function public.partner_wa_pause_state(text) to service_role;

comment on function public.partner_wa_pause_state(text) is
  'Dispatcher pause lookup. Returns wa_scope (promotional|all) while a WhatsApp pause is in force, else NULL. Service-role only.';


-- -------------------------------------------------------------------------------------
-- 4. public.v_partner_engagement  (one row per ACTIVE partner; service-role only)
--
--   last_seen_at        GREATEST(max(partner_activity_log.created_at), auth.users.last_sign_in_at)
--                       (neither alone is truthful); NULL = never signed in / no activity
--   last_referral_at    latest qr_landing_registrations attributed to ANY of the partner's codes
--                       (partner_codes_of(): primary + v2 + aliases, upper(btrim(utm_source)))
--   refs_30d / refs_90d registrations attributed in the last 30 / 90 days
--   last_human_click_at latest comms_click_event for the partner's email, bot/preview UAs excluded
--   is_earner           total_paid_enrolments>0 OR total_commission_earned>0 OR any student_enrolments
--                       row with partner_id = the partner (a self-referred purchase counts: conservative)
--   pending_commission  partners.total_commission_pending
--   is_paying_member    the partner is ALSO a paying student on the rolling subscription
--                       (student_enrolments on a course that has an awa_batches.variant='rolling' batch,
--                        status<>'cancelled', amount_paid>0) -> UI: "also a paying student, student
--                        comms unaffected" (the pause is track-scoped and never touches student sequences)
--   baseline_at         GREATEST(last_seen_at, joined_at): a brand-new partner gets tenure grace
--   tier                engaged (< 30d since baseline) | cold (30-59) | unresponsive (60-89) | dead (90+)
--   suggest_pause       SUGGEST-ONLY (founder decision 4). TRUE when: no activity/sign-in for >= 30 days
--                       AND tenure >= 30 days AND NOT is_earner AND refs_30d = 0 AND no active pause.
--                       (refs_30d = 0 = "a referring partner is not suggested"; it excludes nobody
--                       on 2026-09-30 - drop that one line for the literal spec formula.)
--   days_inactive / has_active_pause / baseline_at are extra columns, appended last.
--
-- Perf note: written with MATERIALIZED CTEs on purpose - the naive form measured 3.6 s
-- (partner_codes_of() re-run per partner per registration row); this form measures ~0.12 s.
-- Owner semantics (default, NOT security_invoker): the view reads auth.users as its owner
-- (postgres), exactly like v_admin_registrations; access is limited by the REVOKE below.
-- To change the column list later use DROP VIEW + CREATE VIEW (then re-run the revoke/grant),
-- or only append columns.
-- -------------------------------------------------------------------------------------
create or replace view public.v_partner_engagement as
with ref_by_code as materialized (
  -- One scan of qr_landing_registrations, grouped by normalised partner code.
  -- MATERIALIZED on purpose: without it the planner inlines this CTE into the lateral join
  -- below and re-scans the table once per partner (measured 3.6 s inlined vs ~0.12 s here).
  select upper(btrim(q.utm_source)) as code,
         max(q.created_at)          as last_at,
         count(*) filter (where q.created_at >= now() - interval '30 days') as n30,
         count(*) filter (where q.created_at >= now() - interval '90 days') as n90
    from public.qr_landing_registrations q
   where q.utm_source is not null
     and btrim(q.utm_source) <> ''
   group by 1
),
activity as materialized (
  -- Last dashboard activity per partner, one pass over partner_activity_log.
  select a.partner_id, max(a.created_at) as last_at
    from public.partner_activity_log a
   where a.partner_id is not null
   group by a.partner_id
),
base as materialized (
  -- MATERIALIZED so every per-partner expression (sub-selects included) is evaluated once,
  -- not once per reference to baseline_at in the final SELECT.
  select
    p.id                                    as partner_id,
    lower(p.email)                          as email,
    p.partner_code                          as partner_code,
    coalesce(p.approved_at, p.created_at)   as joined_at,
    greatest(act.last_at, u.last_sign_in_at) as last_seen_at,
    rf.last_referral_at                     as last_referral_at,
    coalesce(rf.refs_30d, 0)                as refs_30d,
    coalesce(rf.refs_90d, 0)                as refs_90d,
    (select max(c.clicked_at)
       from public.comms_click_event c
      where lower(c.contact_email) = lower(p.email)
        and coalesce(c.ua, '') !~* '(facebookexternalhit|bot|crawler|spider|curl|preview|headless|python)'
    )                                       as last_human_click_at,
    (   coalesce(p.total_paid_enrolments, 0) > 0
     or coalesce(p.total_commission_earned, 0) > 0
     or exists (select 1 from public.student_enrolments se where se.partner_id = p.id)
    )                                       as is_earner,
    coalesce(p.total_commission_pending, 0) as pending_commission,
    exists (
      select 1
        from public.student_enrolments se
       where lower(se.student_email) = lower(p.email)
         and se.course_id in (select b.course_id from public.awa_batches b where b.variant = 'rolling')
         and coalesce(se.enrolment_status, 'active') <> 'cancelled'
         and coalesce(se.amount_paid, 0) > 0
    )                                       as is_paying_member,
    coalesce(pz.wa_paused and (pz.paused_until is null or pz.paused_until > now()), false) as has_active_pause
  from public.partners p
  left join auth.users u                  on u.id = p.auth_user_id
  left join activity act                  on act.partner_id = p.id
  left join public.partner_comms_pause pz on pz.partner_id = p.id
  left join lateral (
    -- unnest() runs partner_codes_of() exactly once per partner (a function scan), then
    -- joins its handful of codes (primary + v2 + aliases) to the materialised per-code counts.
    select max(r.last_at)               as last_referral_at,
           sum(r.n30)::int              as refs_30d,
           sum(r.n90)::int              as refs_90d
      from unnest(public.partner_codes_of(p.id)) as pc(code)
      join ref_by_code r on r.code = pc.code
  ) rf on true
  where p.status = 'active'
),
scored as (
  select b.*, greatest(b.last_seen_at, b.joined_at) as baseline_at
    from base b
)
select
  s.partner_id,
  s.email,
  s.partner_code,
  s.joined_at,
  s.last_seen_at,
  s.last_referral_at,
  s.refs_30d,
  s.refs_90d,
  s.last_human_click_at,
  s.is_earner,
  s.pending_commission,
  s.is_paying_member,
  case
    when s.baseline_at >  now() - interval '30 days' then 'engaged'
    when s.baseline_at >  now() - interval '60 days' then 'cold'
    when s.baseline_at >  now() - interval '90 days' then 'unresponsive'
    else 'dead'
  end                                                     as tier,
  (    s.baseline_at <= now() - interval '30 days'   -- no sign-in / dashboard activity for >= 30 days
   and s.joined_at   <= now() - interval '30 days'   -- tenure grace (implied by baseline; explicit for clarity)
   and not s.is_earner                               -- never suggest an earner
   and s.refs_30d = 0                                -- founder decision 4: a partner who is referring is not suggested
   and not s.has_active_pause                        -- already paused
  )                                                       as suggest_pause,
  -- extra columns are appended at the END so a later CREATE OR REPLACE VIEW stays legal
  s.baseline_at,
  floor(extract(epoch from (now() - s.baseline_at)) / 86400)::int as days_inactive,
  s.has_active_pause
from scored s;

revoke all    on public.v_partner_engagement from public, anon, authenticated;
grant  select on public.v_partner_engagement to service_role;

comment on view public.v_partner_engagement is
  'One row per ACTIVE partner: engagement tier, last sign-in/activity/referral/human click, earner + paying-member flags, and suggest_pause (SUGGEST-ONLY: 30+ days silent, non-earner, 30+ days tenure, not currently referring, not already paused). Service-role only; contains partner emails (PII).';


-- -------------------------------------------------------------------------------------
-- 5. public.lifecycle_engine_alerts  (append-only engine alert log; service-role only)
--    Written by the dispatcher / crons, e.g. kind = 'wa_provider_outage', 'wa_circuit_open',
--    'aisensy_plan_inactive', 'cron_lag'. detail = free-form jsonb. No retention job yet.
--    Writers should de-duplicate (e.g. one row per kind per hour) to avoid alert storms.
-- -------------------------------------------------------------------------------------
create table if not exists public.lifecycle_engine_alerts (
  id         uuid        primary key default gen_random_uuid(),
  kind       text        not null,
  detail     jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lifecycle_engine_alerts_kind_created_at_idx
  on public.lifecycle_engine_alerts (kind, created_at desc);

alter table public.lifecycle_engine_alerts enable row level security;
revoke all on table public.lifecycle_engine_alerts from public, anon, authenticated;
grant select, insert, update, delete on table public.lifecycle_engine_alerts to service_role;

comment on table public.lifecycle_engine_alerts is
  'Append-only alert log for the lifecycle engine (provider outages, circuit-breaker trips, plan lapses, cron lag). Service-role only; RLS on, no policies.';


-- -------------------------------------------------------------------------------------
-- 6. Post-flight self-check. RAISES (=> the whole migration rolls back when applied in one
--    transaction) if any new object is still reachable by anon/authenticated/PUBLIC, if RLS
--    is off, or if any of the 8 exempt sequences is not 'transactional'.
-- -------------------------------------------------------------------------------------
do $$
declare
  v_bad     integer;
  v_missing integer;
begin
  -- (a) anon / authenticated hold no privilege at all on the three new relations
  select count(*) into v_bad
    from unnest(array['public.partner_comms_pause', 'public.v_partner_engagement', 'public.lifecycle_engine_alerts']) as rel
   cross join unnest(array['anon', 'authenticated']) as rol
   cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) as prv
   where has_table_privilege(rol::name, rel::text, prv::text);
  if v_bad > 0 then
    raise exception 'lock-down check failed: anon/authenticated still hold % privilege(s) on the new relations', v_bad;
  end if;

  -- (b) nothing granted to PUBLIC on the new relations
  select count(*) into v_bad
    from pg_class c
   cross join lateral aclexplode(c.relacl) as a
   where c.oid = any (array['public.partner_comms_pause'::regclass,
                            'public.v_partner_engagement'::regclass,
                            'public.lifecycle_engine_alerts'::regclass])
     and a.grantee = 0;
  if v_bad > 0 then
    raise exception 'lock-down check failed: PUBLIC holds % privilege(s) on the new relations', v_bad;
  end if;

  -- (c) the pause-state function is callable by service_role only
  if has_function_privilege('anon', 'public.partner_wa_pause_state(text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.partner_wa_pause_state(text)', 'EXECUTE') then
    raise exception 'lock-down check failed: partner_wa_pause_state(text) is executable by anon/authenticated/PUBLIC';
  end if;
  if not has_function_privilege('service_role', 'public.partner_wa_pause_state(text)', 'EXECUTE') then
    raise exception 'partner_wa_pause_state(text) is not executable by service_role - the dispatcher would fail closed';
  end if;

  -- (d) RLS on, zero policies, on both new tables
  select count(*) into v_bad
    from pg_class
   where oid in ('public.partner_comms_pause'::regclass, 'public.lifecycle_engine_alerts'::regclass)
     and not relrowsecurity;
  if v_bad > 0 then
    raise exception 'RLS is not enabled on % of the new tables', v_bad;
  end if;
  select count(*) into v_bad
    from pg_policy
   where polrelid in ('public.partner_comms_pause'::regclass, 'public.lifecycle_engine_alerts'::regclass);
  if v_bad > 0 then
    raise exception 'unexpected RLS policies exist on the new tables (% found) - they must have none', v_bad;
  end if;

  -- (e) all 8 exempt sequences exist and are transactional (a missing/renamed key would silently
  --     let a promotional-scope pause block payout confirmations / hot-lead alerts)
  select count(*) into v_missing
    from unnest(array['p2_partner_first_student_referral', 'p3_partner_first_commission', 'p5_subpartner_added',
                      'p8_hot_lead_partner_alert', 'p9_payout_confirmation', 'pm1_partner_monthly_statement',
                      'mn1_mentor_enrolment', 'mnc1_mentor_course_live']) as k
   where not exists (select 1 from public.lifecycle_sequences s
                      where s.sequence_key = k and s.comms_class = 'transactional');
  if v_missing > 0 then
    raise exception 'exempt-sequence backfill incomplete: % of 8 keys are missing or not transactional', v_missing;
  end if;
end
$$;

-- make PostgREST pick up the new relations immediately (harmless if it already has)
notify pgrst, 'reload schema';
