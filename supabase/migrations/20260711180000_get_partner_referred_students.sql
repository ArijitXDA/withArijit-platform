-- The partner's full referred-student book (all-time, whole downline, deduped per student) with
-- referrer (sub-partner) name, first registration date, and ever-attended flag. Powers the
-- "invite your students to a webinar" list on partner /dashboard/students. Returns PII → service_role.
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
    select lower(qr.email) as email_key, qr.email, qr.full_name, qr.mobile, qr.registered_at,
           qr.utm_source, qr.join_token,
           (qr.attended_at is not null or coalesce(qr.attendance_confirmed, false)) as attended
    from qr_landing_registrations qr
    where qr.registration_type = 'webinar'
      and qr.utm_source in (select partner_code from codes)
  ),
  agg as (
    select email_key, min(registered_at) as first_registered_at, bool_or(attended) as attended_ever
    from regs group by email_key
  ),
  firstreg as (
    select distinct on (email_key) email_key, email, full_name, mobile, utm_source
    from regs order by email_key, registered_at asc
  ),
  tok as (
    select distinct on (email_key) email_key, join_token
    from regs where join_token is not null order by email_key, registered_at desc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'full_name',     fr.full_name,
    'mobile',        fr.mobile,
    'email',         fr.email,
    'referrer_code', fr.utm_source,
    'referrer_name', coalesce((select full_name from partners where partner_code = fr.utm_source limit 1), fr.utm_source),
    'registered_on', a.first_registered_at,
    'attended_ever', a.attended_ever,
    'join_token',    t.join_token
  ) order by a.first_registered_at desc), '[]'::jsonb)
  from agg a
  join firstreg fr on fr.email_key = a.email_key
  left join tok t on t.email_key = a.email_key
$$;
revoke all on function get_partner_referred_students(text) from public;
grant execute on function get_partner_referred_students(text) to service_role;
