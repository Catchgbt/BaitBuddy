# 🚀 BaitBuddy Production Setup für catchgbt.com

Diese Anleitung macht deinen lokalen Docker-Server öffentlich erreichbar unter **https://catchgbt.com**.

## 📋 Voraussetzungen

- ✅ Docker & Docker Compose installiert
- ✅ Lokale Laptop-IP (192.168.1.x)
- ✅ Zugriff auf Fritz!Box Router
- ✅ IONOS Domain (catchgbt.com)
- ✅ Terminal-Zugriff

## ⚡ Quick Start (50 Min)

### Phase 1: Docker-Vorbereitung (10 Min)

```bash
cd /dein/baitbuddy/project
cd docker

# 1. Kopiere .env Template und setze Secrets
cp .env.example .env
nano .env
# Wichtig: POSTGRES_PASSWORD, JWT_SECRET, CRON_SECRET ändern!

# 2. Generiere Supabase Keys (falls nicht vorhanden)
node scripts/generate-keys.mjs
# Kopiere ANON_KEY und SERVICE_ROLE_KEY in .env

# 3. Erstelle Certbot-Verzeichnis für Let's Encrypt
mkdir -p certbot/conf certbot/www

# 4. Baue Docker-Images
docker-compose build
```

### Phase 2: SSL/TLS Zertifikat (5 Min)

Nur einmalig! Braucht Port 80 frei (kein anderer Webserver).

```bash
# 1. Temporary Standalone Certbot starten (kein Docker-Compose)
docker run --rm -it -p 80:80 \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot certonly \
  --standalone \
  -d catchgbt.com \
  -d www.catchgbt.com \
  --agree-tos \
  --email deine@email.de \
  --no-eff-email

# 2. Prüfe ob erfolgreich
ls -la certbot/conf/live/catchgbt.com/
# Sollte: fullchain.pem, privkey.pem, chain.pem zeigen
```

### Phase 3: Router-Konfiguration (10 Min)

**Fritz!Box öffnen:**
```
http://192.168.1.1
oder http://fritz.box
Login: admin / (Passwort hinten auf der Box)
```

**Port-Forwarding einrichten:**

Internetverbindung → Port-Forwarding

| Name | Protokoll | Externer Port | Interner Port | Interne IP | Status |
|------|-----------|---------------|---------------|------------|--------|
| BaitBuddy HTTP | TCP | 80 | 3000 | 192.168.1.x | ✅ |
| BaitBuddy HTTPS | TCP | 443 | 3000 | 192.168.1.x | ✅ |

Speichern → Router startet neu (2 Min)

**Deine IP finden:**
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
# Suche: 192.168.1.x
```

### Phase 4: DNS bei IONOS (5 Min)

**Öffne IONOS Kundenportal:**
```
https://www.ionos.de
Anmelden → Domains → catchgbt.com → DNS-Verwaltung
```

**Finde deine öffentliche IP:**
```bash
curl -s https://ifconfig.me
# Output: z.B. 82.45.123.456
```

**A-Records einrichten:**

| Typ | Name | Wert | TTL |
|-----|------|------|-----|
| A | @ | 82.45.123.456 | 600 |
| A | www | 82.45.123.456 | 600 |

Speichern!

**Propagation prüfen (5-30 Min warten):**
```bash
nslookup catchgbt.com
# Sollte deine IP zeigen
```

### Phase 5: Docker Starten (10 Min)

```bash
cd docker

# Logs überwachen
docker-compose up -d

# Alle Container healthy?
docker-compose ps
# Alle sollten "Up (healthy)" sein

# Logs prüfen
docker-compose logs -f

# Backend Health testen
curl http://localhost:3000/health
```

### Phase 6: Tests (10 Min)

**Lokal testen:**
```bash
# Backend läuft?
curl http://localhost:3000/api/health
# Response: {"ok":true,"app":"BaitBuddy",...}

# Database verbunden?
docker exec baitbuddy-db psql -U postgres -d postgres -c "SELECT 1;"
# Response: (1 row)

# Redis läuft (optional)?
docker exec baitbuddy-redis redis-cli ping
# Response: PONG
```

**Remote Test (nach DNS-Propagation):**
```bash
# Von außerhalb (Handy im Mobilnetz, NICHT WiFi!)
curl -I https://catchgbt.com/api/health
# Response: HTTP/1.1 200 OK

