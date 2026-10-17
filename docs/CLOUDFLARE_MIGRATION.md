# Cloudflare-Migration (Vercel -> Cloudflare)

**Status: Phase 1 abgeschlossen (2026-09-17)** ✅
- ✅ `wrangler.toml` optimiert & finalisiert
- ✅ GitHub Actions Deploy-Pipeline (`deploy-cloudflare.yml`) konfiguriert
- ✅ SPA-Fallback via `not_found_handling = "single-page-application"` in `wrangler.toml` (kein `_redirects` nötig)
- ✅ Backend-CORS für `catchgbt.com` vorkonfiguriert
- ✅ Rate-Limiter auf Cloudflare-Header (`cf-connecting-ip`) angepasst

**Status Phase 2 (Ausstehend):** Dashboard-Setup & Domain-Umschaltung
- ⏳ Zone `catchgbt.com` aktivieren (Nameserver beim Registrar ändern)
- ⏳ Worker-Secrets in Cloudflare setzen (`CRON_SECRET`, `BACKEND_URL`)
- ⏳ Custom Domain `catchgbt.com` dem Worker zuordnen
- ⏳ Container-Backend (Phase 3, später, benötigt Paid Plan)

Produktives Go-Live nach Nameserver-Umschaltung. Bis dahin: Vercel läuft parallel mit
Übergangslösung (`BACKEND_URL` -> neues Vercel-Projekt in `wrangler.toml`).

## Parallelbetrieb: Vercel + Cloudflare-Backend (17.10.2026)

BaitBuddy behaelt die bestehende Vercel-Bereitstellung. Bei **jedem Push auf `main`**
(z. B. nach einem Merge) startet GitHub Actions zusaetzlich den Workflow
`.github/workflows/deploy-cloudflare-backend.yml` und baut bzw. deployed
den Express-Container fuer den separaten Cloudflare-Worker `baitbuddy-api`.
Der Front-Door-Worker wird unabhaengig ueber `deploy-cloudflare.yml`
aktualisiert. Vercels eigene Git-Integration bleibt ebenfalls unabhaengig.

**Voraussetzungen fuer einen erfolgreichen Cloudflare-Backend-Deploy:**

1. Cloudflare Workers Paid Plan mit verfuegbaren Containers.
2. GitHub Actions Secrets `CLOUDFLARE_API_TOKEN` (Workers/Containers-Deploy-Rechte)
   und `CLOUDFLARE_ACCOUNT_ID` im Repository.
3. Backend-Secrets direkt am Worker `baitbuddy-api`, darunter
   `SUPABASE_SERVICE_ROLE_KEY`, die verwendeten KI-/Stripe-/SMTP-Secrets und
   `CRON_SECRET` (siehe `cloudflare/backend/containerEnv.js`).
4. Der Workflow prueft die Cloudflare-Deploy-Zugangsdaten, fuehrt den Test
   `cloudflare/backend/containerEnv.test.js` aus, deployt Worker plus Container
   und kontrolliert danach dessen `/api/health` (bis zu 10 Minuten Wartezeit).
   Fehlende Berechtigungen oder ein fehlender Paid Plan fuehren zu einem
   **sichtbaren fehlgeschlagenen GitHub-Actions-Lauf**, nicht zu einem
   unbelegten Erfolg.

**Sicherheit:** Dieser Workflow aendert `BACKEND_URL` im Root-`wrangler.toml`
nicht und schaltet weder Domain noch Stripe-Webhooks um. Das laufende
Vercel-Backend bleibt das konfigurierte Produktivziel, bis ein kontrollierter
Routingwechsel mit echten Login-/KI-/Kauf-Tests explizit freigegeben wird.
Bei fehlerhaftem Cloudflare-Container erfolgt kein automatischer Wechsel
des Live-Backends.

## Zielarchitektur

| Schicht | Vorher (Vercel) | Nachher (Cloudflare) |
|--------|-----------------|----------------------|
| Frontend (SPA) | Vercel Static + `vercel.json` rewrites/headers | Static Assets (`dist/`) ueber den Front-Door-Worker bzw. Cloudflare Pages |
| Backend (Express) | Eine Serverless-Function (`api/[...path].mjs`) | Cloudflare **Container** (dieselbe App via `docker/backend.Dockerfile`) |
| Routing | `vercel.json` rewrites | `cloudflare/worker.js` (`/api/*` -> Container, sonst SPA) |
| Cron | `vercel.json` crons | Cloudflare **Cron Triggers** im Worker |
| Rate-Limit-Store | Vercel KV | Redis/Upstash ueber `KV_URL` (Fail-Open) |

