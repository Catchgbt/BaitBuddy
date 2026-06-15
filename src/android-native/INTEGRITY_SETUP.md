# Play Integrity API - Native Android Integration

Anleitung zur Aktivierung der Play Integrity API in deinem nativen Android-Wrapper.

## 1. Gradle Dependency hinzufuegen

In `app/build.gradle`:

```gradle
dependencies {
    implementation "com.google.android.play:integrity:1.4.0"
    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3"
}
```

## 2. Cloud Project Number besorgen

1. Google Cloud Console oeffnen: https://console.cloud.google.com/
2. Dein Projekt auswaehlen (das mit dem Token_Google Service Account)
3. Auf das Projekt-Dropdown klicken - die "Projektnummer" (eine reine Zahl) kopieren
4. Diese Nummer wird in MainActivity als `CLOUD_PROJECT_NUMBER` eingetragen

## 3. Cloud Project mit Play Console verknuepfen

1. Google Play Console -> Deine App
2. Setup -> App-Integritaet -> Play Integrity API
3. Cloud Project verknuepfen (das gleiche Projekt wie der Service Account)

## 4. Files in dein Android-Projekt einbinden

Kopiere folgende Dateien in dein Android-Projekt unter `app/src/main/java/com/catchly/app/`:

- `PlayIntegrityManager.kt`
- `PlayIntegrityBridge.kt`

## 5. MainActivity anpassen

In deiner bestehenden `MainActivity.kt` die WebView-Initialisierung erweitern:

```kotlin
companion object {
    private const val CLOUD_PROJECT_NUMBER = 123456789012L // <- HIER deine Nummer einsetzen
}

// Nach webView.settings... :
webView.addJavascriptInterface(
    PlayIntegrityBridge(this, webView, CLOUD_PROJECT_NUMBER),
    "AndroidIntegrity"
)
```

## 6. Frontend-Aufruf

Im React-Code:

```javascript
import { checkIntegrity, isNativeAndroid } from "@/lib/playIntegrity";

const result = await checkIntegrity("com.catchly.app");

if (result.available && result.trusted) {
    // Geraet ist vertrauenswuerdig
} else if (result.available && !result.trusted) {
    // Geraet ist NICHT vertrauenswuerdig (gerooted, modifizierte App, etc.)
} else {
    // Nicht in nativer App (z.B. Browser) - Check uebersprungen
}
```

## 7. Token_Google Secret Format

Das Secret `Token_Google` muss den **kompletten JSON-Inhalt** der Service-Account-Datei enthalten, z.B.:

```json
{
  "type": "service_account",
  "project_id": "...",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...@....iam.gserviceaccount.com",
  ...
}
```

## 8. Service Account Berechtigungen

Der Service Account braucht in der Google Play Console (nicht Cloud Console!) folgende Berechtigung:
- Setup -> API-Zugriff -> Service Account verknuepfen
- Berechtigung: "App-Informationen einsehen" / "View app information"