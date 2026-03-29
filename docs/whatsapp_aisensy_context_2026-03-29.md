# WhatsApp AiSensy Campaign Context
**Last Updated:** 29 March 2026 — 20:45 IST (updated: automation of 6 pre-enrolment campaigns)
**Author:** Arijit Chowdhury — oStaran × AIwithArijit  
**Supabase Project:** enszifyeqnwcnxaqrmrq (supabase-personal)  
**AiSensy Account:** app.aisensy.com (linked to oStaran WhatsApp Business number)

---

## Changelog

| Date & Time | Change |
|---|---|
| 29 Mar 2026 — 18:30 IST | Initial file created. 21 campaigns documented. |
| 29 Mar 2026 — 20:45 IST | 6 pre-enrolment campaigns converted from Manual → Auto. Edge function `send-webinar-automations` deployed. 5 new pg_cron jobs created. DB trigger on `qr_landing_registrations` INSERT. 2 new columns added to `awa_webinar_sessions`. 2 new columns added to `qr_landing_registrations`. |

---

## Overview

There are **21 unique AiSensy campaign names** across both platforms.  
They fall into two distinct journeys:

| Journey | Student Stage | Platform | Total | Auto | Manual |
|---|---|---|---|---|---|
| **Pre-Enrolment** | Webinar registrant, not yet paid | `partner.ostaran.com/admin` | 11 | 6 | 5 |
| **Post-Enrolment** | Paid enrolled student | `www.ostaran.com` + `partner.ostaran.com/admin` | 10 | 5 | 5 |
| **Total** | | | **21** | **11** | **10** |

---

## AiSensy Campaign Status Legend

| Symbol | Meaning |
|---|---|
| ✅ | **Confirmed working** — successfully sent messages in production |
| 🤖 | **Automated** — converted from manual to auto-trigger as of 29 Mar 2026 |
| ⚠️ | **Created in AiSensy, not yet tested** |
| ❌ | **Campaign does not exist in AiSensy** — will fail with "Campaign does not exist" |
| 🔄 | **Pending Meta approval** — submitted, awaiting approval |

---

## PART A — Pre-Enrolment Campaigns (Webinar Funnel)

**Data Source:** `qr_landing_registrations` table  
**Manual campaigns platform:** `partner.ostaran.com/admin/reminders`  
**Manual campaigns edge function:** `send-student-reminder` (Supabase)  
**Automated campaigns edge function:** `send-webinar-automations` (Supabase — deployed 29 Mar 2026)  

---

### A1. `webinar_registration_confirmation_v2`
**Status:** 🤖 AUTOMATED as of 29 Mar 2026  
**Category:** Utility  
**Trigger:** AUTO — Postgres DB trigger on `INSERT` into `qr_landing_registrations`  
**When:** Fires within seconds of every new webinar registration  
**Sent to:** The registrant — immediately when they submit the registration form  
**Guard:** Only fires if `mobile IS NOT NULL` AND `whatsapp_sent = false`  
**After send:** Sets `whatsapp_sent = true` to prevent duplicates  
**Parameters:** 5 — `name`, `course_name`, `webinar_date`, `webinar_time`, `join_link`  

**Message Preview:**
```
Hi {{1}}, you're registered for the {{2}} webinar! 🎉

Here are your details:

📅 Date: {{3}}
🕐 Time: {{4}} IST
🔗 Your personal join link:
{{5}}

Save this link — you'll need it to join the session.

See you there!
— Arijit Chowdhury, oStaran × AIwithArijit
```

---

### A2. `webinar_countdown_reminder`
**Status:** ✅ WORKING (256 sent) → 🤖 AUTOMATED as of 29 Mar 2026  
**Category:** Utility  
**Trigger:** AUTO — pg_cron `webinar-countdown-reminder-daily` runs daily at 9:00am IST (3:30 UTC)  
**When:** Fires the morning before each scheduled webinar  
**Sent to:** All registrants for tomorrow's webinar where `reminder_email_sent = false`  
**After send:** Sets `reminder_email_sent = true` + `awa_webinar_sessions.countdown_sent_at`  
**Parameters:** 5 — `name`, `course_name`, `webinar_date`, `webinar_time`, `join_link`  

**Message Preview:**
```
Hi {{1}}, your {{2}} webinar is tomorrow!

📅 {{3}} at {{4}} IST

🔗 Your join link:
{{5}}

See you there!
— Arijit, oStaran
```

