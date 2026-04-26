-- ════════════════════════════════════════════════════════════════════════════
-- LIFECYCLE COMMS ENGINE — v1 FOUNDATION
-- ════════════════════════════════════════════════════════════════════════════
-- Adds the schema scaffolding for a unified lifecycle communications engine.
-- This migration is purely additive: 8 tables, 5 enums, indexes, RLS.
-- Does NOT touch any existing table. Does NOT seed sequences/templates.
-- Does NOT deploy any edge function. Backfill runs as a separate script.
--
-- Decisions locked (Apr 2026):
--   1. Prefix:     lifecycle_*
--   2. Dispatcher: Supabase Edge Function + pg_cron (Phase 2a)
--   3. Templates:  DB-stored (lifecycle_templates)
--   4. Phase 2a:   S8 + S1 in parallel
--   5. Consent:    Day 1 (DPDP/GDPR-ready)
--   6. Lead score: Day 1, in lifecycle_contact_profile view
--   7. AiSensy:    Plan B (templates after engine)
--   8. Hot:        score >= 60
--   9. Paid attend points: +35
--  10. Decay half-life: 21 days
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. ENUM TYPES ─────────────────────────────────────────────────────────

CREATE TYPE lifecycle_track AS ENUM ('student', 'partner', 'recruiter');

CREATE TYPE lifecycle_stage AS ENUM (
  'anonymous', 'cold', 'warm',
  'registered_free', 'registered_paid',
  'attended_free', 'attended_paid',
  'enrolled', 'lost', 'suppressed'
);

CREATE TYPE lifecycle_event_type AS ENUM (
  'community_joined', 'library_view', 'quiz_completed',
  'resume_submitted', 'contact_form_submitted', 'partner_referral',
  'webinar_registered', 'masterclass_registered', 'masterclass_paid',
  'session_attended', 'session_no_show', 'session_rated',
  'course_enrolled', 'course_completed',
  'email_sent', 'email_delivered', 'email_opened', 'email_clicked', 'email_bounced',
  'whatsapp_sent', 'whatsapp_delivered', 'whatsapp_read', 'whatsapp_replied',
  'unsubscribed', 'do_not_contact_set', 'suppression_added',
  'stage_advanced', 'stage_regressed'
);

CREATE TYPE lifecycle_seq_status AS ENUM (
  'active', 'completed', 'exited', 'paused', 'failed'
);

CREATE TYPE lifecycle_channel AS ENUM ('email', 'whatsapp', 'sms');

-- ─── 2. UPDATED_AT TRIGGER FUNCTION ────────────────────────────────────────

CREATE OR REPLACE FUNCTION lifecycle_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 3. CORE TABLE: lifecycle_events ───────────────────────────────────────

