# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BaitBuddy is a German-language AI-powered fishing assistant. It is a mobile-first React web app wrapped in Capacitor for Android/iOS, backed by a Node.js/Express API server connected to Supabase (PostgreSQL). The entire UI and all user-facing text is in German.

## Commands

### Frontend (web app)
```bash
npm run dev        # Vite dev server on localhost:5173
npm run build      # Production build → dist/
npm run preview    # Preview production build
npm run lint       # ESLint check (flat config, --quiet)
npm run lint:fix   # Auto-fix ESLint issues
npm run typecheck  # TSC type check via jsconfig.json
```

### Backend (Express API)
```bash
cd backend
npm install
npm run dev        # node --watch src/server.js (auto-restarts on change)
npm run start      # node src/server.js (production)
```

### Mobile (Capacitor / Android)
```bash
cd frontend
npm run build       # Build web assets + sync Capacitor
npm run android     # Build + sync to Android
npm run android:open  # Open Android Studio
```

There are no automated tests in this project.

## Architecture

### Repository Layout

```
/
├── src/              # React web app
│   ├── pages/        # Routable page components (46+ pages)
│   ├── components/   # Feature-organized components; src/components/ui/ is shadcn/ui library
│   ├── lib/          # Core utilities, contexts, hooks helpers
│   ├── hooks/        # Custom React hooks
│   ├── api/          # API client layer
│   ├── App.jsx       # Root: providers + routing
│   ├── Layout.jsx    # Main sidebar/nav layout wrapper
│   └── pages.config.js  # Auto-generated page registry
├── backend/          # Express.js API server
│   └── src/
│       ├── server.js         # App entry point, 7 route modules mounted
│       └── routes/           # ai.js, auth.js, catches.js, community.js, premium.js, spots.js, …
├── frontend/         # Capacitor mobile wrapper (android/, capacitor.config.ts)
├── supabase/
│   └── schema.sql    # Full PostgreSQL schema
└── public/           # Static assets
```

### Frontend Stack

- **React 18** + **Vite 6** (path alias `@` → `./src`)
- **Tailwind CSS 3** + **shadcn/ui** (Radix UI primitives) for all UI components
- **React Router DOM 6** for routing
- **TanStack React Query 5** for server state (staleTime 30s, gcTime 5min, no retry on mutations)
- **Framer Motion** for page transitions (AnimatePresence wraps all routes)
- **Leaflet + react-leaflet** for interactive maps
- **React Hook Form + Zod** for forms and validation
- **Recharts** for data visualization

### Backend Stack

- **Express 4** with ES Modules (`"type": "module"`)
- **Supabase** (PostgreSQL) via `@supabase/supabase-js`
- **Anthropic SDK** (`@anthropic-ai/sdk`) for AI chat, catch analysis, TTS, and recommendations
- **Helmet + CORS** for security middleware

### API Client Layer (`src/api/frontendClient.js`)

This is the single source of truth for all frontend→backend communication. It exports:

- **`base44`** — compatibility object with `.auth`, `.entities` (Proxy), `.functions.invoke()`, `.integrations`
- **Named module exports** — `catches`, `spots`, `ai`, `weather`, `community`, `premium`, `fishing`, `events`, `gear`, `water`, `user` — each with typed methods

The `entities` property is a `Proxy` that maps entity names to REST endpoints via `ENTITY_MAP`:
```js
base44.entities.Catch.create(data)   // POST /api/catches
base44.entities.Spot.list()          // GET  /api/spots
```

Named functions are invoked via:
```js
base44.functions.invoke('catchgbtChat', { messages })  // → POST /api/ai/chat
```

Auth token (`bb_token`) is stored in `localStorage` and injected as `Authorization: Bearer <token>` on every request. Errors with `.status` and `.data` are thrown for HTTP non-2xx responses.

### Routing

Pages are auto-registered from `src/pages.config.js`. Adding a `.jsx` file in `src/pages/` causes it to appear as a route at `/<filename>`. `App.jsx` iterates `pagesConfig.Pages` and renders each under the shared `Layout` component wrapped in `ErrorBoundary`. Three pages (`CatchStats`, `AdminTracking`, `Help`) are hard-coded outside the auto-registry.

### State Management

1. **React Context** — three providers, always present at the app root:
   - `AuthProvider` (`src/lib/AuthContext.jsx`) — user object, auth status, login/logout
   - `NavigationProvider` (`src/lib/NavigationContext.jsx`) — navigation history/state
   - `MobileStackProvider` (`src/components/navigation/MobileStackManager.jsx`) — Android-style back-stack

2. **TanStack React Query** — all server data. Use query keys as string arrays (e.g., `['catches']`).

3. **Optimistic updates** — use `useOptimisticMutation` from `src/lib/useOptimisticMutation.js` for any data mutation. It cancels in-flight queries, snapshots previous data, applies the update immediately, and rolls back on error with auto-invalidation on settle.

## Key Conventions

### Optimistic Mutations

Always prefer `useOptimisticMutation` over raw `useMutation`:

```js
import { useOptimisticMutation } from '@/lib/useOptimisticMutation';

const mutation = useOptimisticMutation({
  queryKey: 'catches',           // or array of keys
  mutationFn: (data) => base44.entities.Catch.create(data),
  optimisticUpdate: (oldList = [], newItem) => [
    { id: `tmp-${Date.now()}`, ...newItem },
    ...oldList,
  ],
  onSuccess: () => toast.success('Fang gespeichert'),
});
mutation.mutate(catchData);
```

### Accessible Icon Buttons

Never use bare `<button>` with an icon. Always use `AccessibleIconButton`:

```js
import { AccessibleIconButton } from '@/components/ui/AccessibleIconButton';
import { X } from 'lucide-react';

<AccessibleIconButton icon={X} label="Schließen" onClick={handleClose} />
```

ARIA labels are centralized in `src/lib/ariaLabels.js`. Use `getAriaLabel('IconName')` for consistency across the app.

### Mobile Navigation

Use the `useMobileStack()` hook (from `MobileStackProvider`) for back-button handling on Android. Minimum tap target size is 44×44px for all interactive elements.

### Path Aliases

`@` resolves to `./src` in both Vite (`vite.config.js`) and TypeScript (`jsconfig.json`). Always use `@/` imports rather than relative paths crossing directory boundaries.

### Environment Variables

- Frontend: must be prefixed `VITE_` (e.g., `VITE_API_URL`)
- Backend: loaded by `dotenv`, no prefix required
- Backend API URL defaults to `https://baitbuddy-backend.onrender.com` if `VITE_API_URL` is unset

### ESLint

ESLint uses the flat config (`eslint.config.js`). The `src/components/ui/` and `src/lib/` shadcn directories are excluded from unused-import rules. Run `npm run lint:fix` before committing.

## CI/CD

`.github/workflows/build-apk.yml` builds a debug APK on manual dispatch or version tags (`v*`), and a signed release AAB when keystore secrets are present (`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`). The web app deploys via Vercel (`vercel.json`).
