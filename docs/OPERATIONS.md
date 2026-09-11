# 🔧 Operations & Maintenance für Production

Tägliche Wartungs- und Troubleshooting-Anleitungen.

## ⚡ Quick Commands

### Status prüfen
```bash
cd docker
docker-compose ps                    # Alle Container Status
./scripts/health-check.sh            # Detaillierte Health-Prüfung
docker-compose logs -f backend       # Live Backend-Logs
```

### Container starten/stoppen
```bash
docker-compose up -d                 # Alle starten
docker-compose down                  # Alle stoppen
docker-compose restart backend       # Backend neu starten
docker-compose logs -f <container>   # Live-Logs
```

### Datenbank prüfen
```bash
docker exec baitbuddy-db psql -U postgres -d postgres -c "SELECT 1;"
docker exec baitbuddy-db psql -U postgres -d postgres -l  # Databases auflisten
```

### Logs aufbereiten
```bash
docker logs baitbuddy-backend --tail 50           # Letzte 50 Zeilen
docker logs baitbuddy-backend --since 10m         # Letzte 10 Minuten
docker logs baitbuddy-backend 2>&1 | grep ERROR  # Nur Fehler
```

---

## 🚨 Troubleshooting

### Backend antwortet nicht
```bash
# 1. Prüfe ob Container läuft
docker ps | grep backend
# Falls DOWN: starten
docker-compose up -d backend

# 2. Logs prüfen
docker logs baitbuddy-backend -f

# 3. Health Check
curl http://localhost:3000/health

# 4. In Container gehen
docker exec -it baitbuddy-backend /bin/sh
ps aux | grep node
```

### SSL/TLS Fehler
```bash
# Zertifikat Status
ls -la docker/certbot/conf/live/catchgbt.com/

# Zertifikat Info
openssl x509 -in docker/certbot/conf/live/catchgbt.com/fullchain.pem -text -noout

# Erneuern (Certbot neu starten)
docker-compose restart certbot

# Logs prüfen
docker logs baitbuddy-certbot
```

### DNS nicht erreichbar
```bash
# IPv4 prüfen
nslookup catchgbt.com
dig catchgbt.com

# Öffentliche IP prüfen
curl https://ifconfig.me

# Cache leeren (macOS)
sudo dscacheutil -flushcache

# Cache leeren (Windows)
ipconfig /flushdns

# Cache leeren (Linux)
sudo systemctl restart systemd-resolved
```

### Hohe CPU/Memory Nutzung
```bash
# Live-Überwachung
docker stats --no-stream

# Speicher-intensive Container identifizieren
docker inspect --format='{{.State.Pid}}'  baitbuddy-backend | xargs ps aux | grep
```

---

## 📊 Monitoring

### Daily Health Check
```bash
./docker/scripts/health-check.sh
```

Checklist:
- [ ] Alle Container "Up"
- [ ] /health Endpoints antworten
- [ ] PostgreSQL erreichbar
- [ ] SSL Zertifikat gültig
- [ ] Keine ERROR-Logs
- [ ] DNS funktioniert

### Sicherheits-Checks
```bash
# CORS Headers
curl -I https://catchgbt.com/api/health

# Security Headers (aus Nginx)
curl -v https://catchgbt.com/api/health 2>&1 | grep -i "x-frame\|x-content\|strict-transport"

# SSL/TLS Strength
openssl s_client -connect catchgbt.com:443 -tls1_2
```

### Performance Test
```bash
# Latenz messen
time curl https://catchgbt.com/api/health

# API-Response unter 2 Sekunden?
curl -w "@curl-format.txt" https://catchgbt.com/api/health
```

---

## 🔐 Backup & Recovery

### Database Backup
```bash
# Snapshot erstellen
docker exec baitbuddy-db pg_dump -U postgres postgres > backup-$(date +%Y%m%d).sql

# Restore
docker exec -i baitbuddy-db psql -U postgres postgres < backup-20250909.sql
```

### Volumen Backup
```bash
# Alle Volumen auflisten
docker volume ls

# Backup erstellen
docker run --rm \
  -v baitbuddy_db-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/db-data.tar.gz -C /data .

# Restore
docker run --rm \
  -v baitbuddy_db-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/db-data.tar.gz -C /data
```

---

## 🔄 Updates & Neustarts

### Geplanter Neustart
```bash
# Nachricht im Log hinterlassen
docker-compose logs -f

# Graceful Shutdown (wartet auf laufende Requests)
docker-compose down

# Warte 30 Sekunden
sleep 30

# Starte neu
docker-compose up -d

# Prüfe Health
./scripts/health-check.sh
```

### Container einzeln updaten
```bash
# Backend neu bauen & deployen
docker-compose build backend
docker-compose up -d backend

# Logs prüfen
docker logs baitbuddy-backend -f
```

### Zertifikat erneuern
```bash
# Manuell (läuft auch automatisch via Cron)
docker exec baitbuddy-certbot certbot renew --force-renewal

# Nginx neu laden (neue Certs laden)
docker-compose restart nginx-reverse-proxy
```

---

## 📝 Logging & Debugging

### Log-Format
- **Backend**: JSON (strukturiert) via Sentry/Logger
- **Nginx**: Combined format (HTTP-Requests)
- **PostgreSQL**: Postgres native format
- **Certbot**: Text (Renewal Events)

### Wichtige Log-Locations
```bash
# Container-Logs (via Docker)
docker logs baitbuddy-<container>

# In-Container Logs (falls gemountet)
docker exec baitbuddy-backend tail -f /app/logs/error.log
```

### Log-Analyse
```bash
# Fehler filtern
docker logs baitbuddy-backend 2>&1 | grep -i error | tail -20

# Specific Event filtern
docker logs baitbuddy-backend 2>&1 | grep "auth/login"

# Response-Zeiten
docker logs baitbuddy-backend 2>&1 | grep "ms"
```

---

## 🆘 Notfall-Verfahren

### Service Down
1. **Prüfe Status**: `docker-compose ps`
2. **Logs anschauen**: `docker logs <container>`
3. **Container neu starten**: `docker-compose restart <container>`
4. **Ganz neu starten**: `docker-compose down && docker-compose up -d`
5. **Health Check**: `./scripts/health-check.sh`

### Datenverlust
1. **Stoppe alles**: `docker-compose down`
2. **Backup restore**: `docker run ... db-data.tar.gz`
3. **Starte wieder**: `docker-compose up -d`

### Speicher voll
```bash
docker system df              # Nutzer Übersicht
docker system prune           # Cleanup (vorsichtig!)
docker volume prune           # Nur ungenutzte Volumen
docker image prune -a         # Alle ungenutzten Images
```

---

## 📞 Support-Info

**Bei Problemen sammeln:**
```bash
# System-Info
docker version
docker-compose --version

# Container-Status
docker-compose ps
docker stats

# Logs (letzten Fehler)
docker logs baitbuddy-backend --tail 50
docker logs baitbuddy-nginx-reverse-proxy --tail 50

# Health-Checks
curl http://localhost:3000/health
curl https://catchgbt.com/api/health 2>&1
```

**Dann teilen:** System-Info + Logs + Error-Nachricht
