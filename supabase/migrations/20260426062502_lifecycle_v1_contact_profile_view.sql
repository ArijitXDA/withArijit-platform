-- ════════════════════════════════════════════════════════════════════════════
-- LIFECYCLE CONTACT PROFILE — unified view across all source tables
-- ════════════════════════════════════════════════════════════════════════════
-- One row per email/mobile with:
--   - identity (email, mobile, name)
--   - stage_reached (highest lifecycle_stage achieved)
--   - ever_* counters (community, library, quiz, resume, webinar, masterclass paid, attended, enrolled)
--   - first_partner_code (sticky attribution from first-seen)
--   - consent flags (computed from lifecycle_consent_log; defaults to opted_in for legacy)
--   - is_suppressed (computed from lifecycle_suppression)
--   - lead_score (0-100, event-driven, 21-day half-life decay)
--   - hot_lead (bool, score >= 60)
--   - last_event_type / last_event_at
--   - active_sequences (array of sequence_keys)
--
-- Lead score formula (Apr 2026 decisions):
--   community_joined        +5
--   quiz_completed         +10
--   library_view (capped)  +3 each, max +15
--   resume_submitted       +20
--   webinar_registered     +15
--   masterclass_registered +30
--   masterclass_paid       +50
--   session_attended free  +25
--   session_attended paid  +35
--   session_rated >=4      +10
--   session_rated <4        -5
--   email_clicked          +2 each, max +10
--   whatsapp_replied        +5
--   email_bounced          -10
--   30+ days no activity   -10
--   60+ days no activity   -20
-- Decay: 21-day half-life via 1 / (1 + days_since_event/21)
-- Hot threshold: 60
-- Cap: 0..100
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW lifecycle_contact_profile AS
WITH

-- ─── A. UNION all source tables into a normalised contact stream ─────────
contact_streams AS (
  SELECT
    LOWER(email)                              AS email,
    mobile                                    AS mobile,
    full_name                                 AS name,
    created_at                                AS first_seen_at,
    'qr_landing_registrations'                AS source,
    utm_source                                AS partner_code
  FROM qr_landing_registrations
  WHERE email IS NOT NULL

  UNION ALL

  SELECT LOWER(email), mobile, name,
         created_at, 'quiz_responses', NULL::TEXT
  FROM quiz_responses
  WHERE email IS NOT NULL

  UNION ALL

  SELECT LOWER(email), NULL::TEXT, NULL::TEXT,
         created_at, 'community_members', NULL::TEXT
  FROM community_members
  WHERE email IS NOT NULL

  UNION ALL

  SELECT LOWER(email), NULL::TEXT, NULL::TEXT,
         viewed_at, 'library_views', NULL::TEXT
  FROM library_views
  WHERE email IS NOT NULL

  UNION ALL

  SELECT LOWER(rs.email), rs.mobile, rs.full_name,
         rs.created_at, 'resume_submissions',
         p.partner_code
  FROM resume_submissions rs
  LEFT JOIN partners p ON p.id = rs.partner_id

  UNION ALL

  SELECT LOWER(student_email), NULL::TEXT, NULL::TEXT,
         created_at, 'student_enrolments', NULL::TEXT
  FROM student_enrolments
  WHERE student_email IS NOT NULL

  UNION ALL

  SELECT LOWER(email::TEXT), mobile::TEXT, full_name::TEXT,
         NULL::TIMESTAMPTZ, 'webinar_ratings', NULL::TEXT
  FROM webinar_ratings
  WHERE email IS NOT NULL
),

-- ─── B. One identity row per email ───────────────────────────────────────
identity AS (
  SELECT
    email,
    (ARRAY_AGG(name) FILTER (WHERE name IS NOT NULL))[1]            AS name,
    (ARRAY_AGG(mobile) FILTER (WHERE mobile IS NOT NULL))[1]        AS mobile,
    MIN(first_seen_at)                                              AS first_seen_at,
    (ARRAY_AGG(partner_code ORDER BY first_seen_at NULLS LAST)
       FILTER (WHERE partner_code IS NOT NULL))[1]                  AS first_partner_code
  FROM contact_streams
  GROUP BY email
),

