-- Create dashboard_account_notes table
-- Stores text and audio notes linked to user accounts
create table if not exists dashboard_account_notes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     text not null,
  content     text,
  audio_data  text,
  mime_type   text default 'audio/webm',
  duration_ms integer,
  title       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Create index for faster queries by user_id
create index if not exists idx_dashboard_account_notes_user_id
  on dashboard_account_notes(user_id);

-- Create index for sorting by created_at
create index if not exists idx_dashboard_account_notes_created_at
  on dashboard_account_notes(user_id, created_at desc);

-- Enable RLS (Row Level Security)
alter table dashboard_account_notes enable row level security;

-- RLS Policy: Users can only see and manage their own notes
create policy "Users can view their own notes"
  on dashboard_account_notes for select
  using (auth.uid()::text = user_id);

create policy "Users can create their own notes"
  on dashboard_account_notes for insert
  with check (auth.uid()::text = user_id);

create policy "Users can update their own notes"
  on dashboard_account_notes for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy "Users can delete their own notes"
  on dashboard_account_notes for delete
  using (auth.uid()::text = user_id);
