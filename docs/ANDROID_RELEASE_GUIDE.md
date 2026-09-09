# BaitBuddy Android Release Guide

Automatisierte Android APK/AAB Build & Play Store Release mit GitHub Actions.

---

## 🚀 Quick Release Process

```bash
# 1. Finalize Version (local)
# Editiere android/app/build.gradle
versionCode = 1
versionName = "1.0.0"

# 2. Commit & Tag
git add android/app/build.gradle
git commit -m "Bump version to 1.0.0"
git tag v1.0.0
git push origin main
git push origin --tags

# 3. GitHub Actions baut automatisch
# → Gehe zu GitHub → Actions → "build-android" Workflow
# → Warte bis abgeschlossen (~30 Minuten)

# 4. Prüfe Artifacts
# → Workflow Seite → Artifacts
# → Download "baitbuddy-v1.0.0.apk" (Debug) oder "release" (Production)

# 5. Play Store Upload
# → Google Play Console → BaitBuddy → Testing → Closed Testing → Upload AAB
# → Review warten (~24 Stunden)
# → Release to Production
```

---

## 1. Setup (Einmalig)

### 1.1 Google Play Service Account

```bash
# 1. Gehe zu Google Cloud Console
#    https://console.cloud.google.com

# 2. Erstelle neue Service Account:
#    IAM & Admin → Service Accounts → Create Service Account
#    Name: "GitHub-CI-BaitBuddy"
#    Description: "Automated Android Release via GitHub Actions"

# 3. Generiere Key:
#    → Service Account Seite
#    → Keys → Add Key → JSON
#    → Datei wird heruntergeladen

# 4. Konvertiere zu GitHub Secret:
#    cat service-account-key.json | base64 -w0 > sa-key.b64
#    # Kopiere den Output

# 5. In GitHub:
#    Repository → Settings → Secrets and variables
#    → New repository secret
#    Name: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
#    Value: [base64-encoded-json]
```

### 1.2 Signing Key Setup

```bash
# 1. Generiere Signing-Key (wenn noch nicht vorhanden)
keytool -genkey -v -keystore baitbuddy-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias baitbuddy-release \
  -storepass '<PASSWORD>' \
  -keypass '<PASSWORD>'

# 2. Konvertiere zu Base64
base64 -w0 baitbuddy-release.keystore > keystore.b64

# 3. Setze GitHub Secrets
#    KEYSTORE_BASE64 = [output von base64]
#    KEYSTORE_PASSWORD = <PASSWORD>
#    KEYSTORE_KEY_PASSWORD = <PASSWORD>
#    KEYSTORE_KEY_ALIAS = baitbuddy-release

# Speichere keystore.keystore SICHER:
# - Nicht in Git committen
# - Backup an 3 Stellen
# - Niemals public machen
```

### 1.3 GitHub Secrets Checklist

```
✅ KEYSTORE_BASE64
✅ KEYSTORE_PASSWORD  
✅ KEYSTORE_KEY_PASSWORD
✅ KEYSTORE_KEY_ALIAS
✅ GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
✅ ANTHROPIC_API_KEY (für Gameplay Tests)
✅ ELEVENLABS_API_KEY (für TTS Tests)
```

---

## 2. Version Management

### 2.1 versionCode & versionName

```gradle
// android/app/build.gradle

android {
  compileSdkVersion 34
  
  defaultConfig {
    applicationId "com.smokemoney81.baitbuddy"
    minSdkVersion 24
    targetSdkVersion 34
    
    versionCode 1        // Wird incrementiert bei jedem Release
    versionName "1.0.0"  // Semantische Versionierung
  }
}

// versionCode-Strategie:
// v1.0.0 → versionCode 1
// v1.0.1 → versionCode 2
// v1.1.0 → versionCode 3
// v2.0.0 → versionCode 10
```

### 2.2 Version Workflow

```bash
# Vor Release: aktualisiere Version
# 1. Editiere android/app/build.gradle
# 2. Editiere Changelog (docs/CHANGELOG.md)
# 3. Commit & Tag

# Semantic Versioning:
# MAJOR.MINOR.PATCH
# 1.0.0   = Initial Release
# 1.0.1   = Bugfix
# 1.1.0   = New Feature
# 2.0.0   = Breaking Change
```

---

## 3. Build Process

### 3.1 Lokal bauen (für Tests)

```bash
# Debug Build
./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk

# Release Build (benötigt Keystore)
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk

# App Bundle (AAB für Play Store)
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### 3.2 Automated Build (GitHub Actions)

```yaml
# .github/workflows/build-android.yml

name: Build Android

