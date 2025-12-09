-- 1. Replace 'your_email@example.com' with your login email address.
-- 2. Run this entire script in the Supabase SQL Editor.

DO $$
DECLARE
    target_email TEXT := 'floryn1984@outlook.com'; -- <<< I updated this based on your screenshot
    target_user_id UUID;
BEGIN
    -- Find the user in the auth system
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found. Please sign up first.', target_email;
    END IF;

    -- Ensure a profile exists for this user
    INSERT INTO public.profiles (id, email, role)
    VALUES (target_user_id, target_email, 'user')
    ON CONFLICT (id) DO NOTHING;

    -- Update the role to admin
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = target_user_id;

    RAISE NOTICE 'SUCCESS: User % is now an ADMIN.', target_email;
END $$;
