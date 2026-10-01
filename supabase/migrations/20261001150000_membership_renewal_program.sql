-- Membership renewal program — RECORD of what was applied to production by hand on 2026-10-01 (repo parity).
-- Applied via 'supabase db query --linked' in this order: 01 core, 03 templates, 04 sequences. All INERT: the new
-- sequences are created is_active=false, the emitters are unscheduled, and a non-dry-run tick refuses to emit unless
-- its sequences are active and the legacy s13/wb1 are inactive. Go-live is recorded in the next migration file.

-- ============================================================================
-- Membership renewal program — CORE (helpers, state view, two emitters)
-- 2026-10-01.  Scope (founder decision #6): SUBSCRIPTION (rolling-membership) students only
-- = courses that own a batch with variant='rolling' (today: quantum-ai-continued).
-- NOTHING here sends anything: the emitters are not scheduled until 05_golive.sql, the sequences that consume
-- their events are created INACTIVE (04_sequences.sql), and a non-dry-run tick refuses to emit unless they are active.
--
-- Design (see audit reference_comms_rework_audit_2026_09_30):
--   * one EVENT PER TOUCH, eligibility re-checked at emit time (so a member who pays is
--     never emitted again, and no long ladder can be killed by the stale-enrolment sweeper)
--   * idempotent: source_row_id = md5(email|course|cycle|date|stage) + ON CONFLICT DO NOTHING
--   * IST calendar throughout (Vercel/Node is UTC — never CURRENT_DATE)
--   * every function: REVOKE from PUBLIC/anon/authenticated, GRANT service_role (Supabase
--     default-grants EXECUTE to anon+authenticated on new public fns — landmine)
-- ============================================================================

-- ── rolling-membership course set ─────────────────────────────────────────────
create or replace function public.membership_rolling_course_ids()
returns setof uuid
language sql stable
set search_path = public, pg_temp
as $$
  select distinct b.course_id
    from public.awa_batches b
   where b.variant = 'rolling' and b.course_id is not null
$$;

-- ── a customer-safe first-name source: strips < > (would be live HTML in an email body), collapses whitespace,
--    and title-cases an ALL-CAPS name ("SANJIT KUMAR DAS" -> "Sanjit Kumar Das"). Apostrophes and & are kept
--    (D'Souza). NULL when nothing is left. ──
create or replace function public.membership_clean_name(p_name text)
returns text
language sql immutable
set search_path = public, pg_temp
as $$
  select nullif(btrim(regexp_replace(regexp_replace(
           case when p_name ~ '[A-Z]' and p_name = upper(p_name) then initcap(lower(p_name)) else p_name end,
           '[<>]', '', 'g'), '\s+', ' ', 'g')), '')
$$;

-- ── per-member state (furthest paid access date wins, so a stacked / early renewal is seen) ──
-- amount_paid >= 500 = a real payment (excludes the Rs 0 / Rs 15 internal test rows).
create or replace view public.v_membership_state
with (security_invoker = true) as
with pay as (
  select lower(trim(e.student_email)) as email,
         e.course_id, e.course_name, e.student_name, nullif(btrim(e.student_mobile), '') as student_mobile,
         e.amount_paid, e.created_at, e.access_end_date, e.batch_id
    from public.student_enrolments e
   where e.course_id in (select public.membership_rolling_course_ids())
     and coalesce(trim(e.student_email), '') <> ''
     and e.access_end_date is not null
     and coalesce(e.enrolment_status, '') not in ('cancelled', 'refunded', 'transferred')
     and lower(trim(e.student_email)) not like '%@ostaran.com'
)
select p.email,
       p.course_id,
       (array_agg(p.course_name order by p.created_at desc))[1]                                                as course_name,
       -- Renewal checkout rows carry the e-mail HANDLE as student_name ('kunalmitramustaphi'); the real name is on an
       -- earlier row. Take the latest name that is not handle-shaped (no spaces / capitals, [a-z0-9._+-] only).
       (array_agg(p.student_name order by p.created_at desc)
          filter (where p.amount_paid >= 500
                    and coalesce(btrim(p.student_name), '') <> ''
                    and lower(btrim(p.student_name)) <> split_part(p.email, '@', 1)
                    and btrim(p.student_name) !~ '^[a-z0-9._+-]+$'))[1]                                        as student_name,
       (array_agg(p.student_mobile order by p.created_at desc) filter (where p.student_mobile is not null))[1] as student_mobile,
       (array_agg(p.batch_id order by p.created_at desc) filter (where p.batch_id is not null))[1]             as batch_id,
       (count(*) filter (where p.amount_paid >= 500))::int                                                     as paid_count,
       (array_agg(p.amount_paid order by p.created_at desc) filter (where p.amount_paid >= 500))[1]            as last_paid_amount,
       -- furthest_end spans ALL live rows (a comped / extension row with a later end still counts as access)…
       max(p.access_end_date)                                                                                  as furthest_end,
       (max(p.access_end_date) - ((now() at time zone 'Asia/Kolkata')::date))::int                             as days_to_end,
       case when max(p.access_end_date) >= ((now() at time zone 'Asia/Kolkata')::date)
            then 'active' else 'lapsed' end                                                                    as state
  from pay p
 group by p.email, p.course_id
-- …but only an e-mail with at least one REAL payment (>= Rs 500) is in the cohort: Rs 0 / Rs 15 rows are internal tests.
having bool_or(p.amount_paid >= 500);

-- ── the member offer: public code EXISTING (33% off the Rs 2,999 list = Rs 2,009) ──
-- Returns no row when the code is missing / inactive / expired / exhausted, so the lapsed
-- templates (which promise the code) are never sent without a working offer.
create or replace function public.membership_loyal_offer(p_course_id uuid)
returns table(discount_code text, price_inr integer, list_inr integer)
language sql stable
set search_path = public, pg_temp
as $$
  select d.code::text,
         greatest(1, round(case d.type::text
                             when 'percentage'  then c.mrp * (1 - d.discount_value / 100.0)
                             when 'fixed'       then c.mrp - d.discount_value
                             when 'final_price' then d.discount_value
                             else c.mrp end))::int,
         round(c.mrp)::int
    from public.discount_codes d
    join public.awa_courses c on c.id = d.course_id
   where d.code = 'EXISTING'
     and d.course_id = p_course_id
     and d.status = 'active'
     and (d.valid_from is null or now() >= d.valid_from)
     and (d.valid_to   is null or now() <= d.valid_to)
     and (d.max_uses   is null or coalesce(d.uses_count, 0) < d.max_uses)
$$;

-- ── tracked-link target (no PII in the URL; ?code= is pre-filled by the course page) ──
create or replace function public.membership_renew_url(p_slug text, p_code text, p_medium text, p_campaign text)
returns text
language sql immutable
set search_path = public, pg_temp
as $$
  select 'https://www.ostaran.com/courses/' || p_slug || '?enrol=1'
      || case when coalesce(p_code, '') <> '' then '&code=' || p_code else '' end
      -- NO utm_source: PaymentModalTrigger treats utm_source as a PARTNER CODE and would send it to checkout
      || '&utm_medium=' || p_medium || '&utm_campaign=' || p_campaign
$$;

-- ── next live session on/after p_from for a member's batch (same effective-date logic as the
--    s11 class-reminder emitter: computed date, rescheduled override, skipped sessions) ──
create or replace function public.membership_next_session(p_course_id uuid, p_pref_batch uuid, p_from date)
returns table(batch_id uuid, session_number integer, session_date date, session_time time, join_link text)
language sql stable
set search_path = public, pg_temp
as $$
  with sess as (
    select b.id as batch_id, b.start_time, b.meeting_link as batch_link, gs.n as session_number,
           (b.start_date + (gs.n - 1) * 7)::date as computed_date,
           coalesce(b.id = p_pref_batch, false) as preferred
      from public.awa_batches b
     cross join lateral generate_series(1, coalesce(b.total_sessions, 26)) as gs(n)
     where b.course_id = p_course_id and b.variant = 'rolling' and b.is_active = true
       and b.start_date is not null and (b.end_date is null or b.end_date >= p_from)
  ), eff as (
    select s.batch_id, s.session_number, s.preferred,
           case when l.status = 'rescheduled' and l.override_date is not null then l.override_date else s.computed_date end as eff_date,
           case when l.status = 'rescheduled' and l.override_time is not null then l.override_time else s.start_time end as eff_time,
           coalesce(l.status, 'scheduled') as status,
           coalesce(l.meeting_link, s.batch_link) as join_link
      from sess s
      left join public.awa_session_links l on l.batch_id = s.batch_id and l.session_number = s.session_number
  )
  select e.batch_id, e.session_number, e.eff_date, e.eff_time, e.join_link
    from eff e
   where e.eff_date >= p_from and e.status <> 'skipped' and e.eff_time is not null
   order by e.preferred desc, e.eff_date, e.eff_time
   limit 1
$$;

-- ── CANDIDATES 1 — expiry window: T-5 ('w5', WA + email) and T-1/T-0 ('w1', email) ────────────
-- Pure read (no writes). The tick below inserts them; p_dry_run just returns them.
create or replace function public.membership_window_candidates()
returns table(email text, mobile text, stage text, course_id uuid, furthest_end date, sid uuid, meta jsonb, days_to_end integer)
language sql stable
set search_path = public, pg_temp
as $$
  with cand as (
    select s.*,
           ac.slug, ac.name as ac_name, round(ac.mrp)::int as list_inr,
           case when s.days_to_end <= 1 then 'w1' else 'w5' end as stage,
           o.discount_code, o.price_inr,
           ns.session_date as ns_date, ns.session_time as ns_time
      from public.v_membership_state s
      join public.awa_courses ac on ac.id = s.course_id
      left join lateral public.membership_loyal_offer(s.course_id) o on true
      left join lateral public.membership_next_session(s.course_id, s.batch_id, ((now() at time zone 'Asia/Kolkata')::date) + 1) ns on true
     where s.state = 'active'
       and s.days_to_end between 0 and 5
       and not exists (select 1 from public.lifecycle_suppression x where lower(x.email) = s.email)
  )
  select c.email, c.student_mobile as mobile, c.stage, c.course_id, c.furthest_end,
         md5(concat_ws('|', 'mem_window', c.email, c.course_id::text, c.furthest_end::text, c.stage))::uuid as sid,
         jsonb_build_object(
           'full_name',         public.membership_clean_name(c.student_name),
           'membership_name',   coalesce(c.course_name, c.ac_name),
           'membership_name_html', replace(coalesce(c.course_name, c.ac_name), '&', '&amp;'),
           'expiry_date',       to_char(c.furthest_end, 'FMDD Mon YYYY'),
           'expiry_iso',        c.furthest_end::text,
           -- concurrency_scope='session' keys on webinar_date: one enrolment per member per cycle
           'webinar_date',      c.furthest_end::text,
           'stage',             c.stage,
           'cycle_end',         c.furthest_end::text,
           'days_to_end',       c.days_to_end,
           -- dispatcher v26: no step of this event may be sent after the end of the expiry day (IST)
           'send_by',           to_char(((c.furthest_end + 1)::timestamp at time zone 'Asia/Kolkata') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
           'price',             to_char(coalesce(c.price_inr, c.list_inr), 'FM999,999'),
           'list_price',        to_char(c.list_inr, 'FM999,999'),
           'discount_code',     coalesce(c.discount_code, ''),
           'code_line_html',    case when c.discount_code is not null
                                     then '<p style="font-size:15px;line-height:1.7;margin:0 0 16px;">Member rate: use code <strong>' || c.discount_code
                                          || '</strong> at checkout (it is pre-filled). Enter your email and the price updates to &#8377;'
                                          || to_char(coalesce(c.price_inr, c.list_inr), 'FM999,999') || '.</p>'
                                     else '' end,
           'next_session_line', case when c.ns_date is not null
                                     then 'Your next live session is on ' || to_char(c.ns_date, 'Dy, FMDD Mon YYYY')
                                          || ' at ' || to_char(c.ns_time, 'FMHH12:MI AM') || ' IST.'
                                          || case when c.ns_date > c.furthest_end then ' That is after your access ends, so renew to attend it.' else '' end
                                     else '' end,
           'cta_target',        public.membership_renew_url(c.slug, c.discount_code, 'whatsapp', 'mr_' || c.stage),
           'renew_url',         public.membership_renew_url(c.slug, c.discount_code, 'email',    'mr_' || c.stage)
         ) as meta,
         c.days_to_end
    from cand c
   where case c.stage
           -- w5: skip if ANY reminder (incl. the legacy s13 one, which carries no stage) went in the last 7 days
           when 'w5' then not exists (select 1 from public.lifecycle_events le
                                       where lower(le.email) = c.email and le.event_type = 'membership_expiring'
                                         and le.occurred_at > now() - interval '7 days'
                                         and coalesce(le.metadata->>'stage', 'w5') = 'w5')
           -- w1: never within 36h of another window reminder (late catch-up of w5)
           else not exists (select 1 from public.lifecycle_events le
                             where lower(le.email) = c.email and le.event_type = 'membership_expiring'
                               and le.occurred_at > now() - interval '36 hours')
         end
   limit 200
$$;

-- ── CANDIDATES 2 — lapsed members, on the EVE of the next live session (18:00 IST cron) ────────
--   days 1-28 after expiry : weekly class-eve touch, max 4 per lapse cycle, WA alternates
--                            variant a (class reminder) / b (rate held); email twin each time
--   days 29-180            : 'warm' touch at most every 27 days, max 3 per cycle (variant w)
--   cycle = furthest_end, so a renewal starts a fresh cycle; nothing is emitted to a member who
--   has paid (state flips to active) — eligibility is re-checked on every run.
create or replace function public.membership_rejoin_candidates()
returns table(email text, mobile text, stage text, course_id uuid, furthest_end date, sid uuid, meta jsonb, days_lapsed integer, paid_count integer)
language sql stable
set search_path = public, pg_temp
as $$
  with t0 as (select ((now() at time zone 'Asia/Kolkata')::date) as today),
  base as (
    select s.*, ac.slug, ac.name as ac_name, (t0.today - s.furthest_end) as days_lapsed, t0.today
      from public.v_membership_state s
      join public.awa_courses ac on ac.id = s.course_id
      cross join t0
     where s.state = 'lapsed'
       and (t0.today - s.furthest_end) between 1 and 180
       and not exists (select 1 from public.lifecycle_suppression x where lower(x.email) = s.email)
  ), sess as (
    select b.*, ns.session_number, ns.session_date, ns.session_time
      from base b
     cross join lateral public.membership_next_session(b.course_id, b.batch_id, b.today + 1) ns
     where ns.session_date = b.today + 1          -- the class is TOMORROW  => this is the class-eve run
  ), withoffer as (
    select se.*, o.discount_code, o.price_inr, o.list_inr
      from sess se
      join lateral public.membership_loyal_offer(se.course_id) o on true    -- no working offer => no emission
  ), touch as (
    select w.*,
           (select count(*) from public.lifecycle_events le
             where lower(le.email) = w.email and le.event_type = 'membership_lapsed'
               and le.event_source_table = 'cron_membership_rejoin'
               and le.metadata->>'cycle_end' = w.furthest_end::text)                              as touches,
           (select count(*) from public.lifecycle_events le
             where lower(le.email) = w.email and le.event_type = 'membership_lapsed'
               and le.event_source_table = 'cron_membership_rejoin'
               and le.metadata->>'cycle_end' = w.furthest_end::text
               and le.metadata->>'stage' = 'warm')                                                as warm_touches,
           (select max(le.occurred_at) from public.lifecycle_events le
             where lower(le.email) = w.email and le.event_type = 'membership_lapsed'
               and le.event_source_table = 'cron_membership_rejoin'
               and le.metadata->>'cycle_end' = w.furthest_end::text)                              as last_touch
      from withoffer w
  )
  select t.email, t.student_mobile as mobile,
         case when t.days_lapsed <= 28 then 'eve' else 'warm' end as stage,
         t.course_id, t.furthest_end,
         md5(concat_ws('|', 'mem_rejoin', t.email, t.course_id::text, t.furthest_end::text, t.session_date::text))::uuid as sid,
         jsonb_build_object(
           'full_name',       public.membership_clean_name(t.student_name),
           'membership_name', coalesce(t.course_name, t.ac_name),
           'expiry_date',     to_char(t.furthest_end, 'FMDD Mon YYYY'),
           'cycle_end',       t.furthest_end::text,
           'stage',           case when t.days_lapsed <= 28 then 'eve' else 'warm' end,
           'variant',         case when t.days_lapsed > 28 then 'w'
                                   when t.touches % 2 = 0 then 'a' else 'b' end,
           'touch_no',        t.touches + 1,
           'lapsed_days',     t.days_lapsed,
           -- class date/time: feeds {{webinar_date_display}} / {{webinar_time_display}} and the
           -- concurrency_scope='session' key (one enrolment per member per class date)
           'webinar_date',    t.session_date::text,
           'webinar_time',    to_char(t.session_time, 'HH24:MI'),
           'session_number',  t.session_number,
           -- dispatcher v26: nothing about "the next live session" may be sent once that session has started
           'send_by',         to_char(((t.session_date + t.session_time) at time zone 'Asia/Kolkata') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
           'price',           to_char(t.price_inr, 'FM999,999'),
           'list_price',      to_char(t.list_inr,  'FM999,999'),
           'discount_code',   t.discount_code,
           'cta_target',      public.membership_renew_url(t.slug, t.discount_code, 'whatsapp',
                                'mr_' || case when t.days_lapsed > 28 then 'warm' when t.touches % 2 = 0 then 'eve_a' else 'eve_b' end),
           'renew_url',       public.membership_renew_url(t.slug, t.discount_code, 'email',
                                'mr_' || case when t.days_lapsed > 28 then 'warm' when t.touches % 2 = 0 then 'eve_a' else 'eve_b' end)
         ) as meta,
         t.days_lapsed, t.paid_count
    from touch t
   where (t.days_lapsed <= 28 and t.touches < 4)
      or (t.days_lapsed >  28 and t.warm_touches < 3 and (t.last_touch is null or t.last_touch < now() - interval '27 days'))
   limit 200
$$;

-- ── TICKS (cron-callable). p_dry_run=true returns what WOULD be emitted and writes nothing. ────
-- A non-dry run REFUSES to emit unless every sequence that consumes its events is active AND the legacy
-- sequence it replaces is inactive. Otherwise an event would either (a) enrol nobody yet burn its
-- deterministic source_row_id (that member/cycle could never be re-emitted), or (b) also enrol the legacy
-- s13 / wb1 and double-send. Errors are NOT swallowed: a failing tick must show as FAILED in cron.job_run_details.
create or replace function public.lifecycle_emit_membership_window_tick(p_dry_run boolean default false)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $fn$
declare v_inserted int := 0;
begin
  if p_dry_run then
    return jsonb_build_object('dry_run', true, 'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
               'who', left(c.email, 3) || '…@' || split_part(c.email, '@', 2),
               'stage', c.stage, 'cycle_end', c.furthest_end, 'days_to_end', c.days_to_end,
               'price', c.meta->>'price', 'code', c.meta->>'discount_code',
               'next', c.meta->>'next_session_line', 'send_by', c.meta->>'send_by'))
        from public.membership_window_candidates() c), '[]'::jsonb));
  end if;

  if (select count(*) from public.lifecycle_sequences where sequence_key in ('mr1_window_t5', 'mr1_window_t1') and is_active) <> 2
     or exists (select 1 from public.lifecycle_sequences where sequence_key = 's13_membership_renewal' and is_active) then
    return jsonb_build_object('tick_at', now(), 'skipped', 'sequences_not_ready');
  end if;

  with ins as (
    insert into public.lifecycle_events (email, mobile, event_type, event_source_table, source_row_id, track, metadata, occurred_at, backfilled)
    select c.email, c.mobile, 'membership_expiring'::lifecycle_event_type, 'cron_membership_window', c.sid,
           'student'::lifecycle_track, c.meta, now(), false
      from public.membership_window_candidates() c
    on conflict (event_source_table, source_row_id, event_type) do nothing
    returning 1
  )
  select count(*) into v_inserted from ins;
  return jsonb_build_object('tick_at', now(), 'membership_window_emitted', v_inserted);
