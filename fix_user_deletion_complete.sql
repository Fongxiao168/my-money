-- 1. Fix Foreign Keys for Core Tables
-- Accounts
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'accounts_user_id_fkey') THEN
    ALTER TABLE accounts DROP CONSTRAINT accounts_user_id_fkey;
  END IF;
END $$;
ALTER TABLE accounts ADD CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Categories
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'categories_user_id_fkey') THEN
    ALTER TABLE categories DROP CONSTRAINT categories_user_id_fkey;
  END IF;
END $$;
ALTER TABLE categories ADD CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Transactions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'transactions_user_id_fkey') THEN
    ALTER TABLE transactions DROP CONSTRAINT transactions_user_id_fkey;
  END IF;
END $$;
ALTER TABLE transactions ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Fix Foreign Keys for Feature Tables (just in case)
-- Payment Requests
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payment_requests_user_id_fkey') THEN
    ALTER TABLE payment_requests DROP CONSTRAINT payment_requests_user_id_fkey;
  END IF;
END $$;
ALTER TABLE payment_requests ADD CONSTRAINT payment_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- User Activity Logs (references profiles)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_activity_logs_user_id_fkey') THEN
    ALTER TABLE user_activity_logs DROP CONSTRAINT user_activity_logs_user_id_fkey;
  END IF;
END $$;
ALTER TABLE user_activity_logs ADD CONSTRAINT user_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;


-- 3. Re-create the Delete Function
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
  -- This will automatically cascade to all tables with ON DELETE CASCADE
  delete from auth.users where id = target_user_id;
end;
$$;

-- 4. Grant Execute Permission
GRANT EXECUTE ON FUNCTION delete_user_by_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_by_admin(uuid) TO service_role;
