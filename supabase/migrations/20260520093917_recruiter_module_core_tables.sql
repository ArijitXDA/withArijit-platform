-- ════════════════════════════════════════════════════════════════════════════
-- Recruiter Module — Migration 2 of 2
-- Six core tables: recruiters, jobs, views, contact_requests, shortlists,
-- shortlist_members, saved_searches.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Recruiters ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recruiters (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  auth_user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Company
  company_name        text NOT NULL,
  company_website     text,
  company_logo_url    text,
  company_size        text,           -- 1-10 / 11-50 / 51-200 / 201-1000 / 1000+
  industry            text,

  -- Contact person
  contact_name        text NOT NULL,
  work_email          text NOT NULL UNIQUE,
  work_email_domain   text GENERATED ALWAYS AS (lower(split_part(work_email, '@', 2))) STORED,
  mobile              text,
  designation         text,

  -- Identity / compliance
  hq_city             text,
  hq_country          text DEFAULT 'India',
  gst_number          text,
  pan                 text,

  -- Plan
  hiring_volume       text,           -- 1-5 / 6-20 / 21+
  plan_tier           text NOT NULL DEFAULT 'free',
  credits_remaining   integer NOT NULL DEFAULT 0,
  credits_total       integer NOT NULL DEFAULT 0,

  -- Lifecycle
  status              text NOT NULL DEFAULT 'pending_verification',
                         -- pending_verification | active | suspended | rejected
  verified_at         timestamptz,
  approved_at         timestamptz,
  approved_by         uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  rejected_reason     text,
  suspended_reason    text,

  -- UTM / acquisition
  utm_source          text,
  utm_medium          text,
  utm_campaign        text,
  referer             text,

  -- Counters (denormalised; updated by triggers later)
  total_jobs_posted        integer NOT NULL DEFAULT 0,
  total_candidates_viewed  integer NOT NULL DEFAULT 0,
  total_contacts_requested integer NOT NULL DEFAULT 0,

  admin_notes         text,
  is_spam             boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS recruiters_status_idx       ON public.recruiters (status);
CREATE INDEX IF NOT EXISTS recruiters_email_idx        ON public.recruiters (lower(work_email));
CREATE INDEX IF NOT EXISTS recruiters_domain_idx       ON public.recruiters (work_email_domain);
CREATE INDEX IF NOT EXISTS recruiters_auth_idx         ON public.recruiters (auth_user_id);
CREATE INDEX IF NOT EXISTS recruiters_created_idx      ON public.recruiters (created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.recruiters_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS recruiters_updated_at ON public.recruiters;
CREATE TRIGGER recruiters_updated_at
  BEFORE UPDATE ON public.recruiters
  FOR EACH ROW EXECUTE FUNCTION public.recruiters_set_updated_at();


-- ─── Recruiter jobs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recruiter_jobs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  recruiter_id          uuid NOT NULL REFERENCES public.recruiters(id) ON DELETE CASCADE,

  title                 text NOT NULL,
  slug                  text UNIQUE,
  description           text,          -- markdown
  employment_type       text NOT NULL DEFAULT 'full_time',
                          -- full_time | part_time | contract | intern | freelance
  location_type         text NOT NULL DEFAULT 'onsite',
                          -- onsite | hybrid | remote
  location_city         text,
  location_country      text DEFAULT 'India',

  exp_min_years         integer,
  exp_max_years         integer,
  ctc_min_lpa           numeric(8, 2),
  ctc_max_lpa           numeric(8, 2),
  ctc_currency          text DEFAULT 'INR',
  show_ctc_publicly     boolean NOT NULL DEFAULT false,

  skills_required       text[] DEFAULT '{}'::text[],
  skills_nice_to_have   text[] DEFAULT '{}'::text[],
  education_min         text,

  is_public             boolean NOT NULL DEFAULT true,
  status                text NOT NULL DEFAULT 'draft',
                          -- draft | active | paused | closed
  closed_at             timestamptz,
  closed_reason         text,

  applications_count    integer NOT NULL DEFAULT 0,
  views_count           integer NOT NULL DEFAULT 0,

  tsv                   tsvector
);

CREATE INDEX IF NOT EXISTS jobs_status_idx       ON public.recruiter_jobs (status);
CREATE INDEX IF NOT EXISTS jobs_recruiter_idx    ON public.recruiter_jobs (recruiter_id);
CREATE INDEX IF NOT EXISTS jobs_public_idx       ON public.recruiter_jobs (is_public, status) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS jobs_skills_gin       ON public.recruiter_jobs USING gin (skills_required);
CREATE INDEX IF NOT EXISTS jobs_tsv_gin          ON public.recruiter_jobs USING gin (tsv);
CREATE INDEX IF NOT EXISTS jobs_created_idx      ON public.recruiter_jobs (created_at DESC);

CREATE OR REPLACE FUNCTION public.recruiter_jobs_tsv_refresh()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.tsv :=
       setweight(to_tsvector('simple', coalesce(NEW.title, '')),                                          'A')
    || setweight(to_tsvector('simple', array_to_string(coalesce(NEW.skills_required, '{}'), ' ')),        'A')
    || setweight(to_tsvector('simple', coalesce(NEW.location_city, '')),                                  'B')
    || setweight(to_tsvector('simple', array_to_string(coalesce(NEW.skills_nice_to_have, '{}'), ' ')),    'C')
    || setweight(to_tsvector('simple', coalesce(NEW.description, '')),                                    'D');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS jobs_tsv_trg ON public.recruiter_jobs;
CREATE TRIGGER jobs_tsv_trg
  BEFORE INSERT OR UPDATE ON public.recruiter_jobs
  FOR EACH ROW EXECUTE FUNCTION public.recruiter_jobs_tsv_refresh();


-- ─── Candidate views (audit trail) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recruiter_candidate_views (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  recruiter_id          uuid NOT NULL REFERENCES public.recruiters(id) ON DELETE CASCADE,
  resume_submission_id  uuid NOT NULL REFERENCES public.resume_submissions(id) ON DELETE CASCADE,
  view_type             text NOT NULL DEFAULT 'card',
                          -- card | full_profile | resume_download
  job_id                uuid REFERENCES public.recruiter_jobs(id) ON DELETE SET NULL,
  source                text,           -- search | shortlist | job_match | direct_link
  ip                    inet,
  user_agent            text
);

CREATE INDEX IF NOT EXISTS views_recruiter_idx  ON public.recruiter_candidate_views (recruiter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS views_candidate_idx  ON public.recruiter_candidate_views (resume_submission_id, created_at DESC);


-- ─── Contact requests (consent-gated unlock) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recruiter_contact_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  recruiter_id          uuid NOT NULL REFERENCES public.recruiters(id) ON DELETE CASCADE,
  resume_submission_id  uuid NOT NULL REFERENCES public.resume_submissions(id) ON DELETE CASCADE,
  job_id                uuid REFERENCES public.recruiter_jobs(id) ON DELETE SET NULL,

  recruiter_message     text,                       -- pitch shown to candidate

  status                text NOT NULL DEFAULT 'pending_admin_review',
                          -- pending_admin_review | candidate_notified | candidate_accepted
                          -- candidate_declined | admin_rejected | expired
  admin_reviewed_by     uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  admin_reviewed_at     timestamptz,
  admin_note            text,

  candidate_response_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  candidate_notified_at timestamptz,
  candidate_decided_at  timestamptz,
  candidate_message     text,                       -- optional reply

  credits_charged       integer NOT NULL DEFAULT 0,

  expires_at            timestamptz NOT NULL DEFAULT (now() + interval '14 days'),

  UNIQUE (recruiter_id, resume_submission_id, job_id)
);

CREATE INDEX IF NOT EXISTS contact_req_status_idx
  ON public.recruiter_contact_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS contact_req_recruiter_idx
  ON public.recruiter_contact_requests (recruiter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS contact_req_candidate_idx
  ON public.recruiter_contact_requests (resume_submission_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.recruiter_contact_requests_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS contact_req_updated_at ON public.recruiter_contact_requests;
CREATE TRIGGER contact_req_updated_at
  BEFORE UPDATE ON public.recruiter_contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.recruiter_contact_requests_set_updated_at();


-- ─── Shortlists ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recruiter_shortlists (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  recruiter_id    uuid NOT NULL REFERENCES public.recruiters(id) ON DELETE CASCADE,
  name            text NOT NULL,
  job_id          uuid REFERENCES public.recruiter_jobs(id) ON DELETE SET NULL,
  description     text,
  UNIQUE (recruiter_id, name)
);

CREATE TABLE IF NOT EXISTS public.recruiter_shortlist_members (
  shortlist_id          uuid NOT NULL REFERENCES public.recruiter_shortlists(id) ON DELETE CASCADE,
  resume_submission_id  uuid NOT NULL REFERENCES public.resume_submissions(id) ON DELETE CASCADE,
  added_at              timestamptz NOT NULL DEFAULT now(),
  added_by_recruiter_id uuid REFERENCES public.recruiters(id) ON DELETE SET NULL,
  notes                 text,
  rating                smallint CHECK (rating BETWEEN 1 AND 5),
  PRIMARY KEY (shortlist_id, resume_submission_id)
);

CREATE INDEX IF NOT EXISTS shortlist_recruiter_idx ON public.recruiter_shortlists (recruiter_id);


-- ─── Saved searches ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recruiter_saved_searches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  recruiter_id    uuid NOT NULL REFERENCES public.recruiters(id) ON DELETE CASCADE,
  name            text NOT NULL,
  query           jsonb NOT NULL,
  notify_on_new   boolean NOT NULL DEFAULT false,
  last_run_at     timestamptz,
  last_match_count integer DEFAULT 0,
  UNIQUE (recruiter_id, name)
);

CREATE INDEX IF NOT EXISTS saved_search_recruiter_idx
  ON public.recruiter_saved_searches (recruiter_id);


-- ─── Add recruiter lifecycle sequences to existing engine ──────────────────
-- (Schema-only; data rows for R1-R6 will be inserted in Phase 2)

COMMENT ON TABLE public.recruiters IS
  'Companies/HR users who post jobs and search the candidate DB at /recruit/*. Mirrors the partners table pattern.';
COMMENT ON TABLE public.recruiter_jobs IS
  'Job postings. is_public + status=active → visible on /recruit/jobs board for SEO.';
COMMENT ON TABLE public.recruiter_candidate_views IS
  'Audit trail of every candidate impression a recruiter sees — DPDP/compliance evidence.';
COMMENT ON TABLE public.recruiter_contact_requests IS
  'Consent-gated unlock. v1 flow: pending_admin_review → candidate_notified → candidate_accepted/declined. Recruiter sees email/mobile only after candidate accepts.';
COMMENT ON TABLE public.recruiter_shortlists IS
  'Recruiter-curated candidate buckets, optionally tied to a specific job.';
COMMENT ON TABLE public.recruiter_saved_searches IS
  'Persisted search queries (jsonb). notify_on_new enables future weekly digest.';
