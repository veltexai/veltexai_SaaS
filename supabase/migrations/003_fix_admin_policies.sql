-- First, create a function to check admin status
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id 
    AND raw_user_meta_data->>'role' = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create new admin policies
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete all profiles" ON profiles
  FOR DELETE USING (is_admin(auth.uid()));