# BaitBuddy Monitoring & Observability Setup

Schritt-für-Schritt Anleitung für Production-Monitoring: Error Tracking, Performance, Logging und Alerting.

---

## 1. Sentry Error Tracking

### 1.1 Setup

```bash
# 1. Registriere auf https://sentry.io (kostenlos bis 10k events/monat)
# 2. Erstelle Projekt:
#    - Frontend: React
#    - Backend: Node.js

# 3. Kopiere die DSNs (Digital Sentry Network):
# Frontend DSN: https://xxx@o123.ingest.sentry.io/456
# Backend DSN: https://yyy@o123.ingest.sentry.io/789

# 4. Setze Environment Variablen:
# Vercel: Project Settings → Environment Variables
# Docker: docker/.env oder docker-compose.yml

# Frontend (.env)
VITE_SENTRY_DSN=https://xxx@o123.ingest.sentry.io/456
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_RELEASE=v1.0.0

# Backend (.env)
SENTRY_DSN=https://yyy@o123.ingest.sentry.io/789
SENTRY_ENVIRONMENT=production
NODE_ENV=production
```

### 1.2 Frontend Integration (bereits eingerichtet)

```javascript
// src/main.jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Automatische Error-Tracking
// - Unhandled JavaScript Errors
// - Unhandled Promise Rejections  
// - Performance Monitoring (page load, slow transactions)
```

### 1.3 Backend Integration (bereits eingerichtet)

```javascript
// backend/src/index.js
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  tracesSampleRate: 0.5, // 50% der Requests
});

// Error Middleware (registriert alle HTTP 5xx Fehler)
app.use(Sentry.Handlers.errorHandler());
```

### 1.4 Monitoring im Sentry Dashboard

```
1. Issues: Fehler werden in Echtzeit gesammelt
   - Gruppiert nach Error-Typ
   - Stack Trace mit Code-Zeilen
   - Betroffen User/Sessions
   - Regression Detection

2. Performance: Langsame Requests/Transaktionen
   - Page Load Metrics (LCP, FID, CLS)
   - API Response Times
   - Database Query Performance

3. Releases: Fehler pro Version
   - Neue Fehler nach Deployment
   - Regressions zwischen Versionen
   - Deployment Health

4. Alerts: Automatische Benachrichtigungen
   - Bei neuen Fehler-Spitzen
   - Bei Regressions
   - Bei Performance-Degradation
```

---

## 2. Health Checks

### 2.1 HTTP Health Endpoint

```bash
# GET /api/health
# Response (200 OK):
{
  "ok": true,
  "status": "healthy",
  "ai_service": {
    "provider": "Anthropic (Claude)",
    "api_key_configured": true,
    "model": "claude-haiku-4-5"
  },
  "database": {
    "connected": true,
    "response_time_ms": 12
  },
  "server": {
    "node_env": "production",
    "uptime_seconds": 86400,
    "memory_usage_mb": 128
  }
}
```

### 2.2 Vercel Health Monitoring

```
1. Gehe zu: Project Settings → Monitoring → Health Checks
2. URL: https://baitbuddy.example.com/api/health
3. Interval: 60 Sekunden
4. Timeout: 30 Sekunden
5. Vercel checkt die Endpoint und zeigt Status im Dashboard
```

### 2.3 Docker Health Checks

```yaml
# docker/docker-compose.yml
services:
  backend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  db:
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 5s
      timeout: 5s
      retries: 10

  auth:
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:9999/health"]
      interval: 5s
      timeout: 5s
      retries: 10
```

### 2.4 Automatische Alerts

```bash
# Cron Job für Health Check (alle 5 Minuten)
# */5 * * * * /usr/local/bin/health-check.sh

#!/bin/bash
URL="https://baitbuddy.example.com/api/health"
RESPONSE=$(curl -s -w "\n%{http_code}" "$URL")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "200" ] || ! echo "$BODY" | grep -q '"ok":true'; then
  # Fehler - sende Alert
  echo "BaitBuddy Health Check fehlgeschlagen (HTTP $HTTP_CODE)" | \
    mail -s "🚨 ALERT: BaitBuddy Down" admin@example.com
  
  # Opional: Sentry Event senden
  curl -X POST "https://sentry.io/api/projects/o123/789/events/" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer YOUR_SENTRY_TOKEN" \
    -d '{"message":"Health check failed","level":"critical"}'
fi
```

---

## 3. Logging

### 3.1 Winston Logger (Backend)

```javascript
// backend/src/lib/logger.js
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'baitbuddy-backend' },
  transports: [
    // File Logging (Produktion)
    new winston.transports.File({
      filename: '/var/log/baitbuddy/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: '/var/log/baitbuddy/app.log',
      maxsize: 10485760,
      maxFiles: 7,
    }),
    // Console (Development)
    ...(process.env.NODE_ENV === 'development' ? [
      new winston.transports.Console({
        format: winston.format.simple()
      })
    ] : []),
  ],
});

export default logger;

// Nutzung:
// logger.info('User logged in', { userId: user.id });
// logger.error('Database error', { error: err.message });
```

### 3.2 Log Strukturierung

```javascript
// API Request Logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration,
      user_id: req.user?.id,
      ip: req.ip,
    });
  });
  next();
});

// AI Service Logging
async function handleChatRequest(messages, userEmail) {
  logger.info('AI Chat Request', {
    user_email: userEmail,
    message_count: messages.length,
  });
  
  try {
    const response = await invokeLLM(prompt);
    logger.info('AI Chat Success', {
      user_email: userEmail,
      tokens_used: response.usage?.total_tokens,
      response_time_ms: Date.now() - start,
    });
    return response;
  } catch (err) {
    logger.error('AI Chat Failed', {
      user_email: userEmail,
      error: err.message,
      stack: err.stack,
    });
    throw err;
  }
}
```

### 3.3 Log Aggregation (Optional: ELK Stack)

```bash
# Für größere Deployments: Elasticsearch + Logstash + Kibana

# Docker Compose:
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"

  kibana:
    image: docker.elastic.co/kibana/kibana:8.0.0
    ports:
      - "5601:5601"

# Filebeat (Log Shipper)
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/baitbuddy/*.log

output.elasticsearch:
  hosts: ["localhost:9200"]

# Zugriff: http://localhost:5601
```

---

## 4. Performance Monitoring

### 4.1 Frontend Metrics (Sentry)

```
- Largest Contentful Paint (LCP): < 2.5s
- First Input Delay (FID): < 100ms
- Cumulative Layout Shift (CLS): < 0.1

Automatisch gesendet an Sentry → Sentry Dashboard → Performance
```

### 4.2 Backend Performance

```javascript
// Slow Query Logger
const SLOW_QUERY_THRESHOLD_MS = 500;

async function executeQuery(query, params) {
  const start = Date.now();
  try {
    const result = await db.query(query, params);
    const duration = Date.now() - start;
    
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn('Slow Query', {
        query: query.substring(0, 100),
        duration_ms: duration,
        params_count: params?.length || 0,
      });
    }
    return result;
  } catch (err) {
    logger.error('Query Error', { query, error: err.message });
    throw err;
  }
}
```

### 4.3 API Performance Tracking

```bash
# Response Time Histogram (Prometheus-Style)
# Oder einfach via Sentry Performance Monitoring

# Ziele:
# - /api/ai/chat: < 2000ms (KI-Buddy Latenz-Ziel)
# - /api/catches: < 500ms
# - /api/auth/login: < 1000ms (Supabase + custom login)
```

---

## 5. Alerting & Notifications

### 5.1 Sentry Alerts

```
1. Gehe zu Alerts → Create Alert Rule
2. Trigger: "When an issue is seen 10 times in 5 minutes"
3. Filter: "Environment = production"
4. Action: "Send an email to team@example.com"

Alternative Trigger:
- New Error (unbekannter Fehler-Typ)
- Error Rate > 5% pro Minute  
- Performance Regression > 25%
```

### 5.2 Email Alerts

```bash
# Health Check Failed
Subject: 🚨 BaitBuddy Health Check Failed
From: monitoring@baitbuddy.example.com
To: admin@example.com

BaitBuddy ist nicht erreichbar!

Zeitstempel: 2026-09-09 15:30:00 UTC
URL: https://baitbuddy.example.com/api/health
HTTP Status: 503
Error: Service Unavailable

Sofortige Aktion:
1. SSH in den Server
2. docker compose logs backend | tail -50
3. docker compose restart backend
4. curl https://baitbuddy.example.com/api/health
```

