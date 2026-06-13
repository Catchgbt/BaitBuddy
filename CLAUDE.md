# BaitBuddy — Entwicklungsregeln für Claude

## Kommunikation

**Immer auf Deutsch antworten** — alle Antworten, Erklärungen und Zusammenfassungen in dieser Session und in zukünftigen Sessions auf Deutsch. (Code, Commit-Messages und PR-Titel dürfen technisch/englisch bleiben, wo üblich.)

## Infrastruktur: nur Vercel & Supabase

**Nur Vercel (Hosting/Deploy/Serverless) und Supabase (DB/Auth/Storage) verwenden.** Keine anderen externen Dienste/Backends einführen (kein base44, kein Render, keine sonstigen MCP-Services für Produktionslogik).

## Projektziel: Neue Web-App ersetzt bestehende PlayStore Version

**BaitBuddy Web-App ersetzt die bisherige Mobile-App.** Die neue Webanwendung in `src/` ist das Produktions-Frontend. Die PlayStore-Version wird durch diese Web-App auf https://bait-buddy.vercel.app ersetzt.

Native API-Clients (alle aus `src/api/`):
- `auth` (`@/api/auth`) — Login/Logout/Registrierung, aktueller Benutzer
- `entities` (`@/api/frontendClient`) — Entity-CRUD (`entities.Catch.list()` …); pro-Entity-Module unter `@/entities/*` (z. B. `@/entities/Catch`)
- `functions` (`@/api/frontendClient`) — `functions.invoke(name, data)` via `FUNCTION_MAP`
- `integrations` (`@/api/frontendClient` bzw. `@/integrations/Core`) — InvokeLLM, UploadFile, …
- `analytics`, `appLogs` (`@/api/frontendClient`) — No-op-Clients
- spezialisierte Module: `catches`, `spots`, `ai`, `community`, `premium`, `fishing`, `events`, `gear`, `water`, `user`

**Regel:** Immer mit den nativen Clients arbeiten. Das `base44/`-Verzeichnis ist nur Altmetadaten und wird vom Code nicht verwendet.

## WICHTIG: Es gibt NUR EINE App

**Immer mit `src/` (Root) arbeiten. Niemals `frontend/` anfassen.**

| Verzeichnis | Status |
|-------------|--------|
| `src/` | ✅ Die echte App — hier werden alle Änderungen gemacht |
| `frontend/` | ❌ Alte Claude-Baustelle — wird NICHT deployed, NICHT anfassen |

### Vercel baut aus Root

```json
// vercel.json — so muss es bleiben:
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install --legacy-peer-deps && cd backend && npm install"
}
```

Niemals `buildCommand` auf `frontend/` oder ein anderes Unterverzeichnis ändern.

### Build-Befehle

```bash
npm run dev        # Dev-Server starten
npm run build      # Production-Build (Output: dist/)
```

## Projektstruktur

```
BaitBuddy/
├── src/           # ← Die App (React + Vite)
│   ├── pages/     # Alle Seiten (Home.jsx, Dashboard.jsx, ...)
│   ├── components/
│   ├── api/       # frontendClient.js — ersetzt @base44/sdk
│   └── lib/       # AuthContext, etc.
├── backend/       # Express-Backend (Supabase, AI, Auth)
├── api/           # Vercel Serverless Entry (api/[...path].mjs)
├── dist/          # Build-Output (automatisch generiert)
├── vercel.json    # Deployment-Config — nicht ändern ohne Rücksprache
└── frontend/      # ❌ NICHT VERWENDEN
```

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + Framer Motion
- **Backend**: Express (Node.js) auf Vercel Serverless
- **Auth**: JWT via `/api/auth/login` und `/api/auth/register`
- **Routing**: React Router DOM (alle Seiten in `src/pages/`)
- **API-Client**: `src/api/frontendClient.js` (kein @base44/sdk)

## Live-URL

**https://bait-buddy.vercel.app** — wird bei jedem Merge zu `main` aktualisiert
