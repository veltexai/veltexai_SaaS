-- Add missing invoice_date column to billing_history table
ALTER TABLE public.billing_history 
ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMPTZ DEFAULT NOW();

-- Update existing records to use created_at as invoice_date if null
UPDATE public.billing_history 
SET invoice_date = created_at 
WHERE invoice_date IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_billing_history_invoice_date ON public.billing_history(invoice_date);