CREATE TABLE lifecycle_events (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email              TEXT,
  mobile             TEXT,
  event_type         lifecycle_event_type NOT NULL,
  event_source_table TEXT,
  source_row_id      UUID,
  track              lifecycle_track NOT NULL DEFAULT 'student',
  occurred_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  metadata           JSONB        NOT NULL DEFAULT '{}'::jsonb,
  backfilled         BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX lifecycle_events_idempotency_idx
  ON lifecycle_events (event_source_table, source_row_id, event_type)
  WHERE event_source_table IS NOT NULL AND source_row_id IS NOT NULL;

CREATE INDEX lifecycle_events_email_occurred_idx
  ON lifecycle_events (LOWER(email), occurred_at DESC) WHERE email IS NOT NULL;
CREATE INDEX lifecycle_events_mobile_occurred_idx
  ON lifecycle_events (mobile, occurred_at DESC) WHERE mobile IS NOT NULL;
CREATE INDEX lifecycle_events_type_occurred_idx
  ON lifecycle_events (event_type, occurred_at DESC);
CREATE INDEX lifecycle_events_track_occurred_idx
  ON lifecycle_events (track, occurred_at DESC);

COMMENT ON TABLE  lifecycle_events IS 'Append-only event log. Every lifecycle-relevant action becomes one row.';
COMMENT ON COLUMN lifecycle_events.metadata IS 'partner_code, utm_*, registration_type, rating, final_price, course_name, webinar_date, etc.';
COMMENT ON COLUMN lifecycle_events.backfilled IS 'TRUE if from historical backfill. Dispatcher MUST ignore for new sequence enrolments.';

-- ─── 4. lifecycle_sequences ────────────────────────────────────────────────

CREATE TABLE lifecycle_sequences (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_key      TEXT         UNIQUE NOT NULL,
  name              TEXT         NOT NULL,
  description       TEXT,
  track             lifecycle_track NOT NULL DEFAULT 'student',
  trigger_event     lifecycle_event_type NOT NULL,
  trigger_filter    JSONB        NOT NULL DEFAULT '{}'::jsonb,
  exit_on_events    lifecycle_event_type[] NOT NULL DEFAULT ARRAY[]::lifecycle_event_type[],
  is_active         BOOLEAN      NOT NULL DEFAULT FALSE,
  version           INT          NOT NULL DEFAULT 1,
  priority          INT          NOT NULL DEFAULT 2,
  created_by        UUID,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER lifecycle_sequences_updated_at
  BEFORE UPDATE ON lifecycle_sequences
  FOR EACH ROW EXECUTE FUNCTION lifecycle_set_updated_at();

CREATE INDEX lifecycle_sequences_active_idx
  ON lifecycle_sequences (is_active, trigger_event) WHERE is_active = TRUE;

-- ─── 5. lifecycle_sequence_steps ───────────────────────────────────────────

CREATE TABLE lifecycle_sequence_steps (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id         UUID         NOT NULL REFERENCES lifecycle_sequences(id) ON DELETE CASCADE,
  step_index          INT          NOT NULL,
  delay_hours         INT          NOT NULL DEFAULT 0,
  absolute_anchor     TEXT,
  anchor_offset_hours INT,
  send_window_start   TIME         DEFAULT '09:00',
  send_window_end     TIME         DEFAULT '21:00',
  channel             lifecycle_channel NOT NULL,
  template_key        TEXT         NOT NULL,
  conditions          JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (sequence_id, step_index)
);

CREATE TRIGGER lifecycle_sequence_steps_updated_at
  BEFORE UPDATE ON lifecycle_sequence_steps
  FOR EACH ROW EXECUTE FUNCTION lifecycle_set_updated_at();

CREATE INDEX lifecycle_sequence_steps_sequence_idx
  ON lifecycle_sequence_steps (sequence_id, step_index);

-- ─── 6. lifecycle_sequence_enrolments ──────────────────────────────────────

CREATE TABLE lifecycle_sequence_enrolments (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id         UUID         NOT NULL REFERENCES lifecycle_sequences(id) ON DELETE CASCADE,
  email               TEXT         NOT NULL,
  mobile              TEXT,
  context             JSONB        NOT NULL DEFAULT '{}'::jsonb,
  enrolled_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  current_step_index  INT          NOT NULL DEFAULT 0,
  status              lifecycle_seq_status NOT NULL DEFAULT 'active',
  exit_reason         TEXT,
  next_send_at        TIMESTAMPTZ,
  last_sent_at        TIMESTAMPTZ,
  last_attempt_at     TIMESTAMPTZ,
  failure_count       INT          NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER lifecycle_sequence_enrolments_updated_at
  BEFORE UPDATE ON lifecycle_sequence_enrolments
  FOR EACH ROW EXECUTE FUNCTION lifecycle_set_updated_at();

CREATE UNIQUE INDEX lifecycle_seq_enrol_unique_active_idx
  ON lifecycle_sequence_enrolments (sequence_id, LOWER(email))
  WHERE status = 'active';

CREATE INDEX lifecycle_seq_enrol_dispatch_idx
  ON lifecycle_sequence_enrolments (status, next_send_at)
  WHERE status = 'active' AND next_send_at IS NOT NULL;

CREATE INDEX lifecycle_seq_enrol_email_idx
  ON lifecycle_sequence_enrolments (LOWER(email));

-- ─── 7. lifecycle_templates ────────────────────────────────────────────────

CREATE TABLE lifecycle_templates (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key             TEXT         NOT NULL,
  channel                  lifecycle_channel NOT NULL,
  version                  INT          NOT NULL DEFAULT 1,
  subject                  TEXT,
  preview_text             TEXT,
  body_html                TEXT,
  body_text                TEXT,
  aisensy_campaign_name    TEXT,
  aisensy_param_order      TEXT[],
  variables_declared       JSONB        NOT NULL DEFAULT '{}'::jsonb,
  is_active                BOOLEAN      NOT NULL DEFAULT FALSE,
  created_by               UUID,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (template_key, version)
);

CREATE TRIGGER lifecycle_templates_updated_at
  BEFORE UPDATE ON lifecycle_templates
  FOR EACH ROW EXECUTE FUNCTION lifecycle_set_updated_at();

CREATE INDEX lifecycle_templates_active_key_idx
  ON lifecycle_templates (template_key) WHERE is_active = TRUE;

-- ─── 8. lifecycle_suppression ──────────────────────────────────────────────

CREATE TABLE lifecycle_suppression (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT,
  mobile       TEXT,
  channels     lifecycle_channel[] NOT NULL DEFAULT ARRAY['email','whatsapp']::lifecycle_channel[],
  reason       TEXT         NOT NULL,
  notes        TEXT,
  set_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  set_by       UUID,
  CONSTRAINT lifecycle_suppression_identity_chk
    CHECK (email IS NOT NULL OR mobile IS NOT NULL)
);

CREATE UNIQUE INDEX lifecycle_suppression_email_idx
  ON lifecycle_suppression (LOWER(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX lifecycle_suppression_mobile_idx
  ON lifecycle_suppression (mobile) WHERE mobile IS NOT NULL;

-- ─── 9. lifecycle_consent_log ──────────────────────────────────────────────

CREATE TABLE lifecycle_consent_log (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT         NOT NULL,
  mobile          TEXT,
  channel         lifecycle_channel NOT NULL,
  state           TEXT         NOT NULL CHECK (state IN ('opted_in','opted_out','withdrawn')),
  source          TEXT         NOT NULL,
  ip_address      TEXT,
  user_agent      TEXT,
  set_by          UUID,
  recorded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  metadata        JSONB        NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX lifecycle_consent_log_email_channel_idx
  ON lifecycle_consent_log (LOWER(email), channel, recorded_at DESC);

COMMENT ON TABLE lifecycle_consent_log IS 'Append-only consent audit. Latest row by recorded_at = current state for (email,channel).';

-- ─── 10. lifecycle_dispatch_log ────────────────────────────────────────────

CREATE TABLE lifecycle_dispatch_log (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  enrolment_id        UUID         REFERENCES lifecycle_sequence_enrolments(id) ON DELETE SET NULL,
  sequence_id         UUID         REFERENCES lifecycle_sequences(id) ON DELETE SET NULL,
  step_index          INT,
  channel             lifecycle_channel,
  template_key        TEXT,
  recipient_email     TEXT,
  recipient_mobile    TEXT,
  status              TEXT         NOT NULL,
  skip_reason         TEXT,
  provider            TEXT,
  provider_message_id TEXT,
  error_message       TEXT,
  attempted_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  duration_ms         INT
);

CREATE INDEX lifecycle_dispatch_log_enrolment_idx
  ON lifecycle_dispatch_log (enrolment_id, attempted_at DESC);
CREATE INDEX lifecycle_dispatch_log_recent_idx
  ON lifecycle_dispatch_log (attempted_at DESC);

-- ─── 11. RLS POLICIES ──────────────────────────────────────────────────────

ALTER TABLE lifecycle_events                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifecycle_sequences               ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifecycle_sequence_steps          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifecycle_sequence_enrolments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifecycle_templates               ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifecycle_suppression             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifecycle_consent_log             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifecycle_dispatch_log            ENABLE ROW LEVEL SECURITY;

CREATE POLICY lifecycle_events_admin_read ON lifecycle_events
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.id = auth.uid() AND au.status = 'active' AND au.role IN ('super_admin','dev_admin')));

CREATE POLICY lifecycle_sequences_admin_read ON lifecycle_sequences
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.id = auth.uid() AND au.status = 'active' AND au.role IN ('super_admin','dev_admin')));

CREATE POLICY lifecycle_sequence_steps_admin_read ON lifecycle_sequence_steps
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.id = auth.uid() AND au.status = 'active' AND au.role IN ('super_admin','dev_admin')));

