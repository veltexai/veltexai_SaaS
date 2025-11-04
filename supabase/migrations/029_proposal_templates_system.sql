-- =============================================
-- PROPOSAL TEMPLATES SYSTEM MIGRATION
-- =============================================
-- This migration creates the foundation for tier-based template access control
-- Templates are linked to subscription tiers and users can only access allowed templates

-- =============================================
-- 1. CREATE PROPOSAL TEMPLATES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.proposal_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    template_type TEXT NOT NULL CHECK (template_type IN ('basic', 'premium')),
    preview_image_url TEXT,
    template_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. CREATE TEMPLATE TIER ACCESS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.template_tier_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.proposal_templates(id) ON DELETE CASCADE,
    subscription_tier TEXT NOT NULL CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique template-tier combinations
    UNIQUE(template_id, subscription_tier)
);

-- =============================================
-- 3. CREATE USER TEMPLATE PREFERENCES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_template_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    preferred_template_id UUID REFERENCES public.proposal_templates(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one preference per user
    UNIQUE(user_id)
);

-- =============================================
-- 4. ADD TEMPLATE REFERENCE TO PROPOSALS TABLE
-- =============================================
ALTER TABLE public.proposals 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.proposal_templates(id) ON DELETE SET NULL;

-- =============================================
-- 5. UPDATE USER_BRANDING_SETTINGS TABLE
-- =============================================
-- Add template_version field to track branding changes
ALTER TABLE public.user_branding_settings 
ADD COLUMN IF NOT EXISTS template_version INTEGER DEFAULT 1;

-- =============================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_proposal_templates_type ON public.proposal_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_proposal_templates_active ON public.proposal_templates(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_template_tier_access_tier ON public.template_tier_access(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_template_tier_access_template ON public.template_tier_access(template_id);
CREATE INDEX IF NOT EXISTS idx_user_template_preferences_user ON public.user_template_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_template_id ON public.proposals(template_id);

-- =============================================
-- 7. ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_tier_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_template_preferences ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 8. CREATE RLS POLICIES FOR PROPOSAL_TEMPLATES
-- =============================================
-- Users can view active templates
CREATE POLICY "Users can view active templates" ON public.proposal_templates
    FOR SELECT USING (is_active = true);

-- Admins can manage all templates
CREATE POLICY "Admins can manage all templates" ON public.proposal_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- =============================================
-- 9. CREATE RLS POLICIES FOR TEMPLATE_TIER_ACCESS
-- =============================================
-- Users can view tier access (needed for frontend logic)
CREATE POLICY "Users can view template tier access" ON public.template_tier_access
    FOR SELECT USING (true);

-- Admins can manage tier access
CREATE POLICY "Admins can manage template tier access" ON public.template_tier_access
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- =============================================
-- 10. CREATE RLS POLICIES FOR USER_TEMPLATE_PREFERENCES
-- =============================================
-- Users can manage their own preferences
CREATE POLICY "Users can view own template preferences" ON public.user_template_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own template preferences" ON public.user_template_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own template preferences" ON public.user_template_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own template preferences" ON public.user_template_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Admins can view all preferences
CREATE POLICY "Admins can view all template preferences" ON public.user_template_preferences
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- =============================================
-- 11. CREATE HELPER FUNCTIONS
-- =============================================

-- Function to get user accessible templates based on subscription tier
CREATE OR REPLACE FUNCTION public.get_user_accessible_templates(user_uuid UUID)
RETURNS TABLE (
    template_id UUID,
    template_name TEXT,
    template_description TEXT,
    template_type TEXT,
    preview_image_url TEXT,
    template_config JSONB,
    is_accessible BOOLEAN,
    sort_order INTEGER
) AS $$
DECLARE
    user_tier TEXT;
BEGIN
    -- Get user's subscription tier
    SELECT 
        COALESCE(subscription_plan, 'starter') INTO user_tier
    FROM public.profiles 
    WHERE id = user_uuid;
    
    -- If user is on trial, treat as starter
    IF user_tier IS NULL THEN
        user_tier := 'starter';
    END IF;
    
    RETURN QUERY
    SELECT 
        pt.id as template_id,
        pt.name as template_name,
        pt.description as template_description,
        pt.template_type,
        pt.preview_image_url,
        pt.template_config,
        CASE 
            WHEN tta.template_id IS NOT NULL THEN true
            ELSE false
        END as is_accessible,
        pt.sort_order
    FROM public.proposal_templates pt
    LEFT JOIN public.template_tier_access tta ON (
        pt.id = tta.template_id 
        AND tta.subscription_tier = user_tier
    )
    WHERE pt.is_active = true
    ORDER BY pt.sort_order ASC, pt.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access specific template
CREATE OR REPLACE FUNCTION public.can_user_access_template(user_uuid UUID, template_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_tier TEXT;
    has_access BOOLEAN := false;
BEGIN
    -- Get user's subscription tier
    SELECT 
        COALESCE(subscription_plan, 'starter') INTO user_tier
    FROM public.profiles 
    WHERE id = user_uuid;
    
    -- Check if template is accessible for user's tier
    SELECT EXISTS(
        SELECT 1 
        FROM public.template_tier_access tta
        JOIN public.proposal_templates pt ON pt.id = tta.template_id
        WHERE tta.template_id = template_uuid
        AND tta.subscription_tier = user_tier
        AND pt.is_active = true
    ) INTO has_access;
    
    RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 12. CREATE TRIGGERS
-- =============================================

-- Trigger for updated_at on proposal_templates
CREATE TRIGGER proposal_templates_updated_at
    BEFORE UPDATE ON public.proposal_templates
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for updated_at on user_template_preferences
CREATE TRIGGER user_template_preferences_updated_at
    BEFORE UPDATE ON public.user_template_preferences
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- 13. INSERT DEFAULT TEMPLATES
-- =============================================

-- Insert Basic Template (accessible to all tiers)
INSERT INTO public.proposal_templates (
    name, 
    description, 
    template_type, 
    template_config,
    sort_order
) VALUES (
    'Basic Professional',
    'Clean and professional template suitable for all cleaning services',
    'basic',
    '{"layout": "standard", "sections": ["header", "services", "pricing", "footer"], "style": "minimal"}',
    1
) ON CONFLICT DO NOTHING;

-- Insert Premium Templates (accessible to Professional and Enterprise)
INSERT INTO public.proposal_templates (
    name, 
    description, 
    template_type, 
    template_config,
    sort_order
) VALUES 
(
    'Executive Premium',
    'Sophisticated template with enhanced branding and detailed service breakdown',
    'premium',
    '{"layout": "executive", "sections": ["cover", "company_profile", "services", "methodology", "pricing", "testimonials", "footer"], "style": "executive"}',
    2
),
(
    'Modern Corporate',
    'Contemporary design with visual elements and comprehensive service details',
    'premium',
    '{"layout": "modern", "sections": ["hero", "about", "services", "process", "pricing", "portfolio", "contact"], "style": "modern"}',
    3
),
(
    'Luxury Elite',
    'Premium template with luxury styling for high-end commercial clients',
    'premium',
    '{"layout": "luxury", "sections": ["cover", "executive_summary", "company_credentials", "service_portfolio", "detailed_pricing", "case_studies", "appendix"], "style": "luxury"}',
    4
);

-- =============================================
-- 14. SET UP TIER ACCESS PERMISSIONS
-- =============================================

-- Get template IDs for access setup
DO $$
DECLARE
    basic_template_id UUID;
    executive_template_id UUID;
    modern_template_id UUID;
    luxury_template_id UUID;
BEGIN
    -- Get template IDs
    SELECT id INTO basic_template_id FROM public.proposal_templates WHERE name = 'Basic Professional';
    SELECT id INTO executive_template_id FROM public.proposal_templates WHERE name = 'Executive Premium';
    SELECT id INTO modern_template_id FROM public.proposal_templates WHERE name = 'Modern Corporate';
    SELECT id INTO luxury_template_id FROM public.proposal_templates WHERE name = 'Luxury Elite';
    
    -- Starter tier: Only Basic template
    INSERT INTO public.template_tier_access (template_id, subscription_tier) 
    VALUES (basic_template_id, 'starter') ON CONFLICT DO NOTHING;
    
    -- Professional tier: Basic + Executive
    INSERT INTO public.template_tier_access (template_id, subscription_tier) VALUES 
    (basic_template_id, 'professional'),
    (executive_template_id, 'professional') 
    ON CONFLICT DO NOTHING;
    
    -- Enterprise tier: All templates
    INSERT INTO public.template_tier_access (template_id, subscription_tier) VALUES 
    (basic_template_id, 'enterprise'),
    (executive_template_id, 'enterprise'),
    (modern_template_id, 'enterprise'),
    (luxury_template_id, 'enterprise')
    ON CONFLICT DO NOTHING;
END $$;

-- =============================================
-- 15. GRANT PERMISSIONS
-- =============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_tier_access TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_template_preferences TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_user_accessible_templates(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_access_template(UUID, UUID) TO authenticated;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================