# Curl mit verbose um SSL zu prüfen
curl -v https://catchgbt.com/health
# Sollte Let's Encrypt Zertifikat zeigen
```

## 🔍 Troubleshooting

### DNS funktioniert nicht
```bash
# Cache leeren
sudo dscacheutil -flushcache  # macOS
ipconfig /flushdns  # Windows
sudo systemctl restart systemd-resolved  # Linux
```

### Port-Forwarding erreicht nicht
```bash
# 1. Lokal funktioniert?
curl http://localhost:3000/health

# 2. Router neu starten (Aus/An)
# 3. Port-Einstellungen prüfen (80→3000, 443→3000)
# 4. Firewall auf Laptop prüfen
```

### SSL Zertifikat Fehler
```bash
# Erneuere manuell
docker exec baitbuddy-certbot certbot renew --force-renewal

# Logs prüfen
docker logs baitbuddy-certbot
```

### Backend antwortet nicht
```bash
# Detaillierte Logs
docker logs baitbuddy-backend -f

# In Container gehen
docker exec -it baitbuddy-backend /bin/sh

# Prozess prüfen
ps aux | grep node
```

## 📊 Expected Output

```bash
$ docker-compose ps
NAME                           STATUS
baitbuddy-db                   Up (healthy)
baitbuddy-auth                 Up (healthy)
baitbuddy-rest                 Up
baitbuddy-storage              Up (healthy)
baitbuddy-imgproxy             Up (healthy)
baitbuddy-kong                 Up
baitbuddy-backend              Up (healthy)
baitbuddy-frontend             Up
baitbuddy-cron                 Up
baitbuddy-nginx-reverse-proxy  Up (healthy)
baitbuddy-certbot              Up
baitbuddy-redis                Up (Optional)

$ curl https://catchgbt.com/api/health
{"ok":true,"app":"BaitBuddy","version":"1.0.0","voice":false,"ai":true}
```

## ✅ Completion Checklist

- [ ] Docker-Compose startet fehlerfrei
- [ ] Alle Container zeigen "Up (healthy)"
- [ ] `curl http://localhost:3000/health` → 200 OK
- [ ] DNS propagiert: `nslookup catchgbt.com` zeigt deine IP
- [ ] SSL-Zertifikat gültig: kein Browser-Warning
- [ ] CORS funktioniert: Vercel-Frontend kann API aufrufen
- [ ] Backend antwortet auf `/api/*` Endpoints
- [ ] Database Read/Write funktioniert
- [ ] Redis funktioniert (falls aktiviert)
- [ ] Logs sauber, keine ERROR-Einträge
- [ ] Security Headers gesetzt
- [ ] Rate Limiting aktiv

## 🔐 Sicherheits-Checkliste

Vor Production-Start:

- [ ] POSTGRES_PASSWORD: stark (32+ Zeichen)
- [ ] JWT_SECRET: zufällig generiert
- [ ] CRON_SECRET: zufällig generiert
- [ ] ANTHROPIC_API_KEY: gesetzt und gültig
- [ ] .env NICHT in Git committed
- [ ] SSL/TLS Zertifikat gültig
- [ ] CORS: nur Vercel Domain erlauben
- [ ] Rate Limiting: aktiv
- [ ] Logs: strukturiert, keine Secrets
- [ ] Firewall: nur Ports 80/443 geöffnet

## 🚀 Production Launch

```bash
cd docker
docker-compose up -d

# Überwache die Logs
docker-compose logs -f backend

# Nach 30s prüfen
curl https://catchgbt.com/api/health
```

**Live!** 🎉

## 📝 Weitere Ressourcen

- `docs/DOCKER_SELFHOST.md` — Ausführliche Selbsthosting-Anleitung
- `.docker-compose.yml` — Service-Definitionen
- `docker/nginx-reverse-proxy.conf` — SSL/TLS + Proxy-Konfiguration
- `docker/.env.example` — Environment-Template

## 🆘 Support

Falls Fehler auftreten:
1. Logs prüfen: `docker logs <container>`
2. Health-Status: `docker-compose ps`
3. Netzwerk-Verbindung: `docker network inspect baitbuddy-baitbuddy_net`
4. DNS-Propagation: `dig catchgbt.com` oder `nslookup catchgbt.com`

Brauchst du weitere Hilfe? → Schreib dein Problem hier hin mit:
- Docker-Status: `docker-compose ps`
- Log-Auszug: `docker logs <container>`
- Error-Message
