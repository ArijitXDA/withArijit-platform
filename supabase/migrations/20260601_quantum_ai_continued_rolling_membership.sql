-- ─────────────────────────────────────────────────────────────────────────────
-- Quantum & AI — Continued Up-skilling : endless monthly-membership course.
--
-- Applied via Supabase MCP on 2026-06-01. This file mirrors the canonical SQL
-- (source of truth is supabase_migrations.schema_migrations). Additive only —
-- existing courses/batches and the long26/weekend9 logic are untouched.
--
-- Resulting IDs (for reference; do NOT hardcode in app code — resolve by slug):
--   course  c1857a8d-ef52-43b8-b66d-aab96722dcff  (slug: quantum-ai-continued)
--   batch   3c1bcba8-...  QAC-W-SAT  Saturday 20:00 IST  first session 2026-06-20
--   batch   d3326311-...  QAC-W-SUN  Sunday   20:00 IST  first session 2026-06-21
--
-- NOTE: course + batches were seeded is_active=FALSE and are flipped to TRUE at
-- launch (see launch checklist). Variant 'rolling' = no fixed end / curriculum.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Allow the new 'rolling' batch variant (additive to the CHECK constraint).
alter table awa_batches drop constraint if exists awa_batches_variant_check;
alter table awa_batches add constraint awa_batches_variant_check
  check (variant = any (array['long26'::text, 'weekend9'::text, 'rolling'::text]));

-- 2) The course (₹2,999/mo incl 18% GST, monthly tenure, no partner commission,
--    no webinar gate). Seeded inactive; activate at launch.
insert into awa_courses
  (course_code, name, short_name, description, slug, mrp, gst_percent, discount_percent,
   partner_pool_percent, tenure_type, tenure_value, tenure_unit, total_sessions,
   session_duration_mins, requires_webinar, is_active, is_featured, sort_order,
   audience_category, target_audience, seo_title, seo_description)
values
  ('QAC',
   'Quantum & AI — Continued Up-skilling',
   'Continued Up-skilling',
   'An ongoing, never-ending monthly membership: one live 60-minute session every week on the latest and upcoming in AI, Agentic AI, AI automation & tools, AI governance / security / observability, MLOps / DevOps / LLMOps, GPUs, GCC operations and Quantum Computing. For every learner, at every level.',
   'quantum-ai-continued',
   2999, 18, 0,
   0, 'monthly', 1, 'month', null,
   60, false, false, false, 9,
   'general', 'Everyone — all levels, across AI & Quantum',
   'Quantum & AI — Continued Up-skilling | Monthly AI Membership | oStaran',
   'An endless monthly membership with a live 60-min session every week on the latest in AI, Agentic AI, MLOps/LLMOps, GPUs, GCC Ops and Quantum Computing. Rs.2,999/month incl GST. Saturday & Sunday cohorts.')
on conflict (slug) do nothing;

-- 3) Two rolling weekly cohorts (Sat & Sun 20:00 IST). Seeded inactive.
insert into awa_batches
  (course_id, batch_code, label, day_of_week, start_time, start_date, end_date,
   duration_mins, variant, total_sessions, is_active, is_open, max_seats, sort_order)
select c.id, v.batch_code, v.label, v.day_of_week, v.start_time::time, v.start_date::date, null,
       60, 'rolling', 52, false, true, 999, v.sort_order
from (select id from awa_courses where slug = 'quantum-ai-continued') c,
     (values
       ('QAC-W-SAT','Quantum & AI Continued - Weekly - Saturday 20:00 IST','Saturday','20:00:00','2026-06-20',1),
       ('QAC-W-SUN','Quantum & AI Continued - Weekly - Sunday 20:00 IST','Sunday','20:00:00','2026-06-21',2)
     ) as v(batch_code,label,day_of_week,start_time,start_date,sort_order)
on conflict (batch_code) do nothing;
