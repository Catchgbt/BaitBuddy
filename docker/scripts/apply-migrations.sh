#!/usr/bin/env bash
# Spielt supabase/migrations/*.sql in den laufenden lokalen Stack ein.
# Nur fuer Migrationen noetig, die NACH dem Schema-Snapshot (2026-09-05) dazukommen;
# die bestehenden sechs Migrationen sind bereits im Snapshot enthalten und
# idempotent (create ... if not exists), koennen also gefahrlos mitlaufen.
#
#   docker/scripts/apply-migrations.sh
set -euo pipefail
CONTAINER="${CONTAINER:-baitbuddy-db}"
for f in supabase/migrations/*.sql; do
  echo "== $f"
  docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 --quiet < "$f"
done
echo "Fertig"
