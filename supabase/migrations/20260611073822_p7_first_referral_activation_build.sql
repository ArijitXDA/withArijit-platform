-- 1. P7 partner-track email templates (URLs via {{partner_share_url}} from emit context; bulletproof vars)
INSERT INTO lifecycle_templates (template_key, channel, subject, body_html, aisensy_campaign_name, aisensy_param_order, variables_declared, is_active) VALUES
('em_p7_first_referral_v1','email'::lifecycle_channel,$s$How partners get their first student in week 1, {{first_name}}$s$,
$h$<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#374151;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);"><tr><td style="background:linear-gradient(135deg,#07112E,#0D1F4E);padding:20px 36px;"><p style="color:#F0BE3C;font-size:12px;margin:0;font-weight:bold;letter-spacing:.5px;">oStaran PARTNER PROGRAMME</p></td></tr><tr><td style="padding:32px 36px;"><p style="font-size:15px;margin:0 0 16px;">Hi <strong>{{first_name}}</strong>,</p><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">Most of our top-earning partners got their first student by doing one simple thing: sharing their link in 2&ndash;3 WhatsApp groups they were already part of. No selling, no cold pitching.</p><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">Here&rsquo;s a message that works &mdash; just paste it with your link:</p><p style="font-size:14px;line-height:1.7;margin:0 0 16px;background:#f9fafb;border-left:3px solid #F0BE3C;padding:12px 16px;"><em>&ldquo;Free 90-min AI Certification webinar &mdash; GenAI, Copilot, LLMs, Agentic AI. Globally recognised certificate, zero cost. Worth a look.&rdquo;</em></p><div style="text-align:center;margin:28px 0;"><a href="{{partner_share_url}}" style="display:inline-block;background:#07112E;color:#F0BE3C;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold;border:2px solid #F0BE3C;">Share your link &rarr;</a></div><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">One yes is all it takes to activate your pipeline. Reply to this email if you&rsquo;d like me to review your pitch &mdash; I read every one.</p><p style="font-size:14px;color:#374151;margin:20px 0 0;">&mdash; oStaran Partner Support</p></td></tr><tr><td style="background:#f9fafb;padding:12px 36px;text-align:center;border-top:1px solid #e5e7eb;"><p style="font-size:11px;color:#9ca3af;margin:0;"><a href="{{unsubscribe_url}}" style="color:#9ca3af;">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>$h$,
NULL,NULL,'{"first_name":"string","partner_share_url":"string","unsubscribe_url":"string"}'::jsonb,true),
('em_p7_last_nudge_v1','email'::lifecycle_channel,$s2$Your partner account, {{first_name}} — one quick nudge$s2$,
$h2$<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#374151;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);"><tr><td style="background:linear-gradient(135deg,#07112E,#0D1F4E);padding:20px 36px;"><p style="color:#F0BE3C;font-size:12px;margin:0;font-weight:bold;letter-spacing:.5px;">oStaran PARTNER PROGRAMME</p></td></tr><tr><td style="padding:32px 36px;"><p style="font-size:15px;margin:0 0 16px;">Hi <strong>{{first_name}}</strong>,</p><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">You joined the partner programme to earn from the AI wave &mdash; and it only starts after your first share. Even a single referral activates your pipeline and your earnings history.</p><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">It takes 30 seconds: copy your link and send it to five people who&rsquo;d value a free AI certification.</p><div style="text-align:center;margin:28px 0;"><a href="{{partner_share_url}}" style="display:inline-block;background:#07112E;color:#F0BE3C;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold;border:2px solid #F0BE3C;">Share your link &rarr;</a></div><p style="font-size:15px;line-height:1.7;margin:0 0 16px;">Stuck on how to start? Just reply &mdash; we&rsquo;ll help you get your first student.</p><p style="font-size:14px;color:#374151;margin:20px 0 0;">&mdash; oStaran Partner Support</p></td></tr><tr><td style="background:#f9fafb;padding:12px 36px;text-align:center;border-top:1px solid #e5e7eb;"><p style="font-size:11px;color:#9ca3af;margin:0;"><a href="{{unsubscribe_url}}" style="color:#9ca3af;">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>$h2$,
NULL,NULL,'{"first_name":"string","partner_share_url":"string","unsubscribe_url":"string"}'::jsonb,true);

