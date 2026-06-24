# BaitBuddy — Android (Capacitor)

Diese App wrappt die bestehende React/Vite-Web-App (`src/`) per [Capacitor](https://capacitorjs.com)
in ein natives Android-Projekt und erzeugt eine signierte `.aab` für den Google Play Store.

- **App-ID (Package):** `app.baitbuddy.mobile` — permanent, im Play Store nicht änderbar
- **Web-Assets:** Der Vite-Build (`dist/`) wird lokal in die App gebündelt
- **API:** Die App spricht das Produktions-Backend an (`VITE_API_URL=https://bait-buddy.vercel.app`)

## Voraussetzungen

- Node.js 18+
- JDK 21
- Android SDK (Platform 34, Build-Tools 34.0.0, Platform-Tools)
- `ANDROID_HOME` / `ANDROID_SDK_ROOT` gesetzt

## Signing einrichten (einmalig)

Der Keystore und die Passwörter werden **nicht** eingecheckt. Lege vor dem Build an:

`android/app/baitbuddy-release.keystore` — der Keystore (sicher aufbewahren!)

`android/keystore.properties`:

```properties
storeFile=baitbuddy-release.keystore
storePassword=DEIN_PASSWORT
keyAlias=baitbuddy
keyPassword=DEIN_PASSWORT
```

> Geht der Keystore verloren, lassen sich keine Updates der bestehenden Play-Store-App
> mehr veröffentlichen (außer über Google Play App Signing).

## Build

```bash
# 1. Web-App mit Produktions-API bauen
VITE_API_URL=https://bait-buddy.vercel.app npm run build

# 2. Web-Assets ins Android-Projekt synchronisieren
npx cap sync android

# 3. Signierte AAB bauen
cd android
./gradlew bundleRelease
```

Ergebnis: `android/app/build/outputs/bundle/release/app-release.aab`

## Version erhöhen

Vor jedem neuen Play-Store-Upload in `android/app/build.gradle`:

- `versionCode` um 1 erhöhen (muss bei jedem Upload steigen)
- `versionName` anpassen (z. B. `"1.1"`)
