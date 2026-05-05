# oStaran Lifecycle Comms Engine — Complete Context
*Snapshot as of 2026-05-02. Authoritative handoff doc for Phase 2a → Phase 2b transition.*

> **For new Claude on new Mac:** This doc + the migration files in `withArijit-platform/supabase/migrations/20260426*.sql` + the dispatcher source at `withArijit-platform/supabase/functions/lifecycle-dispatcher/index.ts` are the canonical truth. Read this end-to-end before touching anything.

---

## 1. Executive summary

**Goal**: A DB-driven, per-contact, per-channel lifecycle communications engine that automatically nurtures leads from registration → enrolment, with strict guarantees against sending wrong info (date, time, link) to anyone.

**Status (2026-05-02)**:
- Phase 1 (foundation tables + lead-score view): ✅ LIVE
- Phase 2a-1 (sequences + templates seeded): ✅ LIVE
- Phase 2a-2 (dispatcher edge function v2): ✅ LIVE
- Phase 2a-3 (DB triggers + auto-enrol + pg_cron): ✅ LIVE
- Sequences ACTIVE: **S1** (Free Webinar Attendance) + **S8** (Post-Paid Masterclass Enrol Push)
- Roadmap item **A** (`/unsubscribe/[enrolment_id]` page): 🟡 In progress — Vercel build was failing on TS narrowing, fix is on disk + pushed to origin/main, just needs Vercel to confirm green
- Roadmap items **B → C → D → E**: ⏸ Queued (see §10)

**Architectural one-liner**: Source-table INSERT/UPDATE → DB trigger emits row to `lifecycle_events` → another trigger auto-enrols matching active sequences → pg_cron tick (every 5 min) calls `lifecycle-dispatcher` edge function → dispatcher renders templates with strict variable validation → sends via Resend (email) or AiSensy (WhatsApp) → logs everything → advances to next step.

---

## 2. Locked design decisions

These were debated and locked during Phase 1. Don't re-litigate without explicit reason:

1. **Table prefix**: `lifecycle_*`
2. **Dispatcher**: Supabase Edge Function (Deno) + pg_cron (no external worker, no GitHub Actions cron)
3. **Templates**: stored in DB (`lifecycle_templates`), not files on disk
4. **Phase 2a scope**: S8 (post-paid-masterclass) + S1 (free webinar) running in parallel
5. **Consent flags**: Day 1, DPDP/GDPR-ready (`lifecycle_consent_log` + `lifecycle_suppression`)
6. **Lead score**: Day 1, computed in `lifecycle_contact_profile` view (not materialized)
7. **AiSensy**: Plan B — wire WA templates into the engine but mark `is_active=FALSE` until Meta approves; dispatcher cleanly skips them
8. **Hot lead threshold**: score ≥ 60
9. **Paid masterclass attendance**: +35 points
10. **Decay half-life**: 21 days
11. **Stage model**: `anonymous → cold → warm → registered_free → registered_paid → attended_free → attended_paid → enrolled` plus `-1 lost`, `-2 suppressed`
12. **Track dimension**: `student | partner | recruiter` on every event/sequence/enrolment. **Student-track ships first.** Partner & recruiter tracks deferred to v2.
13. **Free webinar + paid masterclass = SAME Sunday session, two doors**: webinar.ostaran.com (free, partner-code) vs ostaran.com/masterclass (paid <₹4000, UTM-driven). `qr_landing_registrations.registration_type` ('webinar' | 'masterclass') is the discriminator. Saturday partner webinars = separate track, deferred.
14. **Send philosophy**: never silently substitute. If a critical variable is missing, exit the sequence with reason — don't lie to the user. (Learned the hard way: webinar_time has 4 distinct values in production: 11:00, 14:00, 15:30, 17:00. NO default-to-11:00 fallback.)

---

## 3. Database schema

All under `public` schema in Supabase ref `enszifyeqnwcnxaqrmrq`.

### 3.1 Tables (8)

#### `lifecycle_events`
The append-only event log. Every meaningful contact action.
- `id uuid pk`
- `email text NOT NULL` (lowercased)
- `mobile text`
- `event_type lifecycle_event_type` (enum)
- `event_source_table text` (which table triggered it)
- `source_row_id uuid` (the row in that table)
- `track lifecycle_track` (enum, default 'student')
- `metadata jsonb` (rich snapshot of fields at event time — webinar_date, time, profession, partner, etc.)
- `backfilled boolean` (true = imported historical data; auto-enrol IGNORES these)
- `occurred_at timestamptz`, `created_at timestamptz`
- **Unique index** on `(event_source_table, source_row_id, event_type)` — idempotency for re-emission

#### `lifecycle_sequences`
The orchestration definitions.
- `id uuid pk`
- `sequence_key text UNIQUE`
- `description text`
- `track lifecycle_track`
- `priority int` (1=high)
- `trigger_event lifecycle_event_type`
- `trigger_filter jsonb` (e.g. `{"registration_type": "webinar"}` — must be contained in event metadata)
- `exit_on_events lifecycle_event_type[]` (events that exit an active enrolment)
- `is_active boolean` ← **THIS IS THE KILL SWITCH**

#### `lifecycle_sequence_steps`
Steps within a sequence.
- `id uuid pk`, `sequence_id uuid fk`, `step_index int`
- `template_key text` (joins to `lifecycle_templates`)
- `channel lifecycle_channel` ('email' | 'whatsapp')
- `delay_hours int` (cumulative from enrolment time)
- `absolute_anchor text` ('webinar_date' | null) — when set, step is anchored to a context date instead of relative delay
- `anchor_offset_hours int` (e.g. -24 = 24h before webinar)
- `send_window_start time`, `send_window_end time` (IST window — outside this window, push forward)

#### `lifecycle_sequence_enrolments`
Per-contact participation in a sequence.
- `id uuid pk`
- `sequence_id uuid fk`, `email text`, `mobile text`
- `context jsonb` (frozen snapshot of trigger metadata — what's used at render time)
- `enrolled_at timestamptz`
- `current_step_index int` (next step to fire)
- `status lifecycle_seq_status` ('active' | 'paused' | 'exited' | 'completed' | 'failed')
- `next_send_at timestamptz` (when dispatcher should pick this up)
- `last_sent_at`, `last_attempt_at timestamptz`
- `failure_count int`, `exit_reason text`
- **Partial unique index** on `(sequence_id, lower(email))` WHERE `status='active'` — prevents double-enrolment

#### `lifecycle_templates`
The actual email subjects/bodies + WhatsApp template config.
- `id uuid pk`
- `template_key text`, `version int` (latest version wins)
- `channel lifecycle_channel`
- `is_active boolean` (FALSE = skip cleanly)
- `subject text`, `body_html text`, `body_text text` (for email)
- `aisensy_campaign_name text`, `aisensy_param_order text[]` (for whatsapp)
- `variables_declared jsonb` ← **dispatcher's strict validation list**

#### `lifecycle_suppression`
Hard opt-outs. Email is matched lowercase.
- `id uuid pk`, `email text`, `mobile text`
- `channels text[]` ('email' and/or 'whatsapp')
- `reason text` ('user_unsubscribe', 'bounce', 'complaint', etc.)
- `notes text`
- **Check constraint**: email OR mobile must be present
- **Partial unique index** on `lower(email)` WHERE `email IS NOT NULL`

#### `lifecycle_consent_log`
Audit trail (DPDP/GDPR §11).
- `id uuid pk`, `email text`, `mobile text`, `channel lifecycle_channel`
- `state text` (CHECK: 'opted_in' | 'opted_out' | 'withdrawn')
- `source text` ('user_unsubscribe', 'reg_form', 'legacy_pre_2026_05', etc.)
- `ip_address text`, `user_agent text`, `metadata jsonb`
- `recorded_at timestamptz`

#### `lifecycle_dispatch_log`
Every send attempt.
- `id uuid pk`, `enrolment_id uuid fk`, `sequence_id uuid fk`, `step_index int`
- `channel`, `template_key`, `recipient_email`, `recipient_mobile`
- `status text` ('sent' | 'skipped' | 'failed')
- `skip_reason text` ('sequence_inactive' | 'template_not_found' | 'template_inactive_aisensy_pending' | 'suppressed' | 'no_consent' | 'no_mobile' | 'missing_critical_vars:foo,bar')
- `provider text` ('resend' | 'aisensy')
- `provider_message_id text`, `error_message text`
- `duration_ms int`, `attempted_at timestamptz`

### 3.2 Enums (5)
- `lifecycle_track` = 'student' | 'partner' | 'recruiter'
- `lifecycle_stage` = 'anonymous' | 'cold' | 'warm' | 'registered_free' | 'registered_paid' | 'attended_free' | 'attended_paid' | 'enrolled' | 'lost' | 'suppressed'
- `lifecycle_event_type` = 'webinar_registered' | 'masterclass_registered' | 'masterclass_paid' | 'session_attended' | 'session_rated' | 'quiz_completed' | 'community_joined' | 'library_view' | 'resume_submitted' | 'course_enrolled' | 'email_sent' | 'whatsapp_sent' | 'email_clicked' | 'unsubscribed' | 'do_not_contact_set' | (and a few more)
- `lifecycle_seq_status` = 'active' | 'paused' | 'exited' | 'completed' | 'failed'
- `lifecycle_channel` = 'email' | 'whatsapp'

### 3.3 View — `lifecycle_contact_profile`
UNION across 7 source tables (qr_landing_registrations, quiz_responses, community_members, library_views, resume_submissions, student_enrolments, webinar_ratings). Returns one row per unique email with computed:
- `lead_score` (21-day half-life decay: `1/(1 + days_ago/21)` weighted by event-type points; library_view + email_clicked capped to 5 events each; inactivity penalty -10/-20 at 30/60 days)
- `stage` (current pipeline stage)
- `is_hot_lead` (score≥60 AND not suppressed AND not enrolled)
- Default consent state for legacy contacts = `'opted_in'` source `'legacy_pre_2026_05'`

At launch: 483 unique contacts, 802 backfilled events. Stage distribution: enrolled=5, attended_free=11, registered_paid=1, registered_free=387, warm=69, cold=2.

### 3.4 RLS
8 RLS policies, all `lifecycle_*` tables service-role-only writes. `lifecycle_dispatch_log` and `lifecycle_events` admin-readable.

### 3.5 Triggers (9 — canonical "Set A")
All use `SECURITY DEFINER` + `EXCEPTION WHEN OTHERS` (so a lifecycle bug can NEVER break a source INSERT):

| Trigger | Table | Fires | Function |
|---|---|---|---|
| `trg_lifecycle_qr_landing_insert` | qr_landing_registrations | AFTER INSERT | `lifecycle_emit_qr_landing_insert()` → emits `webinar_registered` or `masterclass_registered` |
| `trg_lifecycle_qr_landing_update` | qr_landing_registrations | AFTER UPDATE OF payment_status, attendance_confirmed | `lifecycle_emit_qr_landing_update()` → emits `masterclass_paid` and/or `session_attended` |
| `trg_lifecycle_webinar_rating` | webinar_ratings | AFTER INSERT | `lifecycle_emit_webinar_rating()` → `session_rated` (note: cols are varchar, needs ::TEXT casts) |
| `trg_lifecycle_quiz_response` | quiz_responses | AFTER INSERT | `lifecycle_emit_quiz_response()` → `quiz_completed` (uses `name`, not `full_name`) |
| `trg_lifecycle_community_join` | community_members | AFTER INSERT | `lifecycle_emit_community_join()` → `community_joined` (mobile col = `whatsapp`, name col = `display_name`) |
| `trg_lifecycle_library_view` | library_views | AFTER INSERT | `lifecycle_emit_library_view()` → only emits if `status IN ('success','served','ok')` |
| `trg_lifecycle_resume_submitted` | resume_submissions | AFTER INSERT | `lifecycle_emit_resume_submitted()` → skips if `is_spam=TRUE` |
| `trg_lifecycle_course_enrolled` | student_enrolments | AFTER INSERT | `lifecycle_emit_course_enrolled()` → only when `is_active AND amount_paid > 0` |
| `trg_lifecycle_auto_enrol` | lifecycle_events | AFTER INSERT | `lifecycle_auto_enrol()` — see §3.6 |

⚠️ **Earlier "Set B" parallel triggers were dropped 2026-04-26** (migration `20260426112303_lifecycle_v1_phase2a_part3_drop_orphan_set_b_triggers.sql`). If you ever see naming `lifecycle_<table>_after_<action>` with functions named `lifecycle_emit_<entity>_event()`, it's the orphan set — must not return.

### 3.6 Auto-enrol logic (`lifecycle_auto_enrol()`)
Runs on every NEW lifecycle_events INSERT.
**Skips early if:**
- `backfilled = TRUE` (historical events never trigger sequences)
- `email IS NULL`
- `event_type IN ('email_sent', 'whatsapp_sent')` (dispatcher emits these — prevents loop)

**Then for each active sequence with matching `trigger_event`:**
1. Check `trigger_filter @> NEW.metadata` (JSONB containment)
2. Skip if active enrolment already exists for `(sequence_id, lower(email))`
3. Skip if email is in `lifecycle_suppression` (any channel)
4. INSERT enrolment with `context = NEW.metadata`, `next_send_at = NOW()`, `current_step_index = 0`
5. ON CONFLICT (race protection) → DO NOTHING

### 3.7 pg_cron jobs (2 active)
- `lifecycle-dispatcher-tick` — `*/5 * * * *` → POSTs to `https://enszifyeqnwcnxaqrmrq.supabase.co/functions/v1/lifecycle-dispatcher` with `{"limit": 50}`. No auth header (function is `verify_jwt: false`).
- `lifecycle-stale-cleanup` — `30 21 * * *` (UTC = 03:00 IST) → exits enrolments stuck active with `last_attempt_at < NOW() - INTERVAL '14 days'`.

---

## 4. Sequences seeded (2 active)

### S1 — Free Webinar Attendance Push
- `sequence_key`: `s1_free_webinar_attendance`
- Trigger: `webinar_registered` filtered on `{"registration_type":"webinar"}`
- Exit on: `unsubscribed`, `do_not_contact_set`
- 6 steps:

| # | Channel | Template | Anchor / Delay | Send window | Notes |
|---|---|---|---|---|---|
| 0 | email | `em_s1_confirmation_v1` | T+0h (delay) | 00:00-23:59 | Runs **in parallel** with Make 8297974 (intentional during transition) |
| 1 | email | `em_s1_day_before_v1` | webinar_date -24h | 00:00-23:59 | |
| 2 | whatsapp | `wa_s1_day_before_v1` | webinar_date -24h | 00:00-23:59 | inactive (AiSensy pending) |
| 3 | whatsapp | `wa_s1_one_hour_v1` | webinar_date -1h | 09:00-22:00 | inactive |
| 4 | whatsapp | `wa_s1_live_now_v1` | webinar_date +0h | 09:00-22:00 | inactive |
| 5 | email | `em_s1_post_webinar_v1` | webinar_date +24h | 00:00-23:59 | branched headline by attendance lookup |

### S8 — Post-Paid-Masterclass Enrol Push
- `sequence_key`: `s8_post_paid_masterclass_enrol`
- Trigger: `session_attended` filtered on `{"registration_type":"masterclass"}`
- Exit on: `course_enrolled`, `unsubscribed`, `do_not_contact_set`
- 5 steps (cumulative delay from enrolment):

| # | Channel | Template | Delay | Notes |
|---|---|---|---|---|
| 0 | email | `em_s8_thank_you_v1` | 0h | |
| 1 | whatsapp | `wa_s8_offer_reminder_v1` | 24h | inactive |
| 2 | email | `em_s8_faq_v1` | 72h | |
| 3 | whatsapp | `wa_s8_48h_left_v1` | 144h | inactive |
| 4 | email | `em_s8_last_call_v1` | 168h | dynamic `enrol_url` per audience (see §6) |

---

## 5. Templates seeded (11 total)

### Email (6 active)
- `em_s1_confirmation_v1`
- `em_s1_day_before_v1`
- `em_s1_post_webinar_v1` (branched)
- `em_s8_thank_you_v1`
- `em_s8_faq_v1`
- `em_s8_last_call_v1`

### WhatsApp (5 inactive — AiSensy templates pending Meta approval)
- `wa_s1_day_before_v1`
- `wa_s1_one_hour_v1`
- `wa_s1_live_now_v1`
- `wa_s8_offer_reminder_v1`
- `wa_s8_48h_left_v1`

WA `aisensy_campaign_name` values are placeholders prefixed `lifecycle_*`. Update them when Meta approves the actual campaign names.

### Variable validation
Every template has `variables_declared` populated. Dispatcher's `validateRequiredVars()` checks every declared var resolves to a non-empty string at send time. Any miss → enrolment exits with `missing_critical_vars:foo,bar`.

---

## 6. Dispatcher edge function — `lifecycle-dispatcher` v2

**Location**: Supabase Edge Functions, slug `lifecycle-dispatcher`, function id `f2d23fc0-58ea-4784-b27a-f7040385096f`
**verify_jwt**: false (called by pg_cron with no auth header)
**Source mirror**: `/Users/Arijit WS/withArijit-platform/supabase/functions/lifecycle-dispatcher/index.ts`

### Key constants
```ts
AISENSY_API_URL = 'https://backend.aisensy.com/campaign/t1/api/v2'
RESEND_API_URL  = 'https://api.resend.com/emails'
FROM_EMAIL      = 'Arijit Chowdhury — oStaran <ai@ostaran.com>'
BCC_EMAIL       = 'star.analytix.ai@gmail.com'
SITE_BASE       = 'https://www.ostaran.com'
JOIN_BASE       = 'https://partner.ostaran.com/join'
MAX_FAILURES    = 3
BACKOFF_MINUTES = [5, 30, 120]
```

### Body params
```json
{ "limit": 50, "enrolment_id": "uuid", "dry_run": true }
```
All optional. `enrolment_id` is for testing — process exactly one enrolment regardless of due time.

### Response
```json
{
  "success": true, "dry_run": false, "duration_ms": 1234,
  "processed": 5, "sent": 4, "skipped": 0, "exited": 0, "completed": 1, "deferred": 0, "failed": 0,
  "results": [ { "enrolment_id": "...", "outcome": "sent", "detail": "advanced_to_step_1_sent", "next_send_at": "..." } ]
}
```

### Outcomes
`'sent' | 'skipped' | 'exited' | 'completed' | 'failed' | 'deferred'`

### Skip reasons
`'sequence_inactive' | 'template_not_found' | 'template_inactive_aisensy_pending' | 'suppressed' | 'no_consent' | 'no_mobile' | 'missing_critical_vars:foo,bar'`

### Variable resolution rules

| Variable | Resolution | Fallback |
|---|---|---|
| `first_name` | from `context.full_name` (first whitespace-delimited token) | `'there'` |
| `full_name` | from `context.full_name` | `''` (treated as missing if declared) |
| `webinar_date_display` | `fmtDate(context.webinar_date)` — UTC-stable: `Sun, 26 Apr 2026` | `''` (NEVER 'soon') |
| `webinar_time_display` | `fmtTime(context.webinar_time)` — `3:30 PM` etc. | `''` (NEVER 11:00) |
| `registered_at_display` | enrolment.enrolled_at converted to IST | `''` |
| `course_name` | `context.course_name` | `''` |
| `partner_code` | `context.partner_code` (= `utm_source` from reg) | `''` |
| `join_link` | `${JOIN_BASE}/${context.join_token}?ref=lifecycle` | `''` (NEVER `webinar.ostaran.com`) |
| `enrol_url` | `resolveEnrolUrl(context)` — audience-mapped (see below) | always valid (DEFAULT_SLUG) |
| `unsubscribe_url` | `${SITE_BASE}/unsubscribe/${enrolment.id}` | always valid |
| `post_webinar_headline` / `post_webinar_intro` | branched at send time by `lookupPostWebinarBranch()` (DB lookup of `attendance_confirmed`) | only set on `em_s1_post_webinar_v1` |

### Audience → Course-slug map (for `enrol_url`)
```ts
working_professional        → 'ai-mastery-for-working-professionals'
college_student             → 'ai-mastery-for-students'
job_seeker                  → 'ai-mastery-for-students'
school_student              → 'ai-mastery-for-school-students'
tech_developer              → 'agentic-ai-development'
data_engineer_scientist     → 'agentic-ai-development'
home_maker                  → 'ai-mastery-for-homemakers'
other / null                → 'ai-mastery-programme' (DEFAULT_SLUG)
```
527 contacts at launch — 100% routable to a real slug.

### Anchor + send-window logic
- If step has `absolute_anchor='webinar_date'`: compute send time as `(context.webinar_date IST + context.webinar_time IST + anchor_offset_hours) → UTC`. If either date or time missing → returns null, falls back to `delay_hours from enrolment`.
- If `delay_hours` only: `enrolled_at + delay_hours`.
- Send window: if computed time falls outside `[send_window_start, send_window_end]` IST, push forward to next valid window.

### Idempotency / crash-recovery
Before sending, dispatcher checks `lifecycle_dispatch_log` for an existing `(enrolment_id, step_index, status='sent')`. If found, skips the actual provider call and just advances. Protects against double-sends if function crashed mid-step on a previous tick.

### Failure handling
- Provider error → increment `failure_count`, schedule retry after `BACKOFF_MINUTES[failure_count-1]` (5min, 30min, 120min)
- After `MAX_FAILURES=3` → status='failed', exit_reason='max_failures:...'

---

## 7. Migration files (canonical)

In `withArijit-platform/supabase/migrations/`:

```
20260426062351_lifecycle_v1_foundation.sql
  ├─ 8 tables, 5 enums, 16 indexes, 8 RLS policies
  ├─ trigger lifecycle_set_updated_at()
  └─ unique idempotency index on lifecycle_events

20260426062502_lifecycle_v1_contact_profile_view.sql
  └─ lifecycle_contact_profile VIEW (UNION across 7 source tables, lead score, stage)

20260426065456_lifecycle_v1_phase2a_sequences_and_templates.sql
  └─ S1 + S8 seeded, 11 templates seeded, all is_active=FALSE initially

20260426080334_lifecycle_v1_phase2a_add_s1_step0_confirmation.sql
  └─ S1 step 0 (confirmation email) added — runs parallel to Make 8297974

20260426105746_lifecycle_v1_phase2a_part3_triggers_and_cron.sql
  ├─ 8 source-table emit triggers (canonical "Set A")
  ├─ trg_lifecycle_auto_enrol
  └─ pg_cron: lifecycle-dispatcher-tick + lifecycle-stale-cleanup

20260426112303_lifecycle_v1_phase2a_part3_drop_orphan_set_b_triggers.sql
  └─ Cleanup of duplicate "Set B" triggers from a re-applied earlier attempt
```

There are 3 OLDER Phase 2a Part 3 attempts in `supabase_migrations.schema_migrations` (20260426102904, 20260426103955, 20260426105746). Only the LAST is canonical. The first two are noise from iteration. Set B was the leftover from those — now dropped.

**These migrations are pure-additive to the existing schema.** No existing tables touched. Safe to re-run on a fresh branch.

---

## 8. Smoke test history (reference)

### Phase 2a-2 dispatcher v1 first send (2026-04-26)
- Test enrolment for `ari.bombay@gmail.com`, S1 step 0
- Real email sent via Resend (provider message_id `5301e2dc-…`)
- ✅ All side effects worked
- ⚠️ Issues found in audit by Arijit:
  - `FALLBACK_WEBINAR_TIME='11:00'` would have lied to 27% of registrants (real `webinar_time` distribution: 11:00=363, 15:30=136, 14:00=26, 17:00=1)
  - `join_link` falling back to `webinar.ostaran.com` (the registration page!) when token missing
  - `webinar_date_display` falling back to `'soon'`

### Dispatcher v2 hardening (2026-04-26)
- Removed all silent fallbacks for critical vars
- Added `validateRequiredVars()` against `template.variables_declared` — empty = exit
- `fmtDate` made UTC-stable (was timezone-sensitive)
- Test A: Insert enrolment with missing `webinar_time` → ✅ correctly exited with `missing_critical_vars:webinar_time_display`. No send.
- Test B-1: Real production data (Deepti's 11:00 row) → ✅ sent with correct values
- Test B-2: Real production data (Deepti's 15:30 row, redirected to ari.bombay@gmail.com) → ✅ sent showing **3:30 PM** (NOT 11 AM)

### Phase 2a-3 trigger pipeline test (2026-04-26)
- Synthetic `lifecycle_events` INSERT with valid metadata
- ✅ `trg_lifecycle_auto_enrol` fired
- ✅ S1's trigger_filter `{"registration_type":"webinar"}` matched
- ✅ Enrolment created at step 0 with full context
- Same-transaction pause prevented cron interference
- Cleanup: synthetic event + paused enrolment deleted

### After all tests
S1 + S8 activated. Engine LIVE since 2026-04-26.

---

## 9. Operational queries (memorize these)

```sql
-- Health snapshot
SELECT 'sequences_active'      AS metric, COUNT(*)::text AS value FROM lifecycle_sequences WHERE is_active
UNION ALL SELECT 'enrolments_active',           COUNT(*)::text FROM lifecycle_sequence_enrolments WHERE status='active'
UNION ALL SELECT 'enrolments_total',            COUNT(*)::text FROM lifecycle_sequence_enrolments
UNION ALL SELECT 'dispatch_log_24h_sent',       COUNT(*)::text FROM lifecycle_dispatch_log WHERE status='sent'    AND attempted_at > NOW() - INTERVAL '24 hours'
UNION ALL SELECT 'dispatch_log_24h_skipped',    COUNT(*)::text FROM lifecycle_dispatch_log WHERE status='skipped' AND attempted_at > NOW() - INTERVAL '24 hours'
UNION ALL SELECT 'dispatch_log_24h_failed',     COUNT(*)::text FROM lifecycle_dispatch_log WHERE status='failed'  AND attempted_at > NOW() - INTERVAL '24 hours'
UNION ALL SELECT 'suppression_rows',            COUNT(*)::text FROM lifecycle_suppression
UNION ALL SELECT 'cron_jobs_active',            COUNT(*)::text FROM cron.job WHERE jobname LIKE 'lifecycle-%' AND active;

-- Recent skips by reason
SELECT skip_reason, COUNT(*) AS n
FROM lifecycle_dispatch_log
WHERE status = 'skipped' AND attempted_at > NOW() - INTERVAL '7 days'
GROUP BY skip_reason ORDER BY n DESC;

-- Active enrolments with their next step
SELECT e.email, s.sequence_key, e.current_step_index, e.next_send_at, e.context->>'webinar_date' AS w_date
FROM lifecycle_sequence_enrolments e
JOIN lifecycle_sequences s ON s.id = e.sequence_id
WHERE e.status = 'active'
ORDER BY e.next_send_at ASC LIMIT 50;

-- Pause everything (kill switch — graceful)
UPDATE lifecycle_sequences SET is_active = FALSE;
-- Resume
UPDATE lifecycle_sequences SET is_active = TRUE
WHERE sequence_key IN ('s1_free_webinar_attendance', 's8_post_paid_masterclass_enrol');

-- Manually invoke dispatcher in dry-run from SQL
SELECT net.http_post(
  url := 'https://enszifyeqnwcnxaqrmrq.supabase.co/functions/v1/lifecycle-dispatcher',
  headers := '{"Content-Type":"application/json"}'::jsonb,
  body := '{"dry_run": true, "limit": 10}'::jsonb,
  timeout_milliseconds := 30000
) AS request_id;
-- Then: SELECT content::jsonb FROM net._http_response WHERE id = <request_id>;
```

---

## 10. Roadmap — A → B → C → D → E

User chose this ordering on 2026-05-02. We were mid-A when migration came up.

### A — `/unsubscribe/[enrolment_id]` page 🟡 IN PROGRESS
**Status**: Code complete locally; first Vercel build failed on TS narrowing; fix applied + pushed; awaiting Vercel green confirmation.
**Files**:
- `src/app/(public)/unsubscribe/[enrolment_id]/page.tsx` (server component)
- `src/app/(public)/unsubscribe/[enrolment_id]/_components/UnsubscribeForm.tsx` (client)
- `src/app/api/unsubscribe/route.ts` (API)

**Behavior**:
- Valid enrolment_id, not yet suppressed → confirm screen with masked email + optional WA opt-out
- Already suppressed → idempotent "already unsubscribed"
- Invalid/unknown UUID → generic "if you were on our list…" (no enumeration leak)
- On confirm: UPSERT `lifecycle_suppression`, INSERT `lifecycle_consent_log`, exit ALL active enrolments for that email

**Compliance baked in**: masked email rendering, ip_address + user_agent capture for §11 audit, `robots: noindex`, footer cites DPDP §11.

**Blockers**:
1. Verify Vercel build is green on latest push
2. There's an UNTRACKED `supabase/functions/lifecycle-dispatcher/` directory in the repo — `git add` and commit before migration
3. Browser smoke test on `https://www.ostaran.com/unsubscribe/<real-uuid>` (use any enrolment_id from `lifecycle_dispatch_log` if you ever get a real send)

### B — 24-48h passive observation + tiny SQL health view
**Time**: 30 min build, then watch
- Build a `lifecycle_health` SQL view aggregating the operational metrics from §9
- Spot-check daily for surprise skip reasons, failure spikes, suppression growth

### C — First P2 sequence: S6 Post-Free-Webinar Upsell
**Time**: 2-4h
**Purpose**: Convert free-webinar attendees into paid masterclass enrolees (the highest-leverage funnel gap right now).
**Trigger**: `session_attended` filtered on `{"registration_type":"webinar"}`
**Exit on**: `masterclass_paid`, `masterclass_registered`, `unsubscribed`
**Steps (proposed, finalize in the build)**:
- T+1h email — "What if you went deeper?" — masterclass pitch
- T+24h WA — "Save your seat" — link to ostaran.com/masterclass
- T+72h email — limited-time discount/group offer (per partner economics)
- T+168h email — last-chance soft close

### D — Monitoring SQL view + `/admin/lifecycle-status` page
**Time**: 2-3h
- View: rollups by sequence × day, top exit reasons, hot leads
- UI: simple admin page mirroring the view + recent dispatch log + suppression count

### E — AiSensy template content drafting (you submit to Meta)
**Time**: 1h drafting, days for approval
- Draft the 5 inactive WA template bodies (we already have campaign-name placeholders)
- Submit via AiSensy → Meta approval flow
- On approval: `UPDATE lifecycle_templates SET is_active=TRUE, aisensy_campaign_name='<approved>'` per template

---

## 11. Roadmap (parked beyond E)

15 sequences total were planned in the Phase 0 design session. Active: S1, S8. Next batch (P2): S6 (above), S2, S3, S4, S5, S7, S9. Entry-funnel sequences: E2 Library Nurture, E3 Quiz Follow-up (98 unique emails captured but no follow-up wired today — Make scenario `Supabase Quiz1 Webhook with AI Spot Details` has 1 execution ever, dormant), E4 Resume Follow-up, E5 Contact Form (form needs building first). P3: E1 Community Welcome, E6 Cold Lead, X1 Cold Re-engagement.

**Phase 4** (later): Build `/admin/sequences`, `/admin/templates`, hot-leads dashboard.
**Phase 5** (later): Partner & recruiter tracks (deferred from Phase 2a).

---

## 12. Gotchas & "do not regret" notes

- **NEVER add a default value for `webinar_time` in the dispatcher.** Real production has 4 distinct times. A default lies to ~27% of registrants. The validator will catch it now (`missing_critical_vars`), but if a future engineer "helpfully" adds `|| '11:00'`, that protection vanishes silently.
- **NEVER add a fallback URL for `join_link`.** v1 fell back to the registration page. The user clicked the email's "Join session" button and landed back on the form. Hard lesson, do not repeat.
- **Backfilled events are sacred.** `auto_enrol` checks `backfilled=FALSE` before doing anything. If you ever bulk-import events again, set `backfilled=TRUE` or you'll re-spam everyone.
- **dispatcher-emitted events** (`email_sent`, `whatsapp_sent`) are filtered out in `auto_enrol` to prevent loops. Don't add a sequence triggered on these without thinking through the recursion.
- **Make scenario 8297974** still sends free-webinar reg confirmations in parallel with S1 step 0. Decide later whether to stop Make or stop S1 step 0. For now: 2 confirmations per registrant is acceptable during stabilization.
- **The `lifecycle_seq_enrol_unique_active_idx` partial unique index** prevents (sequence, email) collisions while status='active'. Once an enrolment exits/completes, a new active one for the same email IS allowed. This is intentional — re-engagement is permitted.
- **Templates use `{{var}}` syntax**, NOT `${var}` or `{var}` or `<var>`. Renderer is `text.replace(/\{\{\s*([a-zA-Z_]\w*)\s*\}\}/g, ...)`.
- **`fmtDate` is UTC-stable.** A previous bug had it use local time, which on a Deno worker meant UTC, which meant a Sunday-night IST event could render as Saturday. Don't switch to `toLocaleDateString` without explicit `timeZone: 'UTC'`.
- **`lifecycle_consent_log.state`** has a CHECK constraint: only `'opted_in' | 'opted_out' | 'withdrawn'`. Don't use 'unsubscribed' or other strings.
- **`lifecycle_suppression` has a check `email IS NOT NULL OR mobile IS NOT NULL`.** Always set at least one.
- **Suppression check happens in BOTH** auto_enrol (skip enrolment creation entirely) AND dispatcher (exit enrolment if suppression added mid-flight).

---

## 13. First message to NEW Claude (paste this verbatim)

```
I'm Arijit Chowdhury (oStaran / AIwithArijit × oStaran brand). I'm continuing work
on the lifecycle communications engine in my withArijit-platform repo. Please read
these three files in order before doing anything else:

1. /Users/<new-home>/_MAC_MIGRATION_2026-05-02/01_REPOS_CONTEXT.md
2. /Users/<new-home>/_MAC_MIGRATION_2026-05-02/02_COMMS_ENGINE_CONTEXT.md
3. /Users/<new-home>/withArijit-platform/docs/comms-planning/comms-engine-context-2026-05-02.md
   (this is a copy of #2, version-controlled in the repo for posterity)

Where we are: Phase 1, 2a-1, 2a-2, 2a-3 of the comms engine are LIVE. S1 and S8
are active. We're mid-roadmap-item-A (the /unsubscribe page). The first Vercel
build failed on a TS narrowing issue, the fix was pushed but I need to verify
Vercel went green. After that, we move to B → C → D → E in order.

Supabase MCP is `supabase-personal` ref `enszifyeqnwcnxaqrmrq`.
Filesystem MCP root is `/Users/<new-home>/withArijit-platform/` and the repos folder.

Don't take action yet — first confirm you've read the three files and tell me
back what you understand the current state to be. Then I'll greenlight you to proceed.
```
