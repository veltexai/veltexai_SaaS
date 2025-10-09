-- Add role column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Create an index on the role column for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Add a check constraint to ensure only valid roles are allowed (conditionally)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_valid_role' 
        AND table_name = 'profiles'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT check_valid_role 
          CHECK (role IN ('user', 'admin', 'moderator'));
    END IF;
END $$;

-- Update RLS policies to allow admins to view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile 
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'admin'
    )
  );

-- Role column and constraints already added in migration 003
-- Just add any additional policies or permissions here

-- Grant permissions for the authenticated role
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON proposals TO authenticated;

-- Additional admin policies (if needed)
-- These are already created in migration 003, so we can skip them