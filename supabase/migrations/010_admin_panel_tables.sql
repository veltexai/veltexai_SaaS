-- Admin Panel Extension Tables Migration
-- Creates pricing_settings, prompt_templates, and admin_audit_log tables

-- Create pricing_settings table
CREATE TABLE IF NOT EXISTS public.pricing_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    labor_rate NUMERIC DEFAULT 22.0 NOT NULL,
    overhead_percentage NUMERIC DEFAULT 12 NOT NULL,
    margin_percentage NUMERIC DEFAULT 20 NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    production_rates JSONB DEFAULT '{}' NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for pricing_settings
CREATE INDEX idx_pricing_settings_updated_at ON public.pricing_settings(updated_at DESC);

-- RLS Policies for pricing_settings
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

-- Allow all users to read pricing settings
CREATE POLICY "Allow read access to pricing settings" ON public.pricing_settings
    FOR SELECT USING (true);

-- Only admins can insert/update/delete pricing settings
CREATE POLICY "Allow admin full access to pricing settings" ON public.pricing_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Insert default pricing settings
INSERT INTO public.pricing_settings (labor_rate, overhead_percentage, margin_percentage, currency, production_rates)
VALUES (
    22.0,
    12,
    20,
    'USD',
    '{
        "janitorial": {"low": 2500, "high": 3500},
        "residential": {"low": 1800, "high": 2800},
        "carpet": {"low": 3000, "high": 4000},
        "windows": {"low": 2200, "high": 3200},
        "floors": {"low": 2800, "high": 3800}
    }'::jsonb
)
ON CONFLICT DO NOTHING;

-- Create prompt_templates table
CREATE TABLE IF NOT EXISTS public.prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type TEXT NOT NULL UNIQUE,
    template_text TEXT NOT NULL,
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for prompt_templates
CREATE INDEX idx_prompt_templates_service_type ON public.prompt_templates(service_type);
CREATE INDEX idx_prompt_templates_updated_at ON public.prompt_templates(updated_at DESC);

-- RLS Policies for prompt_templates
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read prompt templates
CREATE POLICY "Allow read access to prompt templates" ON public.prompt_templates
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can insert/update/delete prompt templates
CREATE POLICY "Allow admin full access to prompt templates" ON public.prompt_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Insert default prompt templates
INSERT INTO public.prompt_templates (service_type, template_text) VALUES
('janitorial', 'Generate a comprehensive janitorial service proposal for {client_name} covering {square_footage} sq ft. Include detailed scope of work, frequency schedules, equipment specifications, and quality standards. Consider factors like building type, traffic levels, and special requirements. Provide clear pricing breakdown with labor, materials, and overhead costs.'),
('residential', 'Create a detailed residential cleaning proposal for {client_name} including {services}. Cover all rooms and areas, specify cleaning products and methods, outline scheduling options, and include quality assurance measures. Address special requests, pet considerations, and security protocols.'),
('carpet', 'Develop a carpet cleaning proposal for {client_name} covering {square_footage} sq ft. Detail pre-treatment processes, cleaning methods (steam, dry, or hybrid), stain removal procedures, and drying times. Include carpet protection options, maintenance recommendations, and warranty information.'),
('windows', 'Generate a window cleaning service proposal for {client_name}. Specify interior and exterior cleaning procedures, safety protocols for high-rise work, frequency recommendations, and seasonal considerations. Include screen cleaning, sill maintenance, and post-cleaning inspection processes.'),
('floors', 'Create a floor maintenance proposal for {client_name} covering {square_footage} sq ft. Detail cleaning procedures for different floor types (hardwood, tile, vinyl, etc.), stripping and waxing schedules, equipment specifications, and protective measures. Include restoration services and long-term maintenance plans.')
ON CONFLICT (service_type) DO NOTHING;

-- Create admin_audit_log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for admin_audit_log
CREATE INDEX idx_admin_audit_log_admin_id ON public.admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_action ON public.admin_audit_log(action);

-- RLS Policies for admin_audit_log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Allow admin read access to audit logs" ON public.admin_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Only admins can insert audit logs
CREATE POLICY "Allow admin insert access to audit logs" ON public.admin_audit_log
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Enhance proposals table if needed
ALTER TABLE public.proposals 
ADD COLUMN IF NOT EXISTS service_type TEXT;

-- Add indexes for proposals table
CREATE INDEX IF NOT EXISTS idx_proposals_service_type ON public.proposals(service_type);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON public.proposals(created_at DESC);

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON public.pricing_settings TO anon;
GRANT ALL PRIVILEGES ON public.pricing_settings TO authenticated;
GRANT ALL PRIVILEGES ON public.prompt_templates TO authenticated;
GRANT ALL PRIVILEGES ON public.admin_audit_log TO authenticated;