---

### A3. `webinar_live_now`
**Status:** ✅ WORKING (61 sent) → 🤖 AUTOMATED as of 29 Mar 2026  
**Category:** Utility  
**Trigger:** AUTO — pg_cron `webinar-live-now-every-5min` runs every 5 minutes  
**When:** Fires when a webinar session starts (within ±5 min of `webinar_time`)  
**Sent to:** All registrants for that session  
**After send:** Sets `awa_webinar_sessions.live_notified_at` to prevent re-firing  
**Parameters:** 3 — `name`, `course_name`, `join_link`  

**Message Preview:**
```
🔴 The {{2}} webinar is LIVE now, {{1}}!

Join instantly:
{{3}}

See you inside!
— Arijit, oStaran
```

---

### A4. `webinar_feedback_request`
**Status:** ❌ FAILING (126 failed) → 🤖 AUTOMATED as of 29 Mar 2026 (pending AiSensy campaign creation)  
**Category:** Utility  
**Trigger:** AUTO — pg_cron `webinar-feedback-request-hourly` runs every hour  
**When:** Fires ~90 minutes after webinar ends (start time + duration + 90 min)  
**Sent to:** Only students where `attendance_confirmed = true` (actual attendees, not all registrants)  
**After send:** Sets `post_webinar_email_sent = true` + `awa_webinar_sessions.feedback_sent_at`  
**⚠️ Action needed:** Create `webinar_feedback_request` campaign in AiSensy and get Meta approval  
**Parameters:** 3 — `name`, `course_name`, `feedback_url`  

**Message Preview:**
```
Hi {{1}}, thank you for attending the {{2}} webinar with Arijit! 🙏

Your feedback helps us make every session better.

Please take 2 minutes to share your thoughts here:
{{3}}

Your response means a lot to us.
— Arijit Chowdhury, oStaran × AIwithArijit
```

---

### A5. `webinar_noshow_reengage`
**Status:** ⚠️ Added 29 Mar 2026 → 🤖 AUTOMATED as of 29 Mar 2026  
**Category:** Utility  
**Trigger:** AUTO — pg_cron `webinar-noshow-reengage-daily` runs daily at 10:00am IST (4:30 UTC)  
**When:** Fires the morning after each webinar — targets yesterday's no-shows  
**Sent to:** Registrants where `attended_at IS NULL` AND `no_show_nudge_sent = false`  
**After send:** Sets `no_show_nudge_sent = true`  
**Next webinar:** Automatically looks up the next upcoming session from `awa_webinar_sessions`  
**Parameters:** 4 — `name`, `course_name`, `next_webinar_date`, `re_join_link`  

**Message Preview:**
```
Hi {{1}}, we missed you at the {{2}} webinar! 😊

No worries — another session is coming up on {{3}}.

Your personal join link:
{{4}}

This session covers how professionals like you are using AI to get ahead in 2026. Worth joining.

See you there!
— Arijit Chowdhury, oStaran × AIwithArijit
```

---

### A6. `webinar_promotional`
**Status:** ❌ FAILING — "Campaign does not exist"  
**Category:** Marketing  
**Trigger:** MANUAL — admin sends from Reminders page  
**When:** 3–5 days before a webinar as a promotional push  
**⚠️ Action needed:** Create campaign in AiSensy and get Meta approval  
**Parameters:** 5 — `name`, `webinar_name`, `webinar_date`, `webinar_time`, `registration_link`  

**Message Preview:**
```
Hi {{1}}, the {{2}} AI Certification Webinar is happening on {{3}} at {{4}} IST! 🚀

In just 2 hours, you'll learn:
✅ How AI is reshaping every industry
✅ Live demos of real AI tools
✅ How to get certified in AI

Reserve your free spot now:
{{5}}

Limited seats. See you there!
— Arijit, oStaran × AIwithArijit
```

---

### A7–A11. Conversion Nudges `nudge_1_job_market` → `nudge_5_ai_portfolio`
**Status:** ⚠️ Added 29 Mar 2026 → 🤖 AUTOMATED as of 29 Mar 2026  
**Category:** Marketing  
**Trigger:** AUTO — pg_cron `webinar-nudge-drip-daily` runs daily at 11:00am IST (5:30 UTC)  
**When:** Fires based on days elapsed since webinar date:

