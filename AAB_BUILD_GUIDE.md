# BaitBuddy — AAB/PlayStore Build-Anleitung

Diese Anleitung beschreibt den Prozess zum Erstellen einer AAB-Datei (Android App Bundle) für die Veröffentlichung auf Google Play Store.

## Voraussetzungen

- Node.js 22 und npm (CI-Version; lokal ≥18 möglich)
- JDK 21 (Temurin) — von der CI genutzt
- Android SDK: Platform 36 + Build-Tools 36.0.0 (die CI installiert diese; das Projekt kompiliert weiterhin gegen `compileSdk`/`targetSdk` 35, `minSdk` 24 — siehe `android/variables.gradle`)
- Gradle 8.9 (per Wrapper; die CI hebt den Wrapper vor dem Build auf 8.9 an)
- Keystore-Datei für Code-Signierung (.jks oder .keystore)
- Google Play Store Developer-Account

## Schritt-für-Schritt Anleitung

### 1. Vorbereitung

```bash
# Repository klonen und Dependencies installieren
npm install --legacy-peer-deps
cd backend && npm install
cd ..

# Keystore-Properties einrichten
# Datei: android/keystore.properties erstellen mit:
# storeFile=path/to/keystore.jks (oder .keystore)
# storePassword=your_store_password
# keyAlias=your_key_alias
# keyPassword=your_key_password
```

### 2. Versionierung aktualisieren

**android/app/build.gradle** — `defaultConfig` Abschnitt:
```gradle
versionCode X    // Erhöhen bei jedem Release (muss größer sein als letzte Version)
versionName "X.Y.Z"  // Semantic versioning (z.B. "1.0.0", "1.0.1", "1.1.0")
```

**package.json** — `version` Feld aktualisieren (sollte mit versionName synchron sein):
```json
"version": "1.0.0"
```

### 3. Production-Build erstellen

```bash
# Frontend App bauen
npm run build

# Capacitor-Sync: Web-Assets + native Config ins Android-Projekt kopieren
npx cap sync android

# Android-Build mit Gradle
cd android
./gradlew bundleRelease   # Erstellt AAB-Datei

# Oder als APK (falls gewünscht)
./gradlew assembleRelease

# Output-Pfad:
# AAB: android/app/build/outputs/bundle/release/app-release.aab
# APK: android/app/build/outputs/apk/release/app-release.apk
```

### 4. AAB signieren und optimieren

Das bundleRelease Task signiert die AAB automatisch mit dem Keystore.

**Überprüfung:**
```bash
# Grundinfo über AAB
bundletool dump manifest --bundle=android/app/build/outputs/bundle/release/app-release.aab

# APKs aus Bundle generieren (für lokales Testen)
bundletool build-apks \
  --bundle=android/app/build/outputs/bundle/release/app-release.aab \
  --output=app.apks \
  --ks=path/to/keystore.jks \
  --ks-pass=pass:password \
  --ks-key-alias=alias_name \
  --key-pass=pass:password

# APKs auf Gerät testen
bundletool install-apks --apks=app.apks
```

### 5. PlayStore Upload

1. Öffne **Google Play Console** → **BaitBuddy**
2. Navigiere zu **Release** → **Testing/Production**
3. Klicke auf **Create release** → **Add from library**
4. Lade die AAB-Datei hoch:
   ```
   android/app/build/outputs/bundle/release/app-release.aab
   ```
