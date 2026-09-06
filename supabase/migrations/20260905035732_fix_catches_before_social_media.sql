-- Basis-Tabellen zuerst
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

-- Dann social_media_shares
create table if not exists social_media_shares (
  id uuid primary key default uuid_generate_v4(),
  catch_id uuid not null references catches(id) on delete cascade,
  platform text not null,
  message text,
  include_photo boolean default true,
  photo_url text,
  share_link text,
  created_by text not null,
  created_at timestamptz default now()
);
create index if not exists idx_social_media_shares_catch on social_media_shares(catch_id);
create index if not exists idx_social_media_shares_user on social_media_shares(created_by);
create index if not exists idx_social_media_shares_platform on social_media_shares(platform);

alter table social_media_shares enable row level security;
