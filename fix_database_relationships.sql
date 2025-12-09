
-- 1. Add missing columns to profiles table
alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists is_premium boolean default false;
alter table profiles add column if not exists status text default 'active' check (status in ('active', 'banned'));

-- 2. Fix payment_requests foreign key to allow joining with profiles
-- We need to reference the profiles table directly to use the syntax: profiles:user_id(...)
alter table payment_requests
drop constraint if exists payment_requests_user_id_fkey;

alter table payment_requests
add constraint payment_requests_user_id_fkey
foreign key (user_id)
references profiles(id)
on delete cascade;

-- 3. Verify policies (just to be safe)
alter table profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone" on profiles;
create policy "Public profiles are viewable by everyone" on profiles
  for select using (true);

-- 4. Grant permissions (sometimes needed)
grant select on table profiles to authenticated;
grant select on table profiles to anon;
