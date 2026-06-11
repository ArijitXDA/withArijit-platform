-- 1. m1 emails (membership URL hardcoded in HTML → only first_name + unsubscribe_url needed: bulletproof)
INSERT INTO lifecycle_templates (template_key, channel, subject, body_html, aisensy_campaign_name, aisensy_param_order, variables_declared, is_active) VALUES
('em_m1_whats_next_v1','email'::lifecycle_channel,$s$What's next after the programme, {{first_name}}?$s$,
$h$<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#374151;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);"><tr><td style="background:linear-gradient(135deg,#07112E,#0D1F4E);padding:20px 36px;"><p style="color:#F0BE3C;font-size:12px;margin:0;font-weight:bold;letter-spacing:.5px;">AIwithArijit &times; oStaran</p></td></tr><tr><td style="padding:32px 36px;"><p style="font-size:15px;margin:0 0 16px;">Hi <strong>{{first_name}}</strong>,</p><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">The field moves every week &mdash; new models, new tools, new techniques. <strong>Quantum &amp; AI &mdash; Continued</strong> is how our alumni stay ahead: weekly live sessions with Arijit, advanced Agentic AI and Quantum, and an ongoing peer network.</p><p style="font-size:15px;line-height:1.7;margin:0 0 16px;"><strong>&#8377;2,999/month, cancel anytime.</strong> The easiest way to keep the edge you just built.</p><div style="text-align:center;margin:28px 0;"><a href="https://www.ostaran.com/courses/quantum-ai-continued" style="display:inline-block;background:#07112E;color:#F0BE3C;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold;border:2px solid #F0BE3C;">See what&rsquo;s inside &rarr;</a></div><p style="font-size:14px;color:#374151;margin:20px 0 0;">&mdash; The oStaran Team</p></td></tr><tr><td style="background:#f9fafb;padding:12px 36px;text-align:center;border-top:1px solid #e5e7eb;"><p style="font-size:11px;color:#9ca3af;margin:0;"><a href="{{unsubscribe_url}}" style="color:#9ca3af;">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>$h$,
NULL,NULL,'{"first_name":"string","unsubscribe_url":"string"}'::jsonb,true),
('em_m1_last_note_v1','email'::lifecycle_channel,$s2$Last note on Continued membership, {{first_name}}$s2$,
$h2$<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#374151;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);"><tr><td style="background:linear-gradient(135deg,#07112E,#0D1F4E);padding:20px 36px;"><p style="color:#F0BE3C;font-size:12px;margin:0;font-weight:bold;letter-spacing:.5px;">AIwithArijit &times; oStaran</p></td></tr><tr><td style="padding:32px 36px;"><p style="font-size:15px;margin:0 0 16px;">Hi <strong>{{first_name}}</strong>,</p><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">No pressure &mdash; just didn&rsquo;t want you to miss it. If staying current on AI matters for where your career is going, <strong>Quantum &amp; AI Continued</strong> is the simplest way to keep your edge: weekly live sessions, &#8377;2,999/month, cancel anytime.</p><div style="text-align:center;margin:28px 0;"><a href="https://www.ostaran.com/courses/quantum-ai-continued" style="display:inline-block;background:#07112E;color:#F0BE3C;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold;border:2px solid #F0BE3C;">Keep your edge &rarr;</a></div><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">Either way &mdash; proud of what you&rsquo;ve built. Keep going.</p><p style="font-size:14px;color:#374151;margin:20px 0 0;">&mdash; The oStaran Team</p></td></tr><tr><td style="background:#f9fafb;padding:12px 36px;text-align:center;border-top:1px solid #e5e7eb;"><p style="font-size:11px;color:#9ca3af;margin:0;"><a href="{{unsubscribe_url}}" style="color:#9ca3af;">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>$h2$,
NULL,NULL,'{"first_name":"string","unsubscribe_url":"string"}'::jsonb,true);