-- ─── C. Per-email aggregates ─────────────────────────────────────────────
qr_agg AS (
  SELECT
    LOWER(email)                                                AS email,
    COUNT(*) FILTER (WHERE registration_type = 'webinar')       AS ever_webinar_reg_count,
    COUNT(*) FILTER (WHERE registration_type = 'masterclass'
                       AND payment_status = 'paid')             AS ever_masterclass_paid_count,
    COUNT(*) FILTER (WHERE attendance_confirmed = TRUE
                       AND registration_type = 'webinar')       AS ever_attended_free_count,
    COUNT(*) FILTER (WHERE attendance_confirmed = TRUE
                       AND registration_type = 'masterclass')   AS ever_attended_paid_count,
    BOOL_OR(is_enrolled)                                        AS via_qr_enrolled,
    MAX(created_at)                                             AS qr_last_at
  FROM qr_landing_registrations
  WHERE email IS NOT NULL
  GROUP BY LOWER(email)
),
quiz_agg AS (
  SELECT LOWER(email) AS email,
         COUNT(*)                  AS ever_quiz_count,
         MAX(score)                AS best_quiz_score,
         MAX(readiness_level)      AS latest_readiness_level,
         MAX(created_at)           AS quiz_last_at
  FROM quiz_responses WHERE email IS NOT NULL
  GROUP BY LOWER(email)
),
community_agg AS (
  SELECT LOWER(email) AS email,
         COUNT(*)         AS ever_community_count,
         MAX(created_at)  AS community_last_at
  FROM community_members WHERE email IS NOT NULL
  GROUP BY LOWER(email)
),
library_agg AS (
  SELECT LOWER(email) AS email,
         COUNT(*)         AS ever_library_view_count,
         MAX(viewed_at)   AS library_last_at
  FROM library_views WHERE email IS NOT NULL
  GROUP BY LOWER(email)
),
resume_agg AS (
  SELECT LOWER(email) AS email,
         COUNT(*)         AS ever_resume_count,
         MAX(created_at)  AS resume_last_at
  FROM resume_submissions WHERE email IS NOT NULL
  GROUP BY LOWER(email)
),
enrol_agg AS (
  SELECT LOWER(student_email) AS email,
         COUNT(*) FILTER (WHERE is_active = TRUE AND amount_paid > 0)  AS ever_enrolled_count,
         SUM(amount_paid)                                              AS total_paid,
         MAX(created_at)                                               AS enrol_last_at
  FROM student_enrolments WHERE student_email IS NOT NULL
  GROUP BY LOWER(student_email)
),
rating_agg AS (
  SELECT LOWER(email::TEXT) AS email,
         COUNT(*)                AS ever_rating_count,
         AVG(rating::NUMERIC)    AS avg_rating
  FROM webinar_ratings WHERE email IS NOT NULL
  GROUP BY LOWER(email::TEXT)
),

-- ─── E. Latest event per email (from lifecycle_events) ───────────────────
latest_event AS (
  SELECT DISTINCT ON (LOWER(email))
    LOWER(email)        AS email,
    event_type          AS last_event_type,
    occurred_at         AS last_event_at
  FROM lifecycle_events
  WHERE email IS NOT NULL
  ORDER BY LOWER(email), occurred_at DESC
),

-- ─── F. Suppression status ───────────────────────────────────────────────
suppressed AS (
  SELECT LOWER(email) AS email
  FROM lifecycle_suppression
  WHERE email IS NOT NULL
),

-- ─── G. Consent latest state per (email, channel) ────────────────────────
consent_email AS (
  SELECT DISTINCT ON (LOWER(email))
    LOWER(email)  AS email,
    state         AS consent_email_state,
    source        AS consent_email_source,
    recorded_at   AS consent_email_recorded_at
  FROM lifecycle_consent_log
  WHERE channel = 'email'
  ORDER BY LOWER(email), recorded_at DESC
),
consent_wa AS (
  SELECT DISTINCT ON (LOWER(email))
    LOWER(email)  AS email,
    state         AS consent_wa_state,
    source        AS consent_wa_source,
    recorded_at   AS consent_wa_recorded_at
  FROM lifecycle_consent_log
  WHERE channel = 'whatsapp'
  ORDER BY LOWER(email), recorded_at DESC
),

-- ─── H. Active sequences per email ───────────────────────────────────────
active_seq AS (
  SELECT
    LOWER(e.email)                                  AS email,
    ARRAY_AGG(s.sequence_key ORDER BY s.priority)   AS active_sequences
  FROM lifecycle_sequence_enrolments e
  JOIN lifecycle_sequences s ON s.id = e.sequence_id
  WHERE e.status = 'active'
  GROUP BY LOWER(e.email)
),

-- ─── I. Lead score from lifecycle_events (decayed) ───────────────────────
event_points AS (
  SELECT
    LOWER(email)  AS email,
    event_type,
    occurred_at,
    metadata,
    EXTRACT(EPOCH FROM (NOW() - occurred_at)) / 86400.0  AS days_ago,
    CASE event_type
      WHEN 'community_joined'        THEN 5
      WHEN 'quiz_completed'          THEN 10
      WHEN 'library_view'            THEN 3
      WHEN 'resume_submitted'        THEN 20
      WHEN 'webinar_registered'      THEN 15
      WHEN 'masterclass_registered'  THEN 30
      WHEN 'masterclass_paid'        THEN 50
      WHEN 'session_attended'        THEN
        CASE WHEN metadata->>'registration_type' = 'masterclass' THEN 35 ELSE 25 END
      WHEN 'session_rated'           THEN
        CASE WHEN COALESCE((metadata->>'rating')::INT, 0) >= 4 THEN 10 ELSE -5 END
      WHEN 'email_clicked'           THEN 2
      WHEN 'whatsapp_replied'        THEN 5
      WHEN 'email_bounced'           THEN -10
      ELSE 0
    END AS raw_points
  FROM lifecycle_events
  WHERE email IS NOT NULL
),

event_points_capped AS (
  SELECT
    email, event_type, occurred_at, days_ago,
    CASE
      WHEN event_type = 'library_view' AND
           ROW_NUMBER() OVER (PARTITION BY email, event_type ORDER BY occurred_at DESC) > 5
        THEN 0
      WHEN event_type = 'email_clicked' AND
           ROW_NUMBER() OVER (PARTITION BY email, event_type ORDER BY occurred_at DESC) > 5
        THEN 0
      ELSE raw_points
    END AS capped_points
  FROM event_points
),

decayed_sum AS (
  SELECT
    email,
    SUM(capped_points::NUMERIC / (1 + days_ago / 21.0))            AS decayed_score
  FROM event_points_capped
  GROUP BY email
),

inactivity_penalty AS (
  SELECT
    LOWER(email)  AS email,
    CASE
      WHEN MAX(occurred_at) < NOW() - INTERVAL '60 days' THEN -20
      WHEN MAX(occurred_at) < NOW() - INTERVAL '30 days' THEN -10
      ELSE 0
    END AS penalty
  FROM lifecycle_events
  WHERE email IS NOT NULL
  GROUP BY LOWER(email)
)

