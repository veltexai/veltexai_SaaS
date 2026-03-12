-- Free Trial Without Credit Card Migration
-- ============================================================
-- Trial starts automatically on signup - NO credit card needed
-- 3 proposals OR 7 days (whichever comes first)
-- Cannot send email / download PDF during free trial (enforced in UI)
-- After trial: must subscribe via Stripe to continue

-- 1. Add 'free_trial' to subscription_status constraint
DO $$
BEGIN
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;
    ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_status_check
        CHECK (subscription_status IN (
            'pending', 'free_trial', 'trial', 'trialing',
            'active', 'cancelled', 'past_due', 'expired'
        ));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Migrate existing 'pending' users to 'free_trial'
UPDATE profiles
SET subscription_status = 'free_trial',
    trial_end_at = NOW() + INTERVAL '7 days',
    updated_at = NOW()
WHERE subscription_status = 'pending';

-- Create usage records for migrated users (if they don't already have one)
INSERT INTO usage (user_id, proposal_count, period_start, period_end)
SELECT p.id, 0, NOW(), NOW() + INTERVAL '7 days'
FROM profiles p
WHERE p.subscription_status = 'free_trial'
  AND NOT EXISTS (
      SELECT 1 FROM usage u
      WHERE u.user_id = p.id
        AND u.period_start <= NOW()
        AND u.period_end >= NOW()
  );

-- 3. handle_new_user: auto-start free trial on signup (no credit card)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id, email, full_name, company_name, role,
        subscription_status, trial_end_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'company_name',
        'user',
        'free_trial',
        NOW() + INTERVAL '7 days'
    );

    INSERT INTO public.usage (user_id, proposal_count, period_start, period_end)
    VALUES (NEW.id, 0, NOW(), NOW() + INTERVAL '7 days');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. get_user_current_usage: support free_trial (no subscription record)
