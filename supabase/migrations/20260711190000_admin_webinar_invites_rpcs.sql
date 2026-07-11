-- Admin (org-wide) webinar-invite RPCs behind /admin/webinar-invites. Unscoped: all partners.
-- Applied to prod 2026-07-11; mirrored for repo sync. Returns PII → service_role only.

create or replace function admin_upcoming_webinars()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with sess as (
    select id, course_id, course_name, course_short_name, webinar_date, webinar_time, duration_minutes, ms_teams_link
    from awa_webinar_sessions
    where session_type = 'student' and status = 'scheduled' and webinar_date >= current_date
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id, 'course_name', s.course_name, 'course_short_name', s.course_short_name,
    'webinar_date', s.webinar_date, 'webinar_time', to_char(s.webinar_time, 'HH24:MI'),
    'duration_minutes', s.duration_minutes, 'ms_teams_link', s.ms_teams_link,
    'registered_count', (
      select count(*) from qr_landing_registrations qr
      where qr.registration_type = 'webinar' and qr.course_id = s.course_id
        and qr.webinar_date = s.webinar_date and qr.webinar_time = s.webinar_time
    )
  ) order by s.webinar_date, s.webinar_time), '[]'::jsonb)
  from sess s
$$;

create or replace function admin_referred_students()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with regs as (
    select lower(qr.email) as email_key, qr.email, qr.full_name, qr.mobile, qr.registered_at,
           qr.utm_source, qr.join_token,
           (qr.attended_at is not null or coalesce(qr.attendance_confirmed, false)) as attended
    from qr_landing_registrations qr
    where qr.registration_type = 'webinar' and qr.email is not null and qr.email <> ''
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
    'referrer_name', coalesce((select full_name from partners where partner_code = fr.utm_source limit 1), nullif(fr.utm_source,'')),
    'registered_on', a.first_registered_at,
    'attended_ever', a.attended_ever,
    'join_token',    t.join_token
  ) order by a.first_registered_at desc), '[]'::jsonb)
  from agg a
  join firstreg fr on fr.email_key = a.email_key
  left join tok t on t.email_key = a.email_key
$$;

revoke all on function admin_upcoming_webinars() from public;
revoke all on function admin_referred_students() from public;
grant execute on function admin_upcoming_webinars() to service_role;
grant execute on function admin_referred_students() to service_role;
