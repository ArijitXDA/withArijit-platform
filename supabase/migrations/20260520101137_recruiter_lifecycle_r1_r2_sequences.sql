-- ════════════════════════════════════════════════════════════════════════════
-- Recruiter lifecycle — R1 (welcome+verify) and R2 (approval landed)
-- Wires the existing lifecycle engine to the new recruiters table.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Add three new event types to the enum ──────────────────────────────
ALTER TYPE lifecycle_event_type ADD VALUE IF NOT EXISTS 'recruiter_signed_up';
ALTER TYPE lifecycle_event_type ADD VALUE IF NOT EXISTS 'recruiter_approved';
ALTER TYPE lifecycle_event_type ADD VALUE IF NOT EXISTS 'recruiter_first_job_posted';
