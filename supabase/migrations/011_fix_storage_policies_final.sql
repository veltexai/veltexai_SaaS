-- Drop all existing conflicting policies
DROP POLICY IF EXISTS "Users can upload their own logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own profile logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile logos" ON storage.objects;

-- Create clean, working policies
CREATE POLICY "profile_logos_insert_policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-logos' AND 
  auth.uid()::text = split_part(name, '/', 1)
);

CREATE POLICY "profile_logos_select_policy" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-logos');

CREATE POLICY "profile_logos_update_policy" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-logos' AND 
  auth.uid()::text = split_part(name, '/', 1)
);

CREATE POLICY "profile_logos_delete_policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profile-logos' AND 
  auth.uid()::text = split_part(name, '/', 1)
);