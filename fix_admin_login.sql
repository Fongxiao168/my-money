-- FIX ADMIN LOGIN (Recursion Issue)
-- The previous security policy created an "infinite loop" where the database tried to check if you are an admin,
-- but to check if you are an admin, it had to read the table, which triggered the check again.

-- 1. Create a secure function to check admin status without triggering policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- This runs with "SECURITY DEFINER" which means it bypasses RLS
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the broken policy
DROP POLICY IF EXISTS "Profiles are viewable by owner and admins" ON profiles;

-- 3. Create the fixed policy using the function
CREATE POLICY "Profiles are viewable by owner and admins" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR public.is_admin()
  );

-- 4. Ensure you are definitely an admin (just in case)
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'floryn1984@outlook.com'; -- Replace with your email if different