-- 2. m1 sequence + steps (WA day1, email day3, WA day7, email day14)
WITH seq AS (
  INSERT INTO lifecycle_sequences (sequence_key, name, description, track, trigger_event, trigger_filter, exit_on_events, is_active, version, priority)
  VALUES ('m1_membership_upsell','M1 — Quantum & AI Continued Upsell',
          'Offers recent paid-course completers the Quantum & AI Continued membership (Rs 2,999/mo). Excludes existing members.',
          'student'::lifecycle_track,'membership_upsell_due'::lifecycle_event_type,'{}'::jsonb,
          ARRAY['unsubscribed','do_not_contact_set']::lifecycle_event_type[],true,1,100)
  RETURNING id
)
INSERT INTO lifecycle_sequence_steps (sequence_id, step_index, delay_hours, channel, template_key, send_window_start, send_window_end)
SELECT seq.id, v.step_index, v.delay_hours, v.channel::lifecycle_channel, v.template_key, '09:00'::time, '21:00'::time
FROM seq CROSS JOIN (VALUES
  (0, 0,   'whatsapp', 'wa_m1_keep_edge_v1'),
  (1, 48,  'email',    'em_m1_whats_next_v1'),
  (2, 144, 'whatsapp', 'wa_m1_alumni_rate_v1'),
  (3, 312, 'email',    'em_m1_last_note_v1')
) AS v(step_index, delay_hours, channel, template_key);

-- 3. Tick: recent paid completers (<=45d), exclude active quantum-ai-continued members, dedup 90d, suppression. membership_url baked in.
CREATE OR REPLACE FUNCTION lifecycle_emit_membership_upsell_tick()
RETURNS jsonb LANGUAGE plpgsql AS $fn$
DECLARE v_inserted int := 0;
BEGIN
  WITH eligible AS (
    INSERT INTO lifecycle_events (email, mobile, event_type, event_source_table, source_row_id, track, metadata, occurred_at, backfilled)
    SELECT LOWER(e.student_email), e.student_mobile, 'membership_upsell_due'::lifecycle_event_type, 'cron_membership_upsell', gen_random_uuid(), 'student'::lifecycle_track,
      jsonb_build_object(
        'full_name', e.student_name,
        'course_name', e.course_name,
        'membership_url', 'https://www.ostaran.com/courses/quantum-ai-continued'
      ),
      now(), false
    FROM student_enrolments e
    WHERE e.amount_paid > 0
      AND COALESCE(TRIM(e.student_email),'') <> ''
      AND e.course_id <> 'c1857a8d-ef52-43b8-b66d-aab96722dcff'
      AND (e.enrolment_status='completed' OR (e.is_active AND e.access_end_date IS NOT NULL AND e.access_end_date < CURRENT_DATE))
      AND COALESCE(e.access_end_date, CURRENT_DATE) >= CURRENT_DATE - 45
      AND NOT EXISTS (
        SELECT 1 FROM student_enrolments m
        WHERE LOWER(m.student_email)=LOWER(e.student_email)
          AND m.course_id = 'c1857a8d-ef52-43b8-b66d-aab96722dcff'
          AND (m.is_active = TRUE OR m.access_end_date >= CURRENT_DATE)
      )
      AND NOT EXISTS (SELECT 1 FROM lifecycle_suppression s WHERE lower(s.email)=lower(e.student_email))
      AND NOT EXISTS (SELECT 1 FROM lifecycle_events le WHERE lower(le.email)=lower(e.student_email) AND le.event_type='membership_upsell_due'::lifecycle_event_type AND le.occurred_at > now() - interval '90 days')
    LIMIT 100
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM eligible;
  RETURN jsonb_build_object('tick_at', now(), 'membership_upsell_emitted', v_inserted);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[lifecycle_emit_membership_upsell_tick] %', SQLERRM;
  RETURN jsonb_build_object('error', SQLERRM, 'tick_at', now());
END;
$fn$;
