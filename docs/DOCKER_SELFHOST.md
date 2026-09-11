# BaitBuddy Self-Hosting mit Docker

Der komplette Stack (Datenbank, Auth, Storage, Backend, Frontend, Cron) läuft
mit `docker compose` auf einem einzelnen Rechner. Es wird **kein** Vercel und
**keine** Supabase-Cloud mehr gebraucht. Die App-Code-Basis bleibt unverändert:
Backend und Frontend sprechen weiter „Supabase“, nur die URL zeigt auf den
lokalen Stack.

```
Browser ──► frontend (Nginx :8080) ──► /api ──► backend (Express :3000)
   │                                                  │
   └──────────► kong (:8000) ◄────────────────────────┘
                 ├── auth    (GoTrue)      Login, Token, OAuth, Passwort-Reset
                 ├── rest    (PostgREST)   Tabellenzugriff
                 ├── storage (Storage-API) Bucket "catches" (Fangfotos)
                 └── db      (Postgres 15, supabase/postgres)
cron ──► backend /api/admin/* (täglich, wie vercel.json)
```

## 1. Voraussetzungen

- Docker Desktop (Windows/macOS) oder Docker Engine + Compose v2 (Linux)
- Node.js 22 (nur für die Hilfsskripte)
- Für den Datenexport aus der Cloud: `pg_dump` Version 17

## 2. Erstinstallation

```bash
cd docker
cp .env.example .env
node scripts/generate-keys.mjs
```

`generate-keys.mjs` erzeugt `POSTGRES_PASSWORD`, `JWT_SECRET`, dazu passende
`ANON_KEY`/`SERVICE_ROLE_KEY`, `CRON_SECRET` und `DASHBOARD_PASSWORD`. Danach in
`.env` die restlichen Werte eintragen, mindestens:

| Variable | Zweck |
|---|---|
| `ANTHROPIC_API_KEY` | KI-Buddy (Pflicht) |
| `ELEVENLABS_API_KEY` | Sprachausgabe (optional) |
| `SMTP_*` | Bestätigungs-/Reset-Mails und Support-Tickets (optional, mit `ENABLE_EMAIL_AUTOCONFIRM=true` läuft Login auch ohne SMTP) |
| `ADMIN_EMAILS` | Admin-Allowlist fürs Backend |
| `API_EXTERNAL_URL`, `SITE_URL`, `ALLOWED_ORIGINS` | Nur ändern, wenn der Stack nicht auf `localhost` läuft (siehe Abschnitt 6) |

Dann starten:

```bash
docker compose up -d --build
```

Beim ersten Start legt `db` das komplette Schema aus `docker/db/init/` an
(54 Tabellen, Indizes, Policies, Trigger). Das dauert etwa eine Minute; der
erste Build von Backend und Frontend dauert deutlich länger (`npm ci`).

Danach einmalig nachziehen, was an Tabellen hängt, die erst GoTrue und
storage-api selbst anlegen (Trial-Trigger auf `auth.users`, Bucket `catches`):

```bash
docker/scripts/finalize.sh
```

Unter Windows stattdessen:

```powershell
powershell -File docker/scripts/finalize.ps1
```

Prüfen:

```bash
docker compose ps
curl http://localhost:3000/api/health
```

Die App ist dann unter <http://localhost:8080> erreichbar. Mit
`docker compose --profile tools up -d` kommt zusätzlich das Supabase-Studio
unter <http://localhost:8000> (Login: `DASHBOARD_USERNAME`/`DASHBOARD_PASSWORD`).

## 3. Daten aus der Supabase-Cloud übernehmen

Der Stand in der Cloud (Stand 2026-09-05) ist klein: 17 Auth-Nutzer, 13 Fänge,
26 Spots, 5 Events, 7 Event-Vorlagen, 20 Schonzeit-Regeln, 14 Prüfungsfragen,
4 Support-Tickets, 11 Dateien (4 MB) im Bucket `catches`.

### 3.1 Export (auf dem Laptop, nicht in Termux)

Die Cloud-Datenbank ist unter `db.<ref>.supabase.co` **nur per IPv6**
erreichbar. In Heimnetzen und im Mobilfunk schlägt `pg_dump` dort mit
„could not connect“ fehl. Deshalb den **Session Pooler** nehmen (IPv4). Die
Adresse steht im Supabase-Dashboard unter *Connect → Session pooler* und sieht
so aus: `aws-0-eu-west-2.pooler.supabase.com:5432`, Benutzer
`postgres.yejiqenqdzupauddjcyi`.

```bash
export PGPASSWORD='<Datenbank-Passwort aus Dashboard → Settings → Database>'
docker/scripts/export-cloud.sh "postgresql://postgres.yejiqenqdzupauddjcyi@aws-0-eu-west-2.pooler.supabase.com:5432/postgres"
```

Ergebnis: vier SQL-Dateien in `docker/export/` (auth, public.users, restliche
public-Tabellen, storage.objects). Falls `pg_dump` „server version mismatch“
meldet, ist der lokale Client älter als 17. Alternative ohne Installation:

```bash
docker run --rm -it -v "$PWD:/work" -w /work -e PGPASSWORD postgres:17-alpine sh -c 'apk add --no-cache bash >/dev/null && docker/scripts/export-cloud.sh "<connection-string>"'
```

### 3.2 Import

```bash
docker/scripts/import-dump.sh docker/export <Zeitstempel aus dem Export>
```

Reihenfolge: `auth.users` → `public.users` → übrige Tabellen (mit
`session_replication_role=replica`, damit die FK-Reihenfolge egal ist) →
`storage.objects`. Passwort-Hashes werden mit übernommen, alle Nutzer können sich
mit ihrem bisherigen Passwort anmelden. Refresh-Tokens werden nicht übernommen,
bestehende App-Sessions müssen sich einmal neu einloggen.

