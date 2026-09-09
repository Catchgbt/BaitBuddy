# BaitBuddy Deployment Guide

Umfassende Anleitung für Produktions-Deployments: Docker Self-Hosting, Vercel, Monitoring und Release-Management.

---

## 🚀 Quick Start (Wähle dein Deployment)

### Option 1: Cloud (Empfohlen für MVP)
**Plattform:** Vercel (Web) + Supabase Cloud (DB/Auth)
- **Kosten:** $0-100/Monat (abhängig von Nutzung)
- **Aufwand:** Minimal
- **Skalierung:** Automatisch
- **Geeignet für:** MVP, Public Beta, schnelle Iterationen

→ Gehe zu **Abschnitt 1: Vercel + Supabase Cloud**

### Option 2: Self-Hosted (Empfohlen ab 50k+ Nutzer)
**Plattform:** Docker Compose auf dediziertem Server
- **Kosten:** $30-200/Monat (Server)
- **Aufwand:** Mittel
- **Skalierung:** Manuell
- **Geeignet für:** Kostenkontrolle, Datenschutz, volle Kontrolle

→ Gehe zu **Abschnitt 2: Docker Self-Hosting**

### Option 3: Hybrid (Skalierbar)
**Plattform:** Vercel (Frontend) + Docker (Backend) + Supabase Cloud
- **Kosten:** $50-150/Monat
- **Aufwand:** Mittel-Hoch
- **Skalierung:** Semi-automatisch
- **Geeignet für:** Wachsende Apps, kostenbewusst

→ Gehe zu **Abschnitt 3: Hybrid Setup**

---

## 1️⃣ Vercel + Supabase Cloud (Standard Production)

### 1.1 Voraussetzungen
- ✅ GitHub-Konto mit BaitBuddy-Repo
- ✅ Vercel-Konto (kostenlos)
- ✅ Supabase-Konto (kostenlos)
- ✅ Domain (optional, z.B. `baitbuddy.example.com`)

### 1.2 Schritt-für-Schritt Setup

#### A. Supabase Cloud Project erstellen
```bash
# 1. Gehe zu https://app.supabase.com
# 2. "New Project" → gebe Projekt-Name ein
# 3. Wähle Region (z.B. "Europe" für EU-Datenschutz)
# 4. Speichere die Zugangsdaten irgendwo sicher:
#    - Project URL (VITE_SUPABASE_URL)
#    - Anon Key (VITE_SUPABASE_ANON_KEY)
#    - Service Role Key (SUPABASE_SERVICE_ROLE_KEY)

# 5. Wende alle Migrations an:
# In der Supabase Dashboard → SQL Editor:
# - Kopiere den Inhalt von supabase/schema.sql
# - Führe es aus
# - Dann alle Dateienim supabase/migrations/ nacheinander ausführen
# ODER via CLI:
npm install -g supabase
supabase projects list  # und den Project-ID kopieren
supabase db push --project-ref YOUR_PROJECT_ID
```

#### B. Vercel Project erstellen
```bash
# 1. Gehe zu https://vercel.com/new
# 2. Wähle GitHub und verbinde das BaitBuddy-Repo
# 3. Vercel fragt nach Projekt-Name → verwende "baitbuddy"
# 4. Unter "Environment Variables" füge hinzu:
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=21m0...
ELEVENLABS_VOICE_ID_FEMALE=W...
STRIPE_SECRET_KEY=sk_live_...
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# 5. "Deploy" klicken
# Vercel baut und deployt automatisch
# Deployment-URL wird angezeigt (z.B. https://baitbuddy-xxx.vercel.app)

# 6. Production Domain konfigurieren:
# Gehe zu Project Settings → Domains
# Füge deine Domain hinzu (z.B. baitbuddy.de)
# Konfiguriere DNS gemäß Vercel-Anweisungen
```

#### C. GitHub Actions für Schema-Migrationen aufsetzen
```bash
# 1. In GitHub Repository → Settings → Secrets and variables
# 2. Füge hinzu:
SUPABASE_ACCESS_TOKEN=<von https://app.supabase.com/account/tokens>
SUPABASE_DB_PASSWORD=<postgres password>
SUPABASE_PROJECT_ID=<project-id>

# 3. Committen Sie eine Änderung zu supabase/migrations/
# Der Workflow .github/workflows/supabase-migrations.yml wird automatisch gestartet
# Er führt die Migration auf der Cloud-DB aus
```