CREATE OR REPLACE FUNCTION get_user_current_usage(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    current_usage INTEGER := 0;
    profile_record RECORD;
    subscription_record RECORD;
BEGIN
    SELECT subscription_status
    INTO profile_record
    FROM profiles
    WHERE id = user_uuid;

    IF profile_record.subscription_status = 'free_trial' THEN
        SELECT COALESCE(proposal_count, 0)
        INTO current_usage
        FROM usage
        WHERE user_id = user_uuid
          AND period_start <= NOW()
          AND period_end >= NOW()
        ORDER BY created_at DESC
        LIMIT 1;

        RETURN COALESCE(current_usage, 0);
    END IF;

    SELECT current_period_start, current_period_end, status
    INTO subscription_record
    FROM subscriptions
    WHERE user_id = user_uuid
      AND status IN ('active', 'trialing')
    ORDER BY created_at DESC
    LIMIT 1;

    IF subscription_record IS NOT NULL THEN
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

-- 5. can_user_create_proposal: support free_trial
CREATE OR REPLACE FUNCTION can_user_create_proposal(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_usage INTEGER;
    profile_record RECORD;
    subscription_record RECORD;
    proposal_limit INTEGER;
BEGIN
    SELECT subscription_status, trial_end_at, subscription_plan
    INTO profile_record
    FROM profiles
    WHERE id = user_uuid;

    -- Free trial: check time + usage, no Stripe subscription needed
    IF profile_record.subscription_status = 'free_trial' THEN
        IF profile_record.trial_end_at IS NULL OR profile_record.trial_end_at <= NOW() THEN
            RETURN FALSE;
        END IF;

        current_usage := get_user_current_usage(user_uuid);
        RETURN current_usage < 3;
    END IF;

    IF profile_record.subscription_status = 'pending' THEN
        RETURN FALSE;
    END IF;

    SELECT plan, status
    INTO subscription_record
    FROM subscriptions
    WHERE user_id = user_uuid
      AND status IN ('active', 'trialing')
    ORDER BY created_at DESC
    LIMIT 1;

    IF subscription_record IS NULL THEN
        RETURN FALSE;
    END IF;

    current_usage := get_user_current_usage(user_uuid);

    IF subscription_record.status = 'trialing' THEN
        IF profile_record.trial_end_at IS NULL OR profile_record.trial_end_at <= NOW() THEN
            RETURN FALSE;
        END IF;
        proposal_limit := 3;
    ELSE
        CASE subscription_record.plan
            WHEN 'starter' THEN proposal_limit := 20;
            WHEN 'professional' THEN proposal_limit := 75;
            WHEN 'enterprise' THEN proposal_limit := -1;
            ELSE proposal_limit := 0;
        END CASE;
    END IF;

    RETURN (proposal_limit = -1 OR current_usage < proposal_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. get_user_usage_info: support free_trial
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
    SELECT p.subscription_status, p.trial_end_at, p.subscription_plan
    INTO profile_record
    FROM profiles p
    WHERE p.id = user_uuid;

    -- Free trial path (no Stripe subscription)
    IF profile_record.subscription_status = 'free_trial' THEN
        SELECT COALESCE(u.proposal_count, 0) INTO usage_count
        FROM usage u
        WHERE u.user_id = user_uuid
          AND u.period_start <= NOW()
          AND u.period_end >= NOW()
        ORDER BY u.created_at DESC
        LIMIT 1;

        usage_count := COALESCE(usage_count, 0);

        subscription_plan := 'free_trial';
        subscription_status := 'free_trial';
        is_trial := TRUE;
        trial_end_at := profile_record.trial_end_at;

        IF profile_record.trial_end_at IS NOT NULL AND profile_record.trial_end_at > NOW() THEN
            limit_count := 3;
        ELSE
            limit_count := 0;
        END IF;

        remaining_proposals := GREATEST(0, limit_count - usage_count);
        current_usage := usage_count;
        proposal_limit := limit_count;
        can_create_proposal := (limit_count > 0 AND usage_count < limit_count);

        RETURN NEXT;
        RETURN;
    END IF;

    -- Stripe-backed subscription path
    SELECT s.plan, s.status, s.current_period_end
    INTO subscription_record
    FROM subscriptions s
    WHERE s.user_id = user_uuid
      AND s.status IN ('active', 'trialing')
    ORDER BY s.created_at DESC
    LIMIT 1;

    usage_count := get_user_current_usage(user_uuid);

    IF subscription_record IS NOT NULL THEN
        subscription_plan := subscription_record.plan;

        IF subscription_record.status = 'trialing' THEN
            subscription_status := 'trialing';
            is_trial := TRUE;
            trial_end_at := profile_record.trial_end_at;

            IF profile_record.trial_end_at IS NOT NULL AND profile_record.trial_end_at > NOW() THEN
                limit_count := 3;
            ELSE
                limit_count := 0;
            END IF;
        ELSE
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
        subscription_plan := 'none';
        subscription_status := profile_record.subscription_status;
        is_trial := FALSE;
        trial_end_at := NULL;
        limit_count := 0;
    END IF;

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

-- 7. increment_user_usage: support free_trial
CREATE OR REPLACE FUNCTION increment_user_usage(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    subscription_record RECORD;
    profile_record RECORD;
BEGIN
    SELECT subscription_status, trial_end_at
    INTO profile_record
    FROM profiles
    WHERE id = user_uuid;

    -- Free trial: increment without Stripe subscription
    IF profile_record.subscription_status = 'free_trial' THEN
        UPDATE usage
        SET proposal_count = proposal_count + 1,
            updated_at = NOW()
        WHERE user_id = user_uuid
          AND period_start <= NOW()
          AND period_end >= NOW();

        IF NOT FOUND THEN
            INSERT INTO usage (user_id, proposal_count, period_start, period_end)
            VALUES (
                user_uuid, 1, NOW(),
                COALESCE(profile_record.trial_end_at, NOW() + INTERVAL '7 days')
            );
        END IF;

        RETURN TRUE;
    END IF;

    -- Stripe-backed subscription
    SELECT current_period_start, current_period_end, status
    INTO subscription_record
    FROM subscriptions
    WHERE user_id = user_uuid
      AND status IN ('active', 'trialing')
    ORDER BY created_at DESC
    LIMIT 1;

    IF subscription_record IS NULL THEN
        RETURN FALSE;
    END IF;

    UPDATE usage
    SET proposal_count = proposal_count + 1,
        updated_at = NOW()
    WHERE user_id = user_uuid
      AND period_start <= NOW()
      AND period_end >= NOW();

    IF NOT FOUND THEN
        INSERT INTO usage (user_id, proposal_count, period_start, period_end)
        VALUES (
            user_uuid, 1,
            subscription_record.current_period_start,
            subscription_record.current_period_end
        );
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update function comments
COMMENT ON FUNCTION public.handle_new_user() IS
    'Creates profile with free_trial status and usage record. No credit card needed.';
COMMENT ON FUNCTION can_user_create_proposal(UUID) IS
    'Checks if user can create proposals. free_trial: 3 proposals within 7 days (no Stripe). active/trialing: plan-based limits.';
COMMENT ON FUNCTION get_user_usage_info(UUID) IS
    'Returns usage info. Handles free_trial (no Stripe) and active/trialing (Stripe-backed) subscriptions.';
