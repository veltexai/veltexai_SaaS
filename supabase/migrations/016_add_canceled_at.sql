-- Add canceled_at field to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE;

-- Create index for canceled_at
CREATE INDEX IF NOT EXISTS idx_subscriptions_canceled_at ON subscriptions(canceled_at);