-- FIX ADMIN DASHBOARD ACCESS
-- This script fixes the "recursion" error and ensures you can see the admin dashboard.

-- 1. Create a secure function to check admin status (Bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix Profiles RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Service role full access" ON profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow admins to view ALL profiles (using the secure function)
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (public.is_admin());

-- Allow admins to update any profile
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (public.is_admin());

-- 3. Fix Payment Requests RLS
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all requests" ON payment_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON payment_requests;

CREATE POLICY "Admins can view all requests" ON payment_requests
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update requests" ON payment_requests
  FOR UPDATE USING (public.is_admin());

-- 4. Ensure YOU are an admin
-- Replace 'floryn1984@outlook.com' with your email if different
DO $$
DECLARE
  target_email TEXT := 'floryn1984@outlook.com';
  target_id UUID;
BEGIN
  SELECT id INTO target_id FROM auth.users WHERE email = target_email;
  
  IF target_id IS NOT NULL THEN
    -- Ensure profile exists
    INSERT INTO public.profiles (id, email, role)
    VALUES (target_id, target_email, 'admin')
    ON CONFLICT (id) DO UPDATE
    SET role = 'admin';
    
    RAISE NOTICE 'User % is now confirmed as ADMIN', target_email;
  ELSE
    RAISE NOTICE 'User % not found', target_email;
  END IF;
END $$;