Begruendung fuer den Container statt reiner Workers: Das Backend nutzt Full-Node-APIs
(`fs`/`child_process` in `maps.js`, `Buffer`-Aufbau in `multiProviderTTS.js`, `ioredis`
ueber TCP, SSE ueber Node-Streams). Der Container laesst die identische Express-App
laufen (minimaler Umbau); ein reiner Workers-Port waere ein grosser Rewrite am
umsatzkritischen Premium-/KI-Pfad.

## Dateien in diesem Repo

- `cloudflare/worker.js` — Front-Door: proxyt `/api/*` an `BACKEND_URL` (SSE wird
  unveraendert durchgereicht), liefert sonst die SPA aus dem Assets-Binding und
  fuehrt die vier Crons aus.
- `wrangler.toml` (Repo-Root) — **autoritative** Worker-Config, die die Cloudflare
  "Workers Builds"-Integration liest: `main = cloudflare/worker.js`, Assets (`dist`),
  Cron Triggers, `BACKEND_URL`-Var; `CRON_SECRET` als Secret setzen.
- `public/_headers` — Cache-Header (Aequivalent zu `vercel.json > headers`).
- `docker/backend.Dockerfile` — Backend-Image fuer den Cloudflare-Container.

## Backend-Container (Phase 3) — im Repo vorbereitet

Das Express-Backend läuft als **eigener Worker `baitbuddy-api`** mit Container,
getrennt vom Front-Door-Worker. So hängt die Live-Seite nicht am Container, und
ein fehlender Paid Plan bricht den Frontend-Deploy nicht.

- `cloudflare/backend/wrangler.toml` — Worker + `[[containers]]` (Image aus
  `docker/backend.Dockerfile`, Build-Kontext Repo-Root, `instance_type = "basic"`,
  Region WEUR), nicht-geheime Vars (`SUPABASE_URL`, `APP_URL`, `APP_BASE_URL`).
- `cloudflare/backend/worker.js` — reicht jede Anfrage an die Container-Instanz
  `primary` weiter (eine Instanz: In-Memory-Caches/Rate-Limit bleiben konsistent).
- `cloudflare/backend/containerEnv.js` — welche Worker-Secrets als Umgebung in den
  Container gehen (Test prüft, dass `backend/.env.example` vollständig abgedeckt ist).
- `.github/workflows/deploy-cloudflare-backend.yml` — bei jedem Push auf `main`
  (und manuell); prüft anschließend
  `https://baitbuddy-api.kaisaschnitt99.workers.dev/api/health`.
  Die Repo-Variable `CLOUDFLARE_BACKEND_ENABLED` wird nicht mehr benötigt.

**Nicht `ALLOWED_ORIGINS` setzen**, solange die Android-App `capacitor://localhost`
braucht: die Variable ersetzt die Standardliste komplett.

### Umschalten (in dieser Reihenfolge)

1. Workers Paid Plan im Cloudflare-Konto aktivieren.
2. Secrets am Worker setzen (Dashboard → Workers → `baitbuddy-api` → Settings →
   Variables, oder `npx wrangler secret put NAME --config cloudflare/backend/wrangler.toml`):
   mindestens `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `CRON_SECRET`
   (identisch zum Front-Door-Worker), dazu je nach Funktion `STRIPE_*`,
   `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, `ELEVENLABS_*`/`OPENAI_API_KEY`, `SMTP_*`.
3. GitHub → Actions → „Deploy Backend to Cloudflare“ → Run workflow. Grün heißt:
   `/api/health` antwortet aus dem Container.
4. Login, KI-Chat (auch Streaming) und einen Kauf-Check gegen
   `https://baitbuddy-api.kaisaschnitt99.workers.dev` testen.
5. `BACKEND_URL` in der Root-`wrangler.toml` auf
   `https://baitbuddy-api.kaisaschnitt99.workers.dev` umstellen und mergen.
   Bei Problemen den letzten nachweislich funktionsfähigen aktuellen Backend-Stand wiederherstellen. Das stillgelegte Projekt `https://bait-buddy.vercel.app` darf nicht mehr als Rückfallziel verwendet werden.
6. Automatische Backend-Deploys sind nach erfolgreichem Merge in `main` bereits
   aktiviert. Stripe-Webhook-URL erst nach explizitem, getesteten Traffic-Switch umziehen.

## Ziel-Domain

Die produktive Web-App-Domain ist **`catchgbt.com`** (Apex). Erwartete Origins:
`https://catchgbt.com`, `https://www.catchgbt.com` (beide bereits Default in
`backend/src/lib/allowedOrigins.js`).

## Deploy-Schritte

