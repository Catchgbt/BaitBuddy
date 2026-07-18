# BaitBuddy — Entwicklungsrichtlinien für Claude

## 🎯 Projekt-Übersicht
**BaitBuddy** ist eine Angel-App mit AI-gestütztem KI-Buddy. Technisch ist es eine **Vite + React 18 Web-App**, die für Android per **Capacitor** in einen WebView verpackt wird (die Android-Hülle lädt aktuell die Live-Vercel-Site). Backend läuft als Express-App auf Vercel Serverless, Datenspeicher auf Supabase.

> Wichtig: Es ist **kein** React Native/Expo und **kein** Firebase. „Device-Features" nutzen Browser-Web-APIs im WebView. Supabase-**Realtime** wird derzeit **nicht** verwendet — der Datenzugriff läuft über einen eigenen REST-Client (`src/api/frontendClient.js`) gegen das Backend.

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
| **Frontend** | Vite 6 + React 18 (JSX), Tailwind, Radix/shadcn-UI, React Router, TanStack Query |
| **Mobile-Wrapper** | Capacitor 6 (Android-WebView) |
| **Backend** | Express (Node.js) auf Vercel Serverless (`backend/`, gemountet über `api/[...path].mjs`) |
| **Datenbank & Auth** | Supabase (Postgres, GoTrue-Auth, Storage) — Zugriff über eigenen REST-Client, **kein** Realtime |
| **LLM** | Groq (Llama) für Chat & Vision; OpenAI Realtime (optional) für Voice; ElevenLabs (optional) für TTS |
| **Package Manager** | npm mit legacy peer deps (`--legacy-peer-deps`) |
| **CI/CD** | GitHub Actions (Web-Deploy via Vercel, Android-AAB-Build). **Kein Fastlane, keine iOS-Pipeline.** |

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
- **Frontend**: verteilt über mehrere Stellen (es gibt **kein** `src/components/KiBuddy/`-Verzeichnis):
  - `src/components/layout/AIBuddyWidget.jsx` — das schwebende Chat-Widget (Haupt-Surface)
  - `src/pages/KiBuddyBeta.jsx` — eigenständige Voice-Buddy-Seite
  - `src/components/ai/`, `src/components/chatbot/`, `src/components/home/MiniKiBuddy*.jsx`
  - Hooks: `useChatMessages`, `useSpeechRecognition`, `useElevenLabsVoice`
  - `src/lib/buddyGreetings.js` — Start-Begrüßungs-Generator: begrüßt per Sprechblase + TTS, variiert nach Tageszeit/Stimmung/Event-Status (Anti-Wiederholung via localStorage). Wiederholung gesteuert über **Zeitstempel-Cooldown** (`shouldGreet`/`markGreeted`, localStorage `bb_buddy_last_greeting`, Default 15 Min) statt eines Session-Flags — nötig, weil im Capacitor-WebView eine Sitzung das Wiederöffnen (Resume) überlebt. Ausgelöst im `AIBuddyWidgetStub` beim Mount **und bei `visibilitychange` (Foreground-Resume)**; das volle Widget und `KiBuddyBeta` nutzen denselben Generator. `getVariedPageBubble` rotiert die Seiten-Blase (Seitenfrage/Buddy-Frage/Funktions-Tipp).
  - `src/lib/audioUnlock.js` — `runWhenAudioReady(fn)`: Browser/WebView blockieren Audio-Wiedergabe ohne vorherige Nutzer-Geste (Autoplay-Policy). Die Start-Begrüßung wird deshalb **beim ersten Antippen** entsperrt/nachgeholt; alle Begrüßungs-TTS-Aufrufe laufen über diesen Helfer.
- **Backend**: `backend/src/routes/ai.js` (`POST /api/ai/chat` u. a.) mit `backend/src/lib/llm.js` für die LLM-Anbindung. (Es gibt **kein** `api/routes/kibuddy.js`.)
- **Wissensbasis**: `backend/src/lib/buddyKnowledge.js` — zentrale Praxis-Wissensbasis (Köderführung, Montagen, Unterwasser-Köderbox, Knoten, Drill, Saisonwissen), Gesprächsstil-Regeln (variierende Rückfragen: humorvoll/nachdenklich/neugierig/direkt) und App-Funktionswissen (der Buddy erklärt jede App-Funktion ausführlich und bietet passende Handgriffe aktiv an, z. B. „Sag einfach: Karpfen ins Fangbuch") plus verbindliche Anleitungs-Regeln: Bei „Wie benutze/montiere/führe ich X?"-Fragen erklärt der Buddy **immer selbst Schritt für Schritt** (Montage → Einsatz im Wasser → Führung → Bisserkennung → typische Fehler) und verweist **nie** nur auf Tutorials. Eingebunden in `POST /api/ai/chat` (System-Prompt) und `POST /api/ai/realtime-session` (Voice-Instructions). Wissens-Erweiterungen gehören in dieses Modul, nicht in einzelne Routen-Prompts.
- **Datenbank**: Supabase-Tabellen (`catches`, `spots`, `rule_entries` …) liefern den Kontext; Chat-Historie wird clientseitig gehalten.
- **LLM**: **Groq (Llama)** über natives `fetch` in `backend/src/lib/llm.js` — Text (`llama-3.3-70b-versatile`) und Vision. Der Aufruf erfolgt serverseitig, nie direkt vom Frontend.
  - ⚠️ **Regel: Kein Browser-LLM** — Alle LLM-Anfragen müssen über Backend-Endpoints gehen (`POST /api/ai/chat`, `POST /api/ai/realtime-session`, `POST /api/ai/vision` u.ä.). Frontend darf keine LLM-Libraries direkt verwenden (kein Groq SDK, kein Anthropic SDK, kein Ollama im Browser). Das verhindert API-Key-Exposure, reduziert Bundle-Size und zentralisiert Kontextverwaltung serverseitig.
- **TTS-Stimmen**: `POST /api/ai/tts` (ElevenLabs) kennt zwei Stimmen: männlich „Daniel" (Standard, alle Pläne) und weiblich „Matilda" (**nur Ultimate**, Plan-ID `elite`/Friends-Level). Das Plan-Gate sitzt **serverseitig** (`backend/src/lib/planResolver.js`, geteilt mit `premium.js`) — ohne Ultimate fällt der Server still auf die Standardstimme zurück. Die Auswahl liegt in den Audio-Einstellungen (`VoiceSettings.jsx`), gespeichert via `src/lib/ttsVoice.js` (localStorage `buddy-tts-voice`); `elevenLabsTTS.js` sendet die Wahl bei jedem TTS-Aufruf mit. Env-Overrides: `ELEVENLABS_VOICE_ID` (männlich), `ELEVENLABS_VOICE_ID_FEMALE` (weiblich).
  - ⚠️ **Regel: Nur die ElevenLabs-Stimme** — Die App spricht ausschließlich mit der natürlichen ElevenLabs-Stimme über die zentrale Utility `src/components/utils/elevenLabsTTS.js` (`speakWithFallback` = spricht und löst nach Wiedergabe-Ende auf; „Fallback" bedeutet **Stille** bei Fehlern, nicht Roboterstimme). Die frühere Browser-TTS (`speechSynthesis`, `browserTTS.jsx`) wurde komplett entfernt und darf **nicht** wieder eingeführt werden — schlägt ElevenLabs fehl (offline, kein API-Key), bleibt die Ausgabe still und der Text steht im Chat. Überlappende TTS-Aufrufe werden per Generation-Token in `elevenLabsTTS.js` verworfen (keine Doppelstimmen).

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

> **Rate-Limiting-Store:** Das API-Rate-Limiting (`backend/src/middleware/rateLimit.js`)
> nutzt optional **Vercel KV** (Upstash Redis, ioredis-kompatibel) als
> instanzübergreifenden Zähler — aktiviert über die Env-Variable `KV_URL`
> (Fallback `REDIS_URL`). Ohne gesetzte Env fällt es automatisch auf den
> In-Memory-Store zurück (lokal/Dev/Tests unverändert). Vercel KV bleibt innerhalb
> „nur Vercel & Supabase". Fällt der KV-Store aus, blockiert das die App nicht
> (Fail-Open).

---

## 📦 Build & Release

**Automatisiert via GitHub Actions (kein Fastlane):**
1. PR → `main` gemergt → Vercel deployt die Web-App automatisch
2. Auf `v*`-Tag baut GitHub Actions das Android-**AAB** (Signierung in CI)
3. Upload zu Google Play erfolgt aus dem Artefakt (Beta-Track zuerst)
4. **Keine iOS-Pipeline** vorhanden

> Hinweis: Der Android-Build läuft über **einen** Workflow
> (`.github/workflows/build-android.yml`, Trigger: `v*`-Tag **oder**
> manuell per `workflow_dispatch`). Er baut sowohl ein Debug-APK zum
> Sideloaden als auch das signierte Release-**AAB** — der AAB-Signierschritt
> läuft nur, wenn das `KEYSTORE_BASE64`-Secret gesetzt ist. Der frühere
> zweite Workflow (`build-apk.yml`) wurde konsolidiert und entfernt.
> `versionCode`/`versionName` werden beim manuellen `workflow_dispatch` als
> Inputs übergeben und via Gradle-Properties `appVersionCode`/`appVersionName`
> in `android/app/build.gradle` ausgewertet (die `android.injected.version.*`-
> Properties wirken beim `bundleRelease` nicht). Ohne Property greifen die
> Defaults in `build.gradle`, die der Play-Store-Versionierung folgen. Der
> `version_code` muss höher sein als der zuletzt in der Play Console
> hochgeladene.

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
