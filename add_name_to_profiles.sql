-- Add full_name column to profiles table
alter table public.profiles 
add column full_name text;

-- Update the handle_new_user function to include full_name metadata if available
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, full_name)
  values (
    new.id, 
    new.email, 
    'user',
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$ language plpgsql security definer;