on:
  push:
    tags:
      - 'v*'  # Trigger bei jedem Tag v*.*.*
  workflow_dispatch:  # Manuell von GitHub UI triggerbar
    inputs:
      versionCode:
        description: 'Version Code (z.B. 5)'
        required: true
      versionName:
        description: 'Version Name (z.B. 1.0.1)'
        required: true

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'
      
      - name: Setup Android SDK
        uses: android-actions/setup-android@v2
      
      - name: Build Debug APK
        run: ./gradlew assembleDebug
      
      - name: Build Release AAB
        run: ./gradlew bundleRelease
        env:
          KEYSTORE_BASE64: ${{ secrets.KEYSTORE_BASE64 }}
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEYSTORE_KEY_PASSWORD: ${{ secrets.KEYSTORE_KEY_PASSWORD }}
          KEYSTORE_KEY_ALIAS: ${{ secrets.KEYSTORE_KEY_ALIAS }}
      
      - name: Upload to Play Store
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON }}
          packageName: com.smokemoney81.baitbuddy
          releaseFiles: 'android/app/build/outputs/bundle/release/app-release.aab'
          track: 'beta'  # Zuerst in Beta
          status: 'draft'  # Draft, nicht sofort live
      
      - name: Upload Artifacts
        uses: actions/upload-artifact@v3
        with:
          name: baitbuddy-builds
          path: |
            android/app/build/outputs/apk/debug/app-debug.apk
            android/app/build/outputs/bundle/release/app-release.aab
```

---

## 4. Play Store Process

### 4.1 Beta Release

```
1. GitHub Actions uploadt AAB zu Google Play Console (track: "beta")
2. AAB wird in Beta-Track eingefügt (als Draft)
3. Du reviewst die AAB in Play Console:
   - Prüfe Screenshots
   - Prüfe App-Beschreibung
   - Prüfe Release Notes
4. Klicke "Review Release"
5. Google prüft (≈24 Stunden)
6. Nach Genehmigung: "Start Rollout" → Test mit Tester-Gruppe
```

### 4.2 Production Release

```
1. Nach erfolgreichem Beta-Test:
2. Gehe zu: App → Internal Testing → Latest Release
3. Klicke "Release to Production"
4. Wähle Rollout-Strategie:
   - Staged Rollout (z.B. 25% → 50% → 100% über 5 Tage)
   - Instant (sofort 100%)
5. Play Store genehmigt und startet Rollout
6. App wird in Play Store sichtbar (≈2-4 Stunden)
7. Monitoring: Analytics → Install & Event → Track adoption
```

### 4.3 Play Console Felder ausfüllen

```
Release notes:
- Was neu ist (kurz und punchy)
- Fehlerbehebungen (wenn relevant)
- Known Issues (wenn relevant)
- Sprache: Deutsch

Beispiel:
"v1.0.0 - Erste Version
✨ KI-Buddy Chat (Echtzeit-Antworten)
🎣 Fangbuch mit Foto-Upload
🗺️ Spot-Tracker mit Karte
🐛 Bugfixes und Performance-Verbesserungen"
```

---

## 5. Sideloading (für Tester)

### 5.1 Debug APK Sideload

```bash
# Wenn GitHub Actions ein Debug-APK gebaut hat:

# 1. Download APK vom Artifact
# 2. USB-Debugging am Gerät aktivieren:
#    Settings → Developer Options → USB Debugging

# 3. ADB Connect:
adb connect 192.168.x.x:5555  # oder USB-Kabel

# 4. Install APK:
adb install android/app/build/outputs/apk/debug/app-debug.apk

# 5. Starte App
adb shell am start -n com.smokemoney81.baitbuddy/.MainActivity
```

### 5.2 Test-Gerätgruppe (Play Console)

```
1. Play Console → Testing → Internal Testing
2. "Manage Testers" → Add Email
3. Tester bekommt Link: https://play.google.com/apps/testing/...
4. Über Link kann Tester die Beta-Version installieren (vor Production Release)
```

---

## 6. Quality Assurance

### 6.1 Pre-Release QA

```bash
# Vor jedem Release muss geprüft werden:

# 1. Functional Testing
- [ ] App startet ohne Crash
- [ ] Login funktioniert
- [ ] KI-Buddy antwortet (< 2 Sec)
- [ ] Fangbuch: Foto upload, speichern, abrufen
- [ ] Spot-Tracker: GPS funktioniert
- [ ] Offline-Funktionalität

# 2. Performance Testing
- [ ] App-Start: < 3 Sekunden
- [ ] KI-Response: < 2 Sekunden
- [ ] Scroll Performance: 60 FPS
- [ ] Memory: < 200MB im Idle

# 3. Security Testing
- [ ] Keine hardcodierten Secrets
- [ ] API-Keys sind in Secrets gespeichert
- [ ] Keine unverschlüsselten Logins
- [ ] HTTPS für alle API-Calls

# 4. Compatibility Testing
- [ ] Android 9+ (API 28+)
- [ ] verschiedene Bildschirmgrößen
- [ ] Dark Mode
- [ ] RTL Languages (optional)

# Test-Matrix:
# Devices: Pixel 4a, Pixel 6, Samsung Galaxy S21, OnePlus 9
# OS: Android 10, 12, 13, 14
# Network: WiFi, 4G, 5G
# Locales: de-DE, de-AT, en-US
```

### 6.2 Automated Testing

```bash
# Unit Tests
./gradlew testDebugUnitTest

# Instrumentation Tests (Device Tests)
./gradlew connectedAndroidTest

# Screenshot Tests (mit Paparazzi)
./gradlew recordDebugPaparazzi
```

---

## 7. Rollback-Strategie

### 7.1 Wenn Production-Release fehlschlägt

```
1. Wenn schwerwiegender Bug gefunden:
   - STOPP: Aktiviere kein weiteres Rollout
   - Gehe zu Play Console → App → Releases
   - Klicke "Stop Rollout"

2. Schnell einen Fix-Release erstellen:
   - Branch von `v1.0.0` zu `v1.0.0-hotfix`
   - Fix durchführen
   - Tag: v1.0.1
   - GitHub Actions baut automatisch

3. Neue Beta-Version hochladen
   - Warten auf Genehmigung (24h)
   - Nach Genehmigung: Release to Production

4. Kommuniziere zu Nutzern:
   - Posting in Community
   - Newsletter (optional)
   - App Store Release Notes
```

### 7.2 Downgrade (fallback zu alter Version)

```bash
# Google Play erlaubt kein Downgrade
# Aber Nutzer können alte Version behalten:
# Settings → Apps → BaitBuddy → App Info
# Dort können sie ein Downgrade zu alten Version machen

# Für dich: nur vorwärts aktualisieren
# Kein Downgrade auf Play Store möglich
```

---

## 8. Monitoring & Analytics

### 8.1 Play Console Analytics

```
Post-Release Monitoring:

1. Install Stats
   - Total Installs
   - Daily Installs
   - Geographic Distribution

2. Crash Stats
   - Crash Rate
   - Top Crashing Threads
   - Stack Traces

3. Retention
   - Day 1 Retention (30% ist gut)
   - Day 7 Retention
   - Uninstall Rate

4. Ratings
   - Average Rating (Ziel: 4.5+)
   - Review Sentiment (positive/negative keywords)

Aktion bei Problemen:
- Crash Rate > 1% → Sofort Hotfix
- Rating < 3.5 → Schnelle Bugfixes
- Uninstall Rate > 5% → Investigate
```

### 8.2 Crash Tracking (Sentry)

```
Fehler werden AUTOMATISCH zu Sentry gesendet (wenn konfiguriert)

In Sentry Dashboard:
- Issues → Crashes from Android
- Stack traces mit Java Code
- Affected Devices/OS versions
- User Impact
```

---

## 📋 Release Checklist

### Vor Release
- [ ] Alle Tests grün (Unit + Integration)
- [ ] Keine TODOs im Code
- [ ] Version Numbers aktualisiert
- [ ] Changelog geschrieben
- [ ] QA Testing durchgeführt
- [ ] Secrets konfiguriert
- [ ] Play Console App Info aktualisiert

### Release Tag
- [ ] `git tag v1.0.0`
- [ ] `git push --tags`
- [ ] GitHub Actions baut automatisch
- [ ] Warte auf Build Completion

### Play Store
- [ ] AAB in Beta hochgeladen
- [ ] Release Notes eingegeben
- [ ] Screenshots prüfen
- [ ] Genehmigung abwarten
- [ ] Nach Genehmigung: Release to Production
- [ ] Rollout überwachen (24-48 Stunden)

### Post-Release
- [ ] Crash Rate prüfen (< 0.5%)
- [ ] Rating & Reviews prüfen
- [ ] Analytics überwachen
- [ ] Community-Feedback einchecken
- [ ] Hotfix-Branch bereit (für schnelle Fixes)

---

## 🚨 Emergency Release

Wenn kritischer Bug in Production:

```bash
# 1. Schneller Fix
git checkout -b hotfix/v1.0.1
# Fix durchführen
git commit -m "Hotfix: Critical bug in xyz"

# 2. Tag & Push
git tag v1.0.1
git push origin hotfix/v1.0.1
git push --tags

# 3. GitHub Actions baut automatisch
# 4. Play Console: Beta-Release
# 5. Nach Genehmigung: Production-Release (mit Staged Rollout)

# Zeitrahmen: 30 Minuten bis genehmigt, +30 Min bis in Production
```

---

**Letztes Update:** 2026-09-09
