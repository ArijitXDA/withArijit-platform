-- ─────────────────────────────────────────────────────────────────────────────
-- Membership auto-pause job (Quantum & AI — Continued Up-skilling).
-- Applied via Supabase MCP on 2026-06-01. Mirror of canonical SQL.
--
-- Reflects a lapsed monthly-membership enrolment into enrolment_status='paused'
-- (past the T+2 grace) when the member has no other still-valid row for the
-- course. Pure SQL, mirrors lifecycle-stale-cleanup (cron jobid 23). The app
-- ALSO gates access on access_end_date, so this is the reporting/targeting state
-- (renewal = pay again → a fresh 30-day window → member shows active again).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.membership_pause_lapsed_tick()
returns void language sql as $$
  update student_enrolments se
     set enrolment_status = 'paused', is_active = false, updated_at = now()
    from awa_courses c
   where se.course_id = c.id
     and c.tenure_type = 'monthly'
     and se.enrolment_status = 'active'
     and (se.access_end_date is null or se.access_end_date < current_date - interval '2 days')
     and not exists (
       select 1 from student_enrolments se2
        where se2.student_email = se.student_email
          and se2.course_id     = se.course_id
          and se2.access_end_date >= current_date
     );
$$;

select cron.schedule('membership-pause-lapsed-daily', '45 22 * * *',
  $$ select public.membership_pause_lapsed_tick(); $$);
