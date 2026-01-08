-- 7-Day Trial System Migration (Credit Card Required Upfront)
-- ============================================================
-- Trial ONLY starts after user selects a plan and enters credit card in Stripe
-- Trial ends when EITHER 7 days pass OR 3 proposals are used (whichever comes first)
-- Users without a subscription cannot create proposals

-- Add 'pending' to the subscription_status check constraint if not already present
DO $$
BEGIN
    -- Drop the existing constraint if it exists
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;
    -- Add the new constraint with 'pending' and 'trialing' included
    ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_status_check 
        CHECK (subscription_status IN ('pending', 'trial', 'trialing', 'active', 'cancelled', 'past_due', 'expired'));
EXCEPTION WHEN OTHERS THEN
    -- Constraint might not exist, that's okay
    NULL;
END $$;

-- Update the handle_new_user function - users start in 'pending' status (no trial yet)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert profile with 'pending' status - user must select plan before trial starts
    INSERT INTO public.profiles (id, email, full_name, company_name, role, subscription_status, trial_end_at)
    VALUES (
        NEW.id, 
        NEW.email, 
        NEW.raw_user_meta_data->>'full_name', 
        NEW.raw_user_meta_data->>'company_name', 
        'user',
        'pending',  -- User must select a plan and enter credit card before they can use the app
        NULL        -- No trial end date until they select a plan and start Stripe subscription
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to start trial when user subscribes via Stripe (called by webhook or after checkout)
CREATE OR REPLACE FUNCTION start_user_trial(user_uuid UUID, plan_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    trial_end TIMESTAMP WITH TIME ZONE;
BEGIN
    trial_end := NOW() + INTERVAL '7 days';
    
    -- Update profile to trialing status
    UPDATE profiles
    SET subscription_status = 'trialing',
        subscription_plan = plan_name,
        trial_end_at = trial_end,
        updated_at = NOW()
    WHERE id = user_uuid;
    
    -- Create usage record for trial period
    INSERT INTO usage (user_id, proposal_count, period_start, period_end)
    VALUES (user_uuid, 0, NOW(), trial_end)
    ON CONFLICT (user_id, period_start) DO NOTHING;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION start_user_trial(UUID, TEXT) TO authenticated;

-- Update the get_user_current_usage function
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
        SELECT COALESCE(proposal_count, 0) 
        INTO current_usage
        FROM usage 
        WHERE user_id = user_uuid 
        AND period_start <= NOW() 
        AND period_end >= NOW()
        ORDER BY created_at DESC 
        LIMIT 1;
    END IF;
    
    RETURN COALESCE(current_usage, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the can_user_create_proposal function
-- Users can ONLY create proposals if they have an active/trialing Stripe subscription
CREATE OR REPLACE FUNCTION can_user_create_proposal(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_usage INTEGER;
    profile_record RECORD;
    subscription_record RECORD;
    proposal_limit INTEGER;
BEGIN
    -- Get user's profile
    SELECT subscription_status, trial_end_at, subscription_plan
    INTO profile_record
    FROM profiles 
    WHERE id = user_uuid;
    
    -- If user is in 'pending' status, they cannot create proposals
    IF profile_record.subscription_status = 'pending' THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user has active or trialing subscription
    SELECT plan, status
    INTO subscription_record
    FROM subscriptions 
    WHERE user_id = user_uuid 
    AND status IN ('active', 'trialing')
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- No active subscription = no proposals
    IF subscription_record IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Get current usage
    current_usage := get_user_current_usage(user_uuid);
    
    -- Determine proposal limit based on subscription status
    IF subscription_record.status = 'trialing' THEN
        -- During trial: 3 proposals max AND trial_end_at must be in the future
        IF profile_record.trial_end_at IS NULL OR profile_record.trial_end_at <= NOW() THEN
            RETURN FALSE; -- Trial expired by time
        END IF;
        proposal_limit := 3; -- 3 free proposals during trial
    ELSE
        -- Active subscription: based on plan
        CASE subscription_record.plan
            WHEN 'starter' THEN proposal_limit := 20;
            WHEN 'professional' THEN proposal_limit := 75;
            WHEN 'enterprise' THEN proposal_limit := -1; -- unlimited
            ELSE proposal_limit := 0;
        END CASE;
    END IF;
    
    -- Check if user can create more proposals
    RETURN (proposal_limit = -1 OR current_usage < proposal_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the get_user_usage_info function
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
    SELECT p.subscription_status, p.trial_end_at, p.subscription_plan
    INTO profile_record
    FROM profiles p
    WHERE p.id = user_uuid;
    
    -- Get active or trialing subscription
    SELECT s.plan, s.status, s.current_period_end
    INTO subscription_record
    FROM subscriptions s
    WHERE s.user_id = user_uuid 
    AND s.status IN ('active', 'trialing')
    ORDER BY s.created_at DESC 
    LIMIT 1;
    
    -- Get current usage
    usage_count := get_user_current_usage(user_uuid);
    
    -- Determine limits and status
    IF subscription_record IS NOT NULL THEN
        subscription_plan := subscription_record.plan;
        
        IF subscription_record.status = 'trialing' THEN
            -- User is on trial
            subscription_status := 'trialing';
            is_trial := TRUE;
            trial_end_at := profile_record.trial_end_at;
            
            -- Trial valid if time hasn't expired
            IF profile_record.trial_end_at IS NOT NULL AND profile_record.trial_end_at > NOW() THEN
                limit_count := 3; -- 3 free proposals during trial
            ELSE
                limit_count := 0; -- Trial expired
            END IF;
        ELSE
            -- Active paid subscription
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
        -- No subscription - user is pending or expired
        subscription_plan := 'none';
        subscription_status := profile_record.subscription_status;
        is_trial := FALSE;
        trial_end_at := NULL;
        limit_count := 0; -- Cannot create proposals
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
    can_create_proposal := (limit_count = -1 OR (limit_count > 0 AND usage_count < limit_count));
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the increment_user_usage function
CREATE OR REPLACE FUNCTION increment_user_usage(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    subscription_record RECORD;
    profile_record RECORD;
BEGIN
    -- Get user's profile
    SELECT subscription_status, trial_end_at
    INTO profile_record
    FROM profiles
    WHERE id = user_uuid;

    -- Get user's current subscription period
    SELECT current_period_start, current_period_end, status
    INTO subscription_record
    FROM subscriptions 
    WHERE user_id = user_uuid 
    AND status IN ('active', 'trialing')
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- No subscription = cannot increment (shouldn't happen if can_user_create_proposal is checked first)
    IF subscription_record IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Try to update existing usage record
    UPDATE usage 
    SET proposal_count = proposal_count + 1,
        updated_at = NOW()
    WHERE user_id = user_uuid 
    AND period_start <= NOW()
    AND period_end >= NOW();
    
    -- If no existing record, create new one
    IF NOT FOUND THEN
        INSERT INTO usage (user_id, proposal_count, period_start, period_end)
        VALUES (user_uuid, 1, subscription_record.current_period_start, subscription_record.current_period_end);
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to document the trial system
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates a new user profile with pending status. User must select a plan and enter credit card before trial starts.';
COMMENT ON FUNCTION start_user_trial(UUID, TEXT) IS 'Starts the 7-day trial for a user after they select a plan and enter credit card. Called after Stripe subscription is created.';
COMMENT ON FUNCTION can_user_create_proposal(UUID) IS 'Checks if user can create proposals. Requires active or trialing subscription. Trial limited to 3 proposals within 7 days.';
