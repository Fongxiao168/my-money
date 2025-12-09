-- Add is_premium column to profiles table
alter table profiles add column if not exists is_premium boolean default false;

-- Update RLS to allow users to update their own is_premium status (for demo purposes)
-- In a real app, this should only be updated by a server-side process (webhook)
-- But since we are simulating payment on the client, we need this.
-- The existing policy "Users can update own profile" should cover this if it allows all columns.
-- Let's verify/ensure it.

-- If the existing policy is:
-- create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
-- It allows updating any column.

-- We might want to add a function to simulate payment
create or replace function simulate_payment()
returns void as $$
begin
  update profiles
  set is_premium = true
  where id = auth.uid();
end;
$$ language plpgsql security definer;
