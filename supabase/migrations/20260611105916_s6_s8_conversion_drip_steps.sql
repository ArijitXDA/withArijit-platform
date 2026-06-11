-- S6 continuation (existing steps 0-3 end day 7) — drip day 10..27
INSERT INTO lifecycle_sequence_steps (sequence_id, step_index, delay_hours, channel, template_key, send_window_start, send_window_end)
SELECT s.id, v.step_index, v.delay_hours, v.channel::lifecycle_channel, v.template_key, '09:00'::time, '21:00'::time
FROM lifecycle_sequences s
CROSS JOIN (VALUES
  (4,  240, 'email',    'em_s6_nudge1_v1'),
  (5,  264, 'whatsapp', 'wa_s6_nudge1_v1'),
  (6,  336, 'email',    'em_s6_nudge2_v1'),
  (7,  360, 'whatsapp', 'wa_s6_nudge2_v1'),
  (8,  432, 'email',    'em_s6_nudge3_v1'),
  (9,  456, 'whatsapp', 'wa_s6_nudge3_v1'),
  (10, 528, 'email',    'em_s6_nudge4_v1'),
  (11, 552, 'whatsapp', 'wa_s6_nudge4_v1'),
  (12, 624, 'email',    'em_s6_nudge5_v1'),
  (13, 648, 'whatsapp', 'wa_s6_nudge5_v1')
) AS v(step_index, delay_hours, channel, template_key)
WHERE s.sequence_key = 's6_post_free_webinar_upsell';

-- S8 continuation (existing steps 0-4 end day 7) — same drip day 10..27
INSERT INTO lifecycle_sequence_steps (sequence_id, step_index, delay_hours, channel, template_key, send_window_start, send_window_end)
SELECT s.id, v.step_index, v.delay_hours, v.channel::lifecycle_channel, v.template_key, '09:00'::time, '21:00'::time
FROM lifecycle_sequences s
CROSS JOIN (VALUES
  (5,  240, 'email',    'em_s8_nudge1_v1'),
  (6,  264, 'whatsapp', 'wa_s8_nudge1_v1'),
  (7,  336, 'email',    'em_s8_nudge2_v1'),
  (8,  360, 'whatsapp', 'wa_s8_nudge2_v1'),
  (9,  432, 'email',    'em_s8_nudge3_v1'),
  (10, 456, 'whatsapp', 'wa_s8_nudge3_v1'),
  (11, 528, 'email',    'em_s8_nudge4_v1'),
  (12, 552, 'whatsapp', 'wa_s8_nudge4_v1'),
  (13, 624, 'email',    'em_s8_nudge5_v1'),
  (14, 648, 'whatsapp', 'wa_s8_nudge5_v1')
) AS v(step_index, delay_hours, channel, template_key)
WHERE s.sequence_key = 's8_post_paid_masterclass_enrol';
