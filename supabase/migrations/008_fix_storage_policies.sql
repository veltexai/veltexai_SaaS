-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own logo" ON storage.objects;

-- Create simpler, more reliable policies
CREATE POLICY "Users can upload their own logo" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-logos' AND 
  auth.uid()::text = split_part(name, '/', 1)
);

CREATE POLICY "Users can update their own logo" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-logos' AND 
  auth.uid()::text = split_part(name, '/', 1)
);

CREATE POLICY "Users can delete their own logo" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profile-logos' AND 
  auth.uid()::text = split_part(name, '/', 1)
);
