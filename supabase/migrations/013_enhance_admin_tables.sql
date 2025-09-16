-- Enhance existing admin tables with missing features

-- Add missing columns to pricing_settings
ALTER TABLE public.pricing_settings 
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS production_rate DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS markup_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add missing columns to prompt_templates
ALTER TABLE public.prompt_templates
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- Add missing columns to admin_audit_log
ALTER TABLE public.admin_audit_log
ADD COLUMN IF NOT EXISTS target_id UUID,
ADD COLUMN IF NOT EXISTS target_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Update existing pricing_settings records
UPDATE public.pricing_settings SET 
  name = 'Default Settings',
  description = 'Default pricing configuration',
  production_rate = 50.00,
  markup_percentage = 20.00,
  is_default = true,
  is_active = true
WHERE name IS NULL;

-- Add additional pricing options
INSERT INTO public.pricing_settings (name, description, labor_rate, production_rate, markup_percentage, is_default, is_active)
VALUES 
  ('Premium Pricing', 'Higher rates for complex projects', 100.00, 75.00, 30.00, false, true),
  ('Economy Pricing', 'Competitive rates for budget clients', 60.00, 40.00, 20.00, false, true)
ON CONFLICT DO NOTHING;