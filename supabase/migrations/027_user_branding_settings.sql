-- Create user-specific branding settings table
-- This allows each user to have their own branding settings

CREATE TABLE IF NOT EXISTS public.user_branding_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Branding settings
    company_name TEXT,
    company_logo_url TEXT,
    company_tagline TEXT,
    primary_color TEXT DEFAULT '#3b82f6',
    secondary_color TEXT DEFAULT '#64748b',
    accent_color TEXT DEFAULT '#10b981',
    theme_applied_to_pdfs BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index to ensure one branding setting per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_branding_settings_user_id ON public.user_branding_settings(user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_branding_settings_updated_at ON public.user_branding_settings(updated_at DESC);

-- Enable RLS
ALTER TABLE public.user_branding_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - users can only access their own branding settings
CREATE POLICY "Users can view own branding settings" ON public.user_branding_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own branding settings" ON public.user_branding_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own branding settings" ON public.user_branding_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own branding settings" ON public.user_branding_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Admins can view all branding settings
CREATE POLICY "Admins can view all branding settings" ON public.user_branding_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Create trigger for updated_at
CREATE TRIGGER user_branding_settings_updated_at
    BEFORE UPDATE ON public.user_branding_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_branding_settings TO authenticated;