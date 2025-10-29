-- Create proposal tracking table for enhanced sending functionality
CREATE TABLE IF NOT EXISTS proposal_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  tracking_id TEXT UNIQUE NOT NULL,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('pdf', 'online', 'both')),
  recipient_email TEXT NOT NULL,
  cc_emails TEXT[] DEFAULT '{}',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  include_branding BOOLEAN DEFAULT true,
  track_opens BOOLEAN DEFAULT true,
  track_downloads BOOLEAN DEFAULT true,
  
  -- Tracking data
  email_sent_at TIMESTAMPTZ DEFAULT NOW(),
  email_opened BOOLEAN DEFAULT false,
  email_opened_at TIMESTAMPTZ,
  proposal_viewed BOOLEAN DEFAULT false,
  proposal_viewed_at TIMESTAMPTZ,
  proposal_downloaded BOOLEAN DEFAULT false,
  proposal_downloaded_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  
  -- Metadata
  user_agent TEXT,
  ip_address INET,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_proposal_tracking_proposal_id ON proposal_tracking(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_tracking_tracking_id ON proposal_tracking(tracking_id);
CREATE INDEX IF NOT EXISTS idx_proposal_tracking_recipient_email ON proposal_tracking(recipient_email);
CREATE INDEX IF NOT EXISTS idx_proposal_tracking_created_at ON proposal_tracking(created_at);

-- Enable RLS
ALTER TABLE proposal_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own proposal tracking" ON proposal_tracking
  FOR SELECT USING (
    proposal_id IN (
      SELECT id FROM proposals WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tracking for their own proposals" ON proposal_tracking
  FOR INSERT WITH CHECK (
    proposal_id IN (
      SELECT id FROM proposals WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tracking for their own proposals" ON proposal_tracking
  FOR UPDATE USING (
    proposal_id IN (
      SELECT id FROM proposals WHERE user_id = auth.uid()
    )
  );

-- Allow anonymous access for tracking endpoints (email opens, proposal views)
CREATE POLICY "Allow anonymous tracking updates" ON proposal_tracking
  FOR UPDATE USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON proposal_tracking TO authenticated;
GRANT UPDATE ON proposal_tracking TO anon;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_proposal_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_proposal_tracking_updated_at
  BEFORE UPDATE ON proposal_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_proposal_tracking_updated_at();