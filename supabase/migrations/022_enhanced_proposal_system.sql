-- Enhanced Proposal System Migration for Veltex AI
-- This migration adds new tables and columns for enhanced proposal tracking, AI features, and branding

-- =============================================
-- 1. ENHANCE EXISTING SYSTEM_SETTINGS TABLE
-- =============================================

-- Add new columns to existing system_settings table for enhanced branding
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS theme_applied_to_pdfs BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ai_attribution_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS proposal_tracking_enabled BOOLEAN DEFAULT true;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_settings_colors ON public.system_settings(primary_color, secondary_color, accent_color);

-- =============================================
-- 2. CREATE PROPOSAL VIEW TRACKING TABLE
-- =============================================

-- Create proposal_views table for tracking proposal views
CREATE TABLE IF NOT EXISTS public.proposal_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE NOT NULL,
    viewer_ip INET,
    tracking_token VARCHAR(255) UNIQUE NOT NULL,
    user_agent TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    view_duration INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_proposal_views_proposal_id ON public.proposal_views(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_views_tracking_token ON public.proposal_views(tracking_token);
CREATE INDEX IF NOT EXISTS idx_proposal_views_viewed_at ON public.proposal_views(viewed_at DESC);

-- Enable RLS
ALTER TABLE public.proposal_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own proposal tracking" ON public.proposal_views
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.proposals
            WHERE proposals.id = proposal_views.proposal_id
            AND proposals.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow anonymous proposal view tracking" ON public.proposal_views
    FOR INSERT WITH CHECK (true);

-- =============================================
-- 3. CREATE PROPOSAL STATUS HISTORY TABLE
-- =============================================

-- Create proposal_status_history table
CREATE TABLE IF NOT EXISTS public.proposal_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES public.profiles(id),
    change_reason TEXT,
    email_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_proposal_status_history_proposal_id ON public.proposal_status_history(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_status_history_created_at ON public.proposal_status_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.proposal_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own proposal status history" ON public.proposal_status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.proposals
            WHERE proposals.id = proposal_status_history.proposal_id
            AND proposals.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert proposal status history" ON public.proposal_status_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.proposals
            WHERE proposals.id = proposal_status_history.proposal_id
            AND proposals.user_id = auth.uid()
        )
    );

-- =============================================
-- 4. ENHANCE EXISTING PROPOSALS TABLE
-- =============================================

-- Add new columns to existing proposals table
ALTER TABLE public.proposals 
ADD COLUMN IF NOT EXISTS ai_tone VARCHAR(50) DEFAULT 'professional',
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS send_options JSONB DEFAULT '{"type": "both", "custom_message": ""}';

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_proposals_ai_tone ON public.proposals(ai_tone);
CREATE INDEX IF NOT EXISTS idx_proposals_last_viewed_at ON public.proposals(last_viewed_at DESC);

-- =============================================
-- 5. CREATE ERROR LOGGING TABLE
-- =============================================

-- Create error_logs table for system monitoring
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    user_id UUID REFERENCES public.profiles(id),
    request_url TEXT,
    user_agent TEXT,
    severity VARCHAR(20) DEFAULT 'error',
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON public.error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON public.error_logs(resolved);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admin only)
CREATE POLICY "Admin can view all error logs" ON public.error_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "System can insert error logs" ON public.error_logs
    FOR INSERT WITH CHECK (true);

-- =============================================
-- 6. GRANT PERMISSIONS TO ROLES
-- =============================================

-- Grant permissions for proposal_views table
GRANT SELECT, INSERT ON public.proposal_views TO authenticated;
GRANT SELECT, INSERT ON public.proposal_views TO anon;
GRANT ALL PRIVILEGES ON public.proposal_views TO service_role;

-- Grant permissions for proposal_status_history table
GRANT SELECT, INSERT, UPDATE ON public.proposal_status_history TO authenticated;
GRANT ALL PRIVILEGES ON public.proposal_status_history TO service_role;

-- Grant permissions for error_logs table
GRANT SELECT ON public.error_logs TO authenticated;
GRANT INSERT ON public.error_logs TO authenticated;
GRANT INSERT ON public.error_logs TO anon;
GRANT ALL PRIVILEGES ON public.error_logs TO service_role;

-- =============================================
-- 7. UPDATE DEFAULT SYSTEM SETTINGS
-- =============================================

-- Update default system settings with enhanced branding
UPDATE public.system_settings SET
    theme_applied_to_pdfs = true,
    ai_attribution_enabled = true,
    proposal_tracking_enabled = true,
    primary_color = '#3b82f6',
    secondary_color = '#64748b',
    accent_color = '#10b981'
WHERE id = (SELECT id FROM public.system_settings LIMIT 1);

-- Insert default settings if none exist
INSERT INTO public.system_settings (
    company_name,
    company_tagline,
    primary_color,
    secondary_color,
    accent_color,
    theme_applied_to_pdfs,
    ai_attribution_enabled,
    proposal_tracking_enabled
) VALUES (
    'Veltex Services',
    'Professional AI-Powered Proposals',
    '#3b82f6',
    '#64748b', 
    '#10b981',
    true,
    true,
    true
) ON CONFLICT DO NOTHING;

-- =============================================
-- 8. CREATE FUNCTIONS FOR PROPOSAL TRACKING
-- =============================================

-- Function to update proposal view count
CREATE OR REPLACE FUNCTION public.update_proposal_view_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.proposals 
    SET 
        view_count = view_count + 1,
        last_viewed_at = NEW.viewed_at
    WHERE id = NEW.proposal_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update view count when a new view is recorded
CREATE TRIGGER trigger_update_proposal_view_count
    AFTER INSERT ON public.proposal_views
    FOR EACH ROW EXECUTE FUNCTION public.update_proposal_view_count();

-- Function to log proposal status changes
CREATE OR REPLACE FUNCTION public.log_proposal_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.proposal_status_history (
            proposal_id,
            old_status,
            new_status,
            changed_by
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically log status changes
CREATE TRIGGER trigger_log_proposal_status_change
    AFTER UPDATE ON public.proposals
    FOR EACH ROW EXECUTE FUNCTION public.log_proposal_status_change();

-- =============================================
-- 9. CREATE HELPER FUNCTIONS
-- =============================================

-- Function to generate tracking tokens
CREATE OR REPLACE FUNCTION public.generate_tracking_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Function to get proposal tracking stats
CREATE OR REPLACE FUNCTION public.get_proposal_tracking_stats(proposal_uuid UUID)
RETURNS TABLE (
    total_views BIGINT,
    unique_viewers BIGINT,
    last_viewed TIMESTAMP WITH TIME ZONE,
    average_duration INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_views,
        COUNT(DISTINCT viewer_ip) as unique_viewers,
        MAX(viewed_at) as last_viewed,
        COALESCE(AVG(view_duration)::INTEGER, 0) as average_duration
    FROM public.proposal_views
    WHERE proposal_id = proposal_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;