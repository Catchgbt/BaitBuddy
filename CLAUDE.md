# BaitBuddy — Entwicklungsregeln für Claude

## Kommunikation

**Immer auf Deutsch antworten** — alle Antworten, Erklärungen und Zusammenfassungen in dieser Session und in zukünftigen Sessions auf Deutsch. (Code, Commit-Messages und PR-Titel dürfen technisch/englisch bleiben, wo üblich.)

## Keine Platzhalter und keine Emojis im Code

**Niemals Platzhalter setzen.** Keine Dummy-/Fake-/Mock-Werte, keine `TODO`-Stubs, keine „Lorem ipsum"-Texte, keine Beispiel-/Demo-Platzhalter und keine leeren „Coming soon"-Hülsen im produktiven Code. Immer echte, vollständig funktionsfähige Implementierungen mit echten Daten und echten Anbindungen liefern. Fehlt eine Information oder ist etwas unklar, nachfragen — statt einen Platzhalter einzusetzen.

**Keine dekorativen Emojis im App-Code.** Weder in JSX/HTML-Text, noch in Labels, Buttons, Überschriften, Fehlermeldungen, Toasts, `console.log` oder sonstigen UI-Texten. Dekorative Emojis werden ersatzlos entfernt bzw. — wo ein Icon inhaltlich sinnvoll ist — durch ein `lucide-react`-Icon ersetzt.

**Ausnahme: funktionale Emojis bleiben erlaubt.** Emojis, die als bewusster visueller Identifikator einer Entität dienen und nicht sinnvoll durch Text ersetzbar sind, dürfen bleiben — konkret:
- Länder-/Sprach-Flaggen im Sprachwähler (`src/components/i18n/LanguageSwitcher.jsx`, `flag: '🇩🇪'` …),
- Karten-Marker-Icons, bei denen das Emoji das Icon des Marker-/Spot-Typs IST (z. B. `src/components/map/**`, `MarkerDetailCard`-Adapter, `icon`-Datenfelder).

Faustregel: Steht das Emoji als **Datenwert** für das Icon einer Sache (`flag`/`icon`-Feld, Marker-Typ→Symbol-Map), ist es funktional und bleibt. Steht es **dekorativ im Fließtext/Label/Toast**, wird es entfernt.

## Infrastruktur: nur Vercel & Supabase

**Nur Vercel (Hosting/Deploy/Serverless) und Supabase (DB/Auth/Storage) verwenden.** Keine anderen externen Dienste/Backends einführen (kein base44, kein Render, keine sonstigen MCP-Services für Produktionslogik).

## Auth-Architektur: zwei Session-Systeme

Die App hat aktuell **zwei parallele Auth-Systeme**, die beide aktiv genutzt werden:

1. **bb_token/bb_refresh** (`src/api/frontendClient.js`) — der Haupt-Login-Pfad für E-Mail/Passwort. Login läuft über den Backend-Proxy `/api/auth/login` (der Server ruft `supabase.auth.signInWithPassword` mit dem Service-Role-Client auf); Token/Refresh-Token werden als reine Strings im Frontend in `localStorage` gehalten. Ablauf/Refresh läuft ausschließlich über den eigenen 401-getriggerten Refresh-Mechanismus (`ApiClient._refreshSession()` → `POST /api/auth/refresh`).
2. **Browser-Supabase-Session** (`src/api/supabaseClient.js`) — nur für OAuth-Login (`signInWithOAuth`) und Passwort-Reset (`resetPasswordForEmail`/`updateUser`). `AuthCallback.jsx`/`ResetPassword.jsx` übernehmen die daraus resultierende Session per `onAuthStateChange`/`getSession()` in `bb_token`/`bb_refresh`; `AuthContext.jsx` hält dafür einen App-weiten `onAuthStateChange`-Listener, der SIGNED_IN/SIGNED_OUT/TOKEN_REFRESHED-Events dauerhaft synchronisiert.

**Wichtig:** Beide Systeme würden denselben (rotierenden) Supabase-Refresh-Token verwalten. Damit nicht zwei unabhängige Refresh-Läufe (Browser-Client-Auto-Refresh vs. der eigene 401-Refresh) sich gegenseitig mit einem bereits verbrauchten Token aushebeln, ist `autoRefreshToken` im Supabase-Browser-Client (`src/api/supabaseClient.js`) **bewusst deaktiviert** — der bb_token-Refresh-Pfad ist der einzige aktive Refresh-Mechanismus. Eine vollständige Konsolidierung auf ein einziges Auth-System wurde bewusst zurückgestellt (größerer Eingriff über viele Call-Sites, OAuth-Flows lassen sich ohne echten Browser/echte Provider-Credentials nicht end-to-end verifizieren) — bei künftigen Auth-Änderungen diese Zweiteilung im Hinterkopf behalten.

## App-Distribution: PlayStore & Apple Store

**Die App muss später auf PlayStore und Apple Store deployed werden.** Code wird darauf optimiert — native APIs, Permissions, Device-Features und Platform-spezifische Anforderungen beachten.

## Tech Stack: React Native

**Frontend**: React Native (Expo oder Bare Workflow je nach Anforderung)  
**Backend**: Express (Node.js) auf Vercel Serverless  
**Datenbank & Auth**: Supabase (Realtime, Offline Sync via `@supabase/supabase-js`)  
**Package Manager**: npm mit legacy peer deps  
**CI/CD**: GitHub Actions + Fastlane für App Store Deployment

## Device-Features

Folgende Funktionen müssen implementiert werden:
- **Kamera** — Fotos von Fängen, Ködern, Spots
- **GPS/Location** — Spot-Tracking, Kartenfunktion, Geotagging
- **Offline-Sync** — Daten lokal speichern, asynchron zu Supabase synchen
- **Push Notifications** — Wetter-Warnungen, Events, Community-Updates

**Regel**: Permissions müssen präzise gecheckt werden. Nie blind Berechtigungen anfordern.

## Performance-Anforderungen

- **App-Start**: < 3 Sekunden vom Tap bis UI bereit
- **Low-End Support**: Funktioniert auf Geräten mit ≤2GB RAM
- **Offline-First**: Core-Funktionen funktionieren ohne Internet

**Regel**: Immer auf echten Devices testen, nicht nur Simulator/Emulator.

## Build & Release

**Fastlane + GitHub Actions**:
1. PR gemergt zu `main`
2. GitHub Actions baut APK/IPA via Fastlane
3. Automatischer Upload zu Google Play & Apple App Store (über Beta-Track zuerst)
4. Release-Notes auto-generiert aus Commits

**Kein manueller Upload** — alles automatisiert über CI/CD.

## App Store Richtlinien

**Apple App Store & Google Play haben strenge Regeln**:
- Privacy Policy muss inline erreichbar sein
- Datenhandling muss dokumentiert werden (besonders Location, Kamera)
- Keine versteckten Berechtigungen
- Testflights/Beta-Versionen vor öffentlichem Release

**Regel**: Bei neuen Features immer prüfen, ob App Store Review verlangt wird.

## Previews automatisch mergen

**Preview-Branches werden automatisch zu `main` gemergt**, wenn alle Checks grün sind.
