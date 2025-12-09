-- COMPREHENSIVE ADMIN FIX SCRIPT
-- Run this in your Supabase SQL Editor

-- 1. Ensure the profiles table has the correct structure and RLS
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  role text default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- Allow users to read their own profile (CRITICAL for the app to see the role)
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

-- Allow service role (dashboard) to do everything
drop policy if exists "Service role full access" on public.profiles;
create policy "Service role full access" on public.profiles
  for all using (true) with check (true);


-- 2. Function to promote a user by email
create or replace function public.make_admin(target_email text)
returns void as $$
declare
  target_id uuid;
begin
  -- Find user id
  select id into target_id from auth.users where email = target_email;
  
  if target_id is not null then
    -- Ensure profile exists
    insert into public.profiles (id, email, role)
    values (target_id, target_email, 'admin')
    on conflict (id) do update
    set role = 'admin';
    
    raise notice 'User % is now admin', target_email;
  else
    raise notice 'User % not found in auth.users', target_email;
  end if;
end;
$$ language plpgsql security definer;

-- 3. Run the function for likely emails (ADD YOUR EMAIL HERE IF DIFFERENT)
select public.make_admin('floryn1984@outlook.com');

-- 4. Show the results
select * from public.profiles where role = 'admin';
