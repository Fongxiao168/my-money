-- STRICT ONE ACCOUNT POLICY
-- Run this script to permanently fix duplicate emails and prevent future ones.

-- 1. Clean up ALL duplicates, keeping only the oldest account
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT email
        FROM profiles
        GROUP BY email
        HAVING COUNT(*) > 1
    LOOP
        -- Delete newer duplicates from auth.users
        DELETE FROM auth.users
        WHERE email = r.email
        AND id NOT IN (
            SELECT id 
            FROM profiles 
            WHERE email = r.email 
            ORDER BY created_at ASC 
            LIMIT 1
        );
    END LOOP;
END $$;

-- 2. Add Unique Constraint to profiles table
-- This makes it IMPOSSIBLE for the database to accept a second profile with the same email
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
ALTER TABLE profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);

-- 3. Ensure the trigger is working correctly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