1. Zone `catchgbt.com` aktivieren (Nameserver beim Registrar auf
   `rayden.ns.cloudflare.com` / `serenity.ns.cloudflare.com`), bis Status `active`.
2. Cloudflare "Workers Builds" (Projekt `baitbuddy`) konfigurieren:
   Build command `npm install --legacy-peer-deps && npm run build`, Deploy ueber
   die Root-`wrangler.toml` (`npx wrangler deploy`).
3. Am Worker setzen: Secret `CRON_SECRET` (identisch zum Backend) und das Backend-Ziel.
   **Stand 2026-10-16:** Das Vercel-Projekt unter dem alten Konto
   (`bait-buddy.vercel.app`) ist eingefroren und hat neue KI-Routen, darunter
   `POST /api/ai/fish-recipes`, nicht. Beide Backend-URLs in der Root-`wrangler.toml`
   zeigen daher auf das aktuelle Projekt im Konto `ssbedburg`.
   Cloudflare darf bei Fehlern oder fehlendem Bypass nicht auf den alten Stand
   ausweichen. Stattdessen liefert der Worker HTTP 503 mit `Cache-Control: no-store`.
   Dies betrifft auch Cron-Aufrufe (keine Ausführung auf veralteten Endpunkten).
   Der Bypass muss weiterhin im Cloudflare-Worker `baitbuddy` als Secret
   `VERCEL_PROTECTION_BYPASS` (alternativ `VERCEL_PROTECTION`) gesetzt sein.
   Das Secret muss zum Projekt `ssbedburg/bait-buddy` gehören.
   Prüfen:
   - `GET https://catchgbt.com/api/health`: HTTP 200 und `{ "ok": true, "app": "BaitBuddy" }`.
   - `POST https://catchgbt.com/api/ai/fish-recipes` ohne Anmeldung: HTTP 401
     (Route ist vorhanden und auth-geschützt). HTTP 404 bedeutet falsche Route
     oder veraltetes Backend, HTTP 503 einen nicht verfügbaren Origin/Bypass.
   - Mit Anmeldung Rezeptvorschläge für Hecht abrufen; die bestehende Token-
     Abrechnung und die KI-Antwort müssen erhalten bleiben.
   Für die Container-Migration `VERCEL_BACKEND_URL` entfernen und
   `BACKEND_URL` auf den getesteten Container-Endpunkt setzen.
   Hinweis: Der Backend-Container (`docker/backend.Dockerfile`, `[[containers]]`)
   ist die Ziel-Architektur, aber **zurueckgestellt** — er braucht den Workers
   Paid Plan. Bis dahin proxyt der Front-Door `/api/*` an das Vercel-Backend.
4. Worker Custom Domain `catchgbt.com` (und `www` bzw. Redirect `www -> apex`)
   hinzufuegen; alten `www`-CNAME (manus.space) erst danach ersetzen.
5. Spaeter: Backend-Container (`docker/backend.Dockerfile`) deployen, Secrets aus
   `backend/.env.example` setzen (`SUPABASE_*`, `ANTHROPIC_API_KEY`, `ELEVENLABS_*`,
   `STRIPE_*`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, `KV_URL` optional, `ALLOWED_ORIGINS`,
   `CRON_SECRET`), dann `BACKEND_URL` am Worker darauf umstellen.
6. DNS-Hygiene: `_dmarc` (TXT), `autodiscover`, `_domainconnect` auf **DNS only**.

## Was NACH der Domain-Aktivierung noch zu tun ist (Android-AAB)

Die Android-App laedt die Live-Site remote von `catchgbt.com`. Bereits im Repo
gesetzt (dieser PR): `capacitor.config.json` (`server.url`), App-Links-Host im
`AndroidManifest.xml`, `versionCode`/`versionName`. Offen:

- App-Links-Verifizierung: `assetlinks.json` mit dem Play-Signatur-Fingerprint
  (SHA-256) unter `public/.well-known/assetlinks.json` ablegen (Fingerprint aus
  der Play Console) — der Worker liefert es dann aus.
- AAB-Build erst **nach** Zonenaktivierung anstossen (sonst weisse Seite fuer Tester):
  `build-android.yml` per `workflow_dispatch` (`version_code` > letzter Play-Upload).

## Verifikation

- `/api/health` liefert `{ ok: true }` ueber die neue Domain.
- Ein authentifizierter Endpunkt funktioniert (Login-Flow).
- SSE-Stream `/api/ai/chat/stream` streamt (kein Puffern durch den Worker).
- Ein Cron manuell: `curl -H "Authorization: Bearer $CRON_SECRET" \
  https://<domain>/api/admin/premium/check-expiry` -> HTTP 200.
- Rate-Limit greift pro Client (Key aus `cf-connecting-ip`).
