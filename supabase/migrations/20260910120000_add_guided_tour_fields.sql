-- Add Guided Tour tracking fields to users table
-- Supports dynamic tutorial progression based on user_level

alter table public.users
  add column if not exists user_level text default 'beginner' check (user_level in ('beginner', 'experienced', 'professional')),
  add column if not exists tutorial_completed boolean default false,
  add column if not exists guided_tour_step integer default 0;

comment on column public.users.user_level is 'User skill level: beginner, experienced, or professional. Controls feature visibility and tutorial content.';
comment on column public.users.tutorial_completed is 'Whether the user has completed the full guided tour after first login.';
comment on column public.users.guided_tour_step is 'Current step in the guided tour (for resuming interrupted tours).';
