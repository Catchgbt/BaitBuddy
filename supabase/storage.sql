-- Storage-Konfiguration fuer BaitBuddy (Supabase Storage)
--
-- Hintergrund:
-- Das Backend (backend/src/routes/misc.js -> POST /api/files/upload) laedt
-- hochgeladene Dateien mit dem service_role-Key in den Bucket 'catches' hoch
-- und liefert sie ueber die oeffentliche URL (getPublicUrl) aus.
--
-- Da das Backend mit service_role schreibt (umgeht RLS) und ein public Bucket
-- Objekte ueber die oeffentliche URL ohne RLS ausliefert, braucht der Bucket
-- KEINE anonymen Policies. Das ist die sicherste Konfiguration:
-- kein anonymes Auflisten, Hochladen, Aendern oder Loeschen.
--
-- Dieses Skript ist idempotent und bildet den real angewendeten Stand ab.

-- Storage-Bucket 'catches' anlegen (public zum Ausliefern der Bilder).
insert into storage.buckets (id, name, public)
values ('catches', 'catches', true)
on conflict (id) do update set public = excluded.public;

-- Der frueher vorhandene Bucket 'baitbuddy' hatte vier offene Policies, die
-- jedem (anon) Lesen/Schreiben/Aendern/Loeschen erlaubten. Er war leer und wird
-- vom App-Code nicht verwendet -> Policies entfernen und Bucket abdichten.
drop policy if exists "baitbuddy_public_read" on storage.objects;
drop policy if exists "baitbuddy_insert" on storage.objects;
drop policy if exists "baitbuddy_update" on storage.objects;
drop policy if exists "baitbuddy_delete" on storage.objects;

update storage.buckets set public = false where id = 'baitbuddy';
