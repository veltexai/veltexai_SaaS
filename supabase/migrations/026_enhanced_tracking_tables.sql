-- Enhanced Tracking Tables
-- This migration enhances the proposal tracking system with additional tracking capabilities

-- First, enhance the existing proposal_tracking table
ALTER TABLE proposal_tracking 
ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_scroll_depth DECIMAL(5,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS opened BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS viewed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS downloaded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS downloaded_at TIMESTAMP WITH TIME ZONE;

-- Add missing columns to existing proposal_views table
DO $$
BEGIN
    -- Add session_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proposal_views' 
                   AND column_name = 'session_id'
                   AND table_schema = 'public') THEN
        ALTER TABLE public.proposal_views ADD COLUMN session_id VARCHAR(255);
    END IF;
    
    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proposal_views' 
                   AND column_name = 'user_id'
                   AND table_schema = 'public') THEN
        ALTER TABLE public.proposal_views ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    
    -- Add ip_address column if it doesn't exist (rename from viewer_ip if needed)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proposal_views' 
                   AND column_name = 'ip_address'
                   AND table_schema = 'public') THEN
        -- If viewer_ip exists, we'll keep both for compatibility
        ALTER TABLE public.proposal_views ADD COLUMN ip_address INET;
    END IF;
    
    -- Add referrer column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proposal_views' 
                   AND column_name = 'referrer'
                   AND table_schema = 'public') THEN
        ALTER TABLE public.proposal_views ADD COLUMN referrer TEXT;
    END IF;
    
    -- Add view_duration_seconds column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proposal_views' 
                   AND column_name = 'view_duration_seconds'
                   AND table_schema = 'public') THEN
        ALTER TABLE public.proposal_views ADD COLUMN view_duration_seconds INTEGER DEFAULT 0;
    END IF;
    
    -- Add scroll_depth column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proposal_views' 
                   AND column_name = 'scroll_depth'
                   AND table_schema = 'public') THEN
        ALTER TABLE public.proposal_views ADD COLUMN scroll_depth DECIMAL(5,2) DEFAULT 0.0;
    END IF;
    
    -- Add pages_viewed column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proposal_views' 
                   AND column_name = 'pages_viewed'
                   AND table_schema = 'public') THEN
        ALTER TABLE public.proposal_views ADD COLUMN pages_viewed INTEGER DEFAULT 1;
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proposal_views' 
                   AND column_name = 'updated_at'
                   AND table_schema = 'public') THEN
        ALTER TABLE public.proposal_views ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create proposal_downloads table for download tracking
CREATE TABLE IF NOT EXISTS proposal_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    download_type VARCHAR(50) DEFAULT 'pdf', -- pdf, doc, etc.
    file_size_bytes BIGINT,
    download_completed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to proposal_downloads if they don't exist
DO $$
BEGIN
    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proposal_downloads' 
                   AND column_name = 'user_id'
                   AND table_schema = 'public') THEN
        ALTER TABLE public.proposal_downloads ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create proposal_click_tracking table for detailed interaction tracking
CREATE TABLE IF NOT EXISTS proposal_click_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    element_type VARCHAR(100), -- button, link, section, etc.
    element_id VARCHAR(255),
    element_text TEXT,
    page_section VARCHAR(100),
    click_position_x INTEGER,
    click_position_y INTEGER,
    timestamp_offset_seconds INTEGER, -- seconds from when proposal was opened
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to proposal_click_tracking if they don't exist
DO $$
BEGIN
    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proposal_click_tracking' 
                   AND column_name = 'user_id'
                   AND table_schema = 'public') THEN
        ALTER TABLE public.proposal_click_tracking ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_proposal_tracking_proposal_id ON proposal_tracking(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_tracking_last_viewed ON proposal_tracking(last_viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposal_tracking_opened_at ON proposal_tracking(opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_proposal_views_proposal_id ON proposal_views(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_views_user_id ON proposal_views(user_id);
CREATE INDEX IF NOT EXISTS idx_proposal_views_session_id ON proposal_views(session_id);
CREATE INDEX IF NOT EXISTS idx_proposal_views_created_at ON proposal_views(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proposal_downloads_proposal_id ON proposal_downloads(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_downloads_user_id ON proposal_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_proposal_downloads_created_at ON proposal_downloads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proposal_click_tracking_proposal_id ON proposal_click_tracking(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_click_tracking_session_id ON proposal_click_tracking(session_id);
CREATE INDEX IF NOT EXISTS idx_proposal_click_tracking_element_type ON proposal_click_tracking(element_type);

-- Enable RLS on new tables (proposal_views already has RLS enabled)
ALTER TABLE proposal_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_click_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for proposal_views (additional policies)
CREATE POLICY "Users can insert their own proposal views" ON proposal_views
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR 
        proposal_id IN (
            SELECT id FROM proposals WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own proposal views" ON proposal_views
    FOR UPDATE USING (
        user_id = auth.uid() OR 
        proposal_id IN (
            SELECT id FROM proposals WHERE user_id = auth.uid()
        )
    );

-- Create RLS policies for proposal_downloads
CREATE POLICY "Users can view their own proposal downloads" ON proposal_downloads
    FOR SELECT USING (
        user_id = auth.uid() OR 
        proposal_id IN (
            SELECT id FROM proposals WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own proposal downloads" ON proposal_downloads
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR 
        proposal_id IN (
            SELECT id FROM proposals WHERE user_id = auth.uid()
        )
    );

-- Create RLS policies for proposal_click_tracking
CREATE POLICY "Users can view their own proposal click tracking" ON proposal_click_tracking
    FOR SELECT USING (
        user_id = auth.uid() OR 
        proposal_id IN (
            SELECT id FROM proposals WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own proposal click tracking" ON proposal_click_tracking
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR 
        proposal_id IN (
            SELECT id FROM proposals WHERE user_id = auth.uid()
        )
    );

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON proposal_views TO authenticated;
GRANT SELECT, INSERT ON proposal_downloads TO authenticated;
GRANT SELECT, INSERT ON proposal_click_tracking TO authenticated;