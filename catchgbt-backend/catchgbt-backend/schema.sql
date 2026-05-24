-- ============================================================
-- CatchGBT – Supabase PostgreSQL Schema
-- Ausführen in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Erweiterungen
create extension if not exists "uuid-ossp";

-- ── CATCHES ──────────────────────────────────────────────────────────────
create table if not exists catches (
  id          uuid primary key default uuid_generate_v4(),
  created_by  text not null,             -- user email
  species     text,
  length_cm   numeric(6,2),
  weight_kg   numeric(6,3),
  bait_used   text,
  catch_time  timestamptz,
  spot_id     uuid,
  photo_url   text,
  notes       text,
  is_released boolean default false,
  water_temp  numeric(5,2),
  wind_speed  numeric(5,2),
  created_at  timestamptz default now()
);

-- ── SPOTS ─────────────────────────────────────────────────────────────────
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

-- ── RULE ENTRIES (Schonzeiten) ────────────────────────────────────────────
create table if not exists rule_entries (
  id          uuid primary key default uuid_generate_v4(),
  fish        text not null,
  region      text,
  closed_from date,
  closed_to   date,
  min_size_cm numeric(5,1),
  notes       text,
  created_at  timestamptz default now()
);

-- ── FISHING CLUBS ─────────────────────────────────────────────────────────
create table if not exists fishing_clubs (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  category     text default 'club',       -- 'club' | 'spot'
  address      jsonb default '{}',
  coordinates  jsonb,                     -- {lat, lng}
  website      text,
  phone        text,
  email        text,
  source       text default 'database',
  is_validated boolean default false,
  geocoded_at  timestamptz,
  created_at   timestamptz default now(),
  updated_date timestamptz,
  created_date timestamptz default now()
);

-- ── CLANS ─────────────────────────────────────────────────────────────────
create table if not exists clans (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  description       text default '',
  members           text[] default '{}',  -- array of emails
  founder_email     text,
  competition_id    uuid,
  total_event_score numeric default 0,
  total_catches     integer default 0,
  average_size      numeric(6,2) default 0,
  created_at        timestamptz default now()
);

-- ── COMPETITIONS ──────────────────────────────────────────────────────────
create table if not exists competitions (
  id               uuid primary key default uuid_generate_v4(),
  title            text not null,
  description      text,
  competition_type text,
  target_species   text,
  start_date       timestamptz,
  end_date         timestamptz,
  prize            text,
  is_active        boolean default true,
  participants     text[] default '{}',
  submissions      jsonb default '[]',
  created_at       timestamptz default now()
);

-- ── VOTING SUBMISSIONS ────────────────────────────────────────────────────
create table if not exists voting_submissions (
  id                     uuid primary key default uuid_generate_v4(),
  competition_id         uuid,
  catch_id               uuid,
  user_id                text not null,
  photo_url              text,
  species                text,
  length_cm              numeric(6,2),
  catch_time             timestamptz,
  community_likes        integer default 0,
  ai_score               numeric(5,2) default 0,
  ai_analysis            jsonb,
  total_score            numeric(8,2) default 0,
  is_suspicious          boolean default false,
  disqualification_reason text,
  created_by             text,
  created_at             timestamptz default now()
);

-- ── VOTING LIKES ──────────────────────────────────────────────────────────
create table if not exists voting_likes (
  id             uuid primary key default uuid_generate_v4(),
  submission_id  uuid not null,
  user_id        text not null,
  competition_id uuid,
  created_at     timestamptz default now(),
  unique(submission_id, user_id)
);

-- ── CLAN CATCHES ──────────────────────────────────────────────────────────
create table if not exists clan_catches (
  id             uuid primary key default uuid_generate_v4(),
  catch_id       uuid,
  clan_id        uuid,
  user_id        text not null,
  competition_id uuid,
  species        text,
  length_cm      numeric(6,2),
  points_earned  integer default 0,
  catch_time     timestamptz,
  is_validated   boolean default true,
  created_by     text,
  created_at     timestamptz default now()
);

