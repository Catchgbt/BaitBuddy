# BaitBuddy Staging Test Plan

Umfassender Test-Plan für MVP → Staging → Production Release.

---

## 📋 Test Matrix Overview

| Platform | Browser/Device | Fokus | Priorität |
|----------|---|---|---|
| Web (Desktop) | Chrome, Firefox | Chat, Maps, Premium | HIGH |
| Web (Mobile) | Safari iOS, Chrome Android | UI, Gestures, Perf | HIGH |
| PWA (Android) | Chrome WebAPK | Offline, Notifications | MEDIUM |
| PWA (iOS) | Safari 16+ | Home Screen App | MEDIUM |
| Docker | Linux Server | Deploy, Scaling | HIGH |
| Play Store | Real Device (Pixel 4a+) | Full App Flow | CRITICAL |

---

## 1. Functional Testing

### 1.1 Authentication

```
✅ Email/Passwort Signup
  - [ ] Normaler Signup erfolgreich
  - [ ] Duplicate Email Fehler
  - [ ] Validation: Email Format
  - [ ] Validation: Min 8 Zeichen Passwort
  - [ ] Confirmation Email erhalten
  - [ ] Link in Email funktioniert

✅ Email/Passwort Login
  - [ ] Korrektes Login erfolgreich
  - [ ] Falsches Passwort → Error
  - [ ] Nicht-existenter User → Error
  - [ ] Session bleibt bestehen (localStorage)
  - [ ] Token Refresh funktioniert

✅ Google/GitHub OAuth
  - [ ] OAuth Flow startet
  - [ ] Redirect zu Provider
  - [ ] Autorisierung erfolgt
  - [ ] Nutzer wird erstellt
  - [ ] Existing User wird geloggt in

✅ Passwort Reset
  - [ ] "Forgot Password" Link
  - [ ] Email eingeben
  - [ ] Reset-Email erhalten
  - [ ] Token im Link ist gültig
  - [ ] Neues Passwort setzen funktioniert
  - [ ] Altes Passwort funktioniert nicht mehr

✅ Logout
  - [ ] Session wird gelöscht
  - [ ] localStorage wird geleert
  - [ ] Redirect zu Login
  - [ ] Kein Zugriff ohne Login
```

### 1.2 KI-Buddy (Kernfeature)

```
✅ Chat Interface
  - [ ] Message-Input fokusierbar
  - [ ] Message absendet (Enter + Button)
  - [ ] Eigene Message wird oben angezeigt
  - [ ] KI-Response kommt < 2 Sekunden
  - [ ] Stream-Text wird progressiv angezeigt
  - [ ] Action-Block wird nicht im Chat gezeigt

✅ Text Response
  - [ ] Response ist relevant
  - [ ] Response ist auf Deutsch
  - [ ] Keine Platzhalter-Texte
  - [ ] Keine Lorem ipsum
  - [ ] Response ist natürlich geschrieben

✅ Voice/TTS
  - [ ] Speaker-Icon klickbar
  - [ ] TTS startet (ElevenLabs)
  - [ ] Voice ist natürlich (nicht Roboterstimme)
  - [ ] Audio spielt vollständig
  - [ ] Nächste Nachricht stoppt Audio korrekt
  - [ ] Offline: TTS fällt still durch (kein Error)

✅ Streaming
  - [ ] Streaming startet sofort
  - [ ] Text kommt in Echtzeit
  - [ ] Multiple Sentences sichtbar
  - [ ] Stream-Fehler fällt auf ai.chat zurück
  - [ ] Abort-Signal stoppt Stream

✅ Context Awareness
  - [ ] Buddy kennt letzten Fang
  - [ ] Buddy nennt aktive Schonzeiten
  - [ ] Buddy erwähnt Spots in Nähe
  - [ ] Buddy berücksichtigt Wetter

✅ Offline Fallback
  - [ ] Offline: "Buddy ist offline" Message
  - [ ] Cached Responses zeigen
  - [ ] Sync bei Connectivity
```

### 1.3 Fangbuch

