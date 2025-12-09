-- 1. Identify duplicates and delete them from auth.users (which cascades to profiles)
-- This will keep the OLDEST account and delete newer duplicates.
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
        -- Delete all users with this email EXCEPT the oldest one
        -- We delete from auth.users, which will automatically delete the profile due to CASCADE
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

-- 2. Add unique constraint to prevent future duplicates
ALTER TABLE profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