-- 2. P7 sequence + 4 steps (WA day14, email day18, WA day24, email day30)
WITH seq AS (
  INSERT INTO lifecycle_sequences (sequence_key, name, description, track, trigger_event, trigger_filter, exit_on_events, is_active, version, priority)
  VALUES ('p7_first_referral_activation','P7 — Partner First-Referral Activation',
          'Nudges approved partners with zero webinar registrations by day 14 to make their first share. Exits on first student referral.',
          'partner'::lifecycle_track,'partner_no_referral_14d'::lifecycle_event_type,'{}'::jsonb,
          ARRAY['partner_first_student_referral','unsubscribed','do_not_contact_set']::lifecycle_event_type[],true,1,100)
  RETURNING id
)
INSERT INTO lifecycle_sequence_steps (sequence_id, step_index, delay_hours, channel, template_key, send_window_start, send_window_end)
SELECT seq.id, v.step_index, v.delay_hours, v.channel::lifecycle_channel, v.template_key, '09:00'::time, '21:00'::time
FROM seq CROSS JOIN (VALUES
  (0, 0,   'whatsapp', 'wa_p7_first_share_v1'),
  (1, 96,  'email',    'em_p7_first_referral_v1'),
  (2, 240, 'whatsapp', 'wa_p7_ready_message_v1'),
  (3, 384, 'email',    'em_p7_last_nudge_v1')
) AS v(step_index, delay_hours, channel, template_key);

-- 3. Tick-emit: approved >=14d, zero webinar regs, dedup 60d, suppression-aware. Bakes all vars into metadata.
CREATE OR REPLACE FUNCTION lifecycle_emit_partner_no_referral_tick()
RETURNS jsonb LANGUAGE plpgsql AS $fn$
DECLARE v_inserted int := 0;
BEGIN
  WITH eligible AS (
    INSERT INTO lifecycle_events (email, mobile, event_type, event_source_table, source_row_id, track, metadata, occurred_at, backfilled)
    SELECT p.email, p.mobile, 'partner_no_referral_14d'::lifecycle_event_type, 'cron_partner_activation', gen_random_uuid(), 'partner'::lifecycle_track,
      jsonb_build_object(
        'full_name', p.full_name,
        'partner_code', p.partner_code,
        'partner_share_url', 'https://webinar.ostaran.com/?utm_source=' || COALESCE(p.partner_code,''),
        'dashboard_url', 'https://partner.ostaran.com/dashboard',
        'qr_code_url', p.qr_code_url,
        'days_since_approved', EXTRACT(DAY FROM now() - p.approved_at)::int
      ),
      now(), false
    FROM partners p
    WHERE p.status::text = 'active'
      AND p.approved_at <= now() - interval '14 days'
      AND COALESCE(p.total_webinar_regs,0) = 0
      AND p.email IS NOT NULL AND length(trim(p.email)) > 0
      AND NOT EXISTS (SELECT 1 FROM lifecycle_suppression s WHERE lower(s.email)=lower(p.email))
      AND NOT EXISTS (SELECT 1 FROM lifecycle_events le WHERE lower(le.email)=lower(p.email) AND le.event_type='partner_no_referral_14d'::lifecycle_event_type AND le.occurred_at > now() - interval '60 days')
    ORDER BY p.approved_at ASC
    LIMIT 100
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM eligible;
  RETURN jsonb_build_object('tick_at', now(), 'partner_no_referral_emitted', v_inserted);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[lifecycle_emit_partner_no_referral_tick] %', SQLERRM;
  RETURN jsonb_build_object('error', SQLERRM, 'tick_at', now());
END;
$fn$;
