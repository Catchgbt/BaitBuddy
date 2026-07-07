# BaitBuddy — Entwicklungsrichtlinien für Claude

## 🎯 Projekt-Übersicht
**BaitBuddy** ist eine React Native Angeln-App für iOS/Android mit AI-gestütztem KI-Buddy. Backend läuft auf Vercel, Datenspeicher auf Supabase.

## 📋 Sprache & Kommunikation
- **Immer auf Deutsch antworten** (Erklärungen, Zusammenfassungen, Text)
- Code, Commits und PR-Titel dürfen englisch sein, wo technisch sinnvoll
- Keine Ankündigungen von Check-ins beim PR-Watching (einfach im Hintergrund erledigen)

## 🚫 Code-Standards: Keine Platzhalter, keine dekorativen Emojis

### Platzhalter absolut verboten
Keine `TODO`-Stubs, `Lorem ipsum`, Mock-Werte, leere „Coming soon"-Hülsen oder Dummy-Daten im produktiven Code. **Immer echte, funktionierende Implementierungen mit echten Daten und echten API-Anbindungen liefern.** Falls Information fehlt → nachfragen statt Platzhalter setzen.

### Emojis: Funktional ja, dekorativ nein
- ❌ **Keine** dekorativen Emojis in UI-Text, Labels, Buttons, Überschriften, Fehlermeldungen, Toasts oder `console.log`
- ✅ **Funktionale Emojis bleiben**: 
  - Länder-/Sprach-Flaggen (z. B. `LanguageSwitcher.jsx`: `🇩🇪`, `🇬🇧`)
  - Marker-Icons auf der Karte (z. B. Fisch-Spot = `icon`-Datenfeld)

**Faustregel:** Emoji als Datenwert für ein Icon? Funktional → bleibt. Emoji dekorativ im Text? → weg, ggf. durch `lucide-react`-Icon ersetzen.

---

## 🏗️ Tech-Stack

| Layer | Technologie |
|-------|-------------|
| **Frontend** | React Native (Expo oder Bare Workflow) |
| **Backend** | Express (Node.js) auf Vercel Serverless |
| **Datenbank & Auth** | Supabase (Realtime, Offline Sync) |
| **Package Manager** | npm mit legacy peer deps (`--legacy-peer-deps`) |
| **CI/CD** | GitHub Actions + Fastlane (App Store Deploy) |

---

## 🔑 Auth-Architektur: Zwei Session-Systeme

Die App nutzt **absichtlich zwei parallele Auth-Pfade**, beide aktiv:

### 1. `bb_token` / `bb_refresh` (Haupt-Pfad für E-Mail/Passwort)
- Stored in `localStorage` (reine Strings)
- Login via Backend-Proxy: `POST /api/auth/login` → Server-seitig `supabase.auth.signInWithPassword` (Service-Role-Client)
- Refresh: Nur über 401-getriggerter eigener Mechanismus (`ApiClient._refreshSession()` → `POST /api/auth/refresh`)
- Location: `src/api/frontendClient.js`

### 2. Browser-Supabase-Session (nur OAuth + Passwort-Reset)
- `signInWithOAuth` für Social-Login
- `resetPasswordForEmail` / `updateUser` für Passwort-Handling
- Synchronisierung in `bb_token`/`bb_refresh` via `AuthCallback.jsx` / `ResetPassword.jsx`
- `AuthContext.jsx` hält zentralen `onAuthStateChange`-Listener (SIGNED_IN/SIGNED_OUT/TOKEN_REFRESHED)
- Location: `src/api/supabaseClient.js`

### ⚠️ Kritisch
`autoRefreshToken` ist in `supabaseClient.js` **deaktiviert**, um Token-Konflikt zu vermeiden (nur `bb_token`-Refresh ist aktiv). Eine vollständige Konsolidierung wurde bewusst zurückgestellt (zu großer Eingriff, OAuth nicht offline verifizierbar). **Bei zukünftigen Auth-Änderungen diese Dualität beachten.**

---

## 🤖 KI-Buddy (CloudMD) — Kernfeature

Der **KI-Buddy** ist zentrales Feature mit oberster Priorität. Muss reibungslos, stabil und performant laufen.

### Anforderungen
- Intuitive Konversations-UI
- Kontext-bewusste Antworten (Spot-Info, Wetter, Köder-Tipps)
- Schnelle Response-Zeit (< 2 Sek. Latenz)
- Funktioniert auch offline (gecachte Responses)
- Personalisierte Empfehlungen basierend auf User-History

### Architektur
- **Frontend**: `src/components/KiBuddy/` (Chat-UI, Input, Message-List)
- **Backend**: `api/routes/kibuddy.js` (Prompt-Handling, LLM-Integration, Context-Building)
- **Datenbank**: Supabase-Tabellen für Chat-History, User-Context, Cached-Responses
- **LLM**: Claude API (via Anthropic SDK, nicht direkt vom Frontend)

### Dev-Checkliste
- [ ] Keine Platzhalter in KI-Responses (echte Kontextdaten)
- [ ] Fehlerbehandlung robust (Timeout, API-Fehler, Offline)
- [ ] Unit & Integration Tests für KI-Logik
- [ ] Performance-Test (Response < 2 Sek.)
- [ ] Accessibility (Screen Reader, Mobile)
- [ ] App Store Review vorbereitet (Privacy, Datenhandling dokumentiert)

---

## 📱 Device-Features (Pflicht)

| Feature | Anforderung |
|---------|-----------|
| **Kamera** | Fotos von Fängen, Ködern, Spots |
| **GPS/Location** | Spot-Tracking, Kartenfunktion, Geotagging |
| **Offline-Sync** | Lokale Speicherung, async. Supabase-Sync |
| **Push Notifications** | Wetter-Warnungen, Events, Community-Updates |

**Regel:** Permissions immer präzise checken, niemals blind anfordern.

---

## ⚡ Performance-Anforderungen

- **App-Start:** < 3 Sekunden (Tap → UI bereit)
- **Low-End-Geräte:** Funktioniert mit ≤2GB RAM
- **Offline-First:** Core-Features funktionieren ohne Internet
- **KI-Buddy Response:** < 2 Sekunden

**Regel:** Immer auf echten Devices testen (nicht nur Simulator/Emulator).

---

## 🏭 Infrastruktur: Nur Vercel & Supabase

- ✅ Vercel (Hosting, Serverless, Deploy)
- ✅ Supabase (DB, Auth, Realtime, Storage)
- ❌ **Keine** anderen externen Dienste/Backends (kein Render, keine zusätzlichen MCP-Services)

---

## 📦 Build & Release

**Automatisiert via GitHub Actions + Fastlane:**
1. PR → `main` gemergt
2. GitHub Actions baut APK/IPA automatisch
3. Upload zu Google Play & Apple App Store (Beta-Track zuerst)
4. Release-Notes auto-generiert aus Commits

**Kein manueller Upload erlaubt** — alles CI/CD.

---

## 🎁 App Store Compliance

Apple App Store & Google Play verlangen:
- ✅ Privacy Policy inline erreichbar
- ✅ Datenhandling dokumentiert (Location, Kamera, Microphone)
- ✅ Keine versteckten Permissions
- ✅ Testflight/Beta vor Release
- ✅ App Review für sensible Features geplant

**Bei neuen Features:** App Store Review Anforderungen prüfen.

---

## 🔄 Git & PR-Workflow

### Merging
- Preview-Branches → `main` automatisch, wenn Checks grün
- Hauptentwicklung auf designiertem Feature-Branch
- Immer Pull Request vor Merge (für Code Review + Checks)

### PR-Watching
- CI-Fails, Review-Kommentare, Konflikte eigenverantwortlich beheben
- Check-ins im Hintergrund durchführen — **nie ankündigen** (z. B. "plane Check-in in 30 Min.")
- Stille Durchführung oder komplett weglassen

---

## ✅ Code-Review Checkliste

Vor jedem Commit prüfen:
- [ ] Keine Platzhalter (keine `TODO`, keine Mock-Daten)
- [ ] Keine dekorativen Emojis
- [ ] Echte Implementierung, nicht Stub
- [ ] KI-Buddy-Code: Robuste Fehlerbehandlung, Tests
- [ ] Performance: App-Start < 3 Sek., KI-Response < 2 Sek.
- [ ] Keine neuen Secrets/Credentials in Code
- [ ] TypeScript/Linting clean
- [ ] Tests grün (Unit, Integration, E2E wenn relevant)

---

## 📝 Dokumentation Updaten

Diese CLAUDE.md ist das **Source of Truth** für Entwicklungsregeln. Bei signifikanten Änderungen (neue Auth-Systeme, Device-Features, KI-Buddy-Architektur) **sofort hier updaten**, damit alle Claude-Sessions konsistent arbeiten.
