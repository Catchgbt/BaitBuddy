# BaitBuddy Event-System - Dokumentation

Ein umfassendes Event- und Wettbewerbs-System mit automatischen Rewards basierend auf monatlichem Leaderboard-Ranking.

## 🎯 Hauptmerkmale

### 1. Event-Katalog & Templates
- **10 vordefinierte Event-Templates**: Größter Hecht, Karpfen, Fangwettbewerb, Foto-Contest, etc.
- **Custom Events**: Benutzer können ihre eigenen Events mit benutzerdefinierten Regeln erstellen
- **14-Tage Standard-Laufzeit** oder benutzerdefiniert
- **Flexible Zielfische-Einstellungen** (oder alle Arten)

### 2. Benutzer können Events starten und andere einladen
- **Event-Creator** können andere Angler per E-Mail einladen
- **Einladungs-System**: Pending/Accepted/Declined Status
- **Automatisches Beitreten** bei Annahme der Einladung
- **Multi-Einladung** (mehrere E-Mails gleichzeitig)

### 3. Punkte-System
Komplexe Punkte-Berechnung mit mehreren Bonus-Schichten:

```
Basispunkte:       100 Punkte (pro Einreichung)
Längenboni:        +5 Punkte pro Zentimeter
Art-Boni:          +50-150 Punkte (je nach Art)
Like-Punkte:       +1 Punkt pro Community-Like
Platzierungs-Bonus: +500 (1. Platz), +300 (2.), +100 (3.)
```

**Beispiel**: Hecht 85cm, 10 Likes
- Base: 100
- Länge: 85 × 5 = 425
- Art (Hecht): 50
- Likes: 10 × 1 = 10
- **Total: 585 Punkte**

### 4. Monatliches Leaderboard & Automatische Rewards

**Ablauf**:
1. **Während des Monats**: User nehmen an Events teil, sammeln Punkte
2. **Am 1. des nächsten Monats**: Cron-Job aggregiert alle Punkte (`POST /api/admin/leaderboards/monthly/generate`)
3. **Täglich 01:00 UTC**: Cron-Job aktiviert Rewards automatisch (`POST /api/admin/rewards/auto-activate`)
4. **Gewinner (Rank 1)**: Erhält automatisch **1 Monat kostenlosen Basic Plan** (30 Tage)
5. **Nach 30 Tagen**: Plan läuft automatisch ab

**Reward-Status**:
- `pending`: Warten auf Auto-Aktivierung
- `claimed`: Reward wurde aktiviert
- `active`: User hat aktuell den Plan
- `expired`: 30 Tage sind vorbei

## 🗄️ Datenbank-Schema

### Neue Tabellen

```sql
event_templates         -- Vordefinierte Templates
events                  -- Einzelne Events
event_invitations       -- Einladungen mit Status
event_participants      -- Teilnehmer mit aktuellen Punkten
event_submissions       -- Fang-Einreichungen mit Punkte-Breakdown
event_point_configs     -- Konfigurierbare Punkte-Multiplikatoren
monthly_leaderboards    -- Monatliche aggregierte Rankings
reward_activations      -- Automatisch aktivierte Plan-Rewards
```

## 🔌 API-Endpunkte

### Events verwalten
```
GET    /api/events                    -- Liste aktiver Events
POST   /api/events                    -- Event erstellen
GET    /api/events/:id                -- Event-Details
PATCH  /api/events/:id                -- Event aktualisieren (nur Creator)
DELETE /api/events/:id                -- Event löschen (nur Creator)
```

### Templates
```
GET    /api/events/templates          -- Liste aller Templates
GET    /api/events/templates/:id      -- Template-Details
```

### Teilnahme
```
POST   /api/events/:id/join           -- Dem Event beitreten
POST   /api/events/:id/leave          -- Event verlassen
GET    /api/events/:id/participants   -- Liste mit Punkten
GET    /api/events/:id/leaderboard    -- Rangliste
```

