-- ============================================================================
-- Lifecycle v1 - Drop orphan "Set B" triggers and functions
-- ============================================================================
-- Two parallel sets of lifecycle event-emission triggers ended up in production
-- because the original Part 3 migration (20260426102904) was superseded by a
-- redesigned version (20260426105746) without dropping the old triggers/functions.
--
-- The CANONICAL set (Set A) uses the naming convention:
--   trg_lifecycle_<entity>_<action>  ->  lifecycle_emit_<entity>_<action>()
--
-- The OBSOLETE set (Set B) uses:
--   lifecycle_<table>_after_<action>  ->  lifecycle_emit_<entity>_event()
--
-- Both write the same data into lifecycle_events. The unique index on
-- (event_source_table, source_row_id, event_type) prevents duplicates,
-- so production was never wrong - just doing 2x the work per source insert.
--
-- This migration is idempotent (DROP IF EXISTS) so it's safe on a fresh DB
-- where Set B never existed.
-- ============================================================================

-- Drop Set B triggers (one per source table + auto-enrol)
DROP TRIGGER IF EXISTS lifecycle_qr_landing_after_insert       ON qr_landing_registrations;
DROP TRIGGER IF EXISTS lifecycle_qr_landing_after_update       ON qr_landing_registrations;
DROP TRIGGER IF EXISTS lifecycle_quiz_responses_after_insert   ON quiz_responses;
DROP TRIGGER IF EXISTS lifecycle_community_members_after_insert ON community_members;
DROP TRIGGER IF EXISTS lifecycle_library_views_after_insert    ON library_views;
DROP TRIGGER IF EXISTS lifecycle_resume_submissions_after_insert ON resume_submissions;
DROP TRIGGER IF EXISTS lifecycle_student_enrolments_after_insert ON student_enrolments;
DROP TRIGGER IF EXISTS lifecycle_webinar_ratings_after_insert  ON webinar_ratings;
DROP TRIGGER IF EXISTS lifecycle_events_auto_enrol_after_insert ON lifecycle_events;

-- Drop Set B functions (no longer referenced after triggers gone)
DROP FUNCTION IF EXISTS lifecycle_emit_qr_landing_event();
DROP FUNCTION IF EXISTS lifecycle_emit_quiz_response_event();
DROP FUNCTION IF EXISTS lifecycle_emit_community_member_event();
DROP FUNCTION IF EXISTS lifecycle_emit_library_view_event();
DROP FUNCTION IF EXISTS lifecycle_emit_resume_submission_event();
DROP FUNCTION IF EXISTS lifecycle_emit_student_enrolment_event();
DROP FUNCTION IF EXISTS lifecycle_emit_webinar_rating_event();
DROP FUNCTION IF EXISTS lifecycle_auto_enrol_on_event();
