-- Storage-Buckets fuer BaitBuddy (siehe supabase/storage.sql fuer Hintergrund).
-- Der Bucket 'catches' ist public (Bilder werden per Public-URL ausgeliefert),
-- geschrieben wird ausschliesslich vom Backend mit service_role.
--
-- storage.buckets wird vom storage-api-Service migriert und existiert beim
-- allerersten db-Init moeglicherweise noch nicht. Deshalb nur anlegen, wenn
-- die Tabelle da ist — sonst holt docker/scripts/finalize.sh das nach.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public)
    values ('catches', 'catches', true)
    on conflict (id) do update set public = excluded.public;
    raise notice 'Bucket catches angelegt';
  else
    raise notice 'storage.buckets fehlt noch — Bucket kommt ueber finalize.sh';
  end if;
end $$;
