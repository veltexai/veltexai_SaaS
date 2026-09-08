-- Deploy alongside the application changes: verified billing routes now use
-- the service role for entitlement writes. Ordinary profile edits remain valid.
BEGIN;

CREATE OR REPLACE FUNCTION public.can_user_access_template(user_uuid UUID, template_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.template_tier_access a ON a.subscription_tier =
      CASE WHEN p.subscription_status = 'free_trial' THEN 'professional'
           ELSE COALESCE(p.subscription_plan, 'starter') END
    JOIN public.proposal_templates t ON t.id = a.template_id
    WHERE p.id = user_uuid AND t.id = template_uuid AND t.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_proposal_design_entitlement()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- A null design is the legacy Basic renderer, never Executive Premium.
  IF NEW.template_id IS NOT NULL
     AND NOT public.can_user_access_template(NEW.user_id, NEW.template_id) THEN
    RAISE EXCEPTION 'Your plan does not include this proposal design.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proposals_enforce_design_entitlement ON public.proposals;
CREATE TRIGGER proposals_enforce_design_entitlement
BEFORE INSERT OR UPDATE OF template_id, user_id ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.enforce_proposal_design_entitlement();

CREATE OR REPLACE FUNCTION public.enforce_preferred_design_entitlement()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.preferred_template_id IS NOT NULL
     AND NOT public.can_user_access_template(NEW.user_id, NEW.preferred_template_id) THEN
    RAISE EXCEPTION 'Your plan does not include this proposal design.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS preferences_enforce_design_entitlement ON public.user_template_preferences;
CREATE TRIGGER preferences_enforce_design_entitlement
BEFORE INSERT OR UPDATE OF preferred_template_id, user_id ON public.user_template_preferences
FOR EACH ROW EXECUTE FUNCTION public.enforce_preferred_design_entitlement();

CREATE OR REPLACE FUNCTION public.protect_profile_entitlements()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- SECURITY INVOKER is essential: a SECURITY DEFINER guard would always see
  -- its owner here. Auth signup triggers and verified billing keep working.
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    -- Preserve password-login's minimal missing-profile recovery, not arbitrary
    -- subscription grants. Normal signup is handled by handle_new_user().
    IF COALESCE(NEW.role, 'user') <> 'user'
       OR COALESCE(NEW.subscription_plan, 'starter') <> 'starter'
       OR COALESCE(NEW.subscription_status, 'trial') NOT IN ('trial', 'pending')
       OR NEW.stripe_customer_id IS NOT NULL THEN
      RAISE EXCEPTION 'Entitlements are managed by billing.' USING ERRCODE = '42501';
    END IF;
    -- Match the database default; do not accept a caller-chosen trial duration.
    NEW.trial_end_at := NOW() + INTERVAL '14 days';
  ELSIF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.trial_end_at IS DISTINCT FROM OLD.trial_end_at THEN
    RAISE EXCEPTION 'Entitlements are managed by billing.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_entitlements ON public.profiles;
CREATE TRIGGER profiles_protect_entitlements
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_entitlements();

CREATE OR REPLACE FUNCTION public.protect_subscription_entitlements()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Subscriptions are managed by billing.' USING ERRCODE = '42501';
  ELSIF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id THEN
    RAISE EXCEPTION 'Subscriptions are managed by billing.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_protect_entitlements ON public.subscriptions;
CREATE TRIGGER subscriptions_protect_entitlements
BEFORE INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.protect_subscription_entitlements();

-- Legacy SECURITY DEFINER RPC accepts any user and plan; browsers must not
-- elevate their plan through it. Some environments never created this older
-- RPC, so make the permission hardening conditional rather than failing the
-- entire migration.
DO $$
BEGIN
  IF to_regprocedure('public.start_user_trial(uuid,text)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.start_user_trial(UUID, TEXT) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.start_user_trial(UUID, TEXT) TO service_role;
  END IF;
END;
$$;

COMMIT;
