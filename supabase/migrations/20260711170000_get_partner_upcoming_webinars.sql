-- Upcoming FREE (student) webinars + this partner's (and downline's) registered students for each.
-- Powers the "Upcoming Free Webinars" card on partner.ostaran.com/dashboard/students — partners
-- can join live to vet a session and one-tap WhatsApp-remind their registered leads to show up.
-- Attribution = qr_landing_registrations.utm_source ∈ partner code + recursive downline (mirrors
-- get_partner_student_regs_v2 scoping). Returns PII → service_role only.
create or replace function get_partner_upcoming_webinars(p_partner_code text)
returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  with recursive all_downstream(id, partner_code) as (
    select id, partner_code from partners where partner_code = p_partner_code
    union all
    select p.id, p.partner_code from partners p join all_downstream ad on p.parent_partner_id = ad.id
  ),
  codes as (select partner_code from all_downstream where partner_code is not null and partner_code <> ''),
  sess as (
    select id, course_id, course_name, course_short_name, webinar_date, webinar_time, duration_minutes, ms_teams_link
    from awa_webinar_sessions
    where session_type = 'student' and status = 'scheduled' and webinar_date >= current_date
  ),
  regs as (
    select qr.course_id, qr.webinar_date, qr.webinar_time,
           qr.full_name, qr.mobile, qr.join_token, qr.registration_status, qr.attended_at, qr.utm_source
    from qr_landing_registrations qr
    where qr.registration_type = 'webinar'
      and qr.webinar_date >= current_date
      and qr.utm_source in (select partner_code from codes)
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'course_name', s.course_name,
      'course_short_name', s.course_short_name,
      'webinar_date', s.webinar_date,
      'webinar_time', to_char(s.webinar_time, 'HH24:MI'),
      'duration_minutes', s.duration_minutes,
      'ms_teams_link', s.ms_teams_link,
      'registered_count', (
        select count(*) from regs r
        where r.course_id = s.course_id and r.webinar_date = s.webinar_date and r.webinar_time = s.webinar_time
      ),
      'students', coalesce((
        select jsonb_agg(jsonb_build_object(
          'full_name', r.full_name, 'mobile', r.mobile, 'join_token', r.join_token,
          'registration_status', r.registration_status, 'attended', (r.attended_at is not null),
          'partner_code', r.utm_source
        ) order by r.full_name)
        from regs r
        where r.course_id = s.course_id and r.webinar_date = s.webinar_date and r.webinar_time = s.webinar_time
      ), '[]'::jsonb)
    ) order by s.webinar_date, s.webinar_time
  ), '[]'::jsonb)
  from sess s
$$;
revoke all on function get_partner_upcoming_webinars(text) from public;
grant execute on function get_partner_upcoming_webinars(text) to service_role;