```
✅ Fang hinzufügen
  - [ ] Schnell-Form: Art, Größe, Gewicht
  - [ ] Foto-Upload: Camera/Gallery
  - [ ] Foto wird comprimiert (< 100KB)
  - [ ] Metadata: Spot, Köder, Wetter
  - [ ] Speichern funktioniert
  - [ ] Notification: "Fang gespeichert"

✅ Fangbuch-Liste
  - [ ] Alle Fänge werden aufgelistet
  - [ ] Sortierung: Neueste zuerst
  - [ ] Thumbnail zeigt Foto
  - [ ] Swipe/Tap → Detail-View

✅ Fang-Details
  - [ ] Alle Daten angezeigt
  - [ ] Foto in Vollgröße
  - [ ] Edit-Button
  - [ ] Delete-Button (mit Bestätigung)
  - [ ] Share-Button (Social Media)

✅ Offline Sync
  - [ ] Fang wird lokal gespeichert
  - [ ] Online: Automatischer Sync
  - [ ] Kein Datenverlust
```

### 1.4 Spot-Tracker

```
✅ Spot hinzufügen
  - [ ] GPS wird abgefragt
  - [ ] Koordinaten werden erfasst
  - [ ] Spot-Name eingeben
  - [ ] Wasser-Typ wählen (See, Fluss, etc.)
  - [ ] Notizen hinzufügen (optional)
  - [ ] Speichern erfolgreich

✅ Karte
  - [ ] Karte lädt
  - [ ] Marker zeigen Spots
  - [ ] Tap Marker → Spot-Details
  - [ ] Zoom funktioniert
  - [ ] Zoom auf aktueller Position funktioniert

✅ Spot-Sharing
  - [ ] Share-Button
  - [ ] Link wird generiert
  - [ ] Link funktioniert (andere User können öffnen)
  - [ ] Shared Spot wird in Karte angezeigt

✅ Offline Map
  - [ ] Offline: Karte ist sichtbar (cached)
  - [ ] Keine neuen Spots ohne Connection
```

### 1.5 Premium Plans

```
✅ Plan-Info
  - [ ] 3 Plans sichtbar (Basic, Elite, Friends)
  - [ ] Features pro Plan klar aufgelistet
  - [ ] Preise sichtbar
  - [ ] Best Value Highlight

✅ Stripe Checkout (Web)
  - [ ] Plan wählen
  - [ ] "Buy" klicken → Stripe öffnet
  - [ ] Stripe Checkout lädt
  - [ ] Testdaten eintragen
    - Card: 4242 4242 4242 4242
    - Expiry: 12/25
    - CVC: 123
  - [ ] Zahlung erfolgreich
  - [ ] Redirect zu Success-Page
  - [ ] Plan ist aktiviert

✅ Google Play Billing (Android)
  - [ ] Plan wählen
  - [ ] "Buy" klicken
  - [ ] Play Billing Dialog öffnet
  - [ ] Zahlung erfolgreich (Test SKU)
  - [ ] Plan ist aktiviert
  - [ ] Subscription bleibt bestehen nach App Restart

✅ Trial/Demo
  - [ ] "Try Free" aktiviert 3-Tage Trial
  - [ ] Premium Features funktionieren
  - [ ] Nach 3 Tagen: Trial expired
  - [ ] Requires Payment zum weitermachen

✅ Plan Downgrade
  - [ ] User auf Elite → Basic downgrade
  - [ ] Confirmation Dialog
  - [ ] Features werden sofort deaktiviert
  - [ ] Refund (wenn zutreffend)
```

### 1.6 Events & Community

```
✅ Events List
  - [ ] Alle aktiven Events angezeigt
  - [ ] Event-Template + Status
  - [ ] Teilnehmer-Count

✅ Event Join
  - [ ] "Join" Button
  - [ ] User wird hinzugefügt
  - [ ] Leaderboard wird aktualisiert
  - [ ] Notification zum Buddy

✅ Submit Fang
  - [ ] Select Fang aus Fangbuch
  - [ ] Oder: Neuer Fang direkt hinzufügen
  - [ ] Submission erfolgreich
  - [ ] Leaderboard wird aktualisiert (< 30 Sekunden)

✅ Leaderboard
  - [ ] Alle Participants angezeigt
  - [ ] Sortierung nach Punkte
  - [ ] Eigene Position highlighted
  - [ ] Rankings aktualisieren in Echtzeit
```

---

## 2. Performance Testing

### 2.1 Load Times

