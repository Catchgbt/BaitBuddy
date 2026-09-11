#!/bin/sh
# Ruft einen Backend-Cron-Endpunkt auf. Vercel schickt "Authorization: Bearer <CRON_SECRET>",
# das Backend (events.js, admin.js) erwartet genau diesen Header.
set -u
path="$1"
code=$(curl -s -o /tmp/cron-body -w '%{http_code}' -m 300 \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${BACKEND_URL}${path}")
echo "$(date -u +%FT%TZ) ${path} -> HTTP ${code} $(head -c 300 /tmp/cron-body)"
