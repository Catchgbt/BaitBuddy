create extension if not exists "uuid-ossp";

create table if not exists catches (
  id          uuid primary key default uuid_generate_v4(),
  created_by  text not null,
  species     text,
  length_cm   numeric(6,2),
  weight_kg   numeric(6,3),
  bait_used   text,
  catch_time  timestamptz,
  spot_id     uuid,
  photo_url   text,
  notes       text,
  is_released boolean default false,
  created_at  timestamptz default now()
);

create table if not exists spots (
  id          uuid primary key default uuid_generate_v4(),
  created_by  text not null,
  name        text not null,
  latitude    numeric(10,7),
  longitude   numeric(10,7),
  water_type  text,
  notes       text,
  photo_url   text,
  created_at  timestamptz default now()
);

create table if not exists rule_entries (
  id          uuid primary key default uuid_generate_v4(),
  fish        text not null,
  region      text,
  closed_from date,
  closed_to   date,
  min_size_cm numeric(5,1),
  created_at  timestamptz default now()
);

create table if not exists competitions (
  id               uuid primary key default uuid_generate_v4(),
  title            text not null,
  description      text,
  target_species   text,
  start_date       timestamptz,
  end_date         timestamptz,
  is_active        boolean default true,
  created_at       timestamptz default now()
);

create table if not exists voting_submissions (
  id             uuid primary key default uuid_generate_v4(),
  competition_id uuid,
  user_id        text not null,
  created_by     text,
  photo_url      text,
  species        text,
  length_cm      numeric(6,2),
  catch_time     timestamptz,
  community_likes integer default 0,
  total_score    numeric(8,2) default 0,
  created_at     timestamptz default now()
);

create table if not exists voting_likes (
  id            uuid primary key default uuid_generate_v4(),
  submission_id uuid not null,
  user_id       text not null,
  created_at    timestamptz default now(),
  unique(submission_id, user_id)
);

