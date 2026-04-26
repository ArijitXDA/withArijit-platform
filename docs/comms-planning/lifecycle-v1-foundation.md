# Lifecycle Comms Engine — v1 Foundation

**Status**: Phase 1 complete, applied 2026-04-26. Phase 2a (sequences + dispatcher) is next.

## Decisions locked

| # | Decision | Choice |
|---|---|---|
| 1 | Table prefix | `lifecycle_*` |
| 2 | Dispatcher | Supabase Edge Function + pg_cron |
| 3 | Templates | DB table `lifecycle_templates` |
| 4 | Phase 2a scope | Build S8 + S1 in parallel |
| 5 | Consent flags | Day 1 (DPDP/GDPR-ready) |
| 6 | Lead score | Day 1, computed in view |
| 7 | AiSensy strategy | Plan B (templates after engine ready) |
| 8 | Hot lead threshold | score ≥ 60 |
| 9 | Paid-attendance points | +35 |
| 10 | Decay half-life | 21 days |

## Architecture overview

A thin orchestration layer over existing tables. No replacement, no fork — just a layer that observes events and runs sequences. Existing systems (Make, AiSensy, Resend, qr_landing_registrations, etc.) stay as-is.

```
                    ┌──────────────────────────┐
                    │  Existing tables         │
                    │  qr_landing_registrations│
                    │  quiz_responses          │
                    │  community_members       │
                    │  library_views           │
                    │  resume_submissions      │
                    │  student_enrolments      │
                    │  webinar_ratings         │
                    │  awa_email_log           │
                    └────────────┬─────────────┘
                                 │
                  triggers + backfill
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │  lifecycle_events        │  (append-only)
                    └────────────┬─────────────┘
                                 │
                       observed by dispatcher
                                 │
                                 ▼
              ┌───────────────────────────────────┐
              │  lifecycle_sequences              │
              │  lifecycle_sequence_steps         │
              │  lifecycle_sequence_enrolments    │
              │  lifecycle_templates              │
              │  lifecycle_suppression            │
              │  lifecycle_consent_log            │
              │  lifecycle_dispatch_log           │
              └─────────────┬─────────────────────┘
                            │
                            ▼
                    ┌────────────────┐
                    │  Resend / AiSensy │
                    └────────────────┘
```

## Tables created (Phase 1)

| Table | Purpose |
|---|---|
| `lifecycle_events` | Append-only event log. ~800 rows backfilled at launch. Idempotent on (event_source_table, source_row_id, event_type). |
| `lifecycle_sequences` | Sequence definitions (S1, S8, etc.) — name, track, trigger event, trigger filter, exit conditions, priority. |
| `lifecycle_sequence_steps` | Steps per sequence. delay_hours OR absolute_anchor. |
| `lifecycle_sequence_enrolments` | State machine: who's in which sequence, current step, next_send_at. Unique active enrolment per (sequence, email). |
| `lifecycle_templates` | Versioned template library (email + WhatsApp). |
| `lifecycle_suppression` | Unsubscribe / bounce list. Channel-aware. |
| `lifecycle_consent_log` | Append-only consent audit (DPDP/GDPR). Latest row by recorded_at = current state. |
| `lifecycle_dispatch_log` | Forensic log of every send attempt. Separate from events for debugging. |

## Key view: `lifecycle_contact_profile`

One row per email. Computed from UNION of 7 source tables. Includes:

- Identity (name, email, mobile, first_seen_at, partner_code)
- `stage_reached` enum (highest of: anonymous → cold → warm → registered_free → registered_paid → attended_free → attended_paid → enrolled)
- `ever_*` counters (webinar regs, masterclass paid, attended free/paid, quiz, library, resume, enrolled, ratings)
- Consent state per channel (defaults to `opted_in` with source `legacy_pre_2026_05` for pre-existing contacts)
- `is_suppressed` boolean
- `lead_score` 0–100 (event-driven, 21-day half-life decay)
- `is_hot_lead` boolean (score ≥ 60 AND not suppressed AND not enrolled)
- `last_event_type` / `last_event_at`
- `active_sequences` array

At launch (post-backfill, 2026-04-26):
- 483 unique contacts
- 5 enrolled, 11 attended free, 1 registered paid, 387 registered free, 69 warm, 2 cold
- Top scoring real lead: Antara (registered_paid, score 58)
- Next: 4× registered, 5× registered, paid attendees once they happen

## Lead score formula

Each event contributes points (subject to per-type caps), then sum is decayed by 21-day half-life via `1 / (1 + days_ago / 21)`.

| Event | Points | Cap |
|---|---|---|
| `community_joined` | +5 | — |
| `quiz_completed` | +10 | — |
| `library_view` | +3 | max 5 events (+15 total) |
| `resume_submitted` | +20 | — |
| `webinar_registered` | +15 | — |
| `masterclass_registered` | +30 | — |
| `masterclass_paid` | +50 | — |
| `session_attended` (free) | +25 | — |
| `session_attended` (paid) | +35 | — |
| `session_rated` (≥4) | +10 | — |
| `session_rated` (<4) | -5 | — |
| `email_clicked` | +2 | max 5 events (+10 total) |
| `whatsapp_replied` | +5 | — |
| `email_bounced` | -10 | — |
| 30+ days no activity | -10 (penalty) | — |
| 60+ days no activity | -20 (penalty) | — |

Final score capped at 0–100.

## What Phase 1 does NOT do

- ❌ No sequence definitions yet — Phase 2a
- ❌ No templates yet — Phase 2a
- ❌ No dispatcher edge function yet — Phase 2a
- ❌ No partner-track sequences — v2
- ❌ No admin UI — Phase 5

## Phase 2a (next)

Build `S8 — Post-Paid-Masterclass Enrol Push` and `S1 — Free Webinar Attendance Push` end-to-end:

1. Seed sequence definitions in `lifecycle_sequences` + `lifecycle_sequence_steps`
2. Draft email templates in `lifecycle_templates`
3. Draft WhatsApp template specs (text only, submitted to AiSensy after engine validated)
4. Build dispatcher edge function (scans `lifecycle_sequence_enrolments WHERE status='active' AND next_send_at <= NOW()`)
5. Build trigger watchers (webhook-triggered or polling) that auto-enrol new contacts when matching events fire
6. pg_cron schedule (every 5 min)
7. End-to-end test on a single test contact

Estimated: ~2 weeks of focused work compressed into chat sessions.

## Files

- `supabase/migrations/20260426062351_lifecycle_v1_foundation.sql` — tables, enums, indexes, RLS
- `supabase/migrations/20260426062502_lifecycle_v1_contact_profile_view.sql` — the view
- This doc
