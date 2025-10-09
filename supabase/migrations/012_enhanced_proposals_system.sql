-- Enhanced Proposals System Migration
-- This migration creates the new enhanced proposals table and pricing_settings table

-- Drop existing proposals table and recreate with new schema
DROP TABLE IF EXISTS public.proposals CASCADE;

CREATE TABLE public.proposals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_company TEXT,
    contact_phone TEXT NOT NULL,
    service_location TEXT NOT NULL,
    facility_size INTEGER NOT NULL,
    service_type TEXT NOT NULL CHECK (service_type IN ('residential', 'commercial', 'carpet', 'window', 'floor')),
    service_frequency TEXT NOT NULL CHECK (service_frequency IN ('one-time', '1x-month', 'bi-weekly', 'weekly', '2x-week', '3x-week', '5x-week', 'daily')),
    service_specific_data JSONB DEFAULT '{}'::jsonb,
    global_inputs JSONB DEFAULT '{}'::jsonb,
    pricing_enabled BOOLEAN DEFAULT false,
    pricing_data JSONB DEFAULT '{}'::jsonb,
    generated_content TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for proposals
CREATE INDEX idx_proposals_user_id ON public.proposals(user_id);
CREATE INDEX idx_proposals_service_type ON public.proposals(service_type);
CREATE INDEX idx_proposals_status ON public.proposals(status);
CREATE INDEX idx_proposals_created_at ON public.proposals(created_at DESC);

-- Enable RLS for proposals
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for proposals
CREATE POLICY "Users can view own proposals" ON public.proposals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own proposals" ON public.proposals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own proposals" ON public.proposals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own proposals" ON public.proposals
    FOR DELETE USING (auth.uid() = user_id);

-- Add user_id column to existing pricing_settings table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pricing_settings' 
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.pricing_settings ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_pricing_settings_user_id ON public.pricing_settings(user_id);
    END IF;
END $$;

-- Create pricing_settings table if it doesn't exist (fallback)
CREATE TABLE IF NOT EXISTS public.pricing_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    labor_rate DECIMAL(10,2) DEFAULT 22.00,
    overhead_percentage DECIMAL(5,2) DEFAULT 12.00,
    margin_percentage DECIMAL(5,2) DEFAULT 20.00,
    production_rates JSONB DEFAULT '{
        "residential": {"min": 1000, "max": 1500},
        "commercial": {"min": 2500, "max": 3500},
        "carpet": {"min": 300, "max": 500},
        "window": {"min": 120, "max": 180},
        "floor": {"min": 200, "max": 300}
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS for pricing_settings
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pricing_settings
DROP POLICY IF EXISTS "Users can view own pricing settings" ON public.pricing_settings;
CREATE POLICY "Users can view own pricing settings" ON public.pricing_settings
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can manage pricing settings" ON public.pricing_settings;
CREATE POLICY "Admin can manage pricing settings" ON public.pricing_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS proposals_updated_at ON public.proposals;
CREATE TRIGGER proposals_updated_at
    BEFORE UPDATE ON public.proposals
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS pricing_settings_updated_at ON public.pricing_settings;
CREATE TRIGGER pricing_settings_updated_at
    BEFORE UPDATE ON public.pricing_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert default pricing settings for existing admin users
INSERT INTO public.pricing_settings (user_id, labor_rate, overhead_percentage, margin_percentage)
SELECT id, 22.00, 12.00, 20.00
FROM public.profiles
WHERE role = 'admin'
ON CONFLICT (user_id) DO NOTHING;

-- Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_settings TO authenticated;
GRANT SELECT ON public.proposals TO anon;
GRANT SELECT ON public.pricing_settings TO anon;