end;
$fn$;

create or replace function public.lifecycle_emit_membership_rejoin_tick(p_dry_run boolean default false)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  v_inserted   int := 0;
  v_no_offer   int := 0;
  v_no_session int := 0;
  v_today      date := ((now() at time zone 'Asia/Kolkata')::date);
begin
  -- visibility: lapsed members who cannot be messaged because the member-rate code is not valid / there is no upcoming session
  select count(*) into v_no_offer
    from public.v_membership_state s
   where s.state = 'lapsed' and (v_today - s.furthest_end) between 1 and 180
     and not exists (select 1 from public.membership_loyal_offer(s.course_id));
  select count(*) into v_no_session
    from public.v_membership_state s
   where s.state = 'lapsed' and (v_today - s.furthest_end) between 1 and 180
     and not exists (select 1 from public.membership_next_session(s.course_id, s.batch_id, v_today + 1));

  if p_dry_run then
    return jsonb_build_object('dry_run', true, 'today_ist', v_today,
      'lapsed_without_offer', v_no_offer, 'lapsed_without_session', v_no_session, 'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
               'who', left(c.email, 3) || '…@' || split_part(c.email, '@', 2),
               'stage', c.stage, 'variant', c.meta->>'variant', 'touch_no', c.meta->>'touch_no',
               'lapsed_days', c.days_lapsed, 'paid_count', c.paid_count,
               'class', (c.meta->>'webinar_date') || ' ' || (c.meta->>'webinar_time'),
               'price', c.meta->>'price', 'send_by', c.meta->>'send_by'))
        from public.membership_rejoin_candidates() c), '[]'::jsonb));
  end if;

  if (select count(*) from public.lifecycle_sequences where sequence_key in ('mr2a_eve_a', 'mr2b_eve_b', 'mr3_warm') and is_active) <> 3
     or exists (select 1 from public.lifecycle_sequences where sequence_key = 'wb1_membership_winback' and is_active) then
    return jsonb_build_object('tick_at', now(), 'skipped', 'sequences_not_ready');
  end if;

  with ins as (
    insert into public.lifecycle_events (email, mobile, event_type, event_source_table, source_row_id, track, metadata, occurred_at, backfilled)
    select c.email, c.mobile, 'membership_lapsed'::lifecycle_event_type, 'cron_membership_rejoin', c.sid,
           'student'::lifecycle_track, c.meta, now(), false
      from public.membership_rejoin_candidates() c
    on conflict (event_source_table, source_row_id, event_type) do nothing
    returning 1
  )
  select count(*) into v_inserted from ins;
  return jsonb_build_object('tick_at', now(), 'membership_rejoin_emitted', v_inserted,
                            'lapsed_without_offer', v_no_offer, 'lapsed_without_session', v_no_session);
end;
$fn$;

-- ── privileges: service_role only (RPC-grant landmine — revoke anon + authenticated too) ──────
revoke all on function public.membership_clean_name(text)                            from public, anon, authenticated;
revoke all on function public.membership_rolling_course_ids()                        from public, anon, authenticated;
revoke all on function public.membership_loyal_offer(uuid)                           from public, anon, authenticated;
revoke all on function public.membership_renew_url(text, text, text, text)           from public, anon, authenticated;
revoke all on function public.membership_next_session(uuid, uuid, date)              from public, anon, authenticated;
revoke all on function public.membership_window_candidates()                         from public, anon, authenticated;
revoke all on function public.membership_rejoin_candidates()                         from public, anon, authenticated;
revoke all on function public.lifecycle_emit_membership_window_tick(boolean)         from public, anon, authenticated;
revoke all on function public.lifecycle_emit_membership_rejoin_tick(boolean)         from public, anon, authenticated;
grant execute on function public.membership_clean_name(text)                         to service_role;
grant execute on function public.membership_rolling_course_ids()                     to service_role;
grant execute on function public.membership_loyal_offer(uuid)                        to service_role;
grant execute on function public.membership_renew_url(text, text, text, text)        to service_role;
grant execute on function public.membership_next_session(uuid, uuid, date)           to service_role;
grant execute on function public.membership_window_candidates()                      to service_role;
grant execute on function public.membership_rejoin_candidates()                      to service_role;
grant execute on function public.lifecycle_emit_membership_window_tick(boolean)      to service_role;
grant execute on function public.lifecycle_emit_membership_rejoin_tick(boolean)      to service_role;

revoke all on public.v_membership_state from public, anon, authenticated;
grant select on public.v_membership_state to service_role;

-- ============================================================================
-- Membership renewal program — TEMPLATES (2 approved WhatsApp templates + 4 emails)
-- WhatsApp campaign names + parameter order are EXACTLY as approved in AiSensy (sheet
-- WhatsApp_templates_FINAL.md #5/#6). comms_url is NOT declared (minted AFTER required-var
-- validation — a declared comms_url would exit every enrolment). Idempotent: skips existing keys.
-- Generated by gen_templates.py.
-- ============================================================================

insert into public.lifecycle_templates (template_key, channel, version, is_active, aisensy_campaign_name, aisensy_param_order, variables_declared, subject, body_text)
select 'wa_renewal_class_reminder_v1', 'whatsapp'::lifecycle_channel, 1, true, 'wa_renewal_class_reminder_v1',
       array['first_name', 'webinar_date_display', 'webinar_time_display', 'membership_name', 'price', 'discount_code', 'comms_url']::text[],
       '{"first_name": "string", "webinar_date_display": "string", "webinar_time_display": "string", "membership_name": "string", "price": "string", "discount_code": "string"}'::jsonb, '', 'Hi {{1}}, our next live weekly session is on {{2}} at {{3}} IST.

