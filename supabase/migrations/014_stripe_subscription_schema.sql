-- Stripe Subscription Integration Schema Updates
-- This migration adds all necessary tables and columns for Stripe subscription management

-- Add missing columns to profiles table for subscription management
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'starter',
ADD COLUMN IF NOT EXISTS trial_end_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days');

-- Create indexes for faster lookups on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_plan ON profiles(subscription_plan);

-- Create subscriptions table for detailed subscription tracking
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    status TEXT NOT NULL,
    plan TEXT NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for subscriptions table
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Create usage tracking table
CREATE TABLE IF NOT EXISTS usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    proposal_count INTEGER DEFAULT 0,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for usage table
CREATE INDEX IF NOT EXISTS idx_usage_user_id ON usage(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_period ON usage(period_start, period_end);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_user_period ON usage(user_id, period_start);

-- Create subscription_plans table for plan configuration
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    price_monthly DECIMAL(10,2) NOT NULL,
    price_annual DECIMAL(10,2) NOT NULL,
    proposal_limit INTEGER NOT NULL, -- -1 for unlimited
    features JSONB NOT NULL,
    stripe_price_id_monthly TEXT,
    stripe_price_id_annual TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for subscription_plans
CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON subscription_plans(name);

-- Add missing column to billing_history table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_history') THEN
        ALTER TABLE billing_history 
        ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_billing_history_subscription_id ON billing_history(subscription_id);
    ELSE
        -- Create billing_history table if it doesn't exist
        CREATE TABLE billing_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
            stripe_invoice_id TEXT UNIQUE NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            currency TEXT NOT NULL DEFAULT 'usd',
            status TEXT NOT NULL,
            invoice_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_billing_history_subscription_id ON billing_history(subscription_id);
        CREATE INDEX IF NOT EXISTS idx_billing_history_stripe_invoice_id ON billing_history(stripe_invoice_id);
        CREATE INDEX IF NOT EXISTS idx_billing_history_status ON billing_history(status);
    END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'Users can view own subscriptions') THEN
        CREATE POLICY "Users can view own subscriptions" ON subscriptions
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'Users can insert own subscriptions') THEN
        CREATE POLICY "Users can insert own subscriptions" ON subscriptions
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'Users can update own subscriptions') THEN
        CREATE POLICY "Users can update own subscriptions" ON subscriptions
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'Admins can manage all subscriptions') THEN
        CREATE POLICY "Admins can manage all subscriptions" ON subscriptions
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role = 'admin'
                )
            );
    END IF;
END $$;

-- RLS Policies for usage table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usage' AND policyname = 'Users can view own usage') THEN
        CREATE POLICY "Users can view own usage" ON usage
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usage' AND policyname = 'Users can insert own usage') THEN
        CREATE POLICY "Users can insert own usage" ON usage
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usage' AND policyname = 'Users can update own usage') THEN
        CREATE POLICY "Users can update own usage" ON usage
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usage' AND policyname = 'Admins can manage all usage') THEN
        CREATE POLICY "Admins can manage all usage" ON usage
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role = 'admin'
                )
            );
    END IF;
END $$;

-- RLS Policies for subscription_plans table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'Everyone can view subscription plans') THEN
        CREATE POLICY "Everyone can view subscription plans" ON subscription_plans
            FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'Admins can manage subscription plans') THEN
        CREATE POLICY "Admins can manage subscription plans" ON subscription_plans
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role = 'admin'
                )
            );
    END IF;
END $$;

-- Grant permissions to roles
GRANT SELECT ON subscriptions TO anon;
GRANT ALL PRIVILEGES ON subscriptions TO authenticated;

GRANT SELECT ON usage TO anon;
GRANT ALL PRIVILEGES ON usage TO authenticated;

GRANT SELECT ON subscription_plans TO anon;
GRANT ALL PRIVILEGES ON subscription_plans TO authenticated;

-- Insert initial subscription plan data
INSERT INTO subscription_plans (name, price_monthly, price_annual, proposal_limit, features) VALUES
('starter', 19.90, 99.99, 20, '["20 proposals/month", "Basic templates", "Email support"]'),
('professional', 39.90, 299.99, 75, '["75 proposals/month", "Advanced templates", "Priority support", "Custom branding"]'),
('enterprise', 79.90, 999.99, -1, '["Unlimited proposals", "All templates", "Dedicated support", "API access", "White-label"]')
ON CONFLICT (name) DO NOTHING;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subscriptions_updated_at') THEN
        CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_usage_updated_at') THEN
        CREATE TRIGGER update_usage_updated_at BEFORE UPDATE ON usage
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subscription_plans_updated_at') THEN
        CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create function to get user's current usage for the billing period
CREATE OR REPLACE FUNCTION get_user_current_usage(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    current_usage INTEGER := 0;
    subscription_record RECORD;
BEGIN
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

-- Create function to increment user's proposal usage
CREATE OR REPLACE FUNCTION increment_user_usage(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    subscription_record RECORD;
    usage_record RECORD;
BEGIN
    -- Get user's current subscription period
    SELECT current_period_start, current_period_end 
    INTO subscription_record
    FROM subscriptions 
    WHERE user_id = user_uuid 
    AND status = 'active'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- If no active subscription, use trial period (current month)
    IF subscription_record IS NULL THEN
        subscription_record.current_period_start := date_trunc('month', NOW());
        subscription_record.current_period_end := date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second';
    END IF;
    
    -- Try to update existing usage record
    UPDATE usage 
    SET proposal_count = proposal_count + 1,
        updated_at = NOW()
    WHERE user_id = user_uuid 
    AND period_start = subscription_record.current_period_start
    AND period_end = subscription_record.current_period_end;
    
    -- If no existing record, create new one
    IF NOT FOUND THEN
        INSERT INTO usage (user_id, proposal_count, period_start, period_end)
        VALUES (user_uuid, 1, subscription_record.current_period_start, subscription_record.current_period_end);
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_current_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_user_usage(UUID) TO authenticated;