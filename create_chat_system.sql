-- Create chat_sessions table
create table if not exists chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  status text default 'active' check (status in ('active', 'ended')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Fix FK to allow joining with profiles
-- This is critical for the admin dashboard to fetch user details
do $$
begin
  if exists (select 1 from information_schema.table_constraints where constraint_name = 'chat_sessions_user_id_fkey') then
    alter table chat_sessions drop constraint chat_sessions_user_id_fkey;
  end if;
end $$;

alter table chat_sessions
add constraint chat_sessions_user_id_fkey
foreign key (user_id)
references profiles(id)
on delete cascade;

-- Create chat_messages table
create table if not exists chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references chat_sessions(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  is_admin boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

-- Policies for chat_sessions

-- Users can view their own sessions
drop policy if exists "Users can view their own sessions" on chat_sessions;
create policy "Users can view their own sessions"
  on chat_sessions for select
  using (auth.uid() = user_id);

-- Users can insert their own sessions
drop policy if exists "Users can insert their own sessions" on chat_sessions;
create policy "Users can insert their own sessions"
  on chat_sessions for insert
  with check (auth.uid() = user_id);

-- Admins can view all sessions
drop policy if exists "Admins can view all sessions" on chat_sessions;
create policy "Admins can view all sessions"
  on chat_sessions for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can update sessions (to end them)
drop policy if exists "Admins can update sessions" on chat_sessions;
create policy "Admins can update sessions"
  on chat_sessions for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Policies for chat_messages

-- Users can view messages in their sessions
drop policy if exists "Users can view messages in their sessions" on chat_messages;
create policy "Users can view messages in their sessions"
  on chat_messages for select
  using (
    exists (
      select 1 from chat_sessions
      where id = chat_messages.session_id
      and user_id = auth.uid()
    )
  );

-- Users can insert messages in their active sessions
drop policy if exists "Users can insert messages in their active sessions" on chat_messages;
create policy "Users can insert messages in their active sessions"
  on chat_messages for insert
  with check (
    exists (
      select 1 from chat_sessions
      where id = chat_messages.session_id
      and user_id = auth.uid()
      and status = 'active'
    )
  );

-- Admins can view all messages
drop policy if exists "Admins can view all messages" on chat_messages;
create policy "Admins can view all messages"
  on chat_messages for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can insert messages
drop policy if exists "Admins can insert messages" on chat_messages;
create policy "Admins can insert messages"
  on chat_messages for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Enable Realtime
-- We use a DO block to avoid errors if the table is already in the publication
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'chat_sessions') then
    alter publication supabase_realtime add table chat_sessions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'chat_messages') then
    alter publication supabase_realtime add table chat_messages;
  end if;
end;
$$;

-- Function to update session timestamp
create or replace function update_chat_session_timestamp()
returns trigger as $$
begin
  update chat_sessions
  set updated_at = now()
  where id = new.session_id;
  return new;
end;
$$ language plpgsql;

-- Trigger
drop trigger if exists update_session_timestamp on chat_messages;
create trigger update_session_timestamp
after insert on chat_messages
for each row
execute function update_chat_session_timestamp();

-- Create chat_settings table
create table if not exists chat_settings (
  id int primary key default 1 check (id = 1), -- Ensure singleton
  welcome_message text default 'Hello! How can we help you today?',
  is_enabled boolean default true,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default settings if not exists
insert into chat_settings (id, welcome_message)
values (1, 'Hello! How can we help you today?')
on conflict (id) do nothing;

-- Enable RLS
alter table chat_settings enable row level security;

-- Policies for chat_settings
-- Everyone can view settings
drop policy if exists "Everyone can view chat settings" on chat_settings;
create policy "Everyone can view chat settings"
  on chat_settings for select
  using (true);

-- Only admins can update settings
drop policy if exists "Admins can update chat settings" on chat_settings;
create policy "Admins can update chat settings"
  on chat_settings for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Function to send welcome message
create or replace function send_welcome_message()
returns trigger as $$
declare
  welcome_text text;
  is_chat_enabled boolean;
begin
  select welcome_message, is_enabled into welcome_text, is_chat_enabled from chat_settings where id = 1;
  
  if is_chat_enabled and welcome_text is not null then
    -- We use the user's own ID as sender_id because of the FK constraint, 
    -- but mark is_admin=true so it appears as a system message
    insert into chat_messages (session_id, sender_id, content, is_admin)
    values (new.id, new.user_id, welcome_text, true);
  end if;
  return new;
end;
$$ language plpgsql;

-- Trigger for welcome message
drop trigger if exists on_chat_session_created on chat_sessions;
create trigger on_chat_session_created
after insert on chat_sessions
for each row
execute function send_welcome_message();