Every week we explore the latest in AI — new models, tools, features and real-world use-cases — live and hands-on, and members get the recordings too.

Your *{{4}}* membership has lapsed. Rejoin for ₹{{5}}/month with code {{6}} and pick up where you left off: {{7}}

Reply STOP to opt out.'
 where not exists (select 1 from public.lifecycle_templates where template_key = 'wa_renewal_class_reminder_v1');

insert into public.lifecycle_templates (template_key, channel, version, is_active, aisensy_campaign_name, aisensy_param_order, variables_declared, subject, body_text)
select 'wa_renewal_rate_held_v1', 'whatsapp'::lifecycle_channel, 1, true, 'wa_renewal_rate_held_v1',
       array['first_name', 'membership_name', 'price', 'list_price', 'discount_code', 'comms_url']::text[],
       '{"first_name": "string", "membership_name": "string", "price": "string", "list_price": "string", "discount_code": "string"}'::jsonb, '', 'Hi {{1}}, we would love to see you back in the live weekly AI sessions.

You can rejoin *{{2}}* at ₹{{3}}/month (standard price ₹{{4}}) with code {{5}}. Every week: the latest AI models, tools and use-cases, live — plus recordings for members.

Rejoin here: {{6}}

Reply STOP to opt out.'
 where not exists (select 1 from public.lifecycle_templates where template_key = 'wa_renewal_rate_held_v1');

