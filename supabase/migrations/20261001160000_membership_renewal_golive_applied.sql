-- Membership renewal program — GO-LIVE RECORD (applied to production by hand 2026-10-01, founder approved both phases in chat).
-- Phase A: lapsed program on (mr2a/mr2b/mr3), legacy wb1 off, cron 40 -> rejoin tick '30 12 * * *' (18:00 IST class-eve).
-- Phase B: window program on (mr1_window_t5/t1), legacy s13 off, cron 36 -> window tick (04:45 UTC).
-- Both were drift-guarded single transactions. ROLLBACK (idempotent) is the commented block at the bottom.

-- ===== PHASE A =====
-- ============================================================================
-- GO-LIVE PHASE A — lapsed-member program (class-eve + warm win-back)
-- Safe BEFORE stacking ships: these members have already lapsed, so there is nothing to forfeit.
-- Switches ON mr2a_eve_a / mr2b_eve_b / mr3_warm, retires legacy wb1, repoints cron 40 to the new
-- rejoin tick at 18:00 IST (12:30 UTC — inside the healthy 03:30-14:30 UTC cron window).
-- Every step is drift-guarded: aborts (nothing changes — one transaction) if reality differs.
-- ============================================================================
do $golive$
declare
  v_new  int;
  v_tpl  int;
  v_wb1  boolean;
  v_job  record;
begin
  select count(*) into v_new from public.lifecycle_sequences
   where sequence_key in ('mr2a_eve_a','mr2b_eve_b','mr3_warm') and is_active = false;
  if v_new <> 3 then raise exception 'expected 3 inactive mr2/mr3 sequences, found %', v_new; end if;

  select count(*) into v_tpl from public.lifecycle_templates
   where is_active and template_key in ('wa_renewal_class_reminder_v1','wa_renewal_rate_held_v1','em_mr_class_eve_v1','em_mr_winback_v1');
  if v_tpl <> 4 then raise exception 'expected 4 active templates, found %', v_tpl; end if;

  select is_active into v_wb1 from public.lifecycle_sequences where sequence_key = 'wb1_membership_winback';
  if v_wb1 is distinct from true then raise exception 'wb1 not in expected state (active)'; end if;

  select jobid, jobname, active, command into v_job from cron.job where jobid = 40;
  if v_job.jobname is distinct from 'lifecycle-membership-lapsed-tick'
     or v_job.active is distinct from true
     or v_job.command not like '%lifecycle_emit_membership_lapsed_tick%' then
    raise exception 'cron job 40 not in expected state: %', v_job.command;
  end if;

  if to_regprocedure('public.lifecycle_emit_membership_rejoin_tick(boolean)') is null then raise exception 'tick function lifecycle_emit_membership_rejoin_tick(boolean) is missing — apply 01_core.sql first'; end if;

  update public.lifecycle_sequences set is_active = true,  updated_at = now() where sequence_key in ('mr2a_eve_a','mr2b_eve_b','mr3_warm');
  update public.lifecycle_sequences set is_active = false, updated_at = now() where sequence_key = 'wb1_membership_winback';
  perform cron.alter_job(job_id := 40, schedule := '30 12 * * *', command := 'select public.lifecycle_emit_membership_rejoin_tick();');
end
$golive$;

-- ===== PHASE B =====
-- ============================================================================
-- GO-LIVE PHASE B — expiry-window program (T-5 WA+email, T-1 email)
-- ONLY after stacking (enrollment/self) AND the ?code= prefill are deployed and verified on
-- production: the copy promises "your new month is added on top of the days you have left".
-- Switches ON mr1_window_t5 / mr1_window_t1, retires legacy s13, repoints cron 36 to the new
-- window tick (keeps its 04:45 UTC = 10:15 IST schedule).
-- ============================================================================
do $golive$
declare
  v_new  int;
  v_tpl  int;
  v_s13  boolean;
  v_job  record;
begin
  select count(*) into v_new from public.lifecycle_sequences
   where sequence_key in ('mr1_window_t5','mr1_window_t1') and is_active = false;
  if v_new <> 2 then raise exception 'expected 2 inactive mr1 sequences, found %', v_new; end if;

  select count(*) into v_tpl from public.lifecycle_templates
   where is_active and template_key in ('wa_renewal_reminder','em_mr_window_t5_v1','em_mr_window_t1_v1');
  if v_tpl <> 3 then raise exception 'expected 3 active templates, found %', v_tpl; end if;

  select is_active into v_s13 from public.lifecycle_sequences where sequence_key = 's13_membership_renewal';
  if v_s13 is distinct from true then raise exception 's13 not in expected state (active)'; end if;

  select jobid, jobname, active, command into v_job from cron.job where jobid = 36;
  if v_job.jobname is distinct from 'lifecycle-membership-expiring-tick'
     or v_job.active is distinct from true
     or v_job.command not like '%lifecycle_emit_membership_expiring_tick%' then
    raise exception 'cron job 36 not in expected state: %', v_job.command;
  end if;

  if to_regprocedure('public.lifecycle_emit_membership_window_tick(boolean)') is null then raise exception 'tick function lifecycle_emit_membership_window_tick(boolean) is missing — apply 01_core.sql first'; end if;

  update public.lifecycle_sequences set is_active = true,  updated_at = now() where sequence_key in ('mr1_window_t5','mr1_window_t1');
  update public.lifecycle_sequences set is_active = false, updated_at = now() where sequence_key = 's13_membership_renewal';
  perform cron.alter_job(job_id := 36, command := 'select public.lifecycle_emit_membership_window_tick();');
end
$golive$;

-- ===== ROLLBACK (do NOT run unless reverting; restores legacy s13/wb1 + cron commands, switches off + cancels the new sequences) =====
-- -- ============================================================================
-- -- ROLLBACK for the membership renewal program (idempotent, safe to run at any point)
-- -- Restores the legacy s13 / wb1 sequences and the legacy cron commands/schedules, and switches off
-- -- every new sequence. Already-sent messages are not (cannot be) recalled; in-flight enrolments of the
-- -- new sequences are cancelled so no further step goes out.
-- -- ============================================================================
-- do $rb$
-- begin
--   update public.lifecycle_sequences set is_active = false, updated_at = now()
--    where sequence_key in ('mr1_window_t5','mr1_window_t1','mr2a_eve_a','mr2b_eve_b','mr3_warm');
--   update public.lifecycle_sequences set is_active = true, updated_at = now()
--    where sequence_key in ('s13_membership_renewal','wb1_membership_winback');
-- 
--   -- cancel any still-active enrolments of the new sequences (so no further step is sent)
--   update public.lifecycle_sequence_enrolments e
--      set status = 'exited', exit_reason = 'rollback_membership_renewal_program', next_send_at = null, updated_at = now()
--     from public.lifecycle_sequences s
--    where s.id = e.sequence_id and e.status = 'active'
--      and s.sequence_key in ('mr1_window_t5','mr1_window_t1','mr2a_eve_a','mr2b_eve_b','mr3_warm');
-- 
--   perform cron.alter_job(job_id := 36, command := 'SELECT lifecycle_emit_membership_expiring_tick();');
--   perform cron.alter_job(job_id := 40, schedule := '45 5 * * *', command := 'SELECT lifecycle_emit_membership_lapsed_tick();');
-- end
-- $rb$;
