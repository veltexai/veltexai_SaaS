-- Trial System Setup Migration
-- This migration sets up the trial system with 3 free proposals for new users

-- Update the handle_new_user function to create initial trial usage
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    trial_start TIMESTAMP WITH TIME ZONE;
    trial_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Set trial period (current month)
    trial_start := date_trunc('month', NOW());
    trial_end := date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second';
    
    -- Insert profile with trial status
    INSERT INTO public.profiles (id, email, full_name, company_name, role, subscription_status, trial_end_at)
    VALUES (
        NEW.id, 
        NEW.email, 
        NEW.raw_user_meta_data->>'full_name', 
        NEW.raw_user_meta_data->>'company_name', 
        'user',
        'trial',
        trial_end
    );
    
    -- Create initial usage record with 0 proposals used (3 allowed for trial)
    INSERT INTO public.usage (user_id, proposal_count, period_start, period_end)
    VALUES (NEW.id, 0, trial_start, trial_end);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the get_user_current_usage function to handle trial users properly
CREATE OR REPLACE FUNCTION get_user_current_usage(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    current_usage INTEGER := 0;
    subscription_record RECORD;
    profile_record RECORD;
BEGIN
    -- Get user's profile to check subscription status
    SELECT subscription_status, trial_end_at 
    INTO profile_record
    FROM profiles 
    WHERE id = user_uuid;
    
    -- Get user's current subscription period
    SELECT current_period_start, current_period_end 
    INTO subscription_record
    FROM subscriptions 
    WHERE user_id = user_uuid 
    AND status = 'active'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- If no active subscription, check trial period
    IF subscription_record IS NULL THEN
        -- For trial users, use current month as period
        SELECT COALESCE(proposal_count, 0) 
        INTO current_usage
        FROM usage 
        WHERE user_id = user_uuid 
        AND period_start <= NOW() 
        AND period_end >= NOW()
        ORDER BY created_at DESC 
        LIMIT 1;
    ELSE
        -- Get usage for current subscription period
        SELECT COALESCE(proposal_count, 0) 
        INTO current_usage
        FROM usage 
        WHERE user_id = user_uuid 
        AND period_start = subscription_record.current_period_start
        AND period_end = subscription_record.current_period_end;
    END IF;
    
    RETURN COALESCE(current_usage, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user can create proposals
CREATE OR REPLACE FUNCTION can_user_create_proposal(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_usage INTEGER;
    profile_record RECORD;
    subscription_record RECORD;
    proposal_limit INTEGER;
BEGIN
    -- Get user's profile
    SELECT subscription_status, trial_end_at 
    INTO profile_record
    FROM profiles 
    WHERE id = user_uuid;
    
    -- Get current usage
    current_usage := get_user_current_usage(user_uuid);
    
    -- Check if user has active subscription
    SELECT plan 
    INTO subscription_record
    FROM subscriptions 
    WHERE user_id = user_uuid 
    AND status = 'active'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Determine proposal limit based on subscription or trial
    IF subscription_record IS NOT NULL THEN
        -- User has active subscription
        CASE subscription_record.plan
            WHEN 'starter' THEN proposal_limit := 10;
            WHEN 'professional' THEN proposal_limit := 50;
            WHEN 'enterprise' THEN proposal_limit := -1; -- unlimited
            ELSE proposal_limit := 0;
        END CASE;
    ELSE
        -- User is on trial
        IF profile_record.subscription_status = 'trial' AND profile_record.trial_end_at > NOW() THEN
            proposal_limit := 3; -- 3 free proposals for trial
        ELSE
            proposal_limit := 0; -- Trial expired, no proposals allowed
        END IF;
    END IF;
    
    -- Check if user can create more proposals
    RETURN (proposal_limit = -1 OR current_usage < proposal_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's proposal limits and usage info
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
    -- Get user's profile
    SELECT p.subscription_status, p.trial_end_at 
    INTO profile_record
    FROM profiles p
    WHERE p.id = user_uuid;
    
    -- Get current usage
    usage_count := get_user_current_usage(user_uuid);
    
    -- Get active subscription
    SELECT s.plan, s.status
    INTO subscription_record
    FROM subscriptions s
    WHERE s.user_id = user_uuid 
    AND s.status = 'active'
    ORDER BY s.created_at DESC 
    LIMIT 1;
    
    -- Determine limits and status
    IF subscription_record IS NOT NULL THEN
        -- User has active subscription
        subscription_plan := subscription_record.plan;
        subscription_status := 'active';
        is_trial := FALSE;
        trial_end_at := NULL;
        
        CASE subscription_record.plan
            WHEN 'starter' THEN limit_count := 10;
            WHEN 'professional' THEN limit_count := 50;
            WHEN 'enterprise' THEN limit_count := -1;
            ELSE limit_count := 0;
        END CASE;
    ELSE
        -- User is on trial or no subscription
        subscription_plan := 'trial';
        subscription_status := profile_record.subscription_status;
        is_trial := TRUE;
        trial_end_at := profile_record.trial_end_at;
        
        IF profile_record.subscription_status = 'trial' AND profile_record.trial_end_at > NOW() THEN
            limit_count := 3; -- 3 free proposals for trial
        ELSE
            limit_count := 0; -- Trial expired
        END IF;
    END IF;
    
    -- Calculate remaining proposals
    IF limit_count = -1 THEN
        remaining_proposals := -1; -- unlimited
    ELSE
        remaining_proposals := GREATEST(0, limit_count - usage_count);
    END IF;
    
    -- Return results
    current_usage := usage_count;
    proposal_limit := limit_count;
    can_create_proposal := (limit_count = -1 OR usage_count < limit_count);
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION can_user_create_proposal(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_usage_info(UUID) TO authenticated;