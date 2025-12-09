-- Fix for User History System causing signup errors

-- 1. Ensure extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Ensure table exists with correct permissions
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Grant permissions explicitly
GRANT ALL ON user_activity_logs TO service_role;
GRANT ALL ON user_activity_logs TO postgres;
GRANT SELECT, INSERT ON user_activity_logs TO authenticated;
GRANT SELECT, INSERT ON user_activity_logs TO anon;

-- 4. Enable RLS
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- 5. Re-create policies
DROP POLICY IF EXISTS "Admins can view all user activity logs" ON user_activity_logs;
CREATE POLICY "Admins can view all user activity logs" ON user_activity_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can view their own activity logs" ON user_activity_logs;
CREATE POLICY "Users can view their own activity logs" ON user_activity_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert logs" ON user_activity_logs;
CREATE POLICY "System can insert logs" ON user_activity_logs
  FOR INSERT WITH CHECK (true);

-- 6. Update the registration trigger function with error handling
-- This prevents the signup from failing even if logging fails
CREATE OR REPLACE FUNCTION log_new_user_registration()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO user_activity_logs (user_id, activity_type, description, metadata)
    VALUES (NEW.id, 'registration', 'New user registered', jsonb_build_object('email', NEW.email, 'role', NEW.role));
  EXCEPTION WHEN OTHERS THEN
    -- Log error to Postgres logs but do not fail the transaction
    RAISE WARNING 'Error logging user registration: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Ensure the trigger is properly attached
DROP TRIGGER IF EXISTS on_user_registered_log ON profiles;
CREATE TRIGGER on_user_registered_log
AFTER INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION log_new_user_registration();

-- 8. Update other logging functions with error handling too
CREATE OR REPLACE FUNCTION log_payment_approval()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
      INSERT INTO user_activity_logs (user_id, activity_type, description, metadata)
      VALUES (NEW.user_id, 'payment_approved', 'Payment request approved', jsonb_build_object('amount', NEW.amount, 'request_id', NEW.id));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error logging payment approval: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    IF OLD.email IS DISTINCT FROM NEW.email THEN
      INSERT INTO user_activity_logs (user_id, activity_type, description, metadata)
      VALUES (NEW.id, 'profile_update', 'User profile updated', jsonb_build_object('changes', 'email'));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error logging profile update: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