create table if not exists premium_wallets (
  id       uuid primary key default uuid_generate_v4(),
  user_id  text not null unique,
  credits  integer default 0,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────────────
-- EVENT SYSTEM TABLES
-- ─────────────────────────────────────────────────────────────────────────────────

-- Event-Templates (vordefinierte Wettbewerbe)
create table if not exists event_templates (
  id uuid primary key default uuid_generate_v4(),
  template_id text unique not null,
  name text not null,
  description text,
  icon text,
  duration_days integer default 14,
  scoring_method text default 'points',
  target_species text,
  base_points integer default 100,
  max_participants integer,
  requires_photo boolean default false,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Erweiterte Event/Competitions-Tabelle
create table if not exists events (
  id uuid primary key default uuid_generate_v4(),
  template_id text,
  name text not null,
  description text,
  event_type text default 'custom',
  created_by text not null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  status text default 'active',
  scoring_method text default 'points',
  target_species text,
  base_points integer default 100,
  prize_description text,
  requires_approval boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Event-Einladungen
create table if not exists event_invitations (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  inviter_id text not null,
  invitee_id text not null,
  status text default 'pending',
  sent_at timestamptz default now(),
  accepted_at timestamptz,
  unique(event_id, invitee_id)
);

-- Event-Teilnehmer mit Punkte-Tracking
create table if not exists event_participants (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  user_id text not null,
  joined_at timestamptz default now(),
  submission_count integer default 0,
  total_points numeric(10,2) default 0,
  is_winner boolean default false,
  unique(event_id, user_id)
);

-- Event-Einreichungen (Fänge) mit Punkte-Berechnung
create table if not exists event_submissions (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  user_id text not null,
  species text,
  length_cm numeric(6,2),
  weight_kg numeric(6,3),
  photo_url text,
  catch_time timestamptz,
  community_likes integer default 0,
  calculated_points numeric(8,2) default 0,
  points_breakdown jsonb default '{}',
  submitted_at timestamptz default now(),
  verified boolean default true
);

-- Monatliches Leaderboard (aggregiert automatisch)
create table if not exists monthly_leaderboards (
  id uuid primary key default uuid_generate_v4(),
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
  unique(year, month, user_id)
);

-- Automatische Reward-Aktivierungen
create table if not exists reward_activations (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null unique,
  leaderboard_id uuid not null references monthly_leaderboards(id),
  plan_id text default 'basic',
  duration_days integer default 30,
  activated_at timestamptz default now(),
  expires_at timestamptz not null,
  status text default 'active',
  metadata jsonb default '{}'
);

-- Event-Punkte-Konfiguration
create table if not exists event_point_configs (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade,
  template_id text,
  base_points integer default 100,
  length_bonus_per_cm numeric(5,2) default 5.0,
  species_bonus jsonb default '{}',
  first_place_bonus integer default 500,
  second_place_bonus integer default 300,
  third_place_bonus integer default 100,
  like_point_multiplier numeric(3,2) default 1.0,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────────────
-- FEHLENDE TABELLEN (für Community, Clans, Support, Gear, Lizenzen)
-- ─────────────────────────────────────────────────────────────────────────────────

create table if not exists clans (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  founder_id text not null,
  founded_at timestamptz default now(),
  is_active boolean default true
);

create table if not exists clan_members (
  id uuid primary key default uuid_generate_v4(),
  clan_id uuid not null references clans(id) on delete cascade,
  user_id text not null,
  role text default 'member',
  joined_at timestamptz default now(),
  unique(clan_id, user_id)
);

create table if not exists community_posts (
  id uuid primary key default uuid_generate_v4(),
  author_id text not null,
  title text not null,
  content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists community_comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references community_posts(id) on delete cascade,
  author_id text not null,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists post_likes (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references community_posts(id) on delete cascade,
  user_id text not null,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

create table if not exists support_tickets (
  id uuid primary key default uuid_generate_v4(),
  user_email text not null,
  subject text not null,
  message text not null,
  status text default 'open',
  priority text default 'normal',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists gear (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  type text not null,
  name text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists fishing_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  trip_name text,
  location text,
  planned_date date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists licenses (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  license_type text not null,
  number text,
  issue_date date,
  expiry_date date,
  created_at timestamptz default now()
);

create table if not exists exam_questions (
  id uuid primary key default uuid_generate_v4(),
  category text not null,
  question text not null,
  options jsonb not null,
  correct_answer integer,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────────────
-- RLS (alle Tabellen)
-- ─────────────────────────────────────────────────────────────────────────────────
alter table catches enable row level security;
alter table spots enable row level security;
alter table event_invitations enable row level security;
alter table reward_activations enable row level security;
alter table events enable row level security;
alter table event_participants enable row level security;
alter table event_submissions enable row level security;
alter table monthly_leaderboards enable row level security;
alter table premium_wallets enable row level security;
alter table voting_submissions enable row level security;
alter table clan_members enable row level security;
alter table community_posts enable row level security;
alter table community_comments enable row level security;
alter table support_tickets enable row level security;
alter table gear enable row level security;
alter table fishing_plans enable row level security;
alter table licenses enable row level security;

create policy "own_catches" on catches for all using (created_by = auth.jwt()->>'email');
create policy "own_spots" on spots for all using (created_by = auth.jwt()->>'email');
create policy "own_invitations" on event_invitations for all using (
  invitee_id = auth.jwt()->>'email' or inviter_id = auth.jwt()->>'email'
);
create policy "own_rewards" on reward_activations for select using (user_id = auth.jwt()->>'email');
create policy "public_events_read" on events for select using (true);
create policy "own_events" on events for update using (created_by = auth.jwt()->>'email');
create policy "own_event_submissions" on event_submissions for all using (user_id = auth.jwt()->>'email');
create policy "public_monthly_leaderboard" on monthly_leaderboards for select using (true);
create policy "own_premium_wallet" on premium_wallets for select using (user_id = auth.jwt()->>'email');
create policy "public_voting" on voting_submissions for select using (true);
create policy "own_clan_membership" on clan_members for select using (user_id = auth.jwt()->>'email');
create policy "public_community_posts" on community_posts for select using (true);
create policy "own_comments" on community_comments for all using (author_id = auth.jwt()->>'email');
create policy "own_support_tickets" on support_tickets for select using (user_email = auth.jwt()->>'email');
create policy "own_gear" on gear for all using (user_id = auth.jwt()->>'email');
create policy "own_fishing_plans" on fishing_plans for all using (user_id = auth.jwt()->>'email');
create policy "own_licenses" on licenses for all using (user_id = auth.jwt()->>'email');

-- ─────────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────────
create index if not exists idx_catches_user on catches(created_by);
create index if not exists idx_catches_time on catches(catch_time desc);
create index if not exists idx_spots_user on spots(created_by);
create index if not exists idx_events_status on events(status);
create index if not exists idx_events_dates on events(start_date, end_date);
create index if not exists idx_events_active on events(is_active, status);
create index if not exists idx_event_participants_event on event_participants(event_id);
create index if not exists idx_event_participants_user on event_participants(user_id);
create index if not exists idx_event_submissions_event on event_submissions(event_id);
create index if not exists idx_event_submissions_user on event_submissions(user_id);
create index if not exists idx_monthly_leaderboards_period on monthly_leaderboards(year, month);
create index if not exists idx_monthly_leaderboards_user on monthly_leaderboards(user_id, year, month);
create index if not exists idx_event_invitations_invitee on event_invitations(invitee_id, status);
create index if not exists idx_event_invitations_event on event_invitations(event_id);
