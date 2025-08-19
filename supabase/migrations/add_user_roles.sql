-- Add role column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Create an index on the role column for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Add a check constraint to ensure only valid roles are allowed
ALTER TABLE profiles ADD CONSTRAINT check_valid_role 
  CHECK (role IN ('user', 'admin', 'moderator'));

-- Update RLS policies to allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile 
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'admin'
    )
  );

-- Grant permissions for the authenticated role
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON proposals TO authenticated;