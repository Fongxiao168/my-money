-- Add user_id to accounts
alter table accounts add column user_id uuid references auth.users(id);
alter table categories add column user_id uuid references auth.users(id);
alter table transactions add column user_id uuid references auth.users(id);

-- Update RLS policies
drop policy "Allow public access to accounts" on accounts;
drop policy "Allow public access to categories" on categories;
drop policy "Allow public access to transactions" on transactions;

-- Accounts policies
create policy "Users can view their own accounts" on accounts
  for select using (auth.uid() = user_id);

create policy "Users can insert their own accounts" on accounts
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own accounts" on accounts
  for update using (auth.uid() = user_id);

create policy "Users can delete their own accounts" on accounts
  for delete using (auth.uid() = user_id);

-- Categories policies
create policy "Users can view their own categories" on categories
  for select using (auth.uid() = user_id);

create policy "Users can insert their own categories" on categories
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own categories" on categories
  for update using (auth.uid() = user_id);

create policy "Users can delete their own categories" on categories
  for delete using (auth.uid() = user_id);

-- Transactions policies
create policy "Users can view their own transactions" on transactions
  for select using (auth.uid() = user_id);

create policy "Users can insert their own transactions" on transactions
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own transactions" on transactions
  for update using (auth.uid() = user_id);

create policy "Users can delete their own transactions" on transactions
  for delete using (auth.uid() = user_id);
