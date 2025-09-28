-- Add plan tracking columns to billing_history table for upgrade/downgrade tracking
ALTER TABLE public.billing_history 
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS action TEXT CHECK (action IN ('upgrade', 'downgrade', 'payment', 'refund')),
ADD COLUMN IF NOT EXISTS previous_plan TEXT,
ADD COLUMN IF NOT EXISTS new_plan TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_billing_history_subscription_id ON public.billing_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_action ON public.billing_history(action);

-- Update the database types to reflect the new schema
COMMENT ON COLUMN public.billing_history.action IS 'Type of billing action: upgrade, downgrade, payment, refund';
COMMENT ON COLUMN public.billing_history.previous_plan IS 'Previous subscription plan for upgrades/downgrades';
COMMENT ON COLUMN public.billing_history.new_plan IS 'New subscription plan for upgrades/downgrades';