-- ════════════════════════════════════════════════════════════════════════════
-- Recruiter Module — Migration 1 of 2
-- Additive columns on resume_submissions to enable recruiter-facing search.
-- All columns are nullable / defaulted so existing rows and triggers are safe.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.resume_submissions
  ADD COLUMN IF NOT EXISTS age                         integer,
  ADD COLUMN IF NOT EXISTS current_ctc_lpa             numeric(8, 2),
  ADD COLUMN IF NOT EXISTS expected_ctc_lpa            numeric(8, 2),
  ADD COLUMN IF NOT EXISTS notice_period_days          integer,
  ADD COLUMN IF NOT EXISTS skills                      text[]   DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS linkedin_url                text,
  ADD COLUMN IF NOT EXISTS is_open_to_opportunities    boolean  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS searchable_by_recruiters    boolean  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS recruiter_optout_at         timestamptz,
  ADD COLUMN IF NOT EXISTS last_searched_match_at      timestamptz;

-- Full-text vector (computed) — auto-rebuilt by trigger below
ALTER TABLE public.resume_submissions
  ADD COLUMN IF NOT EXISTS tsv tsvector;

-- ─── Indexes for recruiter search ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS resume_skills_gin
  ON public.resume_submissions USING gin (skills);

CREATE INDEX IF NOT EXISTS resume_preferred_locations_gin
  ON public.resume_submissions USING gin (preferred_locations);

CREATE INDEX IF NOT EXISTS resume_tsv_gin
  ON public.resume_submissions USING gin (tsv);

CREATE INDEX IF NOT EXISTS resume_searchable_filter
  ON public.resume_submissions (searchable_by_recruiters, is_open_to_opportunities, is_spam, status);

CREATE INDEX IF NOT EXISTS resume_city_idx
  ON public.resume_submissions (lower(current_city));

CREATE INDEX IF NOT EXISTS resume_industry_idx
  ON public.resume_submissions (lower(industry));

CREATE INDEX IF NOT EXISTS resume_years_exp_idx
  ON public.resume_submissions (years_experience)
  WHERE years_experience IS NOT NULL;

CREATE INDEX IF NOT EXISTS resume_ctc_idx
  ON public.resume_submissions (current_ctc_lpa)
  WHERE current_ctc_lpa IS NOT NULL;

-- ─── tsv trigger: rebuild on insert/update ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.resume_submissions_tsv_refresh()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.tsv :=
       setweight(to_tsvector('simple', coalesce(NEW.full_name, '')),                 'A')
    || setweight(to_tsvector('simple', coalesce(NEW.target_job_role, '')),           'A')
    || setweight(to_tsvector('simple', coalesce(NEW.current_job_role, '')),          'A')
    || setweight(to_tsvector('simple', array_to_string(coalesce(NEW.skills, '{}'::text[]), ' ')), 'A')
    || setweight(to_tsvector('simple', coalesce(NEW.current_company, '')),           'B')
    || setweight(to_tsvector('simple', coalesce(NEW.industry, '')),                  'B')
    || setweight(to_tsvector('simple', coalesce(NEW.current_city, '')),              'B')
    || setweight(to_tsvector('simple', array_to_string(coalesce(NEW.preferred_locations, '{}'::text[]), ' ')), 'B')
    || setweight(to_tsvector('simple', coalesce(NEW.highest_education, '')),         'C')
    || setweight(to_tsvector('simple', coalesce(NEW.edu_institution, '')),           'C')
    || setweight(to_tsvector('simple', coalesce(NEW.audience_segment, '')),          'D')
    || setweight(to_tsvector('simple', coalesce(NEW.resume_text_pasted, '')),        'D');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS resume_submissions_tsv_trg ON public.resume_submissions;
CREATE TRIGGER resume_submissions_tsv_trg
  BEFORE INSERT OR UPDATE ON public.resume_submissions
  FOR EACH ROW EXECUTE FUNCTION public.resume_submissions_tsv_refresh();

-- ─── Backfill tsv for the 3 existing rows ────────────────────────────────────
UPDATE public.resume_submissions
SET updated_at = updated_at
WHERE tsv IS NULL;

-- ─── Searchable view that admin + recruiter API can both read against ──────
CREATE OR REPLACE VIEW public.v_searchable_candidates AS
SELECT
  id,
  created_at,
  full_name,
  email,
  mobile,
  current_city,
  preferred_locations,
  industry,
  current_company,
  current_job_role,
  target_job_role,
  years_experience,
  age,
  highest_education,
  edu_institution,
  edu_graduation_year,
  current_ctc_lpa,
  expected_ctc_lpa,
  notice_period_days,
  skills,
  linkedin_url,
  audience_segment,
  parse_status,
  parsed_data,
  resume_file_url,
  is_open_to_opportunities,
  status,
  tsv
FROM public.resume_submissions
WHERE searchable_by_recruiters = true
  AND is_spam = false
  AND status NOT IN ('blocked', 'archived');

COMMENT ON COLUMN public.resume_submissions.searchable_by_recruiters IS
  'When true, candidate appears in recruiter-facing search. Default true. Candidate can opt out.';
COMMENT ON COLUMN public.resume_submissions.is_open_to_opportunities IS
  'Soft flag the candidate can toggle without losing search visibility entirely.';
COMMENT ON COLUMN public.resume_submissions.skills IS
  'Normalised skill tags (lowercase). Populated from parse_jsonb on import or admin curation.';
