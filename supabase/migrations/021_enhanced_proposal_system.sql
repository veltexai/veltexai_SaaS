-- Enhanced Proposal System Migration
-- This migration adds new tables and columns for the enhanced VeltexAI proposal system

-- =============================================
-- 1. ENHANCE EXISTING PROPOSALS TABLE
-- =============================================

-- Add new columns to existing proposals table for enhanced intake form
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS facility_details JSONB DEFAULT '{}';
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS traffic_analysis JSONB DEFAULT '{}';
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS service_scope JSONB DEFAULT '[]';
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS special_requirements JSONB DEFAULT '{}';
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS regional_location VARCHAR(50);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS property_type VARCHAR(50);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pricing_breakdown JSONB DEFAULT '{}';

-- Create indexes for enhanced queries
CREATE INDEX IF NOT EXISTS idx_proposals_regional_location ON proposals(regional_location);
CREATE INDEX IF NOT EXISTS idx_proposals_property_type ON proposals(property_type);
CREATE INDEX IF NOT EXISTS idx_proposals_facility_details ON proposals USING GIN(facility_details);
CREATE INDEX IF NOT EXISTS idx_proposals_traffic_analysis ON proposals USING GIN(traffic_analysis);
CREATE INDEX IF NOT EXISTS idx_proposals_service_scope ON proposals USING GIN(service_scope);

-- =============================================
-- 2. CREATE COMPANY PROFILES TABLE
-- =============================================

-- Create company profiles table for enhanced company information management
CREATE TABLE IF NOT EXISTS company_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    contact_info JSONB DEFAULT '{}',
    logo_url TEXT,
    company_background TEXT,
    service_references JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for company profiles
CREATE INDEX IF NOT EXISTS idx_company_profiles_user_id ON company_profiles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_profiles_user_unique ON company_profiles(user_id);

-- =============================================
-- 3. CREATE REGIONAL MULTIPLIERS TABLE
-- =============================================

-- Create regional multipliers table for location-based pricing
CREATE TABLE IF NOT EXISTS regional_multipliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_name VARCHAR(100) UNIQUE NOT NULL,
    multiplier_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial regional data for Washington state
INSERT INTO regional_multipliers (region_name, multiplier_percentage) VALUES
('seattle', 15.00),
('tacoma', 5.00),
('bellevue', 12.00),
('everett', 4.00),
('olympia', 2.00),
('spokane', 0.00),
('vancouver', 8.00),
('renton', 10.00),
('kent', 6.00),
('federal_way', 4.00)
ON CONFLICT (region_name) DO NOTHING;

-- =============================================
-- 4. CREATE PROPERTY BASELINES TABLE
-- =============================================

-- Create property baselines table for property type-specific pricing
CREATE TABLE IF NOT EXISTS property_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_type VARCHAR(50) UNIQUE NOT NULL,
    baseline_rate DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    complexity_factors JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial property type data with baseline rates and complexity factors
INSERT INTO property_baselines (property_type, baseline_rate, complexity_factors) VALUES
('office', 0.15, '{"standard_complexity": 1.0, "high_security": 1.2, "open_floor": 0.9, "private_offices": 1.1}'),
('restaurant', 0.25, '{"kitchen_areas": 1.5, "dining_areas": 1.0, "bar_areas": 1.3, "grease_cleaning": 1.4}'),
('warehouse', 0.12, '{"high_ceilings": 1.3, "loading_docks": 1.1, "storage_areas": 0.8, "office_areas": 1.2}'),
('daycare', 0.30, '{"child_safety": 1.4, "sanitization": 1.3, "play_areas": 1.2, "nap_rooms": 1.1}'),
('medical', 0.35, '{"sterile_areas": 1.6, "biohazard": 1.8, "waiting_rooms": 1.0, "exam_rooms": 1.4}'),
('church', 0.18, '{"large_spaces": 1.1, "special_events": 1.2, "sanctuary": 1.0, "fellowship_halls": 1.1}'),
('retail', 0.20, '{"customer_areas": 1.0, "storage_areas": 0.9, "fitting_rooms": 1.2, "high_traffic": 1.3}'),
('school', 0.22, '{"classrooms": 1.0, "cafeteria": 1.4, "gymnasiums": 1.2, "laboratories": 1.5}')
ON CONFLICT (property_type) DO NOTHING;

-- =============================================
-- 5. ENHANCE PRICING SETTINGS TABLE
-- =============================================

-- Add traffic multipliers to existing pricing_settings table
ALTER TABLE pricing_settings ADD COLUMN IF NOT EXISTS traffic_multipliers JSONB DEFAULT '{
  "light": {"rate": 3500, "description": "Light traffic areas (under 20 staff, minimal visitors)"},
  "medium": {"rate": 2500, "description": "Medium traffic areas (20-60 staff, moderate visitors)"}, 
  "heavy": {"rate": 1750, "description": "Heavy traffic areas (60+ staff, high visitor volume, 5x+ weekly cleaning)"}
}';

-- Update existing records with default traffic multipliers if they don't have them
UPDATE pricing_settings 
SET traffic_multipliers = '{
  "light": {"rate": 3500, "description": "Light traffic areas (under 20 staff, minimal visitors)"},
  "medium": {"rate": 2500, "description": "Medium traffic areas (20-60 staff, moderate visitors)"}, 
  "heavy": {"rate": 1750, "description": "Heavy traffic areas (60+ staff, high visitor volume, 5x+ weekly cleaning)"}
}'
WHERE traffic_multipliers IS NULL OR traffic_multipliers = '{}';

-- =============================================
-- 6. ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on new tables
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_multipliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_baselines ENABLE ROW LEVEL SECURITY;

-- Company profiles policies - users can only access their own profiles
CREATE POLICY "Users can view own company profile" ON company_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own company profile" ON company_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own company profile" ON company_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own company profile" ON company_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Regional multipliers policies - read access for all, admin-only modifications
CREATE POLICY "Anyone can view regional multipliers" ON regional_multipliers
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify regional multipliers" ON regional_multipliers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Property baselines policies - read access for all, admin-only modifications
CREATE POLICY "Anyone can view property baselines" ON property_baselines
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify property baselines" ON property_baselines
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- =============================================
-- 7. GRANT PERMISSIONS TO ROLES
-- =============================================

-- Grant permissions for company_profiles table
GRANT SELECT, INSERT, UPDATE, DELETE ON company_profiles TO authenticated;
GRANT SELECT ON company_profiles TO anon;

-- Grant permissions for regional_multipliers table
GRANT SELECT ON regional_multipliers TO authenticated;
GRANT SELECT ON regional_multipliers TO anon;
GRANT ALL PRIVILEGES ON regional_multipliers TO service_role;

-- Grant permissions for property_baselines table
GRANT SELECT ON property_baselines TO authenticated;
GRANT SELECT ON property_baselines TO anon;
GRANT ALL PRIVILEGES ON property_baselines TO service_role;

-- =============================================
-- 8. CREATE UPDATED_AT TRIGGERS
-- =============================================

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_company_profiles_updated_at 
    BEFORE UPDATE ON company_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_regional_multipliers_updated_at 
    BEFORE UPDATE ON regional_multipliers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_baselines_updated_at 
    BEFORE UPDATE ON property_baselines 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 9. CREATE HELPFUL VIEWS
-- =============================================

-- Create view for enhanced proposal data with related information
CREATE OR REPLACE VIEW enhanced_proposals AS
SELECT 
    p.*,
    cp.company_name as user_company_name,
    cp.logo_url as user_logo_url,
    rm.multiplier_percentage as regional_multiplier,
    pb.baseline_rate as property_baseline_rate,
    pb.complexity_factors as property_complexity_factors
FROM proposals p
LEFT JOIN company_profiles cp ON p.user_id = cp.user_id
LEFT JOIN regional_multipliers rm ON p.regional_location = rm.region_name
LEFT JOIN property_baselines pb ON p.property_type = pb.property_type;

-- Grant access to the view
GRANT SELECT ON enhanced_proposals TO authenticated;
GRANT SELECT ON enhanced_proposals TO anon;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Add comment to track migration
COMMENT ON TABLE company_profiles IS 'Enhanced company profile management for VeltexAI proposal system';
COMMENT ON TABLE regional_multipliers IS 'Regional pricing multipliers for location-based pricing adjustments';
COMMENT ON TABLE property_baselines IS 'Property type baseline rates and complexity factors for pricing calculations';