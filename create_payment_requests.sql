
-- Create payment_requests table
create table if not exists payment_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  receipt_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table payment_requests enable row level security;

-- Drop existing policies to avoid conflicts
drop policy if exists "Users can view their own requests" on payment_requests;
drop policy if exists "Users can insert their own requests" on payment_requests;
drop policy if exists "Admins can view all requests" on payment_requests;
drop policy if exists "Admins can update requests" on payment_requests;

-- Policies
create policy "Users can view their own requests"
  on payment_requests for select
  using (auth.uid() = user_id);

create policy "Users can insert their own requests"
  on payment_requests for insert
  with check (auth.uid() = user_id);

create policy "Admins can view all requests"
  on payment_requests for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Admins can update requests"
  on payment_requests for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Storage Bucket for Receipts (This part usually requires Supabase dashboard or specific storage SQL extensions, but we'll include it for completeness if they run it in SQL editor)
-- Note: Creating buckets via SQL might not work in all Supabase environments directly without specific extensions enabled.
-- Ideally, create the bucket 'receipts' in the Supabase Dashboard.
