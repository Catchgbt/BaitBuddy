#!/usr/bin/env bash
# Spielt die Dumps aus export-cloud.sh in den lokalen Docker-Stack ein.
# Reihenfolge: auth.users -> public.users -> uebrige public-Tabellen -> storage.objects
#
#   docker/scripts/import-dump.sh docker/export 20260905-120000
set -euo pipefail

DIR="${1:?Export-Verzeichnis}"
STAMP="${2:?Zeitstempel des Exports (Dateisuffix)}"
CONTAINER="${CONTAINER:-baitbuddy-db}"

psql_in() {
  docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 --quiet
}

echo "1/4 auth (Nutzer + Identities)"
psql_in < "$DIR/auth-data-$STAMP.sql"

echo "2/4 public.users"
psql_in < "$DIR/public-users-$STAMP.sql"

echo "3/4 public (alle uebrigen Tabellen)"
# Trigger/FK waehrend des Imports entschaerfen, Reihenfolge im Dump ist alphabetisch
{
  echo "set session_replication_role = replica;"
  cat "$DIR/public-data-$STAMP.sql"
  echo "set session_replication_role = default;"
} | psql_in

echo "4/4 storage.objects (Metadaten)"
psql_in < "$DIR/storage-objects-$STAMP.sql"

echo
echo "Sequenzen nachziehen"
docker exec -i "$CONTAINER" psql -U postgres -d postgres --quiet <<'SQL'
select setval('public.exam_questions_id_seq', coalesce((select max(id) from public.exam_questions), 1));
SQL

echo "Fertig. Dateien im Storage: node docker/scripts/migrate-storage.mjs"
