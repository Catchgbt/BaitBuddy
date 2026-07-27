-- social_media_shares wurde in schema.sql definiert, existierte aber nicht in
-- der Live-Datenbank — backend/src/routes/socialMedia.js referenzierte damit
-- eine nicht existente Tabelle (jeder Aufruf endete in einem 500er). Aktiv
-- genutzt vom Frontend ueber SocialMediaShareDialog.jsx (Teilen-Button nach
-- dem Loggen eines Fangs).
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

-- Konsistent mit allen anderen Tabellen: RLS aktiv, keine Policy (deny-all
-- fuer anon/authenticated). Das Backend nutzt den Service-Role-Key und
-- umgeht RLS; das Frontend greift nie direkt per Supabase-Client auf
-- Tabellen zu.
alter table social_media_shares enable row level security;