### 5.3 Slack Notifications (Optional)

```bash
# Incoming Webhook in Slack konfigurieren
# https://api.slack.com/apps → Create App → Incoming Webhooks

# Sentry Integration:
# Sentry → Alerts → Add Integration → Slack
# Channel: #monitoring
# Trigger: Critical Errors, Performance Regressions
```

---

## 6. Dashboard Übersicht

### 6.1 Sentry Dashboard
- **Issues**: Aktuelle Fehler, Häufigkeit, Betroffene User
- **Performance**: Transaktions-Übersicht, Slow Requests
- **Releases**: Errors pro Version, Deployments
- **Alerts**: Alarm-Log und Status

### 6.2 Vercel Dashboard
- **Deployments**: Status aller Deployments
- **Analytics**: Traffic, Response Times, Edge Function Usage
- **Environment**: Env-Variablen, Secrets (masked)
- **Health Checks**: Uptime-Monitor

### 6.3 Eigenes Monitoring Dashboard (Optional)

```html
<!-- monitoring/index.html -->
<h1>BaitBuddy Production Status</h1>

<div class="status-grid">
  <div class="metric">
    <h3>API Health</h3>
    <div id="health-status">🔄 Checking...</div>
    <p id="health-uptime">Uptime: N/A</p>
  </div>

  <div class="metric">
    <h3>Database</h3>
    <div id="db-status">🔄 Checking...</div>
    <p id="db-response">Response: N/A</p>
  </div>

  <div class="metric">
    <h3>Errors (24h)</h3>
    <div id="error-count">Loading...</div>
    <p id="error-trend">↗️ Trend: Unknown</p>
  </div>

  <div class="metric">
    <h3>Performance</h3>
    <div id="perf-score">Loading...</div>
    <p id="perf-detail">Last check: N/A</p>
  </div>
</div>

<script>
// Refresh every 60 seconds
setInterval(async () => {
  // Health check
  const health = await fetch('/api/health').then(r => r.json());
  document.getElementById('health-status').textContent = 
    health.ok ? '✅ Healthy' : '❌ Down';
  
  // Errors from Sentry API
  const errors = await fetchSentryMetric('issues');
  document.getElementById('error-count').textContent = errors.count;
  
  // Performance from Sentry
  const perf = await fetchSentryMetric('performance');
  document.getElementById('perf-score').textContent = perf.score;
}, 60000);
</script>
```

---

## 7. Troubleshooting

### "Sentry Events werden nicht gesendet"

```bash
# 1. Überprüfe DSN
echo $VITE_SENTRY_DSN
# Sollte mit https://...@o123.ingest.sentry.io/456 beginnen

# 2. Kontrolliere ob Sentry Init läuft
# Browser Console: window.__SENTRY_RELEASE__
# Sollte z.B. "v1.0.0" sein

# 3. Verursache einen Fehler
throw new Error("Sentry Test Error");
# Prüfe Sentry Dashboard innerhalb 10 Sekunden
```

### "Health Check schlägt fehl"

```bash
# 1. Prüfe manuell
curl -v https://baitbuddy.example.com/api/health

# 2. Prüfe Backend Logs
docker compose logs -f backend | grep health

# 3. Starte Backend neu
docker compose restart backend

# 4. Warte 10 Sekunden und prüfe erneut
sleep 10
curl https://baitbuddy.example.com/api/health
```

### "Logs sind nicht sichtbar"

```bash
# Vercel: 
# - Gehe zu Project → Deployments → Klicke auf Deployment → Logs

# Docker:
# docker compose logs --tail=100 backend
# docker compose logs --follow backend
```

---

## 📊 Monitoring Checkliste

- [ ] Sentry Project erstellt (Frontend + Backend)
- [ ] DSN in Env-Variablen gesetzt
- [ ] Health Endpoint konfiguriert
- [ ] Sentry Alerts aktiviert
- [ ] Email-Benachrichtigungen konfiguriert
- [ ] Logging Setup validiert
- [ ] Performance Monitoring aktiv
- [ ] Uptime Monitor konfiguriert
- [ ] Backup-Logs automatisiert
- [ ] Monitoring Dashboard gebookmarkt

---

**Letztes Update:** 2026-09-09
