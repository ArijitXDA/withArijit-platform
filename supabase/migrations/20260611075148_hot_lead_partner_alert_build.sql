-- 1. Partner-facing alert email (dashboard link hardcoded; student_first_name from emit metadata)
INSERT INTO lifecycle_templates (template_key, channel, subject, body_html, aisensy_campaign_name, aisensy_param_order, variables_declared, is_active) VALUES
('em_hotlead_partner_alert_v1','email'::lifecycle_channel,$s$Hot lead: {{student_first_name}} attended — reach out today$s$,
$h$<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#374151;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);"><tr><td style="background:linear-gradient(135deg,#07112E,#0D1F4E);padding:20px 36px;"><p style="color:#F0BE3C;font-size:12px;margin:0;font-weight:bold;letter-spacing:.5px;">oStaran PARTNER PROGRAMME</p></td></tr><tr><td style="padding:32px 36px;"><p style="font-size:15px;margin:0 0 16px;">Hi <strong>{{first_name}}</strong>,</p><p style="font-size:15px;line-height:1.7;margin:0 0 16px;"><strong>{{student_first_name}}</strong>, who registered through your link, just attended the webinar and is showing strong intent right now &mdash; but hasn&rsquo;t enrolled yet.</p><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">Warm leads convert about <strong>3&times; higher</strong> when contacted within 24 hours. A simple message works: <em>&ldquo;How did you find the session? Happy to answer any question before you enrol.&rdquo;</em></p><div style="text-align:center;margin:28px 0;"><a href="https://partner.ostaran.com/dashboard" style="display:inline-block;background:#07112E;color:#F0BE3C;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold;border:2px solid #F0BE3C;">Open your dashboard &rarr;</a></div><p style="font-size:14px;color:#374151;margin:20px 0 0;">&mdash; oStaran Partner Support</p></td></tr><tr><td style="background:#f9fafb;padding:12px 36px;text-align:center;border-top:1px solid #e5e7eb;"><p style="font-size:11px;color:#9ca3af;margin:0;"><a href="{{unsubscribe_url}}" style="color:#9ca3af;">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>$h$,
NULL,NULL,'{"first_name":"string","student_first_name":"string","unsubscribe_url":"string"}'::jsonb,true);

-- 2. Sequence (p8 prefix => partner sender + partner unsubscribe; NOT in p1-p6 profile block) + 2 steps (WA now, email +1h)
WITH seq AS (
  INSERT INTO lifecycle_sequences (sequence_key, name, description, track, trigger_event, trigger_filter, exit_on_events, is_active, version, priority)
  VALUES ('p8_hot_lead_partner_alert','P8 — Hot-Lead Partner Alert',
          'Alerts the referring partner when their webinar-attendee is a hot lead but has not converted, so they can reach out fast.',
          'partner'::lifecycle_track,'hot_lead_attended'::lifecycle_event_type,'{}'::jsonb,
          ARRAY['unsubscribed','do_not_contact_set']::lifecycle_event_type[],true,1,90)
  RETURNING id
)
INSERT INTO lifecycle_sequence_steps (sequence_id, step_index, delay_hours, channel, template_key, send_window_start, send_window_end)
SELECT seq.id, v.step_index, v.delay_hours, v.channel::lifecycle_channel, v.template_key, '09:00'::time, '21:00'::time
FROM seq CROSS JOIN (VALUES
  (0, 0, 'whatsapp', 'wa_hotlead_partner_alert_v1'),
  (1, 1, 'email',    'em_hotlead_partner_alert_v1')
) AS v(step_index, delay_hours, channel, template_key);

-- 3. Tick: hot leads (is_hot_lead) who attended free webinar, have an active partner, not converted; emits an alert addressed to the PARTNER.
CREATE OR REPLACE FUNCTION lifecycle_emit_hot_lead_attended_tick()
RETURNS jsonb LANGUAGE plpgsql AS $fn$
DECLARE v_inserted int := 0;
BEGIN
  WITH eligible AS (
    INSERT INTO lifecycle_events (email, mobile, event_type, event_source_table, source_row_id, track, metadata, occurred_at, backfilled)
    SELECT DISTINCT ON (lower(pt.email), lower(cp.email))
      lower(pt.email), pt.mobile, 'hot_lead_attended'::lifecycle_event_type, 'cron_hot_lead', gen_random_uuid(), 'partner'::lifecycle_track,
      jsonb_build_object(
        'full_name', pt.full_name,
        'student_first_name', split_part(COALESCE(cp.name,''),' ',1),
        'student_email', lower(cp.email),
        'dashboard_url', 'https://partner.ostaran.com/dashboard'
      ),
      now(), false
    FROM lifecycle_contact_profile cp
    JOIN partners pt ON upper(pt.partner_code) = upper(cp.partner_code) AND pt.status::text='active'
    WHERE cp.is_hot_lead = true
      AND COALESCE(cp.partner_code,'') <> ''
      AND cp.ever_attended_free_count > 0
      AND COALESCE(cp.total_paid,0) = 0
      AND COALESCE(cp.ever_enrolled_count,0) = 0
      AND cp.last_event_at >= now() - interval '30 days'
      AND COALESCE(TRIM(pt.email),'') <> ''
      AND NOT EXISTS (SELECT 1 FROM lifecycle_suppression s WHERE lower(s.email)=lower(pt.email))
      AND NOT EXISTS (
        SELECT 1 FROM lifecycle_events le
        WHERE lower(le.email)=lower(pt.email) AND le.event_type='hot_lead_attended'::lifecycle_event_type
          AND le.metadata->>'student_email'=lower(cp.email) AND le.occurred_at > now() - interval '14 days'
      )
    ORDER BY lower(pt.email), lower(cp.email)
    LIMIT 100
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM eligible;
  RETURN jsonb_build_object('tick_at', now(), 'hot_lead_alerts_emitted', v_inserted);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[lifecycle_emit_hot_lead_attended_tick] %', SQLERRM;
  RETURN jsonb_build_object('error', SQLERRM, 'tick_at', now());
END;
$fn$;
