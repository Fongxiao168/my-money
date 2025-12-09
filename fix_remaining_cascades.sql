-- Fix Support Tickets (Cascade Delete)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'support_tickets_user_id_fkey') THEN
    ALTER TABLE support_tickets DROP CONSTRAINT support_tickets_user_id_fkey;
  END IF;
END $$;
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Fix Ticket Messages (Cascade Delete)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ticket_messages_sender_id_fkey') THEN
    ALTER TABLE ticket_messages DROP CONSTRAINT ticket_messages_sender_id_fkey;
  END IF;
END $$;
ALTER TABLE ticket_messages ADD CONSTRAINT ticket_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Fix Announcements (Set Null - keep announcement but remove author link)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'announcements_created_by_fkey') THEN
    ALTER TABLE announcements DROP CONSTRAINT announcements_created_by_fkey;
  END IF;
END $$;
ALTER TABLE announcements ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Fix Admin Logs (Set Null - keep log history)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'admin_logs_admin_id_fkey') THEN
    ALTER TABLE admin_logs DROP CONSTRAINT admin_logs_admin_id_fkey;
  END IF;
END $$;
ALTER TABLE admin_logs ADD CONSTRAINT admin_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Fix System Settings (Set Null)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'system_settings_updated_by_fkey') THEN
    ALTER TABLE system_settings DROP CONSTRAINT system_settings_updated_by_fkey;
  END IF;
END $$;
ALTER TABLE system_settings ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Fix Chat Messages (Sender ID) - Just to be safe
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chat_messages_sender_id_fkey') THEN
    ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_sender_id_fkey;
  END IF;
END $$;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