#### D. Automatisches Deployment & PR Checks
```bash
# Workflows sind bereits konfiguriert:

# 1. Bei Push zu main:
# - Vercel deployt automatisch
# - Supabase-Migrations werden angewendet (täglich 03:00 UTC)
# - GitHub Actions prüft alle Checks

# 2. Bei PR:
# - Vercel erstellt Preview-Deployment
# - Tests laufen automatisch
# - Code Review erforderlich vor Merge

# 3. Bei Tag v*:
# - Android-AAB wird gebaut
# - Play Store Upload wird angefordert
```

### 1.3 Verifikation

```bash
# Health Check
curl https://baitbuddy.example.com/api/health

# Sollte folgendes zurückgeben:
{
  "ok": true,
  "status": "healthy",
  "ai_service": {
    "provider": "Anthropic (Claude)",
    "api_key_configured": true,
    "model": "claude-haiku-4-5"
  }
}
```

### 1.4 Monitoring einrichten

```bash
# In Vercel Dashboard:
# 1. Project Settings → Analytics → Aktiviere Analytics
# 2. Project Settings → Monitoring → Aktiviere Error Tracking

# Fehler-Benachrichtigungen:
# 1. Gehe zu Project Settings → Notifications
# 2. Aktiviere Email für Failed Deployments
# 3. Konfiguriere Slack (optional)
```

### 1.5 Backup-Strategie (Supabase Cloud)

```bash
# Automatisches Backup (Supabase macht tägliche Backups)
# Manuelles Backup herunterladen:
# 1. Supabase Dashboard → Project Settings → Backups
# 2. "Download" klicken
# 3. Speichern in sicherer Cloud (Google Drive, AWS S3, etc.)

# Backup-Wiederherstellung:
# Nur mit manueller Unterstützung von Supabase möglich
# → Kontaktiere support@supabase.io
```

---

## 2️⃣ Docker Self-Hosting

### 2.1 Voraussetzungen
- ✅ **Server:** Linux-VM (4GB RAM, 20GB Disk minimum)
  - Empfehlungen: Hetzner, DigitalOcean, Linode, OVH
- ✅ **Docker & Docker Compose:** `docker --version` ≥ 24.0
- ✅ **Domain:** für SSL-Zertifikat
- ✅ **SSH-Zugriff** zum Server

### 2.2 Server-Vorbereitung

```bash
# Auf deinem Server:

# 1. Aktualisiere Pakete
sudo apt update && sudo apt upgrade -y

# 2. Installiere Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# 3. Installiere Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. Verifiziere Installation
docker --version
docker-compose --version

# 5. Konfiguriere Firewall (UFW)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2.3 BaitBuddy Docker-Setup

```bash
# Auf dem Server:

# 1. Klone Repository
mkdir -p /opt/baitbuddy
cd /opt/baitbuddy
git clone https://github.com/smokemoney81/BaitBuddy.git .
git checkout main

# 2. Generiere Secrets (einmalig)
cd docker
node scripts/generate-keys.mjs
# Schreibt in .env:
#   JWT_SECRET=...
#   ANON_KEY=...
#   SERVICE_ROLE_KEY=...

# 3. Konfiguriere .env
cp .env.example .env
# Editiere .env und setze:
#   POSTGRES_PASSWORD=<starkes-passwort-hier>
#   BACKEND_PORT=3001
#   FRONTEND_PORT=8080
#   DOMAIN=baitbuddy.example.com

# 4. Starte Stack
docker compose up -d

# Warte auf alle Services (≈30 Sekunden)
docker compose ps
# Alle Services sollten "Up" sein
```

### 2.4 Nginx Reverse Proxy (SSL/TLS)

```bash
# Installiere Certbot für Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx

# Erstelle SSL-Zertifikat
sudo certbot certonly --standalone -d baitbuddy.example.com

