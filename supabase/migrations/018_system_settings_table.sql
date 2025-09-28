-- Create system_settings table for email and other system configurations
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Branding
    company_name TEXT DEFAULT 'Veltex Services',
    company_logo_url TEXT DEFAULT '',
    company_tagline TEXT DEFAULT 'Professional Printing Solutions',
    primary_color TEXT DEFAULT '#3b82f6',
    secondary_color TEXT DEFAULT '#64748b',
    accent_color TEXT DEFAULT '#10b981',
    
    -- Email Settings
    smtp_host TEXT DEFAULT '',
    smtp_port INTEGER DEFAULT 587,
    smtp_username TEXT DEFAULT '',
    smtp_password TEXT DEFAULT '',
    smtp_from_email TEXT DEFAULT '',
    smtp_from_name TEXT DEFAULT 'Veltex Services',
    
    -- Security
    session_timeout INTEGER DEFAULT 30,
    password_min_length INTEGER DEFAULT 8,
    require_2fa BOOLEAN DEFAULT false,
    max_login_attempts INTEGER DEFAULT 5,
    
    -- Features
    enable_ai_suggestions BOOLEAN DEFAULT true,
    enable_auto_backup BOOLEAN DEFAULT true,
    enable_email_notifications BOOLEAN DEFAULT true,
    enable_sms_notifications BOOLEAN DEFAULT false,
    
    -- Business
    default_currency TEXT DEFAULT 'USD',
    default_timezone TEXT DEFAULT 'America/New_York',
    business_hours_start TEXT DEFAULT '09:00',
    business_hours_end TEXT DEFAULT '17:00',
    
    -- Maintenance
    maintenance_mode BOOLEAN DEFAULT false,
    maintenance_message TEXT DEFAULT 'System is under maintenance. Please check back later.',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_system_settings_updated_at ON public.system_settings(updated_at DESC);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read system settings
CREATE POLICY "Allow read access to system settings" ON public.system_settings
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can insert/update/delete system settings
CREATE POLICY "Allow admin full access to system settings" ON public.system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Insert default settings (only one row should exist)
INSERT INTO public.system_settings (
    company_name,
    company_tagline,
    smtp_from_name,
    enable_email_notifications
) VALUES (
    'Veltex Services',
    'Professional Printing Solutions', 
    'Veltex Services',
    true
) ON CONFLICT DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();