-- ── PREMIUM WALLETS ───────────────────────────────────────────────────────
create table if not exists premium_wallets (
  id                uuid primary key default uuid_generate_v4(),
  user_id           text not null unique,
  purchased_credits integer default 0,
  consumed_credits  integer default 0,
  total_spent_eur   numeric(10,2) default 0,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ── PREMIUM EVENTS ────────────────────────────────────────────────────────
create table if not exists premium_events (
  id             uuid primary key default uuid_generate_v4(),
  user_id        text not null,
  event_type     text,                    -- 'purchase' | 'heartbeat' | 'session_start' | 'session_stop' | 'admin_credit_grant'
  credits_amount integer default 0,
  payload        jsonb default '{}',
  created_at     timestamptz default now()
);

-- ── USAGE SESSIONS ────────────────────────────────────────────────────────
create table if not exists usage_sessions (
  id              uuid primary key default uuid_generate_v4(),
  session_id      text not null unique,
  user_id         text not null,
  feature_id      text,
  started_at      timestamptz default now(),
  stopped_at      timestamptz,
  last_heartbeat  timestamptz,
  billed_credits  integer default 0,
  status          text default 'active',   -- 'active' | 'stopped'
  created_at      timestamptz default now()
);

-- ── WATER ANALYSIS HISTORY ────────────────────────────────────────────────
create table if not exists water_analysis_history (
  id                      uuid primary key default uuid_generate_v4(),
  spot_id                 uuid,
  spot_name               text,
  latitude                numeric(10,7),
  longitude               numeric(10,7),
  temperature             numeric(5,2),
  satellite_sst           numeric(5,2),
  chlorophyll_a           numeric(8,4),
  turbidity_ntu           numeric(8,4),
  algae_risk              text,
  wind_speed              numeric(5,2),
  wind_direction          integer,
  wave_height             numeric(5,2),
  visibility              numeric(5,2),
  quality_score           integer,
  weather_impact          integer,
  weather_condition       text,
  fishing_forecast        text,
  satellite_data_available boolean default false,
  analyzed_at             timestamptz,
  created_by              text,
  created_at              timestamptz default now()
);

-- ── DEPTH DATA POINTS ─────────────────────────────────────────────────────
create table if not exists depth_data_points (
  id               uuid primary key default uuid_generate_v4(),
  latitude         numeric(10,7) not null,
  longitude        numeric(10,7) not null,
  depth_meters     numeric(8,2) not null,
  measured_at      timestamptz,
  device_type      text default 'echolot',
  water_body_name  text,
  is_public        boolean default true,
  quality_score    integer default 7,
  created_by       text,
  created_at       timestamptz default now()
);

-- ── BATHYMETRIC MAPS ──────────────────────────────────────────────────────
create table if not exists bathymetric_maps (
  id                  uuid primary key default uuid_generate_v4(),
  name                text,
  water_body_name     text,
  bounds              jsonb,
  center_lat          numeric(10,7),
  center_lng          numeric(10,7),
  data_points_count   integer default 0,
  contributors_count  integer default 0,
  max_depth           numeric(8,2),
  avg_depth           numeric(8,2),
  hotspots            jsonb default '[]',
  ai_analysis         text,
  status              text default 'pending',  -- 'pending' | 'processing' | 'ready'
  generated_at        timestamptz,
  created_by          text,
  created_at          timestamptz default now()
);

-- ── APP EVENTS (für Leaderboard) ──────────────────────────────────────────
create table if not exists app_events (
  id          uuid primary key default uuid_generate_v4(),
  title       text,
  start_date  timestamptz,
  end_date    timestamptz,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- ── PUBLIC USER VIEW (für Leaderboard, kein PII außer display name) ───────
create or replace view users_public as
  select
    email,
    raw_user_meta_data->>'full_name'          as full_name,
    raw_user_meta_data->>'profile_picture_url' as profile_picture_url
  from auth.users;

-- ── RLS: Alle Tabellen öffentlich für Service Role ────────────────────────
-- Für Produktionsumgebung mit eingeschränktem Zugriff pro User anpassen!
alter table catches enable row level security;
alter table spots enable row level security;
alter table premium_wallets enable row level security;
alter table usage_sessions enable row level security;

-- Einfache Policy: Jeder User sieht nur eigene Daten (service role bypassed automatisch)
create policy "own_catches" on catches for all using (created_by = auth.jwt()->>'email');
create policy "own_spots" on spots for all using (created_by = auth.jwt()->>'email');
create policy "own_wallet" on premium_wallets for all using (user_id = auth.jwt()->>'email');
create policy "own_sessions" on usage_sessions for all using (user_id = auth.jwt()->>'email');

-- Indizes für häufige Queries
create index if not exists idx_catches_created_by on catches(created_by);
create index if not exists idx_catches_catch_time on catches(catch_time desc);
create index if not exists idx_spots_created_by on spots(created_by);
create index if not exists idx_usage_sessions_user_status on usage_sessions(user_id, status);
create index if not exists idx_premium_wallets_user on premium_wallets(user_id);
create index if not exists idx_premium_events_user on premium_events(user_id);
create index if not exists idx_voting_submissions_competition on voting_submissions(competition_id);
create index if not exists idx_depth_data_water_body on depth_data_points(water_body_name);
create index if not exists idx_fishing_clubs_geocoded on fishing_clubs(geocoded_at);
