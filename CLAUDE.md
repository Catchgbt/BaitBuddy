# BaitBuddy — Entwicklungsregeln für Claude

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
