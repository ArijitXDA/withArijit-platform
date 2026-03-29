# WhatsApp AiSensy Campaign Context
**Last Updated:** 29 March 2026  
**Author:** Arijit Chowdhury — oStaran × AIwithArijit  
**Supabase Project:** enszifyeqnwcnxaqrmrq (supabase-personal)  
**AiSensy Account:** app.aisensy.com (linked to oStaran WhatsApp Business number)

---

## Overview

There are **21 unique AiSensy campaign names** across both platforms.  
They fall into two distinct journeys:

| Journey | Student Stage | Platform | Campaigns |
|---|---|---|---|
| **Pre-Enrolment** | Webinar registrant, not yet paid | `partner.ostaran.com/admin` | 11 campaigns |
| **Post-Enrolment** | Paid enrolled student | `www.ostaran.com` (auto) + `partner.ostaran.com/admin` (manual) | 10 campaigns |

---

## AiSensy Campaign Status Legend

| Symbol | Meaning |
|---|---|
| ✅ | **Confirmed working** — successfully sent messages in production |
| ⚠️ | **Created in AiSensy, not yet tested** — added 29 Mar 2026 |
| ❌ | **Campaign does not exist in AiSensy** — will fail with "Campaign does not exist" |
| 🔄 | **Pending Meta approval** — submitted, awaiting approval |

---

## PART A — Pre-Enrolment Campaigns (Webinar Funnel)

**Platform:** `partner.ostaran.com/admin/reminders`  
**Edge Function:** `send-student-reminder` (Supabase)  
**Data Source:** `qr_landing_registrations` table  

---

### A1. `webinar_registration_confirmation_v2`
**Status:** ⚠️ Added 29 Mar 2026 — not yet tested  
**Category:** Utility  
**Trigger:** Manual — admin sends from Reminders page  
**When:** Immediately after a webinar registration event  
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
**Status:** ✅ WORKING — 256 sent, 1 failed (invalid number only)  
**Category:** Utility  
**Trigger:** Manual — admin sends from Reminders page  
**When:** 24–48 hours before each webinar  
**Parameters:** 5 — `name`, `course_name`, `webinar_date`, `webinar_time`, `join_link`  
**Last Used:** 28 Mar 2026  

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
**Status:** ✅ WORKING — 61 sent, 0 failed  
**Category:** Utility  
**Trigger:** Manual — admin sends from Reminders page  
**When:** At the exact moment the webinar goes live  
**Parameters:** 3 — `name`, `course_name`, `join_link`  
**Last Used:** 29 Mar 2026  

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
**Status:** ❌ FAILING — 126 failed, "Campaign does not exist"  
**Category:** Utility  
**Trigger:** Manual — admin sends from Reminders page → Feedback Request  
**When:** 1–2 hours after webinar ends  
**Parameters:** 3 — `name`, `course_name`, `feedback_url`  
**Fix Required:** Create this campaign in AiSensy — template added 29 Mar 2026  

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
**Status:** ⚠️ Added 29 Mar 2026 — never tested  
**Category:** Utility  
**Trigger:** Manual — admin sends from Reminders page  
**When:** 24–48 hours after a webinar to re-engage no-shows  
**Parameters:** 4 — `name`, `course_name`, `next_webinar_date`, `join_link`  

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
**Trigger:** Manual — admin sends from Reminders page  
**When:** 3–5 days before a webinar as a promotional push  
**Parameters:** 5 — `name`, `webinar_name`, `webinar_date`, `webinar_time`, `registration_link`  
**Fix Required:** Create this campaign in AiSensy — template added 29 Mar 2026  

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

### A7. `nudge_1_job_market`
**Status:** ⚠️ Added 29 Mar 2026 — never tested  
**Category:** Marketing  
**Trigger:** Manual — admin sends from Reminders page → Conversion Nudges  
**When:** Day 1 post-webinar (no-show or attendee who didn't enrol)  
**Parameters:** 4 — `name`, `student_type_label`, `enrol_link`, `enrol_button_suffix`  
**Note:** Same campaign used for all student types — `student_type_label` personalises the message  

**Message Preview:**
```
Hi {{1}}, a quick reality check for {{2}}s in 2026 👇

In the last 12 months:
📉 42% of non-AI jobs have faced downsizing
📈 AI-skilled professionals earn 35–60% more
🏆 Employers now actively seek "AI + domain" expertise

Enrol now and lock in today's price:
{{3}}
```

---

### A8. `nudge_2_ai_critical`
**Status:** ⚠️ Added 29 Mar 2026 — never tested  
**Category:** Marketing  
**Trigger:** Manual — admin sends from Reminders page  
**When:** Day 2–3 post-webinar  
**Parameters:** 4 — `name`, `student_type_label`, `enrol_link`, `enrol_button_suffix`  

**Message Preview:**
```
Hi {{1}}, here's something every {{2}} needs to hear 🎯

AI isn't coming — it's already here. And it's not replacing people. It's replacing people who don't know AI.

With the AI Mastery Certification:
✅ No coding background required
✅ Live classes every weekend
✅ Real projects you can show employers
✅ Globally recognised certificate

Enrol today:
{{3}}

— Arijit Chowdhury, oStaran
```

---

### A9. `nudge_3_live_classes`
**Status:** ⚠️ Added 29 Mar 2026 — never tested  
**Category:** Marketing  
**Trigger:** Manual — admin sends from Reminders page  
**When:** Day 4–5 post-webinar  
**Parameters:** 4 — `name`, `student_type_label`, `enrol_link`, `enrol_button_suffix`  

**Message Preview:**
```
Hi {{1}}, what makes AI Mastery with Arijit different? 🤔

Unlike pre-recorded courses:
🔴 Live interactive classes every Saturday
👨‍💻 Real hands-on projects (not theory)
♾️ Lifetime access to all recordings
🏆 Globally recognised certificate

For {{2}}s who are serious about AI — this is the one.

Enrol now (fees increase every month):
{{3}}

— Arijit, oStaran × AIwithArijit
```

---

### A10. `nudge_4_real_projects`
**Status:** ⚠️ Added 29 Mar 2026 — never tested  
**Category:** Marketing  
**Trigger:** Manual — admin sends from Reminders page  
**When:** Day 6–7 post-webinar  
**Parameters:** 4 — `name`, `student_type_label`, `enrol_link`, `enrol_button_suffix`  

**Message Preview:**
```
Hi {{1}}, certificates alone don't get you ahead anymore. Portfolios do. 💼

In the AI Mastery Programme, you build:
🤖 Your own AI chatbot
📊 AI-powered data dashboards
🧠 Agentic AI workflows for real tasks
📄 A personal AI portfolio

No coding background needed.

Build your AI portfolio — enrol now:
{{3}}

— Arijit Chowdhury, oStaran
```

---

### A11. `nudge_5_ai_portfolio`
**Status:** ⚠️ Added 29 Mar 2026 — never tested  
**Category:** Marketing  
**Trigger:** Manual — admin sends from Reminders page  
**When:** Day 8–10 post-webinar (final nudge)  
**Parameters:** 4 — `name`, `student_type_label`, `enrol_link`, `enrol_button_suffix`  

**Message Preview:**
```
Hi {{1}}, your AI certification journey starts this weekend 🚀

Here's what previous {{2}} students say:
⭐ "Got promoted within 3 months"
⭐ "Finally understand how to use AI at work"
⭐ "Arijit explains things that actually make sense"

Join 10,000+ professionals who've already made the move.

This is your last nudge from us — the decision is yours. 🙏

Enrol today:
{{3}}

— Arijit Chowdhury, oStaran × AIwithArijit
```

---

## PART B — Post-Enrolment Campaigns (Student Journey)

**Platform:** `www.ostaran.com` (auto-triggered) + `partner.ostaran.com/admin/communications` (manual)  
**Edge Function:** `send-student-comms` (Supabase — deployed 29 Mar 2026)  
**Scheduler:** `send-student-session-reminders` (Supabase — deployed 29 Mar 2026)  
**Data Source:** `student_enrolments` + `session_master_table` + `awa_batches`  
**Log Table:** `student_comms_log`  

---

### B1. `student_payment_confirmed`
**Status:** ⚠️ Added to AiSensy 29 Mar 2026 — pending Meta approval  
**Category:** Utility  
**Project:** `www.ostaran.com` (auto)  
**Trigger:** AUTO — fires immediately when `enrollment/self` API succeeds (payment confirmed)  
**When:** Instantly on payment  
**Parameters:** 4 — `name`, `amount`, `course_name`, `select_batch_link`  

**Message Preview:**
```
Hi {{1}}, your payment of {{2}} for the {{3}} has been confirmed! 🎉

Your enrolment is now active. The next step is to choose your batch and timeslot — it takes less than a minute.

👇 Choose your batch here:
{{4}}

Welcome aboard! We're excited to have you.
— Arijit Chowdhury, oStaran × AIwithArijit
```

---

### B2. `student_batch_confirmed`
**Status:** ⚠️ Added to AiSensy 29 Mar 2026 — pending Meta approval  
**Category:** Utility  
**Project:** `www.ostaran.com` (auto)  
**Trigger:** AUTO — fires immediately when student selects a batch (`select-batch` API)  
**When:** Instantly on batch selection  
**Parameters:** 6 — `name`, `course_name`, `day_of_week`, `start_time`, `start_date`, `meeting_link`  

**Message Preview:**
```
Hi {{1}}! 🎓 Your batch is confirmed for {{2}}.

📅 Every {{3}} at {{4}} IST
📆 First class: {{5}}

🔗 Your join link (save this):
{{6}}

Join 5 mins early — we start sharp on time.
See you there!
— Arijit, oStaran
```

---

### B3. `student_session_reminder_24h`
**Status:** ⚠️ Added to AiSensy 29 Mar 2026 — pending Meta approval  
**Category:** Utility  
**Project:** `www.ostaran.com` (auto via pg_cron)  
**Trigger:** AUTO — pg_cron job `student-session-reminder-24h` runs every 30 minutes  
**When:** Automatically sent 24 hours before each session in `session_master_table`  
**Channels:** Email + WhatsApp  
**Parameters:** 7 — `name`, `course_name`, `session_number`, `session_title`, `session_date`, `session_time`, `join_link`  

**Message Preview:**
```
Hi {{1}}, your {{2}} class is tomorrow! 📚

📖 Session {{3}}: {{4}}
📅 {{5}} at {{6}} IST

🔗 Join link:
{{7}}

Quick prep: skim last session's notes and join 5 mins early.

See you in class!
— Arijit, oStaran
```

---

### B4. `student_session_reminder_1h`
**Status:** ⚠️ Added to AiSensy 29 Mar 2026 — pending Meta approval  
**Category:** Utility  
**Project:** `www.ostaran.com` (auto via pg_cron)  
**Trigger:** AUTO — pg_cron job `student-session-reminder-1h` runs every 30 minutes  
**When:** Automatically sent 1 hour before each session  
**Channels:** WhatsApp ONLY (no email for 1h reminder)  
**Parameters:** 4 — `name`, `course_name`, `session_number`, `join_link`  

**Message Preview:**
```
🔴 Class in 1 hour, {{1}}!

{{2}} — Session {{3}}

Join now (don't be late 😄):
{{4}}

See you in 60 minutes!
— Arijit, oStaran
```

---

### B5. `student_recording_available`
**Status:** ⚠️ Added to AiSensy 29 Mar 2026 — pending Meta approval  
**Category:** Utility  
**Project:** `partner.ostaran.com/admin` (manual)  
**Trigger:** MANUAL — admin clicks "Notify Students" on the Sessions admin page  
**When:** After admin uploads session recording/notes to `session_master_table`  
**Channels:** Email + WhatsApp  
**Parameters:** 7 — `name`, `session_number`, `recording_link`, `materials_link`, `next_date`, `next_time`, `dashboard_link`  

**Message Preview:**
```
Hi {{1}}! 📹 Session {{2}} is now in your dashboard.

🎬 Watch recording: {{3}}
📄 Study notes: {{4}}

📅 Next class: {{5}} at {{6}} IST

Your full dashboard: {{7}}

Consistent revision is what separates great students. 💡
— Arijit, oStaran
```

---

### B6. `student_batch_changed`
**Status:** ⚠️ Added to AiSensy 29 Mar 2026 — pending Meta approval  
**Category:** Utility  
**Project:** `partner.ostaran.com/admin` (manual)  
**Trigger:** MANUAL — admin changes a batch timeslot and notifies affected students  
**When:** When a batch schedule or join link changes  
**Channels:** Email + WhatsApp  
**Parameters:** 6 — `name`, `course_name`, `old_schedule`, `new_schedule`, `effective_date`, `new_meeting_link`  

**Message Preview:**
```
Hi {{1}}, important update about your {{2}} class ⚠️

Old schedule: {{3}}
New schedule: {{4}}
Effective from: {{5}}

New join link (update your calendar):
{{6}}

If this timeslot doesn't work for you, please reply and we'll help. Apologies for the inconvenience.
— Arijit, oStaran
```

---

### B7. `student_payment_reminder`
**Status:** ⚠️ Added to AiSensy 29 Mar 2026 — pending Meta approval  
**Category:** Utility  
**Project:** `www.ostaran.com` (auto via pg_cron)  
**Trigger:** AUTO — pg_cron job `student-payment-overdue-reminder` runs daily at 9:30am IST  
**When:** Auto-sent at 7, 14, and 21 days after enrolment if `balance_due > 0` (50-50 plan students)  
**Channels:** Email + WhatsApp  
**Parameters:** 4 — `name`, `balance_due`, `course_name`, `payment_link`  

**Message Preview:**
```
Hi {{1}}, a quick reminder 💳

₹{{2}} is outstanding for your {{3}} enrolment.

Pay here to keep your access active:
{{4}}

Already paid? Just ignore this. Need help? Reply here — we're happy to assist.
— Arijit, oStaran
```

---

### B8. `student_announcement`
**Status:** ⚠️ Added to AiSensy 29 Mar 2026 — pending Meta approval  
**Category:** Marketing  
**Project:** `partner.ostaran.com/admin/communications` (manual)  
**Trigger:** MANUAL — admin composes and broadcasts to batch/course/all students  
**When:** Any ad-hoc announcement — bonus session, schedule notice, guest lecture, etc.  
**Channels:** Email + WhatsApp (admin chooses)  
**Parameters:** 2 — `name`, `message_body`  

**Message Preview:**
```
Hi {{1}} 👋

{{2}}

— Arijit Chowdhury, oStaran × AIwithArijit
```

---

### B9. `student_certificate_ready`
**Status:** ⚠️ Added to AiSensy 29 Mar 2026 — pending Meta approval  
**Category:** Utility  
**Project:** `partner.ostaran.com/admin` (manual)  
**Trigger:** MANUAL — admin marks a certificate as issued  
**When:** When a student's certificate is ready for download  
**Channels:** Email + WhatsApp  
**Parameters:** 4 — `name`, `course_name`, `certificate_name`, `certificate_link`  

**Message Preview:**
```
🎓 Congratulations {{1}}!

Your {{2}} certificate is ready! 🏆

📜 {{3}}

Download here:
{{4}}

Add it to your LinkedIn profile — you've genuinely earned it! 💪

With pride,
— Arijit, oStaran
```

---

### B10. `student_course_completion`
**Status:** ⚠️ Added to AiSensy 29 Mar 2026 — pending Meta approval  
**Category:** Utility  
**Project:** `partner.ostaran.com/admin` (manual)  
**Trigger:** MANUAL — admin marks a course as complete for a student  
**When:** When a student completes all sessions of a course  
**Channels:** Email + WhatsApp  
**Parameters:** 3 — `name`, `course_name`, `certificate_link`  

**Message Preview:**
```
🎉 You did it, {{1}}!

{{2}} — COMPLETE ✅

You're now officially AI-certified. Take a moment to be proud of yourself.

Here's what's next:
🏆 Get your certificate: {{3}}
🤝 Become an AI Partner: partner.ostaran.com
📚 Explore more courses: ostaran.com/courses

It's been a privilege training you.
— Arijit Chowdhury, oStaran
```

---

## Quick Reference — All 21 Campaigns

| # | Campaign Name | Journey | Platform | Trigger | Status | Category | Params |
|---|---|---|---|---|---|---|---|
| 1 | `webinar_registration_confirmation_v2` | Pre-Enrolment | partner admin | Manual | ⚠️ Not tested | Utility | 5 |
| 2 | `webinar_countdown_reminder` | Pre-Enrolment | partner admin | Manual | ✅ Working | Utility | 5 |
| 3 | `webinar_live_now` | Pre-Enrolment | partner admin | Manual | ✅ Working | Utility | 3 |
| 4 | `webinar_feedback_request` | Pre-Enrolment | partner admin | Manual | ❌ Fix needed | Utility | 3 |
| 5 | `webinar_noshow_reengage` | Pre-Enrolment | partner admin | Manual | ⚠️ Not tested | Utility | 4 |
| 6 | `webinar_promotional` | Pre-Enrolment | partner admin | Manual | ❌ Fix needed | Marketing | 5 |
| 7 | `nudge_1_job_market` | Pre-Enrolment | partner admin | Manual | ⚠️ Not tested | Marketing | 4 |
| 8 | `nudge_2_ai_critical` | Pre-Enrolment | partner admin | Manual | ⚠️ Not tested | Marketing | 4 |
| 9 | `nudge_3_live_classes` | Pre-Enrolment | partner admin | Manual | ⚠️ Not tested | Marketing | 4 |
| 10 | `nudge_4_real_projects` | Pre-Enrolment | partner admin | Manual | ⚠️ Not tested | Marketing | 4 |
| 11 | `nudge_5_ai_portfolio` | Pre-Enrolment | partner admin | Manual | ⚠️ Not tested | Marketing | 4 |
| 12 | `student_payment_confirmed` | Post-Enrolment | ostaran.com | **Auto** (on payment) | ⚠️ Pending approval | Utility | 4 |
| 13 | `student_batch_confirmed` | Post-Enrolment | ostaran.com | **Auto** (on batch select) | ⚠️ Pending approval | Utility | 6 |
| 14 | `student_session_reminder_24h` | Post-Enrolment | ostaran.com | **Auto** (pg_cron) | ⚠️ Pending approval | Utility | 7 |
| 15 | `student_session_reminder_1h` | Post-Enrolment | ostaran.com | **Auto** (pg_cron) | ⚠️ Pending approval | Utility | 4 |
| 16 | `student_recording_available` | Post-Enrolment | partner admin | Manual | ⚠️ Pending approval | Utility | 7 |
| 17 | `student_batch_changed` | Post-Enrolment | partner admin | Manual | ⚠️ Pending approval | Utility | 6 |
| 18 | `student_payment_reminder` | Post-Enrolment | ostaran.com | **Auto** (pg_cron daily) | ⚠️ Pending approval | Utility | 4 |
| 19 | `student_announcement` | Post-Enrolment | partner admin | Manual | ⚠️ Pending approval | Marketing | 2 |
| 20 | `student_certificate_ready` | Post-Enrolment | partner admin | Manual | ⚠️ Pending approval | Utility | 4 |
| 21 | `student_course_completion` | Post-Enrolment | partner admin | Manual | ⚠️ Pending approval | Utility | 3 |

---

## Technical Architecture

### Edge Functions (Supabase — project enszifyeqnwcnxaqrmrq)

| Function Slug | Purpose | JWT |
|---|---|---|
| `send-student-reminder` | Pre-enrolment campaigns (webinar funnel) — v12 | false |
| `send-student-comms` | Post-enrolment campaigns (student journey) — v1, deployed 29 Mar 2026 | false |
| `send-student-session-reminders` | pg_cron scheduler for session reminders — v1, deployed 29 Mar 2026 | false |
| `send-wa-registration-confirmation` | WA on webinar registration | false |

### pg_cron Jobs

| Job Name | Schedule | Function Called | Purpose |
|---|---|---|---|
| `send-webinar-reminder-daily` | Daily 4:00 UTC (9:30am IST) | `send-webinar-reminder` | Webinar day-of reminders |
| `student-session-reminder-24h` | Every 30 min | `send-student-session-reminders` | 24h before each session |
| `student-session-reminder-1h` | Every 30 min | `send-student-session-reminders` | 1h before each session |
| `student-payment-overdue-reminder` | Daily 4:00 UTC (9:30am IST) | `send-student-session-reminders` | 50-50 plan payment reminders |

### Key DB Tables

| Table | Purpose |
|---|---|
| `student_reminder_templates` | Template definitions for pre-enrolment campaigns |
| `student_reminder_campaigns` | Campaign send history (pre-enrolment) |
| `student_reminder_log` | Per-student send log (pre-enrolment) |
| `student_comms_log` | Per-student send log (post-enrolment, with dedup_key) |
| `student_comms_settings` | Per-student opt-in/out preferences |

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

### Immediate — fix broken campaigns
- [ ] Create `webinar_feedback_request` in AiSensy → submit for Meta approval
- [ ] Create `webinar_promotional` in AiSensy → submit for Meta approval

### Pending Meta Approval (submitted 29 Mar 2026)
- [ ] `student_payment_confirmed` — Utility (24–48h approval expected)
- [ ] `student_batch_confirmed` — Utility
- [ ] `student_session_reminder_24h` — Utility
- [ ] `student_session_reminder_1h` — Utility
- [ ] `student_recording_available` — Utility
- [ ] `student_batch_changed` — Utility
- [ ] `student_payment_reminder` — Utility
- [ ] `student_announcement` — Marketing (3–7 days)
- [ ] `student_certificate_ready` — Utility
- [ ] `student_course_completion` — Utility

### Test after approval
- [ ] Test `student_payment_confirmed` — make a real payment on ostaran.com
- [ ] Test `student_batch_confirmed` — select a batch after payment
- [ ] Test `webinar_feedback_request` — send from partner admin reminders page
- [ ] Test `nudge_1` through `nudge_5` — send from partner admin reminders page
- [ ] Verify pg_cron session reminders — check `student_comms_log` after a session date

---

*This file is the single source of truth for all WhatsApp AiSensy campaigns across the oStaran ecosystem.*  
*Update this file whenever: a new campaign is added, status changes, a trigger is modified, or Meta approval is received.*
