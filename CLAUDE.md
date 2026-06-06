# CLAUDE.md

Diese Datei gibt Claude Code (claude.ai/code) Hinweise zur Arbeit mit diesem Repository.

## Projektübersicht

BaitBuddy ist ein deutschsprachiger, KI-gestützter Angel-Assistent. Es handelt sich um eine mobile-first React-Web-App, die mit Capacitor für Android/iOS verpackt ist und von einem Node.js/Express-API-Server mit Supabase (PostgreSQL) als Datenbank betrieben wird. Die gesamte Benutzeroberfläche und alle benutzerseitigen Texte sind auf Deutsch.

## Befehle

### Frontend (Web-App)
```bash
npm run dev        # Vite-Entwicklungsserver auf localhost:5173
npm run build      # Produktions-Build → dist/
npm run preview    # Produktions-Build als Vorschau starten
npm run lint       # ESLint-Prüfung (flat config, --quiet)
npm run lint:fix   # ESLint-Probleme automatisch beheben
npm run typecheck  # TSC-Typprüfung via jsconfig.json
```

### Backend (Express-API)
```bash
cd backend
npm install
npm run dev        # node --watch src/server.js (startet bei Änderungen neu)
npm run start      # node src/server.js (Produktion)
```

### Mobile (Capacitor / Android)
```bash
cd frontend
npm run build        # Web-Assets bauen + Capacitor synchronisieren
npm run android      # Build + Sync zu Android
npm run android:open # Android Studio öffnen
```

Es gibt keine automatisierten Tests in diesem Projekt.

## Architektur

### Repository-Struktur

```
/
├── src/              # React-Web-App
│   ├── pages/        # Routingfähige Seitenkomponenten (46+ Seiten)
│   ├── components/   # Feature-organisierte Komponenten; src/components/ui/ ist die shadcn/ui-Bibliothek
│   ├── lib/          # Kernhilfsprogramme, Contexts, Hook-Helfer
│   ├── hooks/        # Benutzerdefinierte React-Hooks
│   ├── api/          # API-Client-Schicht
│   ├── App.jsx       # Root: Provider + Routing
│   ├── Layout.jsx    # Haupt-Sidebar/Nav-Layout-Wrapper
│   └── pages.config.js  # Automatisch generierte Seiten-Registry
├── backend/          # Express.js-API-Server
│   └── src/
│       ├── server.js         # App-Einstiegspunkt, 7 Routen-Module eingebunden
│       └── routes/           # ai.js, auth.js, catches.js, community.js, premium.js, spots.js, …
├── frontend/         # Capacitor-Mobile-Wrapper (android/, capacitor.config.ts)
├── supabase/
│   └── schema.sql    # Vollständiges PostgreSQL-Schema
└── public/           # Statische Assets
```

### Frontend-Stack

- **React 18** + **Vite 6** (Pfad-Alias `@` → `./src`)
- **Tailwind CSS 3** + **shadcn/ui** (Radix-UI-Primitive) für alle UI-Komponenten
- **React Router DOM 6** für das Routing
- **TanStack React Query 5** für den Server-State (staleTime 30s, gcTime 5min, kein Retry bei Mutationen)
- **Framer Motion** für Seitenübergänge (AnimatePresence umschließt alle Routen)
- **Leaflet + react-leaflet** für interaktive Karten
- **React Hook Form + Zod** für Formulare und Validierung
- **Recharts** für Datenvisualisierung

### Backend-Stack

- **Express 4** mit ES Modules (`"type": "module"`)
- **Supabase** (PostgreSQL) via `@supabase/supabase-js`
- **Anthropic SDK** (`@anthropic-ai/sdk`) für KI-Chat, Fang-Analyse, TTS und Empfehlungen
- **Helmet + CORS** als Sicherheits-Middleware

### API-Client-Schicht (`src/api/frontendClient.js`)

Dies ist die einzige Quelle der Wahrheit für die gesamte Frontend→Backend-Kommunikation. Sie exportiert:

- **`base44`** — Kompatibilitätsobjekt mit `.auth`, `.entities` (Proxy), `.functions.invoke()`, `.integrations`
- **Benannte Modul-Exporte** — `catches`, `spots`, `ai`, `weather`, `community`, `premium`, `fishing`, `events`, `gear`, `water`, `user` — jeweils mit typisierten Methoden

Die `entities`-Eigenschaft ist ein `Proxy`, der Entitätsnamen über `ENTITY_MAP` auf REST-Endpunkte abbildet:
```js
base44.entities.Catch.create(data)   // POST /api/catches
base44.entities.Spot.list()          // GET  /api/spots
```

