-- Mentor-authored landing-page content for /courses/[slug] (what-you-get,
-- curriculum highlights, session list, projects, FAQs). NULL for oStaran courses
-- (they render the existing category-driven copy). Additive/safe.
alter table awa_courses add column if not exists landing_content jsonb;
