-- BaitBuddy: vollstaendiges public-Schema, 1:1 aus dem Supabase-Projekt
-- baitbuddy-prod (yejiqenqdzupauddjcyi) am 2026-09-05 ausgelesen.
--
-- Wird vom supabase/postgres-Image beim ERSTEN Start automatisch ausgefuehrt
-- (Mount nach /docker-entrypoint-initdb.d/migrations/). Danach nur noch ueber
-- supabase/migrations/*.sql erweitern.
--
-- Enthalten: 54 Tabellen, Primary/Foreign Keys, Unique- und Check-Constraints,
-- Indizes, RLS-Policies, Trigger-Funktion set_trial_premium() inkl. Trigger
-- auf auth.users. Storage-Buckets liegen in 91-baitbuddy-storage.sql.

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text default 'supabase_auth',
  full_name text default '',
  avatar_url text,
  is_admin boolean default false,
  plan text default 'free',
  plan_expires_at timestamptz,
  demo_mode boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
comment on table public.users is 'Profile-Tabelle; id = Supabase auth.users UUID';

create table if not exists public.catches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  species text,
  length_cm numeric,
  weight_kg numeric,
  bait_used text,
  catch_time timestamptz default now(),
  latitude double precision,
  longitude double precision,
  spot_name text,
  water_body text,
  weather jsonb,
  photo_url text,
  notes text,
  is_released boolean default false,
  created_at timestamptz default now(),
  created_by text,
  spot_id uuid
);

create table if not exists public.spot_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists public.spots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  name text not null,
  latitude double precision,
  longitude double precision,
  water_type text,
  is_favorite boolean default false,
  is_public boolean default false,
  notes text,
  photo_url text,
  group_id uuid,
  created_at timestamptz default now(),
  created_by text,
  depth_meters numeric,
  constraint fk_spots_group foreign key (group_id) references public.spot_groups(id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  text text not null,
  photo_url text,
  catch_id uuid,
  likes integer default 0,
  created_at timestamptz default now(),
  constraint fk_posts_catch foreign key (catch_id) references public.catches(id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  post_id uuid references public.posts(id),
  text text not null,
  created_at timestamptz default now()
);

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text,
  description text,
  prize text,
  start_date timestamptz,
  end_date timestamptz,
  is_active boolean default true,
  created_by text,
  created_at timestamptz default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  target_species text,
  scoring_type text,
  created_by text,
  is_active boolean default true,
  created_at timestamptz default now(),
  template_id text,
  name text,
  event_type text default 'custom',
  start_date timestamptz,
  end_date timestamptz,
  status text default 'active',
  scoring_method text default 'points',
  base_points integer default 100,
  prize_description text,
  requires_approval boolean default false,
  updated_at timestamptz default now(),
  visibility text not null default 'public',
  constraint events_visibility_check check (visibility = any (array['public'::text, 'friends'::text]))
);

create table if not exists public.voting_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  catch_id uuid,
  photo_url text,
  title text,
  description text,
  event_id uuid,
  likes integer default 0,
  created_at timestamptz default now(),
  created_by text,
  competition_id uuid,
  species text,
  length_cm numeric,
  catch_time timestamptz,
  total_score numeric default 0,
  constraint fk_voting_submissions_catch foreign key (catch_id) references public.catches(id),
  constraint fk_voting_submissions_event foreign key (event_id) references public.events(id)
);

create table if not exists public.voting_likes (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  submission_id uuid references public.voting_submissions(id),
  created_at timestamptz default now(),
  user_email text,
  constraint voting_likes_submission_user_unique unique (submission_id, user_id),
  constraint voting_likes_user_id_submission_id_key unique (user_id, submission_id)
);

create table if not exists public.clans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  logo_url text,
  owner_id uuid,
  created_at timestamptz default now(),
  created_by text,
  members jsonb default '[]'::jsonb,
  competition_id uuid
);

create table if not exists public.clan_members (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans(id),
  user_id text,
  role text default 'member',
  created_at timestamptz default now(),
  constraint clan_members_clan_id_user_id_key unique (clan_id, user_id)
);

create table if not exists public.clan_catches (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans(id),
  user_id uuid references public.users(id),
  catch_id uuid,
  points numeric default 0,
  created_at timestamptz default now(),
  constraint fk_clan_catches_catch foreign key (catch_id) references public.catches(id)
);

create table if not exists public.event_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id),
  user_id uuid references public.users(id),
  catch_id uuid,
  score numeric default 0,
  created_at timestamptz default now(),
  constraint fk_event_entries_catch foreign key (catch_id) references public.catches(id)
);

create table if not exists public.rule_entries (
  id uuid primary key default gen_random_uuid(),
  fish text not null,
  region text,
  bundesland text,
  closed_from date,
  closed_to date,
  min_size_cm numeric,
  notes text,
  source text,
  created_at timestamptz default now()
);

create table if not exists public.fishing_clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  latitude double precision,
  longitude double precision,
  region text,
  contact text,
  website text,
  created_at timestamptz default now()
);

create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  type text,
  valid_from date,
  valid_until date,
  number text,
  issuer text,
  notes text,
  created_at timestamptz default now(),
  photo_url text,
  user_email text
);

create table if not exists public.fishing_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  title text,
  target_fish text,
  spot_info jsonb,
  steps jsonb,
  planned_date timestamptz,
  is_active boolean default false,
  created_at timestamptz default now(),
  created_by text,
  details jsonb default '{}'::jsonb
);

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text,
  created_at timestamptz default now(),
  is_active boolean default true,
  user_email text,
  user_name text,
  last_activity timestamptz default now(),
  created_by text
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  session_id uuid,
  role text,
  content text,
  created_at timestamptz default now(),
  context text,
  created_by text,
  user_email text
);

create table if not exists public.water_analysis_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  latitude double precision,
  longitude double precision,
  spot_name text,
  analysis_data jsonb,
  created_at timestamptz default now(),
  user_email text
);

create table if not exists public.bathymetric_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  spot_id uuid,
  name text,
  map_data jsonb,
  created_at timestamptz default now(),
  user_email text
);

create table if not exists public.depth_data_points (
  id uuid primary key default gen_random_uuid(),
  map_id uuid references public.bathymetric_maps(id),
  user_id uuid,
  latitude double precision,
  longitude double precision,
  depth_m numeric,
  created_at timestamptz default now(),
  user_email text
);

create table if not exists public.premium_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.users(id),
  credits integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.premium_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  event_type text,
  plan text,
  stripe_session_id text,
  created_at timestamptz default now()
);

create table if not exists public.usage_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  feature text,
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_sec integer,
  created_at timestamptz default now(),
  session_id text,
  feature_id text,
  status text,
  last_heartbeat timestamptz,
  stopped_at timestamptz,
  user_email text
);

create table if not exists public.gear_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text,
  category text,
  brand text,
  model text,
  condition text,
  price numeric,
  description text,
  photo_url text,
  is_for_sale boolean default false,
  created_at timestamptz default now(),
  title text,
  price_cents integer,
  currency text default 'EUR',
  negotiable boolean default false,
  location text,
  shipping_available boolean default false,
  image_urls jsonb default '[]'::jsonb,
  is_active boolean default true,
  seller_email text,
  created_date timestamptz default now(),
  user_email text
);

create table if not exists public.bait_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text,
  ingredients jsonb,
  instructions text,
  target_fish text,
  is_public boolean default false,
  created_at timestamptz default now(),
  category text,
  total_percentage numeric,
  attractiveness_score numeric,
  estimated_cost numeric,
  ai_generated boolean default false,
  ai_analysis text,
  created_date timestamptz default now(),
  user_email text
);

create table if not exists public.function_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  function_name text,
  rating integer,
  feedback text,
  created_at timestamptz default now(),
  comment text,
  user_email text,
  created_date timestamptz default now()
);

create table if not exists public.water_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  spot_id uuid,
  rating integer,
  review text,
  created_at timestamptz default now(),
  user_email text
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  text text,
  photo_url text,
  likes integer default 0,
  reported boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid,
  user_id text,
  created_at timestamptz default now(),
  constraint post_likes_post_id_user_id_key unique (post_id, user_id)
);

create table if not exists public.exam_questions (
  id bigserial primary key,
  question text not null,
  answers text[] not null,
  correct_answer_index integer not null,
  explanation text,
  category varchar(50) not null,
  difficulty varchar(20) not null,
  region varchar(100) not null,
  created_at timestamptz default current_timestamp,
  updated_at timestamptz default current_timestamp
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  category text not null default 'sonstiges',
  message text not null,
  user_email text not null,
  user_name text not null,
  status text not null default 'offen',
  admin_response text,
  created_date timestamptz default current_timestamp,
  updated_date timestamptz default current_timestamp
);

create table if not exists public.event_templates (
  id uuid primary key default gen_random_uuid(),
  template_id text not null unique,
  name text not null,
  description text,
  icon text default '🏆',
  duration_days integer default 14,
  target_species text,
  scoring_method text default 'points',
  base_points integer default 100,
  is_active boolean default true,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  text text not null,
  created_by text,
  created_at timestamptz default now()
);

-- Gear-Subsystem: generische JSONB-Entitaeten (userEntities.js / gear.js)
create table if not exists public.gear_categories (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_date timestamptz default now()
);

create table if not exists public.gear_items (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_date timestamptz default now()
);

create table if not exists public.loadouts (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_date timestamptz default now()
);

create table if not exists public.pack_sessions (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_date timestamptz default now()
);

create table if not exists public.gear_rules (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_date timestamptz default now()
);

create table if not exists public.live_trips (
  id text primary key,
  user_id uuid,
  user_email text,
  trip jsonb,
  created_at timestamptz default now()
);

create table if not exists public.event_invitations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id),
  inviter_id text not null,
  invitee_id text not null,
  status text default 'pending',
  sent_at timestamptz default now(),
  accepted_at timestamptz,
  constraint event_invitations_event_id_invitee_id_key unique (event_id, invitee_id)
);

create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id),
  user_id text not null,
  joined_at timestamptz default now(),
  submission_count integer default 0,
  total_points numeric(10,2) default 0,
  is_winner boolean default false,
  constraint event_participants_event_id_user_id_key unique (event_id, user_id)
);

create table if not exists public.event_submissions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id),
  user_id text not null,
  species text,
  length_cm numeric(6,2),
  weight_kg numeric(6,3),
  photo_url text,
  catch_time timestamptz,
  community_likes integer default 0,
  calculated_points numeric(8,2) default 0,
  points_breakdown jsonb default '{}'::jsonb,
  submitted_at timestamptz default now(),
  verified boolean default true
);

create table if not exists public.monthly_leaderboards (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  month integer not null,
  user_id text not null,
  total_points numeric(10,2) default 0,
  event_count integer default 0,
  rank integer,
  reward_status text default 'pending',
  reward_type text default 'basic_plan_1month',
  claimed_at timestamptz,
  expires_at timestamptz,
  constraint monthly_leaderboards_year_month_user_id_key unique (year, month, user_id)
);

create table if not exists public.reward_activations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  leaderboard_id uuid not null references public.monthly_leaderboards(id),
  plan_id text default 'basic',
  duration_days integer default 30,
  activated_at timestamptz default now(),
  expires_at timestamptz not null,
  status text default 'active',
  metadata jsonb default '{}'::jsonb
);

create table if not exists public.event_point_configs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id),
  template_id text,
  base_points integer default 100,
  length_bonus_per_cm numeric(5,2) default 5.0,
  species_bonus jsonb default '{}'::jsonb,
  first_place_bonus integer default 500,
  second_place_bonus integer default 300,
  third_place_bonus integer default 100,
  like_point_multiplier numeric(3,2) default 1.0,
  created_at timestamptz default now()
);

create table if not exists public.water_scenes (
  id uuid primary key default gen_random_uuid(),
  created_by text not null,
  spot_id uuid references public.spots(id),
  latitude double precision not null,
  longitude double precision not null,
  quality text not null default 'med',
  sample_count integer not null default 0,
  temperature_profile jsonb,
  size_bytes integer not null default 0,
  source text not null default 'open-meteo-marine',
  captured_at timestamptz not null default now(),
  constraint water_scenes_quality_check check (quality = any (array['low'::text, 'med'::text, 'high'::text, 'ultra'::text]))
);

create table if not exists public.user_backups (
  id uuid primary key default gen_random_uuid(),
  created_by text not null,
  kind text not null default 'manual',
  payload jsonb not null,
  size_bytes integer not null default 0,
  catches_count integer not null default 0,
  spots_count integer not null default 0,
  water_scenes_count integer not null default 0,
  bathymetric_maps_count integer not null default 0,
  note text,
  created_at timestamptz not null default now(),
  constraint user_backups_kind_check check (kind = any (array['manual'::text, 'auto'::text]))
);

create table if not exists public.social_media_shares (
  id uuid primary key default uuid_generate_v4(),
  catch_id uuid not null references public.catches(id),
  platform text not null,
  message text,
  include_photo boolean default true,
  photo_url text,
  share_link text,
  created_by text not null,
  created_at timestamptz default now()
);

create table if not exists public.dashboard_account_notes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  content text,
  audio_data text,
  mime_type text default 'audio/webm',
  duration_ms integer,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_referral_codes (
  code text primary key,
  user_id uuid not null unique,
  created_at timestamptz default now()
);

create table if not exists public.referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_user_id uuid not null,
  referred_user_id uuid not null unique,
  referral_code text not null,
  reward_days integer not null default 7,
  reward_plan_id text not null default 'elite',
  reward_granted_at timestamptz default now(),
  created_at timestamptz default now(),
  basic_reward_granted boolean not null default false
);

-- ---------------------------------------------------------------------------
-- Indizes (ohne die durch PK/UNIQUE implizit erzeugten)
-- ---------------------------------------------------------------------------

create index if not exists idx_catches_created_by on public.catches (created_by);
create index if not exists idx_catches_user on public.catches (user_id, catch_time desc);
create index if not exists idx_clan_members_clan on public.clan_members (clan_id);
create index if not exists idx_clan_members_user_id on public.clan_members (user_id);
create index if not exists idx_comments_post on public.comments (post_id);
create index if not exists community_comments_post_id_idx on public.community_comments (post_id);
create index if not exists idx_dashboard_account_notes_created_at on public.dashboard_account_notes (user_id, created_at desc);
create index if not exists idx_dashboard_account_notes_user_id on public.dashboard_account_notes (user_id);
create index if not exists idx_depth_points_map on public.depth_data_points (map_id);
create index if not exists idx_depth_points_user on public.depth_data_points (user_id);
create index if not exists idx_event_entries_event on public.event_entries (event_id, score desc);
create index if not exists idx_event_invitations_invitee on public.event_invitations (invitee_id, status);
create index if not exists idx_event_participants_event on public.event_participants (event_id);
create index if not exists idx_event_participants_user on public.event_participants (user_id);
create index if not exists idx_event_point_configs_event on public.event_point_configs (event_id);
create index if not exists idx_event_submissions_event on public.event_submissions (event_id);
create index if not exists idx_event_submissions_user on public.event_submissions (user_id);
create index if not exists idx_events_active on public.events (is_active, status);
create index if not exists idx_events_dates on public.events (start_date, end_date);
create index if not exists idx_events_status on public.events (status);
create index if not exists idx_events_visibility on public.events (visibility);
create index if not exists exam_questions_category_idx on public.exam_questions (category);
create index if not exists exam_questions_difficulty_idx on public.exam_questions (difficulty);
create index if not exists exam_questions_region_idx on public.exam_questions (region);
create index if not exists idx_fishing_plans_created_by on public.fishing_plans (created_by);
create index if not exists idx_plans_user on public.fishing_plans (user_id);
create index if not exists gear_categories_created_by_idx on public.gear_categories (created_by);
create index if not exists gear_items_created_by_idx on public.gear_items (created_by);
create index if not exists idx_gear_user on public.gear_listings (user_id);
create index if not exists gear_rules_created_by_idx on public.gear_rules (created_by);
create index if not exists idx_licenses_user on public.licenses (user_id);
create index if not exists idx_live_trips_user on public.live_trips (user_id);
create index if not exists loadouts_created_by_idx on public.loadouts (created_by);
create index if not exists idx_monthly_leaderboards_period on public.monthly_leaderboards (year, month);
create index if not exists idx_monthly_leaderboards_user on public.monthly_leaderboards (user_id, year, month);
create index if not exists pack_sessions_created_by_idx on public.pack_sessions (created_by);
create index if not exists idx_posts_created on public.posts (created_at desc);
create index if not exists idx_referrals_code on public.referrals (referral_code);
create index if not exists idx_referrals_referrer on public.referrals (referrer_user_id);
create index if not exists idx_rules_dates on public.rule_entries (closed_from, closed_to);
create index if not exists idx_social_media_shares_catch on public.social_media_shares (catch_id);
create index if not exists idx_social_media_shares_platform on public.social_media_shares (platform);
create index if not exists idx_social_media_shares_user on public.social_media_shares (created_by);
create index if not exists idx_spots_user on public.spots (user_id);
create index if not exists idx_usage_user on public.usage_sessions (user_id);
create index if not exists user_backups_created_at_idx on public.user_backups (created_at desc);
create index if not exists user_backups_created_by_idx on public.user_backups (created_by);
create index if not exists idx_user_referral_codes_user on public.user_referral_codes (user_id);
create index if not exists idx_voting_submissions_competition_id on public.voting_submissions (competition_id);
create index if not exists idx_water_hist_user on public.water_analysis_history (user_id);
create index if not exists water_scenes_captured_at_idx on public.water_scenes (captured_at desc);
create index if not exists water_scenes_created_by_idx on public.water_scenes (created_by);

-- ---------------------------------------------------------------------------
-- Row Level Security: auf ALLEN Tabellen aktiv. Das Backend schreibt mit
-- service_role (umgeht RLS); die Policies gelten nur fuer anon/authenticated.
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy "Users can create their own notes" on public.dashboard_account_notes for insert with check ((auth.uid())::text = user_id);
create policy "Users can delete their own notes" on public.dashboard_account_notes for delete using ((auth.uid())::text = user_id);
create policy "Users can update their own notes" on public.dashboard_account_notes for update using ((auth.uid())::text = user_id) with check ((auth.uid())::text = user_id);
create policy "Users can view their own notes" on public.dashboard_account_notes for select using ((auth.uid())::text = user_id);

create policy own_invitations on public.event_invitations for all using (invitee_id = (auth.jwt() ->> 'email') or inviter_id = (auth.jwt() ->> 'email'));
create policy public_event_participants on public.event_participants for select using (true);
create policy public_event_point_configs on public.event_point_configs for select using (true);
create policy own_event_submissions on public.event_submissions for all using (user_id = (auth.jwt() ->> 'email'));
create policy event_templates_read on public.event_templates for select to anon, authenticated using (true);
create policy exam_questions_allow_read on public.exam_questions for select using (true);
create policy public_monthly_leaderboard on public.monthly_leaderboards for select using (true);
create policy own_referrals_read on public.referrals for select using (auth.uid() = referrer_user_id or auth.uid() = referred_user_id);
create policy own_rewards on public.reward_activations for select using (user_id = (auth.jwt() ->> 'email'));
create policy "Allow all to read their own tickets" on public.support_tickets for select using (true);
create policy user_backups_owner_modify on public.user_backups for all using (created_by = (auth.jwt() ->> 'email')) with check (created_by = (auth.jwt() ->> 'email'));
create policy user_backups_owner_select on public.user_backups for select using (created_by = (auth.jwt() ->> 'email'));
create policy own_referral_code_read on public.user_referral_codes for select using (auth.uid() = user_id);
create policy water_scenes_owner_modify on public.water_scenes for all using (created_by = (auth.jwt() ->> 'email')) with check (created_by = (auth.jwt() ->> 'email'));
create policy water_scenes_owner_select on public.water_scenes for select using (created_by = (auth.jwt() ->> 'email'));

-- ---------------------------------------------------------------------------
-- 24h-Elite-Trial fuer neue Nutzer (Trigger auf auth.users)
-- ---------------------------------------------------------------------------

create or replace function public.set_trial_premium()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object(
         'premium_plan_id', 'elite',
         'premium_expires_at', to_char((now() + interval '24 hours') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
         'premium_trial', true
       );
  return new;
end;
$function$;

revoke execute on function public.set_trial_premium() from anon, authenticated, public;

drop trigger if exists trg_set_trial_premium on auth.users;
create trigger trg_set_trial_premium
  before insert on auth.users
  for each row execute function public.set_trial_premium();

-- ---------------------------------------------------------------------------
-- Grants fuer die PostgREST-Rollen (wie in der Cloud ueblich)
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