Benannte Funktionen werden so aufgerufen:
```js
base44.functions.invoke('catchgbtChat', { messages })  // → POST /api/ai/chat
```

Das Auth-Token (`bb_token`) wird im `localStorage` gespeichert und als `Authorization: Bearer <token>` bei jeder Anfrage mitgesendet. Bei HTTP-Fehlern (non-2xx) werden Fehler mit `.status` und `.data` geworfen.

### Routing

Seiten werden automatisch aus `src/pages.config.js` registriert. Das Hinzufügen einer `.jsx`-Datei in `src/pages/` erzeugt automatisch eine Route unter `/<Dateiname>`. `App.jsx` iteriert über `pagesConfig.Pages` und rendert jede Seite unter der gemeinsamen `Layout`-Komponente, eingewickelt in `ErrorBoundary`. Drei Seiten (`CatchStats`, `AdminTracking`, `Help`) sind außerhalb der automatischen Registry fest kodiert.

### State-Management

1. **React Context** — drei Provider, immer am App-Root vorhanden:
   - `AuthProvider` (`src/lib/AuthContext.jsx`) — Benutzerobjekt, Auth-Status, Login/Logout
   - `NavigationProvider` (`src/lib/NavigationContext.jsx`) — Navigationsverlauf/-zustand
   - `MobileStackProvider` (`src/components/navigation/MobileStackManager.jsx`) — Android-ähnlicher Back-Stack

2. **TanStack React Query** — alle Serverdaten. Query-Keys als String-Arrays verwenden (z. B. `['catches']`).

3. **Optimistische Updates** — `useOptimisticMutation` aus `src/lib/useOptimisticMutation.js` für jede Datenmutation verwenden. Es bricht laufende Abfragen ab, erstellt einen Snapshot der vorherigen Daten, wendet das Update sofort an und macht es bei Fehlern rückgängig, mit automatischer Invalidierung beim Abschluss.

## Wichtige Konventionen

### Optimistische Mutationen

`useOptimisticMutation` immer gegenüber dem rohen `useMutation` bevorzugen:

```js
import { useOptimisticMutation } from '@/lib/useOptimisticMutation';

const mutation = useOptimisticMutation({
  queryKey: 'catches',           // oder Array von Keys
  mutationFn: (data) => base44.entities.Catch.create(data),
  optimisticUpdate: (oldList = [], newItem) => [
    { id: `tmp-${Date.now()}`, ...newItem },
    ...oldList,
  ],
  onSuccess: () => toast.success('Fang gespeichert'),
});
mutation.mutate(catchData);
```

### Barrierefreie Icon-Buttons

Niemals einen bloßen `<button>` mit einem Icon verwenden. Immer `AccessibleIconButton` nutzen:

```js
import { AccessibleIconButton } from '@/components/ui/AccessibleIconButton';
import { X } from 'lucide-react';

<AccessibleIconButton icon={X} label="Schließen" onClick={handleClose} />
```

ARIA-Labels sind zentral in `src/lib/ariaLabels.js` hinterlegt. `getAriaLabel('IconName')` für Konsistenz in der gesamten App verwenden.

### Mobile-Navigation

Den `useMobileStack()`-Hook (aus `MobileStackProvider`) für die Zurück-Schaltflächen-Behandlung unter Android verwenden. Minimale Tipp-Zielgröße für alle interaktiven Elemente: 44×44px.

### Pfad-Aliase

`@` wird in Vite (`vite.config.js`) und TypeScript (`jsconfig.json`) zu `./src` aufgelöst. Immer `@/`-Importe verwenden statt relativer Pfade über Verzeichnisgrenzen hinweg.

### Umgebungsvariablen

- Frontend: müssen mit `VITE_` beginnen (z. B. `VITE_API_URL`)
- Backend: werden von `dotenv` geladen, kein Präfix erforderlich
- Backend-API-URL fällt auf `https://baitbuddy-backend.onrender.com` zurück, wenn `VITE_API_URL` nicht gesetzt ist

### ESLint

ESLint verwendet die Flat-Config (`eslint.config.js`). Die Verzeichnisse `src/components/ui/` und `src/lib/` (shadcn) sind von den Unused-Import-Regeln ausgenommen. Vor dem Commit `npm run lint:fix` ausführen.

## CI/CD

`.github/workflows/build-apk.yml` erstellt bei manuellem Dispatch oder Versions-Tags (`v*`) ein Debug-APK und ein signiertes Release-AAB, wenn Keystore-Secrets vorhanden sind (`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`). Die Web-App wird über Vercel bereitgestellt (`vercel.json`).
