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

## Native Funktionen

Über die Integrations-Schicht `src/lib/native.js` (mit Web-Fallbacks) verfügbar:

| Funktion | Plugin |
|----------|--------|
| Kamera / Fotos (`takePhoto`) | `@capacitor/camera` |
| Standort (`getCurrentPosition`) | `@capacitor/geolocation` |
| Offline-Speicher (`storage`) | `@capacitor/preferences`, `@capacitor/filesystem` |
| Netzwerk-Erkennung (`onNetworkChange`) | `@capacitor/network` |
| Push (`initPushNotifications`) | `@capacitor/push-notifications` |
| Splash / Status-Bar / Back-Button | `@capacitor/splash-screen`, `status-bar`, `app` |
| Haptik / Teilen | `@capacitor/haptics`, `@capacitor/share` |

### Push-Notifications aktivieren (Firebase)

Push benötigt Firebase Cloud Messaging. Ohne Konfiguration baut die App zwar,
die Registrierung schlägt aber zur Laufzeit fehl.

1. Firebase-Projekt anlegen und eine Android-App mit Package `app.baitbuddy.mobile` hinzufügen
2. `google-services.json` herunterladen und nach `android/app/google-services.json` legen
3. Neu bauen — der `com.google.gms.google-services`-Plugin wird automatisch aktiv

## Version erhöhen

Vor jedem neuen Play-Store-Upload in `android/app/build.gradle`:

- `versionCode` um 1 erhöhen (muss bei jedem Upload steigen)
- `versionName` anpassen (z. B. `"1.1"`)