| Campaign | Day After Webinar | Condition |
|---|---|---|
| `nudge_1_job_market` | Day 1 | `nudge_last_sent = 0` |
| `nudge_2_ai_critical` | Day 3 | `nudge_last_sent = 1` |
| `nudge_3_live_classes` | Day 5 | `nudge_last_sent = 2` |
| `nudge_4_real_projects` | Day 7 | `nudge_last_sent = 3` |
| `nudge_5_ai_portfolio` | Day 9 | `nudge_last_sent = 4` |

**Sent to:** Registrants where `is_enrolled = false` AND webinar was 1–10 days ago  
**Personalisation:** `profession_choice` maps to student type label (`Working Professional`, `College Student` etc.)  
**Enrol link:** Includes `utm_source` (partner code) if student was referred by a partner  
**After send:** Updates `nudge_last_sent` (1–5) and `nudge_last_sent_at`  
**Parameters:** 4 — `name`, `student_type_label`, `enrol_link`, `enrol_button_suffix`  

**Preview (nudge_1_job_market):**
```
Hi {{1}}, a quick reality check for {{2}}s in 2026 👇

In the last 12 months:
📉 42% of non-AI jobs have faced downsizing
📈 AI-skilled professionals earn 35–60% more

Enrol now and lock in today's price:
{{3}}
```

---

## PART B — Post-Enrolment Campaigns (Student Journey)

**Platform:** `www.ostaran.com` (auto) + `partner.ostaran.com/admin/communications` (manual)  
**Edge Function:** `send-student-comms` (Supabase — deployed 29 Mar 2026)  
**Scheduler Function:** `send-student-session-reminders` (Supabase — deployed 29 Mar 2026)  
**Data Source:** `student_enrolments` + `session_master_table` + `awa_batches`  
**Log Table:** `student_comms_log`  

| # | Campaign | Trigger | When | Sent To |
|---|---|---|---|---|
| B1 | `student_payment_confirmed` | 🤖 Auto | Instantly on payment | Paying student |
| B2 | `student_batch_confirmed` | 🤖 Auto | Instantly on batch select | Student selecting batch |
| B3 | `student_session_reminder_24h` | 🤖 Auto (pg_cron) | 24h before each session | All students in that batch |
| B4 | `student_session_reminder_1h` | 🤖 Auto (pg_cron) | 1h before each session | All students in that batch |
| B5 | `student_recording_available` | ✋ Manual | Admin uploads recording | All students in that batch |
| B6 | `student_batch_changed` | ✋ Manual | Admin changes batch schedule | Affected students |
| B7 | `student_payment_reminder` | 🤖 Auto (pg_cron) | Day 7/14/21 after enrolment (if balance due) | 50-50 plan students |
| B8 | `student_announcement` | ✋ Manual | Admin composes ad-hoc message | Admin's choice of target |
| B9 | `student_certificate_ready` | ✋ Manual | Admin issues certificate | Specific student |
| B10 | `student_course_completion` | ✋ Manual | Admin marks course complete | Specific student |

*(Full message previews for B1–B10 in previous version of this file — unchanged)*

---

## Complete Quick Reference — All 21 Campaigns

