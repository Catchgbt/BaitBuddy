# BaitBuddy — Entwicklungsregeln für Claude

## Kommunikation

**Immer auf Deutsch antworten** — alle Antworten, Erklärungen und Zusammenfassungen in dieser Session und in zukünftigen Sessions auf Deutsch. (Code, Commit-Messages und PR-Titel dürfen technisch/englisch bleiben, wo üblich.)

## Keine Platzhalter und keine Emojis im Code

**Niemals Platzhalter setzen.** Keine Dummy-/Fake-/Mock-Werte, keine `TODO`-Stubs, keine „Lorem ipsum"-Texte, keine Beispiel-/Demo-Platzhalter und keine leeren „Coming soon"-Hülsen im produktiven Code. Immer echte, vollständig funktionsfähige Implementierungen mit echten Daten und echten Anbindungen liefern. Fehlt eine Information oder ist etwas unklar, nachfragen — statt einen Platzhalter einzusetzen.

**Niemals Emojis im App-Code verwenden.** Weder in JSX/HTML-Text, noch in Labels, Buttons, Überschriften, Fehlermeldungen oder sonstigen UI-Elementen. Die App-Oberfläche bleibt emoji-frei — ausnahmslos.

## Infrastruktur: nur Vercel & Supabase

**Nur Vercel (Hosting/Deploy/Serverless) und Supabase (DB/Auth/Storage) verwenden.** Keine anderen externen Dienste/Backends einführen (kein base44, kein Render, keine sonstigen MCP-Services für Produktionslogik).

## App-Distribution: PlayStore & Apple Store

**Die App muss später auf PlayStore und Apple Store deployed werden.** Code wird darauf optimiert — native APIs, Permissions, Device-Features und Platform-spezifische Anforderungen beachten.

## Tech Stack: React Native (Android PlayStore MVP)

**Frontend**: React Native + Expo Prebuild (Android)  
**UI-Framework**: Gluestack UI (React Native kompatibel)  
**Navigation**: React Navigation v6 (Stack + BottomTabs)  
**Maps**: react-native-maps (native Android performance)  
**Backend**: Express (Node.js) auf Vercel Serverless  
**Datenbank & Auth**: Supabase (Realtime, Offline Sync via `@supabase/supabase-js`)  
**Storage**: Expo SecureStore (Token), SQLite + AsyncStorage (Offline-Daten)  
**Package Manager**: npm mit legacy peer deps  
**Build**: EAS Build (Expo) für Android AAB  
**CI/CD**: GitHub Actions + Fastlane für automatischen PlayStore Upload

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

## Build & Release (PlayStore MVP)

**Phase 1: Android PlayStore**
1. PR gemergt zu `main`
2. GitHub Actions triggert `eas build --platform android` (Expo)
3. Baut Android AAB (App Bundle) für PlayStore
4. Fastlane uploaded automatisch zu Google Play Beta-Track
5. Release-Notes auto-generiert aus Commits

**Phase 2: iOS (später)**
- TestFlight via `eas build --platform ios`
- Apple App Store via Fastlane

**Kein manueller Upload** — alles automatisiert via EAS + Fastlane.

## App Store Richtlinien

**Apple App Store & Google Play haben strenge Regeln**:
- Privacy Policy muss inline erreichbar sein
- Datenhandling muss dokumentiert werden (besonders Location, Kamera)
- Keine versteckten Berechtigungen
- Testflights/Beta-Versionen vor öffentlichem Release

**Regel**: Bei neuen Features immer prüfen, ob App Store Review verlangt wird.

## Previews automatisch mergen

**Preview-Branches werden automatisch zu `main` gemergt**, wenn alle Checks grün sind.
