-- Event-Sichtbarkeit: 'public' (Standard, für alle sichtbar) oder 'friends'
-- (nur für den Ersteller und seine Referral-Freunde sichtbar). 'friends'-Events
-- sind ein Friends-Plan-Feature; das Gate sitzt serverseitig in
-- backend/src/routes/events.js (POST /events). Bestehende Events bleiben durch
-- den DEFAULT 'public' unverändert sichtbar.
--
-- Die Sichtbarkeits-Filterung in GET /events nutzt diese Spalte zusammen mit
-- events.created_by (E-Mail) und der referrals-Tabelle (UUIDs, aufgelöst über
-- auth.admin.getUserById).

alter table if exists public.events
  add column if not exists visibility text not null default 'public';

-- Erlaubte Werte absichern. Constraint idempotent anlegen (Postgres kennt kein
-- "add constraint if not exists" — daher der DO-Block).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_visibility_check'
  ) then
    alter table public.events
      add constraint events_visibility_check
      check (visibility in ('public', 'friends'));
  end if;
end $$;

-- Filter-Beschleunigung für GET /events (WHERE is_active AND visibility ...).
create index if not exists idx_events_visibility on public.events(visibility);
