-- Narrow Executive Premium preview entitlement for active free-trial users.
-- Paid ownership remains Professional/Enterprise. Export restrictions unchanged.

CREATE OR REPLACE FUNCTION public.can_user_access_template(
  user_uuid UUID,
  template_uuid UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_record RECORD;
  user_tier TEXT;
  has_access BOOLEAN := false;
BEGIN
  SELECT subscription_status, trial_end_at, subscription_plan
  INTO profile_record
  FROM public.profiles
  WHERE id = user_uuid;

  IF profile_record IS NULL THEN
    RETURN false;
  END IF;

  IF profile_record.subscription_status = 'free_trial'
     AND profile_record.trial_end_at IS NOT NULL
     AND profile_record.trial_end_at > NOW() THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.proposal_templates pt
      WHERE pt.id = template_uuid
        AND pt.name = 'Executive Premium'
        AND pt.is_active = true
    ) INTO has_access;

    IF has_access THEN
      RETURN true;
    END IF;
  END IF;

  SELECT s.plan
  INTO user_tier
  FROM public.subscriptions s
  WHERE s.user_id = user_uuid
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF user_tier IS NULL THEN
    user_tier := COALESCE(profile_record.subscription_plan, 'starter');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.template_tier_access tta
    JOIN public.proposal_templates pt ON pt.id = tta.template_id
    WHERE tta.template_id = template_uuid
      AND tta.subscription_tier = user_tier
      AND pt.is_active = true
  ) INTO has_access;

  RETURN has_access;
END;
$$;

REVOKE ALL ON FUNCTION public.can_user_access_template(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_user_access_template(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.can_user_access_template(UUID, UUID) IS
  'Enforces paid template tiers with one active-free-trial exception for Executive Premium. Does not change export rights.';
