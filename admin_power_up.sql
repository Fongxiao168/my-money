-- Add status column to profiles table
alter table profiles add column if not exists status text default 'active';

-- Update existing rows to have 'active' status
update profiles set status = 'active' where status is null;