insert into public.lifecycle_templates (template_key, channel, version, is_active, variables_declared, subject, preview_text, body_html)
select 'em_mr_window_t5_v1', 'email'::lifecycle_channel, 1, true, '{"first_name": "string", "membership_name_html": "string", "expiry_date": "string", "price": "string", "renew_url": "string", "unsubscribe_url": "string"}'::jsonb, 'Your membership ends on {{expiry_date}}', 'Renew early and your new month is added on top of the days you have left.', '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#374151;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);"><tr><td bgcolor="#07112E" style="background:#07112E;background:linear-gradient(135deg,#07112E,#0D1F4E);padding:20px 36px;"><p style="color:#F0BE3C;font-size:12px;margin:0;font-weight:bold;letter-spacing:.5px;">AIwithArijit &times; oStaran</p></td></tr><tr><td style="padding:32px 36px;"><p style="font-size:15px;margin:0 0 16px;">Hi <strong>{{first_name}}</strong>,</p><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">Your <strong>{{membership_name_html}}</strong> membership runs until <strong>{{expiry_date}}</strong>. {{next_session_line}}</p><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">If you renew before then, your new month is added <strong>on top of the days you have left</strong> &mdash; nothing is lost by renewing early.</p><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">Every week we explore the latest in AI &mdash; new models, tools, features and real-world use-cases &mdash; live and hands-on, and members get the recordings too.</p><div style="text-align:center;margin:28px 0;"><a href="{{renew_url}}" style="display:inline-block;background:#07112E;color:#F0BE3C;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold;border:2px solid #F0BE3C;">Renew for &#8377;{{price}}/month (incl. GST) &rarr;</a></div>{{code_line_html}}<p style="font-size:15px;line-height:1.7;margin:0 0 16px;">Prefer to take a break? No action needed &mdash; your membership simply pauses after {{expiry_date}}, and you can rejoin any time.</p><p style="font-size:14px;color:#374151;margin:20px 0 0;">&mdash; The oStaran Team</p></td></tr><tr><td style="background:#f9fafb;padding:14px 36px;text-align:center;border-top:1px solid #e5e7eb;"><p style="font-size:12px;line-height:1.6;color:#6b7280;margin:0 0 6px;">You are receiving this because you joined the oStaran Quantum &amp; AI membership. &mdash; Star Analytix Pvt Ltd</p><p style="font-size:13px;color:#6b7280;margin:0;"><a href="{{unsubscribe_url}}" style="color:#6b7280;">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>'
 where not exists (select 1 from public.lifecycle_templates where template_key = 'em_mr_window_t5_v1');

insert into public.lifecycle_templates (template_key, channel, version, is_active, variables_declared, subject, preview_text, body_html)
select 'em_mr_window_t1_v1', 'email'::lifecycle_channel, 1, true, '{"first_name": "string", "expiry_date": "string", "price": "string", "renew_url": "string", "unsubscribe_url": "string"}'::jsonb, 'Your membership ends on {{expiry_date}}', 'Renew now and the days you have left carry over.', '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#374151;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);"><tr><td bgcolor="#07112E" style="background:#07112E;background:linear-gradient(135deg,#07112E,#0D1F4E);padding:20px 36px;"><p style="color:#F0BE3C;font-size:12px;margin:0;font-weight:bold;letter-spacing:.5px;">AIwithArijit &times; oStaran</p></td></tr><tr><td style="padding:32px 36px;"><p style="font-size:15px;margin:0 0 16px;">Hi <strong>{{first_name}}</strong>,</p><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">A quick reminder: your membership ends on <strong>{{expiry_date}}</strong> (that is your last day of access). {{next_session_line}}</p><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">Renew now and your new month starts <strong>after</strong> the days you have left, so you keep every live session and the full recordings library without a gap.</p><div style="text-align:center;margin:28px 0;"><a href="{{renew_url}}" style="display:inline-block;background:#07112E;color:#F0BE3C;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold;border:2px solid #F0BE3C;">Renew for &#8377;{{price}}/month (incl. GST) &rarr;</a></div>{{code_line_html}}<p style="font-size:14px;color:#374151;margin:20px 0 0;">&mdash; The oStaran Team</p></td></tr><tr><td style="background:#f9fafb;padding:14px 36px;text-align:center;border-top:1px solid #e5e7eb;"><p style="font-size:12px;line-height:1.6;color:#6b7280;margin:0 0 6px;">You are receiving this because you joined the oStaran Quantum &amp; AI membership. &mdash; Star Analytix Pvt Ltd</p><p style="font-size:13px;color:#6b7280;margin:0;"><a href="{{unsubscribe_url}}" style="color:#6b7280;">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>'
 where not exists (select 1 from public.lifecycle_templates where template_key = 'em_mr_window_t1_v1');

