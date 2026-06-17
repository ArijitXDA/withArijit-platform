-- Maps a student's email → their device push tokens (Android/iOS/web), so the
-- attendance reminder jobs can target a specific student's phone via FCM.
-- All reads/writes go through server routes using the service role, so RLS is
-- ON with no anon/authenticated policies (service role bypasses it).
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_email text NOT NULL,
  token         text NOT NULL UNIQUE,
  platform      text,            -- 'android' | 'ios' | 'web'
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS device_tokens_email_idx ON public.device_tokens (student_email);
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