-- ─── FINAL ASSEMBLY ──────────────────────────────────────────────────────
SELECT
  i.email,
  i.mobile,
  i.name,
  i.first_seen_at,
  i.first_partner_code                              AS partner_code,

  COALESCE(qa.ever_webinar_reg_count, 0)            AS ever_webinar_reg_count,
  COALESCE(qa.ever_masterclass_paid_count, 0)       AS ever_masterclass_paid_count,
  COALESCE(qa.ever_attended_free_count, 0)          AS ever_attended_free_count,
  COALESCE(qa.ever_attended_paid_count, 0)          AS ever_attended_paid_count,
  COALESCE(qza.ever_quiz_count, 0)                  AS ever_quiz_count,
  qza.best_quiz_score,
  qza.latest_readiness_level,
  COALESCE(ca.ever_community_count, 0)              AS ever_community_count,
  COALESCE(la.ever_library_view_count, 0)           AS ever_library_view_count,
  COALESCE(ra.ever_resume_count, 0)                 AS ever_resume_count,
  COALESCE(ea.ever_enrolled_count, 0)               AS ever_enrolled_count,
  COALESCE(ea.total_paid, 0)                        AS total_paid,
  COALESCE(rta.ever_rating_count, 0)                AS ever_rating_count,
  rta.avg_rating,

  CASE
    WHEN COALESCE(ea.ever_enrolled_count, 0)         > 0 THEN 'enrolled'
    WHEN COALESCE(qa.ever_attended_paid_count, 0)    > 0 THEN 'attended_paid'
    WHEN COALESCE(qa.ever_attended_free_count, 0)    > 0 THEN 'attended_free'
    WHEN COALESCE(qa.ever_masterclass_paid_count, 0) > 0 THEN 'registered_paid'
    WHEN COALESCE(qa.ever_webinar_reg_count, 0)      > 0 THEN 'registered_free'
    WHEN COALESCE(ra.ever_resume_count, 0)           > 0 THEN 'warm'
    WHEN COALESCE(qza.ever_quiz_count, 0)            > 0 THEN 'warm'
    WHEN COALESCE(la.ever_library_view_count, 0)     > 0 THEN 'cold'
    WHEN COALESCE(ca.ever_community_count, 0)        > 0 THEN 'cold'
    ELSE 'anonymous'
  END::lifecycle_stage                              AS stage_reached,

  le.last_event_type,
  le.last_event_at,

  (sp.email IS NOT NULL)                            AS is_suppressed,

  COALESCE(ce.consent_email_state, 'opted_in')      AS consent_email_state,
  COALESCE(ce.consent_email_source, 'legacy_pre_2026_05') AS consent_email_source,
  ce.consent_email_recorded_at,
  COALESCE(cw.consent_wa_state, 'opted_in')         AS consent_whatsapp_state,
  COALESCE(cw.consent_wa_source, 'legacy_pre_2026_05')    AS consent_whatsapp_source,
  cw.consent_wa_recorded_at,

  asq.active_sequences,

  GREATEST(0, LEAST(100,
    ROUND(COALESCE(ds.decayed_score, 0) + COALESCE(ip.penalty, 0))
  ))::INT                                           AS lead_score,

  (
    GREATEST(0, LEAST(100,
      ROUND(COALESCE(ds.decayed_score, 0) + COALESCE(ip.penalty, 0))
    )) >= 60
    AND sp.email IS NULL
    AND COALESCE(ea.ever_enrolled_count, 0) = 0
  )                                                 AS is_hot_lead

FROM identity i
LEFT JOIN qr_agg          qa  ON qa.email  = i.email
LEFT JOIN quiz_agg        qza ON qza.email = i.email
LEFT JOIN community_agg   ca  ON ca.email  = i.email
LEFT JOIN library_agg     la  ON la.email  = i.email
LEFT JOIN resume_agg      ra  ON ra.email  = i.email
LEFT JOIN enrol_agg       ea  ON ea.email  = i.email
LEFT JOIN rating_agg      rta ON rta.email = i.email
LEFT JOIN latest_event    le  ON le.email  = i.email
LEFT JOIN suppressed      sp  ON sp.email  = i.email
LEFT JOIN consent_email   ce  ON ce.email  = i.email
LEFT JOIN consent_wa      cw  ON cw.email  = i.email
LEFT JOIN active_seq      asq ON asq.email = i.email
LEFT JOIN decayed_sum     ds  ON ds.email  = i.email
LEFT JOIN inactivity_penalty ip ON ip.email = i.email;

COMMENT ON VIEW lifecycle_contact_profile IS
  'Unified contact view across qr_landing, quiz, community, library, resume, enrolments, ratings. One row per email. lead_score uses 21-day half-life decay; hot_lead = score>=60 AND not suppressed AND not enrolled.';

GRANT SELECT ON lifecycle_contact_profile TO authenticated;