5. Überprüfe:
   - **Release Notes** (Deutsch/English)
   - **Privacy Policy URL** (öffentlich erreichbar, ohne Login): https://vecxtgwxqzrogthqqdys.supabase.co/functions/v1/legal/datenschutz
   - **Terms of Service** (öffentlich erreichbar, ohne Login): https://vecxtgwxqzrogthqqdys.supabase.co/functions/v1/legal/agb
   - **App Screenshots** (4.7", 5.4", 7.3" Tablets)
   - **App Title** (50 Zeichen max)
   - **Short Description** (80 Zeichen max)
   - **Full Description** (max 4000 Zeichen)
6. Klicke **Review release** → **Start rollout to Production**

## Build-Optimierungen

### ProGuard/R8

- ✅ ProGuard aktiviert (`minifyEnabled: true`)
- ✅ Resource Shrinking aktiviert (`shrinkResources: true`)
- ✅ Capacitor-Klassen geschützt
- ✅ WebView JavaScript-Interface bewahrt
- 📄 Regeln: `android/app/proguard-rules.pro`

### APK-Splitting (für PlayStore)

```gradle
bundle {
  enableSplit = true
  language { enableSplit = true }
  density { enableSplit = true }
  abi { enableSplit = true }
}
```

PlayStore erstellt automatisch optimierte APKs für:
- Verschiedene Sprachen
- Bildschirmdichten
- CPU-Architekturen (arm64, armeabi-v7a, x86, x86_64)

### Vite/Frontend-Optimierung

- ✅ Code-Splitting (vendor, ui, rest)
- ✅ Minification mit Terser
- ✅ Console-Statements entfernt in Production
- ✅ Sourcemaps deaktiviert (für Größe und Sicherheit)
- 📄 Regeln: `vite.config.js`

## Android SDK-Versionen

| Version | Wert |
|---------|------|
| minSdkVersion | 24 (Android 7.0+) |
| compileSdkVersion | 35 (Android 15) |
| targetSdkVersion | 35 (Android 15) |

## Anforderungen für PlayStore

- ✅ minSdkVersion ≥ 24 (Android 7.0+)
- ✅ targetSdkVersion ≥ 35 (aktuelles SDK)
- ✅ Keine Hardware-Anforderungen, die nicht getestet wurden
- ✅ Privacy Policy verlinkt
- ✅ Klarheit über Dateizugriffe
- ✅ Sicherheitsrichtlinie vorhanden

## Fehlerbehebung

### Keystore-Fehler

```
Unsupported ciphers: [BC_3DES]
```

**Lösung**: Keystore mit neuem BC-Provider:
```bash
keytool -importkeystore -srckeystore old.jks -destkeystore new.jks \
  -srcstoretype JKS -deststoretype JKS -srcstorepass pass -deststorepass pass \
  -srcalias old_alias -destalias new_alias
```

### Bundle-Größe zu groß

1. **Überflüssige Dependencies entfernen** (npm audit)
2. **Unused code entfernen** (tree-shaking in vite.config.js)
3. **Assets komprimieren** (WebP für Bilder)
4. **Duplicate dependencies entfernen** (npm dedupe)

```bash
npm list
npm dedupe
```

### PlayStore-Validierungsfehler

- **Überprüfe Manifest-Berechtigungen**: Nur notwendige Permissions
- **Check Signing**: AAB muss mit korrektem Keystore signiert sein
- **Play Console → Setup → App integrity** für Details

## Versionskontrolle

Jeder Release erhöht:
1. `versionCode` in `android/app/build.gradle`
2. `versionName` in `android/app/build.gradle`
3. `version` in `package.json`

Beispiel:
- Release 1.0.0 → versionCode=1, versionName="1.0.0"
- Release 1.0.1 → versionCode=2, versionName="1.0.1"
- Release 1.1.0 → versionCode=3, versionName="1.1.0"

## CI/CD Integration

### Vercel (Web + API)

Vercel baut automatisch bei jedem Push zu `main`:
- ✅ Frontend wird zu `dist/` gebaut
- ✅ Backend wird installiert
- ✅ API wird auf Vercel Serverless deployed

### GitHub Actions (Android)

`.github/workflows/build-android.yml` baut den Android-Client:
- **Trigger:** Push eines `v*`-Tags **oder** manuell per `workflow_dispatch`
- **Toolchain:** Node 22, JDK 21 (Temurin), Android Platform/Build-Tools 36, Gradle 8.9
- **Artefakte:** Debug-APK (`assembleDebug`, immer) zum Sideloaden sowie signiertes Release-**AAB** (`bundleRelease`) — der AAB-Schritt läuft nur, wenn das `KEYSTORE_BASE64`-Secret gesetzt ist
- Signierung erfolgt in CI über die `KEYSTORE_*`/`KEY_*`-Secrets (kein Keystore im Repo)

Alternativ lokal bauen und hochladen:
```bash
npm run build
cd android && ./gradlew bundleRelease
# android/app/build/outputs/bundle/release/app-release.aab hochladen
```

## Weitere Links

- [PlayStore Console](https://play.google.com/console)
- [Google Play Publishing Guidelines](https://play.google.com/console/about/policy)
- [Capacitor Android Docs](https://capacitorjs.com/docs/android)
- [Android Studio Build Config](https://developer.android.com/studio)
- [bundletool Dokumentation](https://developer.android.com/studio/command-line/bundletool)

---

**Letzte Aktualisierung**: Juli 2026
**Für Fragen oder Probleme**: Kontaktiere das Development-Team
