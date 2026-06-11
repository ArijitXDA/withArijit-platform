-- Link auto-drafted social posts back to the recruiter job that spawned them.
-- Enables dedup (one draft set per job) + traceability in the Social tab.
ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS recruiter_job_id uuid
    REFERENCES public.recruiter_jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS social_posts_recruiter_job_idx
  ON public.social_posts (recruiter_job_id)
  WHERE recruiter_job_id IS NOT NULL;

COMMENT ON COLUMN public.social_posts.recruiter_job_id IS
  'Set when this post was auto-drafted from a recruiter job going public. NULL for manually composed posts.';
