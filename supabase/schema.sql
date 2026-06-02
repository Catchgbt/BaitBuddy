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

-- RLS
alter table catches enable row level security;
alter table spots enable row level security;
create policy "own_catches" on catches for all using (created_by = auth.jwt()->>'email');
create policy "own_spots" on spots for all using (created_by = auth.jwt()->>'email');

-- Indexes
create index if not exists idx_catches_user on catches(created_by);
create index if not exists idx_catches_time on catches(catch_time desc);
create index if not exists idx_spots_user on spots(created_by);
