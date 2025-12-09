-- Create user_activity_logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'registration', 'login', 'payment_approved', 'profile_update'
  description TEXT,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all user activity logs" ON user_activity_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can view their own activity logs" ON user_activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert logs" ON user_activity_logs
  FOR INSERT WITH CHECK (true); -- Allow inserts (triggers/functions will handle this)

-- Trigger for New Registration
CREATE OR REPLACE FUNCTION log_new_user_registration()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_activity_logs (user_id, activity_type, description, metadata)
  VALUES (NEW.id, 'registration', 'New user registered', jsonb_build_object('email', NEW.email, 'role', NEW.role));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_registered_log ON profiles;
CREATE TRIGGER on_user_registered_log
AFTER INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION log_new_user_registration();

-- Trigger for Payment Approved
CREATE OR REPLACE FUNCTION log_payment_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
    INSERT INTO user_activity_logs (user_id, activity_type, description, metadata)
    VALUES (NEW.user_id, 'payment_approved', 'Payment request approved', jsonb_build_object('amount', NEW.amount, 'request_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_payment_approved_log ON payment_requests;
CREATE TRIGGER on_payment_approved_log
AFTER UPDATE ON payment_requests
FOR EACH ROW EXECUTE FUNCTION log_payment_approval();

-- Function to log user login (to be called from frontend or auth hook)
CREATE OR REPLACE FUNCTION log_user_login(user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_activity_logs (user_id, activity_type, description)
  VALUES (user_id, 'login', 'User logged in');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Profile Updates
CREATE OR REPLACE FUNCTION log_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    INSERT INTO user_activity_logs (user_id, activity_type, description, metadata)
    VALUES (NEW.id, 'profile_update', 'User profile updated', jsonb_build_object('changes', 'email'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_updated_log ON profiles;
CREATE TRIGGER on_profile_updated_log
AFTER UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION log_profile_update();
