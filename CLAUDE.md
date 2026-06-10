# BaitBuddy — Entwicklungsregeln für Claude

## Kommunikation

**Immer auf Deutsch antworten** — alle Antworten, Erklärungen und Zusammenfassungen in dieser Session und in zukünftigen Sessions auf Deutsch. (Code, Commit-Messages und PR-Titel dürfen technisch/englisch bleiben, wo üblich.)

## Projektziel: Unabhängigkeit von base44

**BaitBuddy soll vollständig unabhängig von base44 werden.**

- Die npm-Abhängigkeit `@base44/sdk` ist bereits entfernt. `src/api/frontendClient.js` ist aktuell nur ein **Kompatibilitäts-Shim**, der die base44-SDK-Form nachbaut (`base44.entities.*`, `base44.auth.*`, `base44.functions.invoke`, `base44.integrations.Core.*`).
- **Ziel:** diesen Shim schrittweise abbauen und durch native, eigene API-Clients ersetzen (die sauberen Named Exports in `frontendClient.js` wie `catches`, `spots`, `ai`, `community`, `premium`, `fishing`, `events`, `gear`, `water`, `user` sind die Zielform).
- Ca. **109 Dateien** in `src/` nutzen noch das `base44.*`-Muster → werden nach und nach migriert.
- Das `base44/`-Verzeichnis (config.jsonc, entities/, functions/) ist nur noch base44-Altmetadaten und wird vom laufenden Code **nicht** verwendet — kann am Ende der Migration gelöscht werden.
- Bei neuem Code **keine** neuen `base44.*`-Aufrufe einführen; native Clients verwenden.

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