| # | Campaign Name | Journey | Trigger | Status | Category | Params |
|---|---|---|---|---|---|---|
| 1 | `webinar_registration_confirmation_v2` | Pre-Enrolment | 🤖 DB trigger (INSERT) | ⚠️ Not tested | Utility | 5 |
| 2 | `webinar_countdown_reminder` | Pre-Enrolment | 🤖 pg_cron 9am IST | ✅ Working | Utility | 5 |
| 3 | `webinar_live_now` | Pre-Enrolment | 🤖 pg_cron every 5min | ✅ Working | Utility | 3 |
| 4 | `webinar_feedback_request` | Pre-Enrolment | 🤖 pg_cron hourly | ❌ Campaign missing | Utility | 3 |
| 5 | `webinar_noshow_reengage` | Pre-Enrolment | 🤖 pg_cron 10am IST | ⚠️ Not tested | Utility | 4 |
| 6 | `webinar_promotional` | Pre-Enrolment | ✋ Manual | ❌ Campaign missing | Marketing | 5 |
| 7 | `nudge_1_job_market` | Pre-Enrolment | 🤖 pg_cron 11am IST (D1) | ⚠️ Not tested | Marketing | 4 |
| 8 | `nudge_2_ai_critical` | Pre-Enrolment | 🤖 pg_cron 11am IST (D3) | ⚠️ Not tested | Marketing | 4 |
| 9 | `nudge_3_live_classes` | Pre-Enrolment | 🤖 pg_cron 11am IST (D5) | ⚠️ Not tested | Marketing | 4 |
| 10 | `nudge_4_real_projects` | Pre-Enrolment | 🤖 pg_cron 11am IST (D7) | ⚠️ Not tested | Marketing | 4 |
| 11 | `nudge_5_ai_portfolio` | Pre-Enrolment | 🤖 pg_cron 11am IST (D9) | ⚠️ Not tested | Marketing | 4 |
| 12 | `student_payment_confirmed` | Post-Enrolment | 🤖 API trigger | 🔄 Pending approval | Utility | 4 |
| 13 | `student_batch_confirmed` | Post-Enrolment | 🤖 API trigger | 🔄 Pending approval | Utility | 6 |
| 14 | `student_session_reminder_24h` | Post-Enrolment | 🤖 pg_cron every 30min | 🔄 Pending approval | Utility | 7 |
| 15 | `student_session_reminder_1h` | Post-Enrolment | 🤖 pg_cron every 30min | 🔄 Pending approval | Utility | 4 |
| 16 | `student_recording_available` | Post-Enrolment | ✋ Manual (admin) | 🔄 Pending approval | Utility | 7 |
| 17 | `student_batch_changed` | Post-Enrolment | ✋ Manual (admin) | 🔄 Pending approval | Utility | 6 |
| 18 | `student_payment_reminder` | Post-Enrolment | 🤖 pg_cron daily 9:30am IST | 🔄 Pending approval | Utility | 4 |
| 19 | `student_announcement` | Post-Enrolment | ✋ Manual (admin) | 🔄 Pending approval | Marketing | 2 |
| 20 | `student_certificate_ready` | Post-Enrolment | ✋ Manual (admin) | 🔄 Pending approval | Utility | 4 |
| 21 | `student_course_completion` | Post-Enrolment | ✋ Manual (admin) | 🔄 Pending approval | Utility | 3 |

**Trigger Summary:** 🤖 Auto = 15 campaigns &nbsp;|&nbsp; ✋ Manual = 6 campaigns

---

## Technical Architecture

### Edge Functions (Supabase — project enszifyeqnwcnxaqrmrq)

| Function Slug | Purpose | Deployed | JWT |
|---|---|---|---|
| `send-student-reminder` | Pre-enrolment manual campaigns (admin-triggered) | Earlier | false |
| `send-webinar-automations` | Pre-enrolment AUTO campaigns — all 6 modes | 29 Mar 2026 | false |
| `send-student-comms` | Post-enrolment ALL campaigns — 10 event types | 29 Mar 2026 | false |
| `send-student-session-reminders` | pg_cron scheduler for course session reminders | 29 Mar 2026 | false |
| `send-wa-registration-confirmation` | Legacy WA on webinar registration (superseded by trigger) | Earlier | false |

### pg_cron Jobs — Complete Registry

| # | Job Name | Schedule (UTC) | IST Equivalent | Function | Mode |
|---|---|---|---|---|---|
| 1 | `send-webinar-reminder-daily` | 4:30 UTC daily | 10:00am IST | `send-webinar-reminder` | Webinar day-of reminder (legacy) |
| 2 | `student-session-reminder-24h` | Every 30 min | Every 30 min | `send-student-session-reminders` | Enrolled student 24h reminder |
| 3 | `student-session-reminder-1h` | Every 30 min | Every 30 min | `send-student-session-reminders` | Enrolled student 1h reminder |
| 4 | `student-payment-overdue-reminder` | 4:00 UTC daily | 9:30am IST | `send-student-session-reminders` | 50-50 plan balance due |
| 5 | `webinar-countdown-reminder-daily` | 3:30 UTC daily | 9:00am IST | `send-webinar-automations` | `countdown_reminder` |
| 6 | `webinar-live-now-every-5min` | Every 5 min | Every 5 min | `send-webinar-automations` | `live_now` |
| 7 | `webinar-feedback-request-hourly` | Every hour | Every hour | `send-webinar-automations` | `feedback_request` |
| 8 | `webinar-noshow-reengage-daily` | 4:30 UTC daily | 10:00am IST | `send-webinar-automations` | `noshow_reengage` |
| 9 | `webinar-nudge-drip-daily` | 5:30 UTC daily | 11:00am IST | `send-webinar-automations` | `nudge_drip` |

