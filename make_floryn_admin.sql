-- Make floryn1984@outlook.com an admin
UPDATE profiles
SET role = 'admin'
WHERE email = 'floryn1984@outlook.com';

-- Verify the change
SELECT email, role FROM profiles WHERE email = 'floryn1984@outlook.com';
