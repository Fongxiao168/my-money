-- FIX DUPLICATE ACCOUNTS SCRIPT
-- This script merges duplicate accounts (same name) for each user.
-- It moves transactions to the oldest account and deletes the newer duplicates.

DO $$
DECLARE
    r RECORD;
    duplicate RECORD;
    original_id UUID;
BEGIN
    -- Loop through all users and their duplicate account names
    FOR r IN 
        SELECT user_id, name, COUNT(*)
        FROM accounts
        GROUP BY user_id, name
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'Processing duplicates for user % account %', r.user_id, r.name;

        -- Find the ID of the OLDEST account (this will be the one we keep)
        SELECT id INTO original_id
        FROM accounts
        WHERE user_id = r.user_id AND name = r.name
        ORDER BY created_at ASC
        LIMIT 1;

        -- Loop through the NEWER duplicates (to be deleted)
        FOR duplicate IN
            SELECT id
            FROM accounts
            WHERE user_id = r.user_id AND name = r.name AND id != original_id
        LOOP
            RAISE NOTICE 'Merging account % into %', duplicate.id, original_id;

            -- 1. Move transactions (outgoing)
            UPDATE transactions
            SET account_id = original_id
            WHERE account_id = duplicate.id;

            -- 2. Move transactions (incoming/transfers)
            UPDATE transactions
            SET to_account_id = original_id
            WHERE to_account_id = duplicate.id;

            -- 3. Delete the duplicate account
            DELETE FROM accounts
            WHERE id = duplicate.id;
            
        END LOOP;
    END LOOP;
END $$;

-- 4. Recalculate balances to ensure they are correct after the merge
-- (Reusing logic from recalculate_balances.sql)

UPDATE accounts SET balance = 0;

-- Add income
UPDATE accounts 
SET balance = balance + (
  SELECT COALESCE(SUM(amount), 0)
  FROM transactions 
  WHERE transactions.account_id = accounts.id 
  AND transactions.type = 'income'
);

-- Subtract expenses
UPDATE accounts 
SET balance = balance - (
  SELECT COALESCE(SUM(amount), 0)
  FROM transactions 
  WHERE transactions.account_id = accounts.id 
  AND transactions.type = 'expense'
);

-- Subtract transfers (outgoing)
UPDATE accounts 
SET balance = balance - (
  SELECT COALESCE(SUM(amount), 0)
  FROM transactions 
  WHERE transactions.account_id = accounts.id 
  AND transactions.type = 'transfer'
);

-- Add transfers (incoming)
UPDATE accounts 
SET balance = balance + (
  SELECT COALESCE(SUM(amount), 0)
  FROM transactions 
  WHERE transactions.to_account_id = accounts.id 
  AND transactions.type = 'transfer'
);