insert into public.lifecycle_templates (template_key, channel, version, is_active, variables_declared, subject, preview_text, body_html)
select 'em_mr_class_eve_v1', 'email'::lifecycle_channel, 1, true, '{"first_name": "string", "webinar_date_display": "string", "webinar_time_display": "string", "expiry_date": "string", "price": "string", "list_price": "string", "discount_code": "string", "renew_url": "string", "unsubscribe_url": "string"}'::jsonb, 'Rejoin to attend the live AI session on {{webinar_date_display}} at {{webinar_time_display}} IST', 'Your membership has ended. Rejoin at the member rate.', '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#374151;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);"><tr><td bgcolor="#07112E" style="background:#07112E;background:linear-gradient(135deg,#07112E,#0D1F4E);padding:20px 36px;"><p style="color:#F0BE3C;font-size:12px;margin:0;font-weight:bold;letter-spacing:.5px;">AIwithArijit &times; oStaran</p></td></tr><tr><td style="padding:32px 36px;"><p style="font-size:15px;margin:0 0 16px;">Hi <strong>{{first_name}}</strong>,</p><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">Our next live weekly session is on <strong>{{webinar_date_display}} at {{webinar_time_display}} IST</strong>.</p><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">Every week we explore the latest in AI &mdash; new models, tools, features and real-world use-cases &mdash; live and hands-on, and members get the recordings too.</p><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">Your membership ended on {{expiry_date}}. You can rejoin for <strong>&#8377;{{price}}/month</strong> incl. GST (standard price &#8377;{{list_price}}) with code <strong>{{discount_code}}</strong>, which is pre-filled at checkout &mdash; and pick up where you left off.</p><div style="text-align:center;margin:28px 0;"><a href="{{renew_url}}" style="display:inline-block;background:#07112E;color:#F0BE3C;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold;border:2px solid #F0BE3C;">Rejoin for &#8377;{{price}}/month (incl. GST) &rarr;</a></div><p style="font-size:14px;color:#374151;margin:20px 0 0;">&mdash; The oStaran Team</p></td></tr><tr><td style="background:#f9fafb;padding:14px 36px;text-align:center;border-top:1px solid #e5e7eb;"><p style="font-size:12px;line-height:1.6;color:#6b7280;margin:0 0 6px;">You are receiving this because you joined the oStaran Quantum &amp; AI membership. &mdash; Star Analytix Pvt Ltd</p><p style="font-size:13px;color:#6b7280;margin:0;"><a href="{{unsubscribe_url}}" style="color:#6b7280;">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>'
 where not exists (select 1 from public.lifecycle_templates where template_key = 'em_mr_class_eve_v1');

insert into public.lifecycle_templates (template_key, channel, version, is_active, variables_declared, subject, preview_text, body_html)
select 'em_mr_winback_v1', 'email'::lifecycle_channel, 1, true, '{"first_name": "string", "webinar_date_display": "string", "webinar_time_display": "string", "expiry_date": "string", "price": "string", "list_price": "string", "discount_code": "string", "renew_url": "string", "unsubscribe_url": "string"}'::jsonb, 'We would love to have you back at the live AI sessions', 'The live weekly sessions continue — rejoin at your member rate.', '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#374151;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);"><tr><td bgcolor="#07112E" style="background:#07112E;background:linear-gradient(135deg,#07112E,#0D1F4E);padding:20px 36px;"><p style="color:#F0BE3C;font-size:12px;margin:0;font-weight:bold;letter-spacing:.5px;">AIwithArijit &times; oStaran</p></td></tr><tr><td style="padding:32px 36px;"><p style="font-size:15px;margin:0 0 16px;">Hi <strong>{{first_name}}</strong>,</p><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">It has been a little while since your membership ended on {{expiry_date}}. The live weekly sessions carry on &mdash; the next one is <strong>{{webinar_date_display}} at {{webinar_time_display}} IST</strong>.</p><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">Every week we explore the latest in AI &mdash; new models, tools, features and real-world use-cases &mdash; live and hands-on, and members get the recordings too.</p><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">You can rejoin at your member rate of <strong>&#8377;{{price}}/month</strong> incl. GST (standard price &#8377;{{list_price}}) with code <strong>{{discount_code}}</strong>, which is pre-filled at checkout.</p><div style="text-align:center;margin:28px 0;"><a href="{{renew_url}}" style="display:inline-block;background:#07112E;color:#F0BE3C;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold;border:2px solid #F0BE3C;">Rejoin for &#8377;{{price}}/month (incl. GST) &rarr;</a></div><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">If it is not the right time, no worries at all &mdash; you can unsubscribe below and we will stop these reminders.</p><p style="font-size:14px;color:#374151;margin:20px 0 0;">&mdash; The oStaran Team</p></td></tr><tr><td style="background:#f9fafb;padding:14px 36px;text-align:center;border-top:1px solid #e5e7eb;"><p style="font-size:12px;line-height:1.6;color:#6b7280;margin:0 0 6px;">You are receiving this because you joined the oStaran Quantum &amp; AI membership. &mdash; Star Analytix Pvt Ltd</p><p style="font-size:13px;color:#6b7280;margin:0;"><a href="{{unsubscribe_url}}" style="color:#6b7280;">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>'
 where not exists (select 1 from public.lifecycle_templates where template_key = 'em_mr_winback_v1');

