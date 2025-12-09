-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Accounts Table
create table accounts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null,
  balance numeric not null default 0,
  color text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Categories Table
create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null, -- 'income' or 'expense'
  color text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Transactions Table
create table transactions (
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

-- Enable Row Level Security (RLS)
alter table accounts enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;

-- Create policies to allow public access (for demo purposes)
-- In a real production app with auth, you would check "auth.uid() = user_id"
create policy "Allow public access to accounts" on accounts for all using (true);
create policy "Allow public access to categories" on categories for all using (true);
create policy "Allow public access to transactions" on transactions for all using (true);

-- Insert Default Categories
insert into categories (name, type, color) values
  ('Food & Dining', 'expense', '#ef4444'),
  ('Transportation', 'expense', '#f97316'),
  ('Shopping', 'expense', '#8b5cf6'),
  ('Entertainment', 'expense', '#ec4899'),
  ('Bills & Utilities', 'expense', '#3b82f6'),
  ('Salary', 'income', '#10b981'),
  ('Freelance', 'income', '#06b6d4'),
  ('Investment', 'income', '#84cc16');
