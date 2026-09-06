# BaitBuddy – AI-Powered Fishing Companion

BaitBuddy ist eine Angel-App mit KI-gestütztem Buddy, Fangbuch, Karten- und
Wetterfunktionen. Sie läuft als Web-App und wird für Android in einen
Capacitor-WebView verpackt.

**Live:** https://bait-buddy.vercel.app

**Self-Hosting:** Der komplette Stack (inkl. Supabase) läuft auch per
`docker compose` auf einem eigenen Rechner, siehe [docs/DOCKER_SELFHOST.md](docs/DOCKER_SELFHOST.md).

---

## 🎯 Key Features

**Intelligenter KI-Buddy**
- Kontextbewusste Antworten auf Basis von Fangbuch, Wetter und Schonzeiten
- Foto-Analyse: Fischart-Erkennung und Größen-/Gewichtsschätzung
- Optionaler Voice-Chat (Web Speech API, ElevenLabs TTS, OpenAI Realtime)
- Offline-Fallback mit vorgefertigten Antworten

**Fangbuch & Analyse**
- Fänge erfassen und auswerten, inkl. Foto und Standort
- Statistiken, Ranglisten, Events

**Karte & Bedingungen**
- Leaflet-Karte mit eigenen Spots, öffentlichen Angelorten (geclustert) und Genehmigungs-Standorten
- Wetter- und Wasserdaten, Solunar-/Gezeiten-Hinweise

**Offline-fähig**
- Kernfunktionen (u. a. Fang erfassen) funktionieren ohne Verbindung und synchronisieren später

---

## 🛠️ Tech Stack

| Layer | Technologie |
|-------|-------------|
| **Frontend** | Vite 6 + React 18 (JSX), Tailwind CSS, Radix/shadcn-UI, React Router |
| **Server-State** | TanStack Query |
| **Mobile-Wrapper** | Capacitor 6 (Android-WebView) |
| **Karten** | Leaflet + react-leaflet + leaflet.markercluster |
| **Backend** | Express (Node.js) als Vercel Serverless Function (`backend/`, gemountet über `api/[...path].mjs`) |
| **Datenbank & Auth** | Supabase (Postgres, GoTrue-Auth, Storage) |
| **LLM** | Anthropic Claude (Messages API) für Chat & Vision; OpenAI Realtime (optional) für Voice; ElevenLabs (optional) für TTS |
| **Tests** | Vitest (Unit), Playwright (E2E) |
| **CI/CD** | GitHub Actions; Vercel-Deploy (Web), Android-AAB-Build via Actions |

> Hinweis: Es kommt **kein** React Native/Expo, **kein** Firebase und (noch) **kein**
> Supabase-Realtime zum Einsatz. Der Datenzugriff läuft über einen eigenen
> REST-Client (`src/api/frontendClient.js`) gegen das Express-Backend.

---

## 🚀 Getting Started

### Voraussetzungen
- Node.js 18+ und npm
- Supabase-Projekt (URL + Keys), Anthropic-API-Key (`ANTHROPIC_API_KEY`) für KI-Funktionen

### Installation

```bash
# Repository klonen
git clone https://github.com/smokemoney81/baitbuddy.git
cd baitbuddy

# Abhängigkeiten installieren (Peer-Deps-Konflikte im Baum → legacy-peer-deps)
npm install --legacy-peer-deps

# Backend-Abhängigkeiten
npm install --legacy-peer-deps --prefix backend

# Environment-Variablen setzen (siehe backend/.env.example)
# u. a. SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY

# Frontend-Dev-Server
npm run dev

# Backend lokal (separates Terminal)
npm run start --prefix backend
```

### Nützliche Scripts

```bash
npm run dev        # Vite Dev-Server
npm run build      # Produktions-Build (Web)
npm run lint       # ESLint (--quiet)
npm run typecheck  # tsc checkJs über die konfigurierte Allowlist
npm test           # Vitest (Frontend + Backend)
npm run test:e2e   # Playwright E2E-Smoke
```

### Android (Capacitor)

```bash
npx cap sync android
npx cap open android
```

---

## 📊 Projektstruktur (Auszug)

```
baitbuddy/
├── api/[...path].mjs       # Vercel-Entry: re-exportiert die Express-App
├── backend/                # Express-Backend (Serverless)
│   └── src/
│       ├── server.js       # App, Middleware, Router-Mounts
│       ├── routes/         # ai, auth, catches, spots, community, events, …
│       ├── lib/            # llm, supabase, fetchWithTimeout, errorResponse, …
│       └── middleware/     # auth, rateLimit
├── src/                    # Vite/React-Frontend
│   ├── pages/              # Route-Seiten (Home, MapPage, KiBuddyBeta, …)
│   ├── components/         # Feature-Komponenten (ai, chatbot, map, community, …)
│   ├── hooks/              # useChatMessages, useSpeechRecognition, …
│   ├── api/                # frontendClient.js (REST), supabaseClient.js (OAuth)
│   ├── lib/                # AuthContext, ThemeContext, query-client, …
│   └── services/           # NotificationService, TideService, …
├── supabase/               # schema.sql, migrations/, security.sql
├── android/                # Capacitor-Android-Projekt
└── e2e/                    # Playwright-Tests
```

---

## 🔌 Integrationen

**Supabase** – Postgres-Datenbank, GoTrue-Auth, Storage (Fang-Fotos).

**Express-Backend** – kapselt alle Datenzugriffe und KI-Aufrufe; der
Service-Role-Key bleibt ausschließlich serverseitig.

**Externe APIs** – Anthropic Claude (LLM), open-meteo (Wetter), optional OpenAI Realtime und
ElevenLabs (Voice/TTS).

---

## 🔐 Auth-Architektur (zwei Session-Systeme)

1. **`bb_token`/`bb_refresh`** (Haupt-Pfad, E-Mail/Passwort): Login über
   `POST /api/auth/login`, Refresh nur 401-getriggert über
   `POST /api/auth/refresh` (`src/api/frontendClient.js`).
2. **Browser-Supabase-Session** (nur OAuth + Passwort-Reset): `autoRefreshToken`
   ist bewusst **deaktiviert**, damit beide Systeme nicht um das single-use
   Refresh-Token konkurrieren (`src/api/supabaseClient.js`, `src/lib/AuthContext.jsx`).

---

## 🧪 Testing

```bash
npm test           # Vitest (Frontend jsdom + Backend node)
npm run test:e2e   # Playwright-Smoke (nicht-blockierend in CI)
```

---

## 🔒 Security & Privacy

- Supabase-Auth mit sicherer Token-Behandlung, HTTPS für alle API-Aufrufe
- Service-Role-Key nur serverseitig; keine Secrets im Frontend-Bundle
- Rate-Limiting auf teuren/sensiblen Pfaden (`/api/ai`, Auth) — best-effort pro Instanz
- Input-Validierung, SSRF-Allowlist für Bild-Fetches

**Datenschutz:**
- **[Datenschutzrichtlinie](PRIVACY.md)** – vollständige Erläuterung aller erfassten Daten
- **[App Store Berechtigungen](APP_STORE_PERMISSIONS.md)** – Details zu Standort, Kamera, Mikrofon
- **DSGVO-konform** – Datenportabilität, Löschungsrecht, Transparenz
- **Keine Datenweitergabe** – Daten werden nicht an Werbetreibende verkauft

**Berechtigungen:**
- Standort: optional, in Einstellungen deaktivierbar
- Kamera: nur für Fangfotos
- Mikrofon: nur während Voice-Chat, nicht persistent

---

## 🤖 KI-Buddy

- Kontextuelle Antworten auf Basis von Fangbuch, Wetter und Schonzeiten
- Foto-Analyse: Fischart-Erkennung und Gewichtsschätzung (Claude Vision)
- Personalisierte Empfehlungen basierend auf der Historie
- Voice-Chat optional (OpenAI Realtime oder Web Speech API + ElevenLabs)
- Offline-Fallback mit gecachten Antworten

---

## ✅ App Store Compliance

- Datenschutzrichtlinie dokumentiert, alle Berechtigungen begründet
- Benutzerrechte implementiert (Datenlöschung, Export, Widerspruch)
- Konto-Löschung entfernt alle Daten
- Keine versteckten Tracking- oder Nutzungsgebühren

Siehe [APP_STORE_PERMISSIONS.md](APP_STORE_PERMISSIONS.md) für die Release-Checkliste.

---

## 📝 Contributing

1. Repository forken
2. Feature-Branch anlegen (`git checkout -b feature/MeinFeature`)
3. Änderungen committen
4. Branch pushen und Pull Request öffnen

Für größere Änderungen bitte zuerst ein Issue zur Abstimmung öffnen.
