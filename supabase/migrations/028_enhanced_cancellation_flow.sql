-- Enhanced Cancellation Flow Migration
-- Adds support for cancellation without immediate downgrade and auto-renewal tracking

-- Add auto_renewal flag to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMP WITH TIME ZONE;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_subscriptions_auto_renewal ON subscriptions(auto_renewal);
CREATE INDEX IF NOT EXISTS idx_subscriptions_grace_period_end ON subscriptions(grace_period_end);

-- Update subscription status enum to include new cancellation states
-- Note: We'll handle this in the application logic since PostgreSQL enum updates can be complex

-- Create cancellation_requests table to track cancellation attempts
CREATE TABLE IF NOT EXISTS cancellation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    reason TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed
    stripe_cancellation_id TEXT,
    refund_amount DECIMAL(10,2),
    refund_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for cancellation_requests
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_user_id ON cancellation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_subscription_id ON cancellation_requests(subscription_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_status ON cancellation_requests(status);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_requested_at ON cancellation_requests(requested_at);

-- Enable RLS on cancellation_requests table
ALTER TABLE cancellation_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cancellation_requests
CREATE POLICY "Users can view their own cancellation requests" ON cancellation_requests
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own cancellation requests" ON cancellation_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admin policies for cancellation_requests
CREATE POLICY "Admins can view all cancellation requests" ON cancellation_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can update cancellation requests" ON cancellation_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Create function to handle subscription expiration
CREATE OR REPLACE FUNCTION handle_subscription_expiration()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update expired subscriptions that are cancelled and past their grace period
    UPDATE subscriptions 
    SET 
        status = 'expired',
        updated_at = NOW()
    WHERE 
        status = 'cancelled'
        AND auto_renewal = false
        AND (
            (grace_period_end IS NOT NULL AND grace_period_end < NOW())
            OR (grace_period_end IS NULL AND current_period_end < NOW())
        );
    
    -- Update profiles for expired subscriptions
    UPDATE profiles 
    SET 
        subscription_status = 'expired',
        subscription_plan = 'starter',
        updated_at = NOW()
    WHERE id IN (
        SELECT user_id 
        FROM subscriptions 
        WHERE status = 'expired'
        AND updated_at >= NOW() - INTERVAL '1 minute'
    );
END;
$$;

-- Create function to check if user should retain access
CREATE OR REPLACE FUNCTION user_has_active_access(user_uuid UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    subscription_record RECORD;
    has_access boolean := false;
BEGIN
    -- Get the user's current subscription
    SELECT * INTO subscription_record
    FROM subscriptions 
    WHERE user_id = user_uuid 
    AND status IN ('active', 'cancelled')
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF subscription_record IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if subscription is active
    IF subscription_record.status = 'active' THEN
        RETURN true;
    END IF;
    
    -- Check if cancelled subscription is still within access period
    IF subscription_record.status = 'cancelled' THEN
        -- Check grace period first
        IF subscription_record.grace_period_end IS NOT NULL THEN
            RETURN subscription_record.grace_period_end > NOW();
        END IF;
        
        -- Otherwise check current period end
        RETURN subscription_record.current_period_end > NOW();
    END IF;
    
    RETURN false;
END;
$$;

-- Add comment to document the enhanced cancellation flow
COMMENT ON TABLE cancellation_requests IS 'Tracks subscription cancellation requests and their processing status';
COMMENT ON COLUMN subscriptions.auto_renewal IS 'Whether the subscription should auto-renew at the end of the current period';
COMMENT ON COLUMN subscriptions.grace_period_end IS 'End of grace period for cancelled subscriptions before downgrading to starter';
COMMENT ON COLUMN subscriptions.cancellation_reason IS 'Reason provided by user for cancellation';