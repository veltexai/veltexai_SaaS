-- Deploy before enabling 4x/6x weekly Commercial Quick proposals.
-- Expand accepted values only; historical proposal/pricing snapshots are untouched.
BEGIN;

ALTER TABLE public.proposals
  DROP CONSTRAINT proposals_service_frequency_check;

ALTER TABLE public.proposals
  ADD CONSTRAINT proposals_service_frequency_check CHECK (
    service_frequency IN (
      'one-time', '1x-month', 'bi-weekly', 'weekly',
      '2x-week', '3x-week', '5x-week', 'daily'
    ) OR (
      service_type = 'commercial' AND service_frequency IN ('4x-week', '6x-week')
    )
  ) NOT VALID;

COMMIT;

-- Validate without holding the exclusive constraint-replacement lock.
ALTER TABLE public.proposals VALIDATE CONSTRAINT proposals_service_frequency_check;