### Einreichungen
```
POST   /api/events/:id/submit         -- Fang einreichen (Auto-Punkte-Berechnung)
```

### Einladungen
```
POST   /api/events/:id/invite         -- User einladen (Multi-Email)
GET    /api/events/invitations/me     -- Meine Einladungen
POST   /api/events/invitations/:id/accept  -- Einladung akzeptieren
POST   /api/events/invitations/:id/decline -- Einladung ablehnen
```

### Monatliches Leaderboard & Rewards
```
GET    /api/leaderboards/monthly?year=2026&month=6  -- Monats-Ranking
GET    /api/rewards/my-activations    -- Meine aktiven Rewards (Pläne)
POST   /api/rewards/claim              -- Reward aktivieren (manuell)
```

### Admin/Cron-Endpunkte
```
POST   /api/admin/leaderboards/monthly/generate  -- Monatliche Aggregation
POST   /api/admin/rewards/auto-activate          -- Auto-Reward-Aktivierung
PATCH  /api/admin/events/auto-archive            -- Abgelaufene Events archivieren
```

**Header erforderlich**: `x-api-key: <ADMIN_API_KEY>`

## 🎨 Frontend-Seiten

### EventCatalog (`/events-catalog`)
- Browse alle aktiven Events
- Filter nach Status (Alle / Laufend / Eigene)
- Event-Template-Auswahl
- Dialog zum Erstellen eigener Events
- Start/Beitreten Button

### EventDetails (`/events/:eventId`)
- Event-Informationen (Status, Basispunkte, Zielfisch)
- Live-Leaderboard
- Fang-Einreichungs-Formular
- Einladungs-Sende-Dialog (für Creator)
- Teilnehmer-Liste

### MonthlyLeaderboard (`/leaderboards/monthly`)
- Monatliches Ranking (Top 100)
- Vorheriger/Nächster Monat Navigation
- Top 3 Highlight-Cards
- Reward-Status und Aktivierung
- Punkte-System Erklärung

### Widgets
- **EventsWidget**: Dashboard-Integration mit aktivem Event + aktueller Rank
- **EventInvitationsWidget**: Notifications für neue Einladungen

## 🤖 Cron-Jobs (Serverless)

### 1. Monatliche Leaderboard-Generierung
**Zeitplan**: 1. des Monats, 00:00 UTC
**Handler**: `POST /api/admin/leaderboards/monthly/generate`

```bash
# curl beispiel:
curl -X POST https://bait-buddy.vercel.app/api/admin/leaderboards/monthly/generate \
  -H "x-api-key: $ADMIN_API_KEY"
```

**Was es tut**:
1. Findet alle Events des Vormonats die "ended" sind
2. Aggregiert alle `event_participants.total_points` pro Nutzer
3. Erstellt Rankings mit Rank-Nummern
4. Setzt `reward_status = 'pending'` für Rank 1
5. Speichert in `monthly_leaderboards` Tabelle

### 2. Auto-Reward-Aktivierung
**Zeitplan**: Täglich 01:00 UTC
**Handler**: `POST /api/admin/rewards/auto-activate`

```bash
curl -X POST https://bait-buddy.vercel.app/api/admin/rewards/auto-activate \
  -H "x-api-key: $ADMIN_API_KEY"
```

**Was es tut**:
1. Findet alle `monthly_leaderboards` mit `rank=1` und `reward_status='pending'`
2. Erstellt `reward_activations` Eintrag für jeden Gewinner
3. Ruft Supabase Auth Admin API auf: `updateUserById(user_id, { premium_plan_id: 'basic', premium_expires_at: now() + 30d })`
4. Setzt `reward_status = 'claimed'`

### 3. Event-Archivierung
**Zeitplan**: Stündlich
**Handler**: `PATCH /api/admin/events/auto-archive`

```bash
curl -X PATCH https://bait-buddy.vercel.app/api/admin/events/auto-archive \
  -H "x-api-key: $ADMIN_API_KEY"
```

**Was es tut**:
1. Findet alle `events` mit `end_date < now()` und `status='active'`
2. Berechnet finale Rankings + Platzierungs-Boni
3. Markiert Event als `status='ended'`

## 📦 Vercel Cron-Konfiguration

Ergänze `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/admin/leaderboards/monthly/generate",
      "schedule": "0 0 1 * *"
    },
    {
      "path": "/api/admin/rewards/auto-activate",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/admin/events/auto-archive",
      "schedule": "0 * * * *"
    }
  ]
}
```

## 🧪 Testing

### Lokales Testen der Punkte-Berechnung

```javascript
// src/lib/pointsCalculator.js
const result = await calculateSubmissionPoints(
  { species: 'Hecht', length_cm: 85, community_likes: 10 },
  'event-id',
  supabase
);
// { total: 585, breakdown: { base: 100, length_bonus: 425, species_bonus: 50, likes_points: 10 } }
```

### Manuelle Cron-Auslösung (Development)

```bash
# Terminal: Admin-API testen
ADMIN_API_KEY=test_key npm run dev

# In Browser/Postman:
POST http://localhost:3000/api/admin/leaderboards/monthly/generate
Header: x-api-key: test_key
```

## 🔒 Sicherheit

- **RLS (Row Level Security)**: Aktiviert für `event_invitations` und `reward_activations`
- **Ownership-Checks**: Nur Event-Creator kann Events bearbeiten/löschen
- **Auth erforderlich**: Alle POST/PATCH/DELETE Endpunkte erfordern Authentifizierung
- **Admin-Schutz**: Cron-Endpunkte erfordern gültigen `x-api-key` Header

## 🚀 Deployment

### 1. Datenbank-Migration ausführen
```bash
# Supabase CLI
supabase db push

# oder manuell: SQL aus supabase/schema.sql ausführen
psql -h db.xxx.supabase.co -d postgres -U postgres -f supabase/schema.sql
```

### 2. Event-Templates einrichten
```bash
# SQL-Seed aus supabase/seed-event-templates.sql ausführen
psql -h db.xxx.supabase.co -d postgres -U postgres -f supabase/seed-event-templates.sql
```

### 3. Environment-Variablen
```env
# .env.local (Backend)
ADMIN_API_KEY=your-secure-key-here
```

### 4. Vercel Deployment
```bash
git push origin main
# Vercel startet automatisches Deployment
```

## 📈 Monitoring

### Leaderboard-Status prüfen
```bash
curl https://bait-buddy.vercel.app/api/leaderboards/monthly?year=2026&month=6
```

### Aktive Rewards prüfen
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://bait-buddy.vercel.app/api/rewards/my-activations
```

### Event-Status prüfen
```bash
curl https://bait-buddy.vercel.app/api/events
```

## 🐛 Troubleshooting

### Problem: Rewards werden nicht aktiviert
**Lösung**: 
1. Prüfe `ADMIN_API_KEY` in Environment
2. Prüfe ob Cron-Job erfolgreich ausgelöst wurde (Vercel Dashboard)
3. Prüfe `reward_activations` Tabelle auf Fehler

### Problem: Punkte werden falsch berechnet
**Lösung**:
1. Prüfe `event_point_configs` für das Event
2. Stelle sicher, dass `species_bonus` JSONB korrekt ist
3. Teste `calculateSubmissionPoints()` Funktion manuell

### Problem: Einladungen funktionieren nicht
**Lösung**:
1. Prüfe `event_invitations` RLS Policy
2. Stelle sicher, dass User auth.jwt() haben
3. Prüfe dass `invitee_id` gültige E-Mail-Adresse ist

## 📞 Support

Bei Fragen zum Event-System: Siehe `/admin/events` Logs auf Vercel Dashboard.
