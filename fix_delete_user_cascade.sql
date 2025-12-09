-- Fix foreign key constraints to allow cascading deletes when a user is deleted
-- This is necessary because the original tables were created without ON DELETE CASCADE
-- causing user deletion to fail if they have associated data.

-- 1. Accounts table
DO $$
BEGIN
  -- Try to drop the constraint if we can guess the name
  -- The default naming convention is table_column_fkey
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'accounts_user_id_fkey') THEN
    ALTER TABLE accounts DROP CONSTRAINT accounts_user_id_fkey;
  END IF;
END $$;

-- Re-add with ON DELETE CASCADE
ALTER TABLE accounts
ADD CONSTRAINT accounts_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 2. Categories table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'categories_user_id_fkey') THEN
    ALTER TABLE categories DROP CONSTRAINT categories_user_id_fkey;
  END IF;
END $$;

ALTER TABLE categories
ADD CONSTRAINT categories_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 3. Transactions table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'transactions_user_id_fkey') THEN
    ALTER TABLE transactions DROP CONSTRAINT transactions_user_id_fkey;
  END IF;
END $$;

ALTER TABLE transactions
ADD CONSTRAINT transactions_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;