### 3.3 Dateien aus dem Storage kopieren

```bash
CLOUD_SERVICE_ROLE_KEY='<Cloud service_role>' \
LOCAL_SERVICE_ROLE_KEY='<SERVICE_ROLE_KEY aus docker/.env>' \
node docker/scripts/migrate-storage.mjs
```

Danach die Foto-URLs in der Datenbank auf den neuen Host umschreiben:

```bash
docker exec -i baitbuddy-db psql -U postgres -d postgres -v new_base="'http://localhost:8000'" -f - < docker/scripts/rewrite-photo-urls.sql
```

## 4. Backups

Datenbank:

```bash
docker exec baitbuddy-db pg_dump -U postgres -d postgres --clean --if-exists > backup-$(date +%F).sql
```

Storage-Dateien liegen im Volume `baitbuddy_storage-data`:

```bash
docker run --rm -v baitbuddy_storage-data:/data -v "$PWD:/out" alpine tar czf /out/storage-$(date +%F).tgz -C /data .
```

Beides am besten als Cron auf dem Host, zusätzlich zu den In-App-Backups
(`user_backups`).

## 5. Migrationen nach dem Snapshot

`docker/db/init/90-baitbuddy-schema.sql` ist ein vollständiger Snapshot der
Cloud-Datenbank vom 2026-09-05 und läuft nur beim ersten Start. Neue
Schemaänderungen kommen wie bisher als Datei nach `supabase/migrations/` und
werden mit `docker/scripts/apply-migrations.sh` eingespielt.

Hinweis: `supabase/seed-event-templates.sql` referenziert die Spalten
`max_participants` und `requires_photo`, die es in der Live-Tabelle
`event_templates` nicht gibt. Die Vorlagen kommen deshalb über den Datenimport
(Abschnitt 3), nicht über diese Seed-Datei.

## 6. Zugriff aus dem LAN oder Internet

Für die Android-App und andere Geräte muss der Stack unter einer festen Adresse
erreichbar sein. In `docker/.env` anpassen:

```
API_EXTERNAL_URL=https://api.baitbuddy.example      # Kong (Auth, Storage-URLs)
SITE_URL=https://app.baitbuddy.example              # Frontend
ALLOWED_ORIGINS=https://app.baitbuddy.example,capacitor://localhost
ADDITIONAL_REDIRECT_URLS=https://app.baitbuddy.example/*,capacitor://localhost/*
```

Nach einer Änderung von `API_EXTERNAL_URL` das Frontend neu bauen
(`docker compose up -d --build frontend`), weil die Supabase-URL beim Vite-Build
eingebrannt wird. Davor gehört ein Reverse-Proxy mit TLS (Caddy oder Traefik),
weil Service Worker, Kamera und Geolocation im Browser nur über HTTPS laufen.

Die Android-Hülle lädt die Web-App von `capacitor.config.json → server.url`.
Dort `https://bait-buddy.vercel.app` durch die neue `SITE_URL` ersetzen, ebenso
in `android/app/src/main/AndroidManifest.xml` (Deep-Link-Host), und die App neu
bauen.

Google-Login: In der Google-Cloud-Console als autorisierte Redirect-URI
`<API_EXTERNAL_URL>/auth/v1/callback` eintragen, dann
`GOOGLE_OAUTH_ENABLED=true` plus Client-ID/Secret in `.env`.

## 7. Was sich gegenüber Vercel ändert

| Vercel/Cloud | Docker |
|---|---|
| `api/[...path].mjs` mountet Express als Serverless Function | `backend` startet `node src/server.js` direkt (Port 3000) |
| `vercel.json` rewrites/headers | `docker/nginx.conf` |
| `vercel.json` crons | Container `cron` (gleiche Pfade, gleiche UTC-Zeiten, `CRON_SECRET`) |
| Vercel KV als Rate-Limit-Store | optional `--profile redis` und `KV_URL=redis://redis:6379`, sonst In-Memory |
| Karten-Downloads gesperrt (Read-only-FS) | funktionieren, Daten im Volume `bathymetry-data` |
| Supabase-Cloud Postgres 17 | `public.ecr.aws/supabase/postgres:17.6.1.165` — gleiche Hauptversion wie die Cloud, die Dumps passen ohne Konflikt |

Die Images kommen bewusst aus `public.ecr.aws/supabase/*`, also derselben
Quelle wie bei der Supabase-CLI. Wer schon einmal `supabase start` ausgeführt
hat, hat sie dadurch meist bereits lokal liegen.

## 8. Stolperfallen, die hier schon behoben sind

Diese Punkte sind im Setup bereits berücksichtigt — nützlich zu wissen, falls
später etwas angepasst wird:

- **`99-roles.sql` filtert über `pg_roles`.** Der Rollenbestand hängt von der
  Postgres-Version ab (`supabase_functions_admin` gibt es in 17.x nicht mehr).
  `migrate.sh` bricht beim ersten Fehler ab — ein hartes `alter user` auf eine
  fehlende Rolle würde das gesamte Schema-Init verhindern.
- **`auth.jwt()` wird im Schema angelegt und gehört `supabase_auth_admin`.**
  Das Image bringt nur `auth.uid()`, `auth.role()` und `auth.email()` mit, die
  Policies brauchen aber `auth.jwt() ->> 'email'`. Gehört die Funktion
  `postgres`, scheitert GoTrue beim Start mit „must be owner of function jwt“.
- **Kein `imgproxy`.** Die App liefert Fotos über `getPublicUrl()` ohne
  Transformationen.

Die Vercel-Dateien bleiben im Repo, damit ein Cloud-Deploy weiterhin möglich
ist. Beide Wege nutzen denselben Code.