-- ============================================================================
-- Membership renewal program — SEQUENCES (created INACTIVE; 05_golive.sql switches them on)
-- Parallel to the legacy s13 / wb1 (which have a single WA step each) — never insert steps into a
-- live sequence (step_index landmine); the legacy pair is deactivated at go-live instead.
-- All use concurrency_scope='session' (key = webinar_date#session_number#webinar_time, set by the
-- emitters) so a stuck enrolment can never silently swallow a later cycle's touch.
-- course_enrolled in exit_on_events: if the member pays between the email (step 0) and its WhatsApp
-- (step 1) the WhatsApp is cancelled. Every event also carries send_by (dispatcher v26): nothing is sent after
-- the session starts / the expiry day ends.
-- ============================================================================
do $seed$
declare
  v_ids jsonb := '{}'::jsonb;
  r record;
  v_id uuid;
begin
  for r in
    select * from (values
      ('mr1_window_t5',  'MR1 — Membership expiry window (T-5)',        'membership_expiring', '{"stage":"w5"}'::jsonb,
         'Active member, 1-5 days before access ends: email + WhatsApp renewal reminder. Renewal stacks (new month added after remaining days).'),
      ('mr1_window_t1',  'MR1 — Membership expiry window (T-1/T-0)',    'membership_expiring', '{"stage":"w1"}'::jsonb,
         'Last-day email for a member whose access ends tomorrow/today.'),
      ('mr2a_eve_a',     'MR2 — Lapsed class-eve (class reminder)',     'membership_lapsed',   '{"stage":"eve","variant":"a"}'::jsonb,
         'Evening before the next live session, member lapsed 1-28 days: email + WhatsApp class reminder + rejoin (touches 1 and 3).'),
      ('mr2b_eve_b',     'MR2 — Lapsed class-eve (member rate held)',   'membership_lapsed',   '{"stage":"eve","variant":"b"}'::jsonb,
         'Evening before the next live session, member lapsed 1-28 days: WhatsApp member-rate nudge only (touches 2 and 4).'),
      ('mr3_warm',       'MR3 — Warm lapse win-back',                   'membership_lapsed',   '{"stage":"warm"}'::jsonb,
         'Member lapsed 29-180 days: at most every 27 days, max 3 per lapse cycle; email + WhatsApp on a class eve.')
    ) as t(seq_key, seq_name, trig, filt, descr)
  loop
    insert into public.lifecycle_sequences
      (sequence_key, name, description, track, trigger_event, trigger_filter, exit_on_events, is_active, version, priority, concurrency_scope, comms_class)
    values
      (r.seq_key, r.seq_name, r.descr, 'student'::lifecycle_track, r.trig::lifecycle_event_type, r.filt,
       array['unsubscribed','do_not_contact_set','course_enrolled']::lifecycle_event_type[], false, 1, 100, 'session', 'promotional')
    on conflict (sequence_key) do nothing;
  end loop;
end
$seed$;

-- steps (only inserted when the sequence has none yet — idempotent re-run)
insert into public.lifecycle_sequence_steps (sequence_id, step_index, delay_hours, send_window_start, send_window_end, channel, template_key, conditions)
select s.id, v.step_index, v.delay_hours, '09:00'::time, '21:00'::time, v.channel::lifecycle_channel, v.template_key, '{}'::jsonb
  from (values
    -- EMAIL FIRST, WhatsApp 1h later: email is the reliable channel; a WhatsApp outage (the documented
    -- recurring failure) then delays only the WhatsApp step, never the email.
    ('mr1_window_t5', 0, 0, 'email',    'em_mr_window_t5_v1'),
    ('mr1_window_t5', 1, 1, 'whatsapp', 'wa_renewal_reminder'),
    ('mr1_window_t1', 0, 0, 'email',    'em_mr_window_t1_v1'),
    ('mr2a_eve_a',    0, 0, 'email',    'em_mr_class_eve_v1'),
    ('mr2a_eve_a',    1, 1, 'whatsapp', 'wa_renewal_class_reminder_v1'),
    -- variant b (touches 2 and 4): WhatsApp only — avoids near-identical emails four weeks running
    ('mr2b_eve_b',    0, 0, 'whatsapp', 'wa_renewal_rate_held_v1'),
    ('mr3_warm',      0, 0, 'email',    'em_mr_winback_v1'),
    ('mr3_warm',      1, 1, 'whatsapp', 'wa_renewal_rate_held_v1')
  ) as v(seq_key, step_index, delay_hours, channel, template_key)
  join public.lifecycle_sequences s on s.sequence_key = v.seq_key
 where not exists (select 1 from public.lifecycle_sequence_steps x where x.sequence_id = s.id);
