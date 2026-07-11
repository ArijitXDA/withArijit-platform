-- SECURITY: Supabase default privileges auto-GRANT EXECUTE to anon+authenticated on new public
-- functions, so "revoke from public" alone left these PII SECURITY-DEFINER RPCs callable via the
-- public REST API (unauthenticated dump + IDOR on p_partner_code). Revoke anon+authenticated too.
-- Also: dedupe the referred-student books by (email, mobile) not email alone (two distinct people
-- sharing an email were being silently merged). Applied to prod 2026-07-11.

create or replace function get_partner_referred_students(p_partner_code text)
returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  with recursive all_downstream(id, partner_code) as (
    select id, partner_code from partners where partner_code = p_partner_code
    union all
    select p.id, p.partner_code from partners p join all_downstream ad on p.parent_partner_id = ad.id
  ),
  codes as (select partner_code from all_downstream where partner_code is not null and partner_code <> ''),
  regs as (
    select (lower(trim(qr.email)) || '|' || coalesce(qr.mobile, '')) as person_key,
           qr.email, qr.full_name, qr.mobile, qr.registered_at, qr.utm_source, qr.join_token,
           (qr.attended_at is not null or coalesce(qr.attendance_confirmed, false)) as attended
    from qr_landing_registrations qr
    where qr.registration_type = 'webinar' and qr.utm_source in (select partner_code from codes)
  ),
  agg as (select person_key, min(registered_at) as first_registered_at, bool_or(attended) as attended_ever from regs group by person_key),
  firstreg as (select distinct on (person_key) person_key, email, full_name, mobile, utm_source from regs order by person_key, registered_at asc),
  tok as (select distinct on (person_key) person_key, join_token from regs where join_token is not null order by person_key, registered_at desc)
  select coalesce(jsonb_agg(jsonb_build_object(
    'full_name', fr.full_name, 'mobile', fr.mobile, 'email', fr.email,
    'referrer_code', fr.utm_source,
    'referrer_name', coalesce((select full_name from partners where partner_code = fr.utm_source limit 1), fr.utm_source),
    'registered_on', a.first_registered_at, 'attended_ever', a.attended_ever, 'join_token', t.join_token
  ) order by a.first_registered_at desc), '[]'::jsonb)
  from agg a join firstreg fr on fr.person_key = a.person_key left join tok t on t.person_key = a.person_key
$$;

create or replace function admin_referred_students()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with regs as (
    select (lower(trim(qr.email)) || '|' || coalesce(qr.mobile, '')) as person_key,
           qr.email, qr.full_name, qr.mobile, qr.registered_at, qr.utm_source, qr.join_token,
           (qr.attended_at is not null or coalesce(qr.attendance_confirmed, false)) as attended
    from qr_landing_registrations qr
    where qr.registration_type = 'webinar' and qr.email is not null and qr.email <> ''
  ),
  agg as (select person_key, min(registered_at) as first_registered_at, bool_or(attended) as attended_ever from regs group by person_key),
  firstreg as (select distinct on (person_key) person_key, email, full_name, mobile, utm_source from regs order by person_key, registered_at asc),
  tok as (select distinct on (person_key) person_key, join_token from regs where join_token is not null order by person_key, registered_at desc)
  select coalesce(jsonb_agg(jsonb_build_object(
    'full_name', fr.full_name, 'mobile', fr.mobile, 'email', fr.email,
    'referrer_code', fr.utm_source,
    'referrer_name', coalesce((select full_name from partners where partner_code = fr.utm_source limit 1), nullif(fr.utm_source,'')),
    'registered_on', a.first_registered_at, 'attended_ever', a.attended_ever, 'join_token', t.join_token
  ) order by a.first_registered_at desc), '[]'::jsonb)
  from agg a join firstreg fr on fr.person_key = a.person_key left join tok t on t.person_key = a.person_key
$$;

revoke execute on function get_partner_upcoming_webinars(text) from anon, authenticated, public;
revoke execute on function get_partner_referred_students(text) from anon, authenticated, public;
revoke execute on function admin_upcoming_webinars() from anon, authenticated, public;
revoke execute on function admin_referred_students() from anon, authenticated, public;
revoke execute on function admin_comms_messages(text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz,int,int) from anon, authenticated, public;
revoke execute on function admin_comms_recipients(text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz,int,int) from anon, authenticated, public;
revoke execute on function admin_comms_recipient_detail(text) from anon, authenticated, public;
revoke execute on function admin_comms_kpis(text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz) from anon, authenticated, public;
revoke execute on function admin_comms_filter_options() from anon, authenticated, public;
grant execute on function get_partner_referred_students(text) to service_role;
grant execute on function admin_referred_students() to service_role;
