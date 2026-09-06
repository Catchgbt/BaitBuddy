-- Nach dem Import: Foto-URLs von der Cloud auf den lokalen Stack umschreiben.
-- Die URL-Struktur ist identisch (/storage/v1/object/public/<bucket>/<pfad>),
-- nur der Host aendert sich. :new_base per psql-Variable uebergeben:
--
--   docker exec -i baitbuddy-db psql -U postgres -d postgres \
--     -v new_base="'http://localhost:8000'" -f - < docker/scripts/rewrite-photo-urls.sql
--
-- Fuer Zugriff aus dem LAN/Internet statt localhost die API_EXTERNAL_URL angeben.
\set old_base '''https://yejiqenqdzupauddjcyi.supabase.co'''

update public.catches set photo_url = replace(photo_url, :old_base, :new_base) where photo_url like :old_base || '%';
update public.spots set photo_url = replace(photo_url, :old_base, :new_base) where photo_url like :old_base || '%';
update public.posts set photo_url = replace(photo_url, :old_base, :new_base) where photo_url like :old_base || '%';
update public.community_posts set photo_url = replace(photo_url, :old_base, :new_base) where photo_url like :old_base || '%';
update public.voting_submissions set photo_url = replace(photo_url, :old_base, :new_base) where photo_url like :old_base || '%';
update public.event_submissions set photo_url = replace(photo_url, :old_base, :new_base) where photo_url like :old_base || '%';
update public.social_media_shares set photo_url = replace(photo_url, :old_base, :new_base) where photo_url like :old_base || '%';
update public.licenses set photo_url = replace(photo_url, :old_base, :new_base) where photo_url like :old_base || '%';
update public.gear_listings set photo_url = replace(photo_url, :old_base, :new_base) where photo_url like :old_base || '%';
update public.clans set logo_url = replace(logo_url, :old_base, :new_base) where logo_url like :old_base || '%';
update public.users set avatar_url = replace(avatar_url, :old_base, :new_base) where avatar_url like :old_base || '%';
update auth.users set raw_user_meta_data = jsonb_set(raw_user_meta_data, '{avatar_url}', to_jsonb(replace(raw_user_meta_data->>'avatar_url', :old_base, :new_base)))
  where raw_user_meta_data->>'avatar_url' like :old_base || '%';
