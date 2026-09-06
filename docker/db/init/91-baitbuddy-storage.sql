-- Storage-Buckets fuer BaitBuddy (siehe supabase/storage.sql fuer Hintergrund).
-- Der Bucket 'catches' ist public (Bilder werden per Public-URL ausgeliefert),
-- geschrieben wird ausschliesslich vom Backend mit service_role.
insert into storage.buckets (id, name, public)
values ('catches', 'catches', true)
on conflict (id) do update set public = excluded.public;