# Nginx-Konfiguration (/etc/nginx/sites-available/baitbuddy)
server {
    listen 80;
    listen [::]:80;
    server_name baitbuddy.example.com;

    # Redirect HTTP → HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name baitbuddy.example.com;

    ssl_certificate /etc/letsencrypt/live/baitbuddy.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/baitbuddy.example.com/privkey.pem;

    # Frontend (Port 8080)
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API (Port 3001)
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Aktiviere Konfiguration
sudo ln -s /etc/nginx/sites-available/baitbuddy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Auto-Renewal (Certbot)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 2.5 Health Checks & Monitoring

```bash
# Prüfe alle Services
docker compose exec db pg_isready -U postgres
docker compose exec auth wget -q -O- http://localhost:9999/health
docker compose exec backend curl -s http://localhost:3001/api/health
docker compose exec frontend curl -s http://localhost:8080/health

# Logs anschauen
docker compose logs -f backend
docker compose logs -f db
docker compose logs -f auth

# Verifikation
curl https://baitbuddy.example.com/api/health
# Sollte { "ok": true, "status": "healthy" } zurückgeben
```

### 2.6 Backup-Strategie (Docker)

```bash
# Tägliches Datenbank-Backup (Crontab)
# /usr/local/bin/baitbuddy-backup.sh
#!/bin/bash
BACKUP_DIR="/backups/baitbuddy"
DATE=$(date +%Y-%m-%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Postgres Dump
docker compose exec -T db pg_dump -U postgres -d postgres > \
  $BACKUP_DIR/postgres_$DATE.sql

# Supabase Storage Dump (S3-Bucket)
aws s3 sync s3://baitbuddy-storage $BACKUP_DIR/storage_$DATE/

# Komprimieren
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz $BACKUP_DIR/postgres_$DATE.sql
rm $BACKUP_DIR/postgres_$DATE.sql

# Alte Backups löschen (älter als 30 Tage)
find $BACKUP_DIR -type f -name "backup_*.tar.gz" -mtime +30 -delete

# Hochladen in sichere Cloud (optional)
aws s3 cp $BACKUP_DIR/backup_$DATE.tar.gz s3://backup-bucket/baitbuddy/

# Crontab-Eintrag (täglich 02:00)
# 0 2 * * * /usr/local/bin/baitbuddy-backup.sh
```

---

## 3️⃣ Android Play Store Release

### 3.1 Vorbereitung

```bash
# 1. Google Play Console Konto erstellen
#    → https://play.google.com/console
#    → Registriere als Developer ($25 einmalig)
#    → Erstelle neue App "BaitBuddy"

# 2. Signing-Key generieren (einmalig)
keytool -genkey -v -keystore baitbuddy-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias baitbuddy-release \
  -storepass '<PASSWORD>' \
  -keypass '<PASSWORD>'

# 3. Keystore zu Base64 konvertieren
base64 -w0 baitbuddy-release.keystore > keystore.b64
# Speichere den Output als Secret: KEYSTORE_BASE64

# 4. Setze Secrets in GitHub (Settings → Secrets)
KEYSTORE_PASSWORD=<PASSWORD>
KEYSTORE_KEY_PASSWORD=<PASSWORD>
KEYSTORE_KEY_ALIAS=baitbuddy-release

# 5. Service Account für Play Console erstellen
#    → Google Cloud Console
#    → Create Service Account
#    → Gib die JSON-Datei als GOOGLE_PLAY_SERVICE_ACCOUNT_JSON ein
```

### 3.2 GitHub Actions Workflow

```bash
# Der Workflow ist bereits konfiguriert in:
# .github/workflows/build-android.yml

# Trigger: Tag erstellen
git tag v1.0.0
git push --tags

# Automatisch:
# 1. Android-AAB wird gebaut
# 2. Signiert
# 3. Zu Play Console hochgeladen (Beta-Track)
```

### 3.3 Play Store Submission

```bash
# 1. In Google Play Console → BaitBuddy App
# 2. Gehe zu "Testing" → "Closed Testing" (Beta)
# 3. Prüfe AAB-Upload (sollte automatisch da sein)
# 4. Gebe Release Notes ein
# 5. Klicke "Save" und warte auf Review (≈24 Stunden)

# 6. Nach Genehmigung:
# "Release to Production" klicken
# Wähle Rollout-Strategie (z.B. 50% → 100% über 5 Tage)
```

---

## 4️⃣ Monitoring & Observability

### 4.1 Sentry Error Tracking

```bash
# 1. Registriere auf https://sentry.io
# 2. Erstelle neues Projekt (React + Node.js)
# 3. Kopiere die DSN

# 4. Setze Umgebungsvariablen:
# Frontend (.env)
VITE_SENTRY_DSN=https://xxx@sentry.io/yyy
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_RELEASE=v1.0.0

# Backend (.env)
SENTRY_DSN=https://xxx@sentry.io/yyy
NODE_ENV=production

# 5. Fehler werden automatisch zu Sentry gesendet

# Verifikation
# Verursache einen Fehler (z.B. /api/test mit falscher API-Key)
# Prüfe ob er in Sentry auftaucht
```

### 4.2 Health Checks

```bash
# Automatische Health Checks konfigurieren

# Endpoint: /api/health (alle 60 Sekunden)
# Response sollte sein:
{
  "ok": true,
  "status": "healthy",
  "ai_service": { "api_key_configured": true },
  "server": { "uptime_seconds": 3600 }
}

# In Vercel:
# Project Settings → Monitoring → Health Checks
# URL: https://baitbuddy.example.com/api/health

# In Docker (Cron):
# */5 * * * * curl -f https://baitbuddy.example.com/api/health || \
#   echo "Health check failed" | mail -s "BaitBuddy Down" admin@example.com
```

### 4.3 Performance Monitoring (Frontend)

```javascript
// Automatisch in src/main.jsx konfiguriert:
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
  beforeSend(event) {
    // Filtere sensitive Daten
    return event;
  }
});

// Performance-Metriken werden automatisch gesendet
// Prüfe in Sentry Dashboard → Performance → Transactions
```

### 4.4 Logging

```bash
# Backend nutzt Winston für strukturiertes Logging

# Standard-Level: info, warn, error
# Logs gehen zu:
# - Console (Entwicklung)
# - File (Produktion: /var/log/baitbuddy/app.log)
# - Sentry (errors only)

# Log-Rotation (Docker Compose)
# logging:
#   driver: "json-file"
#   options:
#     max-size: "10m"
#     max-file: "3"
```

---

## 5️⃣ Skalierung & Optimierung

### 5.1 Vercel (Auto-Scaling)

```
- Traffic wird automatisch verteilt
- Serverless Functions skalieren automatisch
- Nur Kosten für genutzte CPU/Memory
- Kein manuales Scaling nötig
```

### 5.2 Docker (Manuelles Scaling)

```bash
# Für höhere Last: Mehrere Container spawnen
docker-compose up -d --scale backend=3

# Nutze Load Balancer (z.B. HAProxy)
# Oder Kubernetes für Enterprise-Scale
```

### 5.3 Datenbank-Optimierung

```bash
# Indices überprüfen
docker compose exec db psql -U postgres -c "\d+ catches"

# Langsame Queries aufspüren
# enable log_statement = 'all' in postgresql.conf

# Query-Analyser (EXPLAIN ANALYZE)
docker compose exec db psql -U postgres -c \
  "EXPLAIN ANALYZE SELECT * FROM catches WHERE species='Hecht'"
```

---

## 🛠️ Troubleshooting

### "Health Check Failed"

```bash
# 1. Prüfe Backend-Logs
docker compose logs backend
curl -v https://baitbuddy.example.com/api/health

# 2. Prüfe Anthropic API Key
echo $ANTHROPIC_API_KEY  # Muss gesetzt sein

# 3. Starte Backend neu
docker compose restart backend
```

### "Database Connection Error"

```bash
# 1. Prüfe Postgres-Status
docker compose ps db
docker compose logs db

# 2. Stelle Verbindung her
docker compose exec db psql -U postgres -c "SELECT 1"

# 3. Migrationen fehlen?
docker compose exec backend npm run migrate
```

### "Deployment Failed"

```bash
# Vercel:
# 1. Gehe zu Project → Deployments
# 2. Prüfe die Build-Logs

# Docker:
# 1. Prüfe Docker Build Output
docker compose build --no-cache backend

# 2. Prüfe Disk-Space
df -h
# Wenn < 1GB übrig: alte Docker images löschen
docker system prune -a
```

---

## 📋 Pre-Launch Checkliste

- [ ] API Health Check erfolgreich
- [ ] Database migriert und verifiziert
- [ ] Sentry Error Tracking aktiv
- [ ] SSL-Zertifikat gültig (certbot)
- [ ] Backups funktionieren
- [ ] Monitoring-Alerts konfiguriert
- [ ] Staging getestet (Web + Android)
- [ ] Privacy Policy & ToS online
- [ ] Analytics konfiguriert (GA4)
- [ ] Support-Email eingerichtet
- [ ] Fehler-Fallback-Prozeduren dokumentiert

---

## 📞 Support & Kontakt

- **GitHub Issues:** https://github.com/smokemoney81/BaitBuddy/issues
- **Dokumentation:** `docs/` Verzeichnis
- **Supabase Docs:** https://supabase.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Docker Docs:** https://docs.docker.com

---

**Letztes Update:** 2026-09-09
**Autor:** Claude Haiku 4.5
