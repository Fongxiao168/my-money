-- 1. Add status column to profiles if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'banned'));

-- 2. Update existing users to be active (safe to run multiple times)
UPDATE public.profiles SET status = 'active' WHERE status IS NULL;

-- 3. Drop the policy if it exists to avoid the "already exists" error
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- 4. Re-create the policy to ensure it has the correct permissions
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'admin'
    )
  );
