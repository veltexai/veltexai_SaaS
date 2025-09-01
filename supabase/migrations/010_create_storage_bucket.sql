-- Create storage bucket for profile logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-logos', 'profile-logos', true);

-- Set up storage policies for profile-logos bucket
CREATE POLICY "Users can upload their own profile logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-logos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own profile logos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'profile-logos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-logos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profile-logos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to view profile logos
CREATE POLICY "Public can view profile logos" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-logos');