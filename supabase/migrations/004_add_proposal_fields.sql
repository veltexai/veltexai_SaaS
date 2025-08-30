-- Add new columns to proposals table
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS client_company TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS service_location TEXT,
ADD COLUMN IF NOT EXISTS service_frequency TEXT CHECK (service_frequency IN ('daily', 'weekly', 'monthly')),
ADD COLUMN IF NOT EXISTS square_footage TEXT,
ADD COLUMN IF NOT EXISTS desired_start_date DATE,
ADD COLUMN IF NOT EXISTS special_requirements TEXT,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Create storage bucket for proposal attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal-attachments', 'proposal-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket
CREATE POLICY "Users can upload their own proposal attachments" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'proposal-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own proposal attachments" ON storage.objects
FOR SELECT USING (bucket_id = 'proposal-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own proposal attachments" ON storage.objects
FOR DELETE USING (bucket_id = 'proposal-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);