# BaitBuddy — Tiefer Bug-Scan: Findings-Report

Systematischer 20-Sektoren-Scan der Codebasis. Pro Sektor: gefundene Bugs,
umgesetzte Fixes und dokumentierte (riskante/architektonische) Funde.

Basis-Status vor Scan: `lint`, `typecheck`, `test` (159 Tests) grün.

---

## Sektor 01 — Auth-Frontend

**Gefixt:**
- `src/components/ProtectedRoute.jsx`: Komponente destrukturierte `authChecked`
  und `checkUserAuth` aus `useAuth()`, die der `AuthContext` gar nicht bereitstellt
  (er liefert `isLoadingAuth`, `isAuthenticated`, `authError`, `checkAppState`).
  Dadurch war `!authChecked` immer `true` → die Guard `if (isLoadingAuth || !authChecked)`
  hätte dauerhaft nur den Fallback-Spinner gerendert und der Effekt `checkUserAuth()`
  hätte einen `TypeError` geworfen (undefined is not a function). Auf den echten
  Context-API (`isLoadingAuth`, `isAuthenticated`, `checkAppState`) umgestellt.
  (Komponente ist derzeit nicht im Routing eingebunden — Fix verhindert eine
  latente Zeitbombe bei Wiederverwendung.)

**Geprüft, unauffällig:** `frontendClient.js` (Refresh-Dedup via `_refreshPromise`,
kombinierte Abort-Signale, Offline-Cache), `AuthContext.jsx`, `AuthCallback.jsx`
(sauberes Unsubscribe + Timeout-Cleanup), `ResetPassword.jsx`, `supabaseClient.js`.

## Sektor 02 — KI-Buddy Chat-UI

**Gefixt:**
- `src/utils/buddyActions.js` (`open_url`-Aktion): Öffnete eine KI-generierte
  (und damit per Prompt-Injection beeinflussbare) URL ungeprüft via
  `window.open(p.url, '_blank')`. Ergänzt: Protokoll-Validierung (nur
  `http:`/`https:`, blockiert `javascript:`/`data:`) und `noopener,noreferrer`
  gegen Reverse-Tabnabbing.

**Geprüft, unauffällig:** `AIBuddyWidget.jsx` (Unmount-Guard `isMountedRef`,
TTS-Abbruch im Cleanup, Timer-Cleanups, kombinierte Offline-Fallbacks im
`catch`), `useChatMessages.js`, `useBuddyStorage.js` (gedrosselte
Positions-Persistenz mit Timer-Cleanup), `MessageBubble.jsx`, `BuddyOutput.jsx`.

## Sektor 06 — Wetter & Wasser (Berechnungen)

**Gefixt:**
- `src/services/SolunarService.js`: `referenceNewMoon` wurde mit dem lokalen
  `Date`-Konstruktor (`new Date(2000, 0, 6, 18, 14, 0)`) erzeugt, obwohl der
  Kommentar UTC angibt und `getMoonPhase()` absolute `getTime()`-Differenzen
  bildet. Dadurch hing die berechnete Mondphase von der Zeitzone der Maschine ab.
  Auf `Date.UTC(...)` umgestellt.
- `src/services/TideService.js` (`getTideRecommendation`): Prüfte
  `hoursToNext <= 1 && minutesToNext <= 30`, also die Minuten-Komponente
  unabhängig von den Stunden — 0h45m galt so als "nicht optimal", 1h20m aber als
  "optimal". Auf Gesamtzeit (`totalMinutes <= 90 / <= 180`) umgestellt.
- `src/utils/baitPrognosis.utils.js` (`generateExplanation`): `factors.sort(...)`
  mutierte das Array in-place, das gleichzeitig als `result.factors` vom
  Radar-Chart gerendert wird → verschob dessen Anzeige-Reihenfolge. Sortiert jetzt
  eine Kopie (`[...factors]`).

**Geprüft, unauffällig:** `sunCalc.js` (korrekte NOAA-Implementierung),
`FishPredictionService.js`.

## Sektor 05 — Fänge & Logbuch (Optimistic-Updates)

**Gefixt:**
- `src/hooks/useOptimisticMutation.js` **entfernt** (tote, defekte
  Doppel-Implementierung). Zeile 30 enthielt `const [isPending, setIsPending] =
  useCallback(false);` — `useCallback(false)` liefert `false`, das nicht
  iterierbar ist → jede Komponente, die den Hook importiert hätte, wäre beim
  Rendern mit `TypeError: false is not iterable` abgestürzt (zudem `useState` gar
  nicht importiert). Kein einziger Import verweist auf diese Datei; alle Aufrufer
  nutzen die funktionierende Implementierung in `src/lib/useOptimisticMutation.js`
  (bzw. `src/lib/optimistic/useOptimisticMutation.ts`). Datei gelöscht, um den
  latenten Crash und die verwirrende Schatten-Implementierung zu beseitigen.

**Geprüft, unauffällig:** `src/lib/useOptimisticMutation.js` (korrekter
`useMutation`-Wrapper mit Snapshot/Rollback/Invalidate), `useOptimisticCatch.ts`.

## Sektor 13 — Offline & PWA

**Gefixt:**
- `src/utils/offlinePhotoStorage.js`: `getUnsyncdOfflinePhotos()` und
  `cleanupSyncedPhotos()` fragten den `synced`-Index ab (`index.getAll(false)` /
  `index.getAll(true)`). `synced` wird jedoch als **Boolean** gespeichert, und
  Booleans sind laut IndexedDB-Spezifikation **keine gültigen Schlüssel** — solche
  Datensätze werden gar nicht in den Index aufgenommen. Beide Abfragen lieferten
  daher immer eine leere Liste: Offline-Fotos wurden nie zum Sync herausgegeben
  (`offlineSync.js` hängt an `getUnsyncdOfflinePhotos`) und das Cleanup löschte
  nie etwas. Auf `store.getAll()` + JS-Filter umgestellt (wie es
  `getOfflinePhotoStats` bereits korrekt macht) — ohne Schema-Migration.

**Geprüft, unauffällig:** `retryUtils.js`, `networkStatus.js`.

## Sektor 15 — Backend-Basis & Middleware

**Geprüft, unauffällig:** `auth.js` (kurzlebiger Token-Cache mit TTL + Größen-
Limit, Admin-Allowlist), `errorResponse.js` (generische DB-Fehler, kein Leak),
`fetchWithTimeout.js` (AbortController + Timeout), `urlSafety.js`
(SSRF-Host-Whitelist), `rateLimit.js` (Fail-Open bei KV-Ausfall).

## Sektor 16 — KI-Backend

**Gefixt:**
- `backend/src/routes/ai.js` (`/ai/chat`, Wetter-Kontext): `userLocation.latitude`
  /`longitude` wurden ungeprüft in die open-meteo-URL interpoliert. Ein String wie
  `"52.5&extra=1"` hätte fremde Query-Parameter einschleusen können. Ergänzt:
  harte `Number.isFinite`-Validierung inkl. Wertebereich (lat ±90, lon ±180),
  sonst wird der Wetterkontext verworfen.

**Geprüft, unauffällig:** `lib/llm.js` (Retry mit Backoff, Timeout,
Response-Struktur-Validierung), Prompt-Injection-Schutz (Längenlimits für
Chat-/Catch-/Kontext-Strings), SSRF-Schutz bei Bild-URLs (`isAllowedFetchUrl`).

## Sektor 17 — Daten-Routen A (Kern)

**Geprüft, unauffällig:** `catches.js`, `spots.js`, `community.js`,
`userEntities.js`, `backups.js`, `sync.js` — durchgehend Ownership-Checks
(`.eq('created_by'/'user_email', req.user.email)`) auf GET/PATCH/DELETE,
Feld-Whitelists bei Updates, `sendDbError` statt Roh-Fehler.

## Sektor 18 — Daten-Routen B (Features)

**Geprüft, unauffällig:** `bathymetry.js`, `gear.js`, `notes.js`, `misc.js`,
`socialMedia.js`, `waterData.js`, `events.js`, `premium.js`,
`lib/closedSeason.js` (korrekte Monat/Tag-Vergleiche inkl. jahresübergreifender
Schonzeiten Okt–Feb).

## Sektoren 03, 04, 07–12, 14, 19, 20 — weiterer Scan

Gescannt (Voice-Cleanup, Karte/GPS-Koordinaten, Events/Ranking, LiveTrip-Sync,
Gear/Shop, Premium-Gating, Quiz/Spiele, sonstige Hooks/Services, Android/Capacitor,
Security-Querschnitt). Muster-Scans (fehlende `noopener` bei `window.open`,
`dangerouslySetInnerHTML`, Timer-/Listener-Cleanups, `JSON.parse`-Guards,
Ownership-Checks) ergaben keine weiteren eindeutig falschen Live-Bugs über die oben
gefixten hinaus. `TripSyncService.js` und `NotificationService.js` haben saubere
Interval-/Listener-Cleanups; `dangerouslySetInnerHTML` findet sich nur in
`components/ui/chart.jsx` (statisches, generiertes CSS — kein User-Input).

### Dokumentiert (nicht angefasst — Risiko/Architektur)
- `window.open(..., '_blank')` ohne `noopener` an mehreren Stellen
  (`SocialMediaShareDialog.jsx`, `map/v2/*`, `TripPlanner.jsx`,
  `CommunitySection.jsx`). Ziele sind statische/vertrauenswürdige URLs (Karten,
  Facebook-Gruppe); moderne Browser setzen für `_blank` ohnehin implizit
  `noopener`. Reverse-Tabnabbing-Restrisiko gering — bewusst nicht in diesem
  Scan gebündelt geändert (rein mechanische, breit gestreute Änderung).
- Doppelte/parallele Optimistic-Mutation-Implementierungen
  (`src/lib/useOptimisticMutation.js` vs. `src/lib/optimistic/useOptimisticMutation.ts`)
  bleiben bestehen; beide sind in Benutzung. Konsolidierung wäre ein größerer,
  koordinierter Eingriff.

### Supabase-Advisors (read-only, `baitbuddy-prod`)
Security-Advisor-Lauf ergab (nur dokumentiert, keine DB-Änderung im Rahmen des
Code-Scans):
- **INFO `rls_enabled_no_policy`** auf praktisch allen `public`-Tabellen: RLS ist
  aktiviert, aber es existieren keine Policies. Das ist mit der App-Architektur
  konsistent — sämtlicher Datenzugriff läuft über den Backend-Service-Role-Client
  (`backend/src/lib/supabase.js`), der RLS umgeht; Ownership wird im Backend per
  `created_by`/`user_email`-Filter erzwungen (siehe Sektoren 17/18). Ein direkter
  Anon-Key-Zugriff wäre damit vollständig gesperrt. Falls künftig direkter
  Client-Zugriff geplant ist, müssen Policies ergänzt werden.
- **WARN `auth_leaked_password_protection`**: HaveIBeenPwned-Prüfung deaktiviert.
  Empfehlung: in den Supabase-Auth-Einstellungen aktivieren.
  https://supabase.com/docs/guides/auth/password-security

