#!/usr/bin/env bash
# Nach dem ersten "docker compose up" ausfuehren.
#
# Zwei Dinge im Schema haengen an Tabellen, die erst die Dienste selbst anlegen:
#   - trg_set_trial_premium auf auth.users  (GoTrue-Migrationen)
#   - Bucket "catches" in storage.buckets   (storage-api-Migrationen)
# Beim db-Init sind die eventuell noch nicht da. Dieses Skript setzt beides
# nach, sobald der Stack laeuft. Mehrfaches Ausfuehren ist unschaedlich.
#
#   docker/scripts/finalize.sh
set -euo pipefail
CONTAINER="${CONTAINER:-baitbuddy-db}"

# Abfragen OHNE "docker exec -i": mit -i liest docker exec stdin, was in einer
# Kommandosubstitution ($(...)) haengen bleibt, bis stdin geschlossen wird.
q() { docker exec "$CONTAINER" psql -U postgres -d postgres -tAc "$1"; }
# Nur fuer Heredocs wird stdin gebraucht.
run() { docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 --quiet; }

echo "Warte auf auth.users und storage.buckets ..."
ready=f
for _ in $(seq 1 60); do
  ready=$(q "select (to_regclass('auth.users') is not null and to_regclass('storage.buckets') is not null)::text" | tr -d '\r')
  [ "$ready" = "t" ] && break
  sleep 2
done
if [ "$ready" != "t" ]; then
  echo "Fehler: auth.users / storage.buckets nach 2 Minuten nicht da." >&2
  echo "Laufen 'auth' und 'storage'? -> docker compose ps; docker compose logs auth storage" >&2
  exit 1
fi

echo "Trigger trg_set_trial_premium setzen"
run <<'SQL'
drop trigger if exists trg_set_trial_premium on auth.users;
create trigger trg_set_trial_premium
  before insert on auth.users
  for each row execute function public.set_trial_premium();
SQL

echo "Bucket 'catches' anlegen"
run <<'SQL'
insert into storage.buckets (id, name, public)
values ('catches', 'catches', true)
on conflict (id) do update set public = excluded.public;
SQL

echo
echo "Kontrolle:"
echo "  Trigger: $(q "select count(*) from pg_trigger where tgname='trg_set_trial_premium'")"
echo "  Buckets: $(q "select string_agg(id||' (public='||public||')', ', ') from storage.buckets")"
echo "Fertig."
