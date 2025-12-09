-- 1. Create table if it doesn't exist
create table if not exists profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  role text default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS (safe to run multiple times)
alter table profiles enable row level security;

-- 3. Drop existing policies to avoid conflicts
drop policy if exists "Public profiles are viewable by everyone" on profiles;
drop policy if exists "Users can insert their own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;
drop policy if exists "Admins can update any profile" on profiles;

-- 4. Re-create policies
create policy "Public profiles are viewable by everyone" on profiles
  for select using (true);

create policy "Users can insert their own profile" on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Admins can update any profile" on profiles
  for update using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 5. Create/Replace function
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$ language plpgsql security definer;

-- 6. Drop and Re-create trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. Backfill existing users
insert into public.profiles (id, email, role)
select id, email, 'user'
from auth.users
where id not in (select id from public.profiles);

-- 8. IMPORTANT: Update YOUR user to be an admin
-- Replace 'floryn1984@outlook.com' with your actual email address below and uncomment the lines:

-- update public.profiles 
-- set role = 'admin' 
-- where email = 'floryn1984@outlook.com';
