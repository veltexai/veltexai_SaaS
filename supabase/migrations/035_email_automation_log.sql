-- Email Automation Log
-- Tracks which lifecycle emails have been sent to each user to prevent duplicates.
-- Types: 'welcome' | 'first_proposal' | 'trial_ending' | 'trial_expired'

CREATE TABLE IF NOT EXISTS public.email_automation_log (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_type  TEXT        NOT NULL,
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, email_type)
);

ALTER TABLE public.email_automation_log ENABLE ROW LEVEL SECURITY;

-- Only service-role code writes to this table; no user-facing policies needed.
CREATE POLICY "Service role only" ON public.email_automation_log
  USING (false)
  WITH CHECK (false);

-- Index for fast cron look-ups
CREATE INDEX IF NOT EXISTS idx_email_automation_log_user_type
  ON public.email_automation_log (user_id, email_type);
