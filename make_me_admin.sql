-- REPLACE 'your_email@example.com' WITH YOUR ACTUAL EMAIL ADDRESS

-- 1. Force create a profile for your user if it's missing
insert into public.profiles (id, email, role)
select id, email, 'user'
from auth.users
where email = 'floryn1984@outlook.com'
on conflict (id) do nothing;

-- 2. Now update the role to admin
update public.profiles
set role = 'admin'
where email = 'floryn1984@outlook.com';

-- 3. Verify the result (should show 1 row now)
select * from public.profiles where email = 'floryn1984@outlook.com';
