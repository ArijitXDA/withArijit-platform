-- Pre-existing SECURITY-DEFINER RPCs that the Supabase default-privileges artifact left
-- anon/authenticated-callable via PostgREST. get_partner_student_regs_v2 is the important one
-- (full student PII + IDOR on p_partner_code); the others are partner/admin aggregates. All call
-- sites use the service-role client (verified), so lock to service_role only. Applied 2026-07-11.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('get_partner_student_regs_v2','get_partner_funnel_stats','get_comms_link_stats','get_comms_video_funnel')
  loop
    execute format('revoke execute on function %s from anon, authenticated, public', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;
