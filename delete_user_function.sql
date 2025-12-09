-- Function to allow admins to delete users from auth.users
-- This is required because client-side code cannot delete from auth.users directly
create or replace function delete_user_by_admin(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Check if the executing user is an admin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Access denied: only admins can delete users';
  end if;

  -- Delete from auth.users
  -- This will automatically cascade to the public.profiles table
  delete from auth.users where id = target_user_id;
end;
$$;
