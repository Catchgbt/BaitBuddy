-- Freundschafts-Empfehlungssystem
-- =============================================================================
-- Zwei Tabellen für das Referral-Popup nach dem Login:
--
--  * `user_referral_codes` — 1:1-Mapping <referral_code> -> <user_id>. Wird beim
--    ersten Aufruf von /api/referrals/me befüllt (bei fehlendem Code wird ein
--    neuer generiert). Zusätzlich zum `referral_code` in user_metadata (das
--    für die Anzeige im Profil reicht) brauchen wir hier einen direkten
--    Lookup — Supabase-JS erlaubt kein Filtern auf `auth.users.user_metadata`
--    via PostgREST, deshalb spiegeln wir die Codes in eine eigene Tabelle.
--
--  * `referrals` — Log-Tabelle für jede erfolgreiche Einladung. Ein neuer
--    Nutzer kann nur einmal referred werden (UNIQUE auf referred_user_id),
--    was Doppel-Belohnungen strukturell verhindert.
--
-- Beide Tabellen werden ausschließlich vom Backend (Service-Role) beschrieben,
-- daher RLS an und keine INSERT/UPDATE-Policies für Endnutzer.

create extension if not exists "uuid-ossp";

create table if not exists user_referral_codes (
  code       text primary key,
  user_id    uuid not null unique,
  created_at timestamptz default now()
);

create index if not exists idx_user_referral_codes_user
  on user_referral_codes(user_id);

create table if not exists referrals (
  id                uuid primary key default uuid_generate_v4(),
  referrer_user_id  uuid not null,
  referred_user_id  uuid not null unique,
  referral_code     text not null,
  reward_days       integer not null default 7,
  reward_plan_id    text not null default 'elite',
  reward_granted_at timestamptz default now(),
  created_at        timestamptz default now()
);

create index if not exists idx_referrals_referrer
  on referrals(referrer_user_id);

create index if not exists idx_referrals_code
  on referrals(referral_code);

alter table user_referral_codes enable row level security;
alter table referrals enable row level security;

-- Nur eigene Zeilen lesen — Insert/Update/Delete bleiben dem Backend
-- vorbehalten (Service-Role umgeht RLS).
create policy "own_referral_code_read"
  on user_referral_codes for select
  using (auth.uid() = user_id);

create policy "own_referrals_read"
  on referrals for select
  using (auth.uid() = referrer_user_id or auth.uid() = referred_user_id);
