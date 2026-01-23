-- Fix Trial Display, Template Access, and Usage Reset
-- ====================================================
-- 1. When 3 trial proposals are used, show actual plan (not "Free Trial")
-- 2. Fix template access to read from subscriptions table
-- 3. Handle usage reset when trial ends (proposal count resets to 0)

-- =============================================
-- FIX 1: Update get_user_usage_info function
-- =============================================
-- When trial proposals are exhausted, set is_trial = FALSE and show actual plan

CREATE OR REPLACE FUNCTION get_user_usage_info(user_uuid UUID)
RETURNS TABLE(
    current_usage INTEGER,
    proposal_limit INTEGER,
    can_create_proposal BOOLEAN,
    subscription_plan TEXT,
    subscription_status TEXT,
    remaining_proposals INTEGER,
    is_trial BOOLEAN,
    trial_end_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    profile_record RECORD;
    subscription_record RECORD;
    usage_count INTEGER;
    limit_count INTEGER;
BEGIN
    SELECT p.subscription_status, p.trial_end_at, p.subscription_plan, p.created_at
    INTO profile_record
    FROM profiles p
    WHERE p.id = user_uuid;
    
    usage_count := get_user_current_usage(user_uuid);
    
    SELECT s.plan, s.status, s.current_period_start, s.current_period_end
    INTO subscription_record
    FROM subscriptions s
    WHERE s.user_id = user_uuid 
    AND s.status IN ('active', 'trialing')
    ORDER BY s.created_at DESC 
    LIMIT 1;
    
    IF subscription_record IS NOT NULL THEN
        subscription_plan := subscription_record.plan;
        
        IF subscription_record.status = 'trialing' THEN
            -- Check if trial is still valid (BOTH time AND proposals remaining)
            IF profile_record.trial_end_at IS NOT NULL 
               AND profile_record.trial_end_at > NOW() 
               AND usage_count < 3 THEN
                -- Trial is ACTIVE (time valid AND proposals remaining)
                subscription_status := 'trialing';
                is_trial := TRUE;
                trial_end_at := profile_record.trial_end_at;
                limit_count := 3;
            ELSE
                -- Trial ENDED (either time expired OR all 3 proposals used)
                -- User is now on their selected plan
                subscription_status := 'active';
                is_trial := FALSE;
                trial_end_at := NULL;
                
                -- Use the REAL plan limits
                CASE subscription_record.plan
                    WHEN 'starter' THEN limit_count := 20;
                    WHEN 'professional' THEN limit_count := 75;
                    WHEN 'enterprise' THEN limit_count := -1;
                    ELSE limit_count := 0;
                END CASE;
            END IF;
        ELSE
            -- User has ACTIVE paid subscription (not trialing)
            subscription_status := 'active';
            is_trial := FALSE;
            trial_end_at := NULL;
            
            CASE subscription_record.plan
                WHEN 'starter' THEN limit_count := 20;
                WHEN 'professional' THEN limit_count := 75;
                WHEN 'enterprise' THEN limit_count := -1;
                ELSE limit_count := 0;
            END CASE;
        END IF;
    ELSE
        -- No subscription - user is PENDING or expired
        subscription_plan := COALESCE(profile_record.subscription_plan, 'none');
        subscription_status := COALESCE(profile_record.subscription_status, 'pending');
        is_trial := FALSE;
        trial_end_at := NULL;
        limit_count := 0;
    END IF;
    
    -- Calculate remaining proposals
    IF limit_count = -1 THEN
        remaining_proposals := -1;
    ELSE
        remaining_proposals := GREATEST(0, limit_count - usage_count);
    END IF;
    
    current_usage := usage_count;
    proposal_limit := limit_count;
    can_create_proposal := (limit_count = -1 OR (limit_count > 0 AND usage_count < limit_count));
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FIX 2: Update can_user_access_template function
-- =============================================
-- Read from subscriptions table first (works during trial)

CREATE OR REPLACE FUNCTION public.can_user_access_template(user_uuid UUID, template_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_tier TEXT;
    has_access BOOLEAN := false;
BEGIN
    -- Get user's subscription tier from subscriptions table (more reliable during trial)
    SELECT s.plan INTO user_tier
    FROM subscriptions s
    WHERE s.user_id = user_uuid 
    AND s.status IN ('active', 'trialing')
    ORDER BY s.created_at DESC 
    LIMIT 1;
    
    -- Fallback to profiles if no subscription found
    IF user_tier IS NULL THEN
        SELECT COALESCE(subscription_plan, 'starter') INTO user_tier
        FROM public.profiles 
        WHERE id = user_uuid;
    END IF;
    
    -- Check if template is accessible for user's tier
    SELECT EXISTS(
        SELECT 1 
        FROM public.template_tier_access tta
        JOIN public.proposal_templates pt ON pt.id = tta.template_id
        WHERE tta.template_id = template_uuid
        AND tta.subscription_tier = user_tier
        AND pt.is_active = true
    ) INTO has_access;
    
    RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FIX 3: Update get_user_current_usage function
-- =============================================
-- Get usage based on the subscription's current billing period

CREATE OR REPLACE FUNCTION get_user_current_usage(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    current_usage INTEGER := 0;
    subscription_record RECORD;
BEGIN
    -- Get user's current subscription period (active or trialing)
    SELECT current_period_start, current_period_end, status
    INTO subscription_record
    FROM subscriptions 
    WHERE user_id = user_uuid 
    AND status IN ('active', 'trialing')
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF subscription_record IS NOT NULL THEN
        -- Get usage for current subscription period
        -- Match on period_start to get the correct usage record
        SELECT COALESCE(proposal_count, 0) 
        INTO current_usage
        FROM usage 
        WHERE user_id = user_uuid 
        AND period_start <= NOW() 
        AND period_end >= NOW()
        ORDER BY period_start DESC 
        LIMIT 1;
    END IF;
    
    RETURN COALESCE(current_usage, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Add comments documenting the fixes
-- =============================================
COMMENT ON FUNCTION get_user_usage_info(UUID) IS 'Returns user usage info. Trial ends when EITHER 7 days pass OR 3 proposals used. After trial ends (or 3 proposals used), shows actual plan name. Usage resets when Stripe transitions subscription from trialing to active.';
COMMENT ON FUNCTION can_user_access_template(UUID, UUID) IS 'Checks template access. Reads from subscriptions table first (works during trial), falls back to profiles.';
COMMENT ON FUNCTION get_user_current_usage(UUID) IS 'Gets current proposal usage for the active billing period. Returns 0 if no usage record exists for current period.';