```
Ziel-Metriken:
┌─────────────────────────┬──────────┬─────────────┐
│ Metrik                  │ Ziel     │ Max. Erlaubt │
├─────────────────────────┼──────────┼─────────────┤
│ App Start (cold)        │ < 2 Sec  │ 3 Sec       │
│ App Start (warm)        │ < 1 Sec  │ 1.5 Sec     │
│ KI-Buddy Response       │ < 2 Sec  │ 3 Sec       │
│ Fangbuch Laden          │ < 0.5 Sec│ 1 Sec       │
│ Map Init                │ < 1 Sec  │ 2 Sec       │
│ Plan Checkout           │ < 0.5 Sec│ 1 Sec       │
└─────────────────────────┴──────────┴─────────────┘

Messung (Chrome DevTools):
1. Öffne App
2. DevTools → Performance → Start Recording
3. Interaktion durchführen
4. Stop → Analyse Times
```

### 2.2 Memory Usage

```
Ziel: < 200MB im Idle (Android)

Messung:
1. Öffne Android Studio Device Monitor
2. Oder: adb shell dumpsys meminfo | grep baitbuddy
3. Idle Memory sollte < 200MB sein
4. Nach Chat (10 Messages): < 250MB
5. Nach Karte: < 220MB

Leak Detection:
- Nach 1h Nutzung: Memory sollte nicht > 50MB steigen
```

### 2.3 Battery Impact

```
Ziel: < 5% Battery pro Stunde normale Nutzung

Messung:
1. Battery Stats (Android): adb shell dumpsys batterystats
2. Oder: Settings → Battery Usage → BaitBuddy
3. Sollte < 5% sein

Optimization Points:
- GPU: Maps, 3D Lures
- CPU: AI Chat Streaming
- Network: Sync, Notifications
```

### 2.4 Network Efficiency

```
Ziel: < 10MB pro Stunde normale Nutzung

Messung (Android):
1. Settings → Network & Internet → Mobile Data → Data Usage
2. Per-App Breakdown → BaitBuddy
3. Sollte < 10MB pro Stunde sein

Optimization:
- Bilder komprimieren (Fang Fotos)
- Cache API Responses (Buddy Knowledge)
- Batch API Calls (Events, Leaderboard)
```

---

## 3. Security Testing

### 3.1 Authentication Security

```
✅ Token Storage
  - [ ] Tokens im localStorage (Design intent)
  - [ ] Nicht in Cookies (XSRF-Schutz)
  - [ ] Nicht im Source Code

✅ Token Expiration
  - [ ] Access Token: 1 Stunde
  - [ ] Refresh Token: 30 Tage
  - [ ] Expired Token → Auto Refresh
  - [ ] Refresh Failure → Logout

✅ API Request Validation
  - [ ] POST /api/catches: nur mit Auth
  - [ ] DELETE /api/catches/id: nur eigene
  - [ ] PATCH /api/user: nur sich selbst
  - [ ] Admin Routes: nur mit admin_role
```

### 3.2 Data Protection

```
✅ HTTPS
  - [ ] Alle API Calls über HTTPS
  - [ ] Alle Redirects HTTPS
  - [ ] No mixed content

✅ Secrets
  - [ ] API Keys nicht im Frontend Code
  - [ ] Environment Variables gesetzt
  - [ ] Secrets nicht in Git
  - [ ] Sentry + Monitoring Secrets masked

✅ SQL Injection
  - [ ] Parameterized Queries überall
  - [ ] Keine String Interpolation
  - [ ] Test: `'; DROP TABLE users; --` → Fehler (expected)

✅ XSS Prevention
  - [ ] Alle User-Inputs escaped
  - [ ] HTML Entities für Display
  - [ ] React Auto-Escaping nutzen
  - [ ] Test: `<script>alert('xss')</script>` → nicht ausgeführt
```

### 3.3 Permissions

```
✅ Camera Permission
  - [ ] Android: Nur wenn gefragt
  - [ ] iOS: System Dialog
  - [ ] Denied: Fallback ohne Crash

✅ Location Permission
  - [ ] GPS: Nur wenn gefragt
  - [ ] Precision: 5-10m acceptable
  - [ ] Denied: Funktioniert ohne GPS (cached Spots)

✅ Microphone Permission
  - [ ] Voice Buddy: Nur wenn gefragt
  - [ ] Denied: Text-only Buddy
  - [ ] No Fallback to WebSpeech API (nur ElevenLabs)

✅ Storage Permission
  - [ ] Photos: Gallery Access
  - [ ] Downloads: Für AAB/APK
  - [ ] Caches: Not requestable (system)
```

---

## 4. Compatibility Testing

### 4.1 Browser Compatibility

```
┌──────────────┬──────────┬────────┬──────────┐
│ Browser      │ Version  │ Status │ Notes    │
├──────────────┼──────────┼────────┼──────────┤
│ Chrome       │ Latest-2 │ ✅     │ Primary  │
│ Firefox      │ Latest-2 │ ✅     │ Primary  │
│ Safari       │ Latest-1 │ ✅     │ iOS/Mac  │
│ Edge         │ Latest-1 │ ✅     │ Windows  │
│ Samsung      │ Latest   │ ✅     │ Android  │
└──────────────┴──────────┴────────┴──────────┘

Critical Features per Browser:
- WebSpeech API: Chrome, Edge (nicht Firefox)
- Geolocation: Alle
- Camera: Alle (mit HTTPS)
- IndexedDB: Alle (offline sync)
```

### 4.2 Device Compatibility

```
Android:
- [ ] Nexus 5 (2014, 1GB RAM) → Basic funktionalität
- [ ] Pixel 4a (2020, 6GB RAM) → Alle Features
- [ ] Samsung Galaxy S21 (2021, 8GB RAM) → Alle Features
- [ ] OnePlus 9 (2021, 8GB RAM) → Alle Features

Screen Sizes:
- [ ] 4.0" (Small Phone)
- [ ] 5.0" (Medium Phone)
- [ ] 6.0" (Large Phone)
- [ ] 7.0" (Phablet)
- [ ] 10.0" (Tablet - optional)

Orientations:
- [ ] Portrait
- [ ] Landscape
- [ ] Rotation (device is not jittering)
```

### 4.3 OS Version Compatibility

```
Android:
- [ ] 9 (API 28) → Min Target
- [ ] 12 (API 31) → Standard Device
- [ ] 13 (API 33) → Recent
- [ ] 14 (API 34) → Latest

iOS (PWA only, kein Native App):
- [ ] 14.0+ → Web App funktioniert
- [ ] 16.4+ → Notifications
- [ ] 17.0 → Latest

Features per OS:
- Push Notifications: Android 8+, iOS 16.4+
- Web Bluetooth: Android 10+, kein iOS
- Geolocation: Android 6+, iOS all
```

---

## 5. Offline Testing

### 5.1 Offline Functionalit

```
Setup:
- [ ] Dev Tools → Network → Offline (Browser)
- [ ] Flugzeug-Modus (Android)
- [ ] Disconnect WiFi + Mobile Data

Tests:
✅ Dashboard
  - [ ] Cached Fänge angezeigt
  - [ ] Cached Stats angezeigt
  - [ ] Cached Spots auf Map

✅ Chat
  - [ ] "Buddy ist offline" Message
  - [ ] Cached Responses (Tageszeit-Greetings)
  - [ ] Keine neue API Calls

✅ Sync
  - [ ] Neuer Fang wird lokal gespeichert
  - [ ] Online: Auto-Sync (< 30 Sekunden)
  - [ ] Keine Duplikate nach Sync
  - [ ] Notification: "Synchronisiert"

✅ Error Handling
  - [ ] Keine Red Toasts (Fehler-Meldungen)
  - [ ] Graceful Degradation
  - [ ] Retry-Mechanism aktiv
```

### 5.2 Slow Network

```
Simulation (DevTools → Network → "Slow 3G"):

Tests:
- [ ] App bleibt responsive (nicht freezed)
- [ ] Loading States angezeigt
- [ ] Keine Timeout-Fehler (oder graceful)
- [ ] Streaming Text kommt (langsamer, aber kontinuierlich)
```

---

## 6. Accessibility Testing

### 6.1 Screen Reader

```
Setup: NVDA (Windows) oder JAWS

Tests:
- [ ] Alle Buttons haben labels
- [ ] Images haben alt-text
- [ ] Form Labels gebunden
- [ ] Headings strukturiert (H1 > H2 > H3)
- [ ] List Items properly marked

Critical Flows:
- [ ] Login ablauf mit Screen Reader
- [ ] Fang hinzufügen ablauf
- [ ] Chat Navigation
```

### 6.2 Color Contrast

```
Tool: WAVE, Axe, Lighthouse

Tests:
- [ ] Text Contrast: Min 4.5:1 (Level AA)
- [ ] UI Components: Min 3:1
- [ ] Kein Color-only Information

Dark Mode:
- [ ] Contrasts auch im Dark Mode OK
```

### 6.3 Keyboard Navigation

```
Tests:
- [ ] Tab-Order logisch
- [ ] Fokus sichtbar (Ring/Highlight)
- [ ] Enter zum Aktivieren (Buttons, Links)
- [ ] Arrow Keys für Navigation (Menus, Lists)
- [ ] Escape zum Schließen (Modals)

No Mouse:
- [ ] Alle Features erreichbar
```

---

## 7. Monitoring & Bug Tracking

### 7.1 Sentry Monitoring

```
Während Test:
- [ ] Prüfe Sentry Dashboard regelmäßig
- [ ] Neue Errors sofort untersuchen
- [ ] Stack Traces verifizieren
- [ ] Duplicate Errors merken
```

### 7.2 Bug Reporting Template

```
Title: [PLATFORM] [SEVERITY] Brief Description

Severity:
- CRITICAL: App Crash, Data Loss, Security
- HIGH: Feature kaputt, Häufige User Pain
- MEDIUM: Bug unter bestimmten Umständen
- LOW: Cosmetic, Edge Case

Steps to Reproduce:
1. ...
2. ...
3. ...

Expected:
- What should happen

Actual:
- What happened

Environment:
- Platform: (Android/iOS/Web)
- Device: (Model, OS)
- App Version: (v1.0.0)
- Network: (WiFi/4G/Offline)

Attachments:
- Screenshot/Video
- Sentry Link
```

### 7.3 Test Result Documentation

```
Template für jeden Test-Run:

Date: 2026-09-09
Tester: John Doe
Build: v1.0.0 (versionCode: 1)
Device: Pixel 4a, Android 12

Test Results:
┌────────────────────┬────────┬─────────────────┐
│ Feature            │ Status │ Notes           │
├────────────────────┼────────┼─────────────────┤
│ Authentication     │ ✅     │ All good        │
│ KI-Buddy           │ ✅     │ Latency 1.5s    │
│ Fangbuch           │ ⚠️     │ Photo blur bug  │
│ Spots              │ ✅     │ GPS accurate    │
│ Premium            │ ✅     │ Stripe OK       │
└────────────────────┴────────┴─────────────────┘

Issues Found:
- [BUG-123] Photo blur on portrait mode (MEDIUM)

Approved for Release: ✅ YES
```

---

## 📋 Test Checklist (Pre-Launch)

### Functional
- [ ] Authentication (Signup, Login, OAuth, Reset)
- [ ] KI-Buddy (Chat, TTS, Streaming, Offline)
- [ ] Fangbuch (Add, Edit, Delete, Share)
- [ ] Spots (Add, Map, Sharing)
- [ ] Premium (Plans, Checkout, Billing)
- [ ] Events (Join, Submit, Leaderboard)
- [ ] Settings (Profile, Notifications, Voice)

### Performance
- [ ] App Start < 2s (cold)
- [ ] KI-Response < 2s
- [ ] Memory < 200MB idle
- [ ] Battery impact OK
- [ ] Network usage OK

### Security
- [ ] No hardcoded secrets
- [ ] Token management OK
- [ ] Permissions working
- [ ] No XSS/SQL Injection

### Compatibility
- [ ] All target Browsers tested
- [ ] Min Android 9 works
- [ ] iOS 14+ Web App works
- [ ] Tablet layout tested

### Offline
- [ ] Offline fallbacks work
- [ ] Sync robust
- [ ] No data loss

### Accessibility
- [ ] Screen reader OK
- [ ] Color contrast OK
- [ ] Keyboard navigation OK

### Monitoring
- [ ] Sentry connected
- [ ] Health checks pass
- [ ] Analytics working

---

**Letztes Update:** 2026-09-09
