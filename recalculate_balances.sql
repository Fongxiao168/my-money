-- Recalculate account balances based on transactions

-- 1. Reset all balances to 0
UPDATE accounts SET balance = 0;

-- 2. Add income
UPDATE accounts 
SET balance = balance + (
  SELECT COALESCE(SUM(amount), 0)
  FROM transactions 
  WHERE transactions.account_id = accounts.id 
  AND transactions.type = 'income'
);

-- 3. Subtract expenses
UPDATE accounts 
SET balance = balance - (
  SELECT COALESCE(SUM(amount), 0)
  FROM transactions 
  WHERE transactions.account_id = accounts.id 
  AND transactions.type = 'expense'
);

-- 4. Subtract transfers (outgoing)
UPDATE accounts 
SET balance = balance - (
  SELECT COALESCE(SUM(amount), 0)
  FROM transactions 
  WHERE transactions.account_id = accounts.id 
  AND transactions.type = 'transfer'
);

-- 5. Add transfers (incoming)
UPDATE accounts 
SET balance = balance + (
  SELECT COALESCE(SUM(amount), 0)
  FROM transactions 
  WHERE transactions.to_account_id = accounts.id 
  AND transactions.type = 'transfer'
);
