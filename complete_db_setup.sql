-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Tables (if they don't exist)

create table if not exists accounts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null,
  balance numeric not null default 0,
  color text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null, -- 'income' or 'expense'
  color text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists transactions (
  id uuid primary key default uuid_generate_v4(),
  date timestamp with time zone not null,
  description text not null,
  amount numeric not null,
  type text not null, -- 'income', 'expense', 'transfer'
  category text not null,
  account_id uuid references accounts(id) on delete cascade,
  to_account_id uuid references accounts(id) on delete set null, -- For transfers
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Add user_id column (safe to run if column exists)

alter table accounts add column if not exists user_id uuid references auth.users(id);
alter table categories add column if not exists user_id uuid references auth.users(id);
alter table transactions add column if not exists user_id uuid references auth.users(id);

-- 3. Enable RLS

alter table accounts enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;

-- 4. Drop existing policies to avoid conflicts

drop policy if exists "Allow public access to accounts" on accounts;
drop policy if exists "Allow public access to categories" on categories;
drop policy if exists "Allow public access to transactions" on transactions;

drop policy if exists "Users can view their own accounts" on accounts;
drop policy if exists "Users can insert their own accounts" on accounts;
drop policy if exists "Users can update their own accounts" on accounts;
drop policy if exists "Users can delete their own accounts" on accounts;

drop policy if exists "Users can view their own categories" on categories;
drop policy if exists "Users can insert their own categories" on categories;
drop policy if exists "Users can update their own categories" on categories;
drop policy if exists "Users can delete their own categories" on categories;

drop policy if exists "Users can view their own transactions" on transactions;
drop policy if exists "Users can insert their own transactions" on transactions;
drop policy if exists "Users can update their own transactions" on transactions;
drop policy if exists "Users can delete their own transactions" on transactions;

-- 5. Create Policies

-- Accounts
create policy "Users can view their own accounts" on accounts for select using (auth.uid() = user_id);
create policy "Users can insert their own accounts" on accounts for insert with check (auth.uid() = user_id);
create policy "Users can update their own accounts" on accounts for update using (auth.uid() = user_id);
create policy "Users can delete their own accounts" on accounts for delete using (auth.uid() = user_id);

-- Categories
create policy "Users can view their own categories" on categories for select using (auth.uid() = user_id);
create policy "Users can insert their own categories" on categories for insert with check (auth.uid() = user_id);
create policy "Users can update their own categories" on categories for update using (auth.uid() = user_id);
create policy "Users can delete their own categories" on categories for delete using (auth.uid() = user_id);

-- Transactions
create policy "Users can view their own transactions" on transactions for select using (auth.uid() = user_id);
create policy "Users can insert their own transactions" on transactions for insert with check (auth.uid() = user_id);
create policy "Users can update their own transactions" on transactions for update using (auth.uid() = user_id);
create policy "Users can delete their own transactions" on transactions for delete using (auth.uid() = user_id);
