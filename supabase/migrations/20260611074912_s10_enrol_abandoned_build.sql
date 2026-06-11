-- 1. Repoint the two s10 WA templates to a self-resolved var (enrol_url is overwritten by the dispatcher; recovery_url is not)
UPDATE lifecycle_templates
  SET aisensy_param_order = ARRAY['first_name','course_name','recovery_url'],
      variables_declared = '{"first_name":"string","course_name":"string","recovery_url":"string"}'::jsonb
  WHERE template_key='wa_s10_seat_held_v1';
UPDATE lifecycle_templates
  SET aisensy_param_order = ARRAY['first_name','recovery_url'],
      variables_declared = '{"first_name":"string","recovery_url":"string"}'::jsonb
  WHERE template_key='wa_s10_last_reminder_v1';

-- 2. s10 email
INSERT INTO lifecycle_templates (template_key, channel, subject, body_html, aisensy_campaign_name, aisensy_param_order, variables_declared, is_active) VALUES
('em_s10_still_thinking_v1','email'::lifecycle_channel,$s$Your {{course_name}} seat is still held, {{first_name}}$s$,
$h$<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#374151;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);"><tr><td style="background:linear-gradient(135deg,#07112E,#0D1F4E);padding:20px 36px;"><p style="color:#F0BE3C;font-size:12px;margin:0;font-weight:bold;letter-spacing:.5px;">AIwithArijit &times; oStaran</p></td></tr><tr><td style="padding:32px 36px;"><p style="font-size:15px;margin:0 0 16px;">Hi <strong>{{first_name}}</strong>,</p><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">You were one step away from enrolling in <strong>{{course_name}}</strong>. Here&rsquo;s what&rsquo;s waiting: live weekend classes with Arijit, two certificates, the physical AI Kit, and lifetime access to resources.</p><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">Your seat is still held &mdash; you can finish in about two minutes:</p><div style="text-align:center;margin:28px 0;"><a href="{{recovery_url}}" style="display:inline-block;background:#07112E;color:#F0BE3C;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold;border:2px solid #F0BE3C;">Complete my enrolment &rarr;</a></div><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">If something held you back &mdash; timing, format, or payment &mdash; just reply and tell me. I&rsquo;ll sort it out personally.</p><p style="font-size:14px;color:#374151;margin:20px 0 0;">&mdash; The oStaran Team</p></td></tr><tr><td style="background:#f9fafb;padding:12px 36px;text-align:center;border-top:1px solid #e5e7eb;"><p style="font-size:11px;color:#9ca3af;margin:0;"><a href="{{unsubscribe_url}}" style="color:#9ca3af;">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>$h$,
NULL,NULL,'{"first_name":"string","course_name":"string","recovery_url":"string","unsubscribe_url":"string"}'::jsonb,true);

-- 3. s10 sequence + steps (WA ~now, email +22h, WA +46h). Exits the moment they actually enrol.
WITH seq AS (
  INSERT INTO lifecycle_sequences (sequence_key, name, description, track, trigger_event, trigger_filter, exit_on_events, is_active, version, priority)
  VALUES ('s10_enrol_abandoned','S10 — Abandoned Course-Enrolment Recovery',
          'Recovers students with a recent pending/abandoned course payment who have not yet paid. Exits on course_enrolled.',
          'student'::lifecycle_track,'enrol_abandoned'::lifecycle_event_type,'{}'::jsonb,
          ARRAY['course_enrolled','unsubscribed','do_not_contact_set']::lifecycle_event_type[],true,1,100)
  RETURNING id
)
INSERT INTO lifecycle_sequence_steps (sequence_id, step_index, delay_hours, channel, template_key, send_window_start, send_window_end)
SELECT seq.id, v.step_index, v.delay_hours, v.channel::lifecycle_channel, v.template_key, '09:00'::time, '21:00'::time
FROM seq CROSS JOIN (VALUES
  (0, 0,  'whatsapp', 'wa_s10_seat_held_v1'),
  (1, 22, 'email',    'em_s10_still_thinking_v1'),
  (2, 46, 'whatsapp', 'wa_s10_last_reminder_v1')
) AS v(step_index, delay_hours, channel, template_key);

-- 4. Tick: recent pending course payment (<=7d), not masterclass/renewal, not an eventual payer / current student, dedup 90d, suppression.
CREATE OR REPLACE FUNCTION lifecycle_emit_enrol_abandoned_tick()
RETURNS jsonb LANGUAGE plpgsql AS $fn$
DECLARE v_inserted int := 0;
BEGIN
  WITH eligible AS (
    INSERT INTO lifecycle_events (email, mobile, event_type, event_source_table, source_row_id, track, metadata, occurred_at, backfilled)
    SELECT DISTINCT ON (lower(p.email))
      lower(p.email), p.mobile, 'enrol_abandoned'::lifecycle_event_type, 'cron_enrol_abandoned', gen_random_uuid(), 'student'::lifecycle_track,
      jsonb_build_object(
        'full_name', p.name,
        'course_name', p.course,
        'recovery_url', 'https://www.ostaran.com/courses?utm_source=lifecycle_s10&utm_medium=recovery'
      ),
      now(), false
    FROM payments p
    WHERE p.payment_status='pending'
      AND p.created_at >= now() - interval '7 days'
      AND COALESCE(TRIM(p.email),'') <> ''
      AND p.course NOT ILIKE '%masterclass%'
      AND p.course NOT ILIKE '%renewal%'
      AND NOT EXISTS (SELECT 1 FROM payments ps WHERE lower(ps.email)=lower(p.email) AND ps.payment_status='success')
      AND NOT EXISTS (SELECT 1 FROM student_enrolments se WHERE lower(se.student_email)=lower(p.email) AND se.amount_paid>0)
      AND NOT EXISTS (SELECT 1 FROM lifecycle_suppression s WHERE lower(s.email)=lower(p.email))
      AND NOT EXISTS (SELECT 1 FROM lifecycle_events le WHERE lower(le.email)=lower(p.email) AND le.event_type='enrol_abandoned'::lifecycle_event_type AND le.occurred_at > now()-interval '90 days')
    ORDER BY lower(p.email), p.created_at DESC
    LIMIT 100
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM eligible;
  RETURN jsonb_build_object('tick_at', now(), 'enrol_abandoned_emitted', v_inserted);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[lifecycle_emit_enrol_abandoned_tick] %', SQLERRM;
  RETURN jsonb_build_object('error', SQLERRM, 'tick_at', now());
END;
$fn$;
