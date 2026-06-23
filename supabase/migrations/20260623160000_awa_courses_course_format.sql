-- Course tenure/structure, stamped when a (mentor) cohort is scheduled, so the
-- public course card + page reflect reality instead of a hardcoded session count.
-- 'weekend9' | 'long26' | 'rolling' (weekly-ongoing) | 'custom'. NULL = unscheduled/legacy.
alter table awa_courses add column if not exists course_format text;