### DB Triggers

| Trigger Name | Table | Event | Function Called | Purpose |
|---|---|---|---|---|
| `on_new_registration_send_wa` | `qr_landing_registrations` | AFTER INSERT | `trigger_registration_confirmation()` → `send-webinar-automations` | Instant WA on registration |

### New DB Columns (added 29 Mar 2026)

**`awa_webinar_sessions`:**
- `countdown_sent_at` (timestamptz) — set when countdown reminder is sent
- `live_notified_at` (timestamptz) — set when live_now is sent (prevents re-firing)
- `feedback_sent_at` (timestamptz) — set when feedback request is sent

**`qr_landing_registrations`:**
- `nudge_last_sent` (integer, default 0) — tracks which nudge was last sent (0=none, 1–5)
- `nudge_last_sent_at` (timestamptz) — timestamp of last nudge sent

### Key DB Tables

| Table | Purpose |
|---|---|
| `qr_landing_registrations` | Webinar registrants — source for all pre-enrolment campaigns |
| `awa_webinar_sessions` | Scheduled webinar sessions with automation state tracking |
| `student_reminder_templates` | Template definitions for manual pre-enrolment campaigns |
| `student_reminder_campaigns` | Campaign send history (manual pre-enrolment) |
| `student_reminder_log` | Per-student send log (manual pre-enrolment) |
| `student_enrolments` | Paid enrolled students — source for post-enrolment campaigns |
| `student_comms_log` | Per-student send log (post-enrolment, with dedup_key) |
| `student_comms_settings` | Per-student opt-in/out preferences |
| `session_master_table` | Course session schedule — source for session reminder crons |

### API Routes (www.ostaran.com — withArijit-platform)

| Route | Triggers Campaign |
|---|---|
| `POST /api/enrollment/self` | `student_payment_confirmed` (fire-and-forget) |
| `POST /api/student/select-batch` | `student_batch_confirmed` (fire-and-forget) |

### Email Sender
- **From:** `Arijit Chowdhury — oStaran <ai@ostaran.com>`  
- **Service:** Resend (domain `ostaran.com` verified ✅)

---

## Action Items

### Immediate — fix broken / missing campaigns in AiSensy
- [ ] Create `webinar_feedback_request` in AiSensy → submit for Meta approval (automation is live, campaign missing)
- [ ] Create `webinar_promotional` in AiSensy → submit for Meta approval (manual, used occasionally)

### Pending Meta Approval (submitted 29 Mar 2026)
- [ ] `webinar_registration_confirmation_v2` — Utility
- [ ] `webinar_noshow_reengage` — Utility
- [ ] `nudge_1_job_market` through `nudge_5_ai_portfolio` — Marketing (3–7 days)
- [ ] `student_payment_confirmed` — Utility
- [ ] `student_batch_confirmed` — Utility
- [ ] `student_session_reminder_24h` — Utility
- [ ] `student_session_reminder_1h` — Utility
- [ ] `student_recording_available` — Utility
- [ ] `student_batch_changed` — Utility
- [ ] `student_payment_reminder` — Utility
- [ ] `student_announcement` — Marketing
- [ ] `student_certificate_ready` — Utility
- [ ] `student_course_completion` — Utility

### Test after approval
- [ ] Test `webinar_registration_confirmation_v2` — register a new test account on webinar.ostaran.com
- [ ] Test `webinar_countdown_reminder` — check DB for tomorrow's sessions
- [ ] Test `webinar_live_now` — at next webinar start time
- [ ] Test `webinar_feedback_request` — ~90 min after next webinar ends
- [ ] Test `webinar_noshow_reengage` — morning after next webinar
- [ ] Test nudge drip — check `student_comms_log` D1, D3, D5, D7, D9 after webinar
- [ ] Test `student_payment_confirmed` — make a real payment on ostaran.com
- [ ] Test `student_batch_confirmed` — select a batch after payment

---

*This file is the single source of truth for all WhatsApp AiSensy campaigns across the oStaran ecosystem.*  
*Update this file whenever: a new campaign is added, status changes, a trigger is modified, or Meta approval is received.*