CREATE POLICY lifecycle_sequence_enrolments_admin_read ON lifecycle_sequence_enrolments
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.id = auth.uid() AND au.status = 'active' AND au.role IN ('super_admin','dev_admin')));

CREATE POLICY lifecycle_templates_admin_read ON lifecycle_templates
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.id = auth.uid() AND au.status = 'active' AND au.role IN ('super_admin','dev_admin')));

CREATE POLICY lifecycle_suppression_admin_read ON lifecycle_suppression
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.id = auth.uid() AND au.status = 'active' AND au.role IN ('super_admin','dev_admin')));

CREATE POLICY lifecycle_consent_log_admin_read ON lifecycle_consent_log
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.id = auth.uid() AND au.status = 'active' AND au.role IN ('super_admin','dev_admin')));

CREATE POLICY lifecycle_dispatch_log_admin_read ON lifecycle_dispatch_log
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.id = auth.uid() AND au.status = 'active' AND au.role IN ('super_admin','dev_admin')));

GRANT SELECT ON lifecycle_events                TO authenticated;
GRANT SELECT ON lifecycle_sequences             TO authenticated;
GRANT SELECT ON lifecycle_sequence_steps        TO authenticated;
GRANT SELECT ON lifecycle_sequence_enrolments   TO authenticated;
GRANT SELECT ON lifecycle_templates             TO authenticated;
GRANT SELECT ON lifecycle_suppression           TO authenticated;
GRANT SELECT ON lifecycle_consent_log           TO authenticated;
GRANT SELECT ON lifecycle_dispatch_log          TO authenticated;
