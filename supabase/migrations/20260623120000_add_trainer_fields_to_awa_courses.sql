-- Per-course trainer/mentor identity for the public course landing page.
-- All nullable → NULL renders the oStaran default (Arijit Chowdhury). Mentor
-- courses (Mentor portal) populate these to attribute the course to the mentor.
alter table awa_courses
  add column if not exists trainer_name text,
  add column if not exists trainer_title text,
  add column if not exists trainer_location text,
  add column if not exists trainer_bio text,
  add column if not exists trainer_photo_url text,
  add column if not exists trainer_linkedin text,
  add column if not exists trainer_credentials jsonb,        -- [{label,value,sub}]
  add column if not exists trainer_research_areas jsonb;      -- ["Agentic AI", ...]

comment on column awa_courses.trainer_name is
  'Course trainer/mentor display name. NULL = oStaran default (Arijit Chowdhury). Set per mentor course.';
