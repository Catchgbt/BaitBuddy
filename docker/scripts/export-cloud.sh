#!/usr/bin/env bash
# Exportiert Daten aus der Supabase-Cloud (Projekt baitbuddy-prod) als SQL-Dumps.
#
# Voraussetzung: pg_dump >= 17 (Cloud laeuft auf Postgres 17). Unter Windows:
#   Git Bash + PostgreSQL 17 Client (https://www.postgresql.org/download/windows/)
#   oder: docker run --rm -v "$PWD:/out" -e PGPASSWORD postgres:17-alpine pg_dump ...
#
# WICHTIG: Den *Session Pooler* verwenden (IPv4-faehig). Die direkte Adresse
# db.<ref>.supabase.co ist nur per IPv6 erreichbar — daran scheitern die meisten
# Heimnetze/Mobilfunk mit "could not connect" / "Network is unreachable".
# Die Pooler-Adresse steht im Dashboard unter "Connect" -> "Session pooler".
#
# Aufruf:
#   export PGPASSWORD='<Datenbank-Passwort aus dem Dashboard>'
#   docker/scripts/export-cloud.sh "postgresql://postgres.yejiqenqdzupauddjcyi@aws-0-eu-west-2.pooler.supabase.com:5432/postgres"
set -euo pipefail

CONN="${1:?Connection-String (Session Pooler) als 1. Argument angeben}"
OUT="${2:-docker/export}"
mkdir -p "$OUT"
STAMP=$(date -u +%Y%m%d-%H%M%S)

echo "1/3 public-Daten (nur Daten, Schema kommt aus docker/db/init)"
pg_dump "$CONN" \
  --schema=public --data-only --no-owner --no-privileges \
  --column-inserts --rows-per-insert=500 \
  --exclude-table='public.users' \
  -f "$OUT/public-data-$STAMP.sql"

# public.users (Profil-Spiegel) separat, damit FK-Reihenfolge beim Import stimmt
pg_dump "$CONN" \
  --table='public.users' --data-only --no-owner --no-privileges --column-inserts \
  -f "$OUT/public-users-$STAMP.sql"

echo "2/3 auth-Daten (Nutzer inkl. Passwort-Hashes, Identities, MFA)"
pg_dump "$CONN" \
  --schema=auth --data-only --no-owner --no-privileges --column-inserts \
  --table='auth.users' --table='auth.identities' --table='auth.mfa_factors' \
  -f "$OUT/auth-data-$STAMP.sql"

echo "3/3 storage-Metadaten (Objektliste; Dateien selbst holt migrate-storage.mjs)"
pg_dump "$CONN" \
  --schema=storage --data-only --no-owner --no-privileges --column-inserts \
  --table='storage.objects' \
  -f "$OUT/storage-objects-$STAMP.sql"

echo
echo "Fertig. Dateien in $OUT:"
ls -la "$OUT" | grep "$STAMP"
echo
echo "Import: docker/scripts/import-dump.sh $OUT $STAMP"
