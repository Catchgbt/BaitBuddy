# BaitBuddy — Android/PlayStore Build-Anleitung

Diese Anleitung führt dich durch die Erstellung einer signierten AAB-Datei für Google Play Store.

## Übersicht

- **Deine Web-App** (React/Vite) wird zu einer **nativen Android-App** mit Capacitor
- **App-ID**: `app.baitbuddy.mobile`
- **Output**: `android/app/build/outputs/bundle/release/app-release.aab` (signiert, ~2,3 MB)

---

## 🔧 Schritt 1: Keystore erstellen (einmalig!)

Ein **Keystore** ist eine Datei, die deinen privaten Signierungsschlüssel enthält. Google Play braucht diesen, um zu verifizieren, dass Updates von dir kommen.

### Schritt 1a: Java überprüfen

```bash
java -version
```

Falls nicht installiert: [OpenJDK 21+ installieren](https://adoptium.net/)

### Schritt 1b: Keystore generieren

**Windows (PowerShell oder CMD):**

```bash
keytool -genkey -v -keystore baitbuddy.jks ^
  -keyalg RSA -keysize 2048 -validity 10000 ^
  -alias baitbuddy
```

**macOS / Linux:**

```bash
keytool -genkey -v -keystore baitbuddy.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias baitbuddy
```

**Prompts beantworten:**

```
Enter keystore password: [dein_keystore_passwort]
Re-enter password: [dein_keystore_passwort]

What is your first and last name? 
  → Sebastian [oder dein Name]

What is the name of your organizational unit?
  → Development

What is the name of your organization?
  → BaitBuddy Team

What is the name of your City or Locality?
  → [deine Stadt, z.B. Berlin]

What is the name of your State or Province?
  → [Bundesland, z.B. Berlin]

What is the two-letter country code for this unit?
  → DE [oder dein Land]

Is [CN=Sebastian, ...] correct?
  → yes

Enter key password (RETURN if same as keystore password):
  → [dein_key_passwort, oder einfach ENTER für gleiches Passwort]
```

**Output:** `baitbuddy.jks` wird erstellt

### Schritt 1c: Fingerprint überprüfen

```bash
keytool -list -v -keystore baitbuddy.jks
```

Der **SHA256-Fingerprint** wird angezeigt — speichere ihn, falls nötig.

---

## 📋 Schritt 2: Keystore-Konfiguration

### Schritt 2a: keystore.properties erstellen

1. Kopiere `keystore.properties.example` zu `keystore.properties` (im `android/` Verzeichnis):
   ```bash
   cp keystore.properties.example android/keystore.properties
   ```

2. Öffne `android/keystore.properties` und fülle aus:
   ```properties
   storeFile=../baitbuddy.jks
   storePassword=your_keystore_password
   keyAlias=baitbuddy
   keyPassword=your_key_password
   ```

### Schritt 2b: .gitignore überprüfen

Die `.gitignore` sollte `keystore.properties` und `*.jks` bereits schützen:
```
android/keystore.properties
*.jks
*.keystore
```

**WICHTIG:** Der Keystore wird NICHT gepusht und bleibt privat! ✅

---

## 🏗️ Schritt 3: Dependencies installieren

```bash
npm install --legacy-peer-deps
cd backend && npm install
cd ..
```

---

## 📦 Schritt 4: AAB bauen

### Schritt 4a: Web-App bauen

```bash
npm run build
```

Output: `dist/` Verzeichnis mit kompilierten Assets

### Schritt 4b: Capacitor sync (Web-Assets → Android)

```bash
npx cap sync android
```

Das kopiert `dist/` in `android/app/src/main/assets/public/`

### Schritt 4c: AAB bauen mit Gradle

```bash
cd android
./gradlew bundleRelease
```

(Windows: `.\gradlew.bat bundleRelease`)

**Output:**
```
android/app/build/outputs/bundle/release/app-release.aab
```

**Größe:** ~2,3 MB (signiert, optimiert)

---

## ✅ Schritt 5: PlayStore-Upload

### Schritt 5a: Google Play Console öffnen

👉 https://play.google.com/console

### Schritt 5b: BaitBuddy auswählen

- Gehe zu **Release** → **Production** (oder **Testing**)
- Klick **Create release**

### Schritt 5c: AAB hochladen

- Lade `android/app/build/outputs/bundle/release/app-release.aab` hoch
- Google Play signiert mit deinem Keystore automatisch
- Release Notes hinzufügen (auf Deutsch & Englisch empfohlen)

### Schritt 5d: Review & Launch

- Überprüfe App-Details (Screenshots, Beschreibung, etc.)
- Klick **Review release**
- Klick **Start rollout to Production**

---

## 🔧 Häufige Fehler

### "sig fehlt" oder "Signatur fehlt"

**Problem:** Die AAB ist nicht mit dem korrekten Keystore signiert.

**Lösung:**
1. Überprüfe `android/keystore.properties`
2. `baitbuddy.jks` existiert & Passwörter sind korrekt?
3. Starte neuen Build: `./gradlew clean bundleRelease`

### "Keystore-Datei nicht gefunden"

**Problem:** `storeFile` Pfad in `keystore.properties` ist falsch.

**Lösungen:**
```properties
# Option 1: Relativ zu android/
storeFile=../baitbuddy.jks

# Option 2: Absolut
storeFile=C:\Users\Sebastian\Projects\BaitBuddy\baitbuddy.jks
```

### "Build failed: Gradle"

Stelle sicher:
- Java 21+ installiert: `java -version`
- Android SDK vorhanden: `echo $ANDROID_HOME`
- Gradle Daemon: `./gradlew --status`

---

## 📊 Versionierung

Jedes Mal, wenn du ein Update machst:

**Erhöhe in `android/app/build.gradle`:**

```gradle
defaultConfig {
    versionCode 2      // Jedes Mal erhöhen (1, 2, 3, ...)
    versionName "1.0.1"  // Semantic versioning
}
```

Beispiel-Progression:
- Release 1.0.0 → versionCode=1
- Release 1.0.1 → versionCode=2
- Release 1.1.0 → versionCode=3

---

## 📚 Weitere Ressourcen

- [Capacitor Android Docs](https://capacitorjs.com/docs/android)
- [Google Play Console](https://play.google.com/console)
- [Keytool Documentation](https://docs.oracle.com/en/java/javase/21/docs/specs/man/keytool.html)
- [Android App Signing](https://developer.android.com/studio/publish/app-signing)

---

## ⚠️ Sicherheit

- **Keystore (`baitbuddy.jks`):** Privat, nicht pushen, nicht teilen!
- **Passwörter:** Sicher speichern (nicht in Dateien, nicht im Chat)
- **Backups:** Sicherung der `baitbuddy.jks` an sicherem Ort
- **Verlust:** Wenn `baitbuddy.jks` verloren geht, kann deine App NICHT mehr updated werden! 🔴

---

**Letzte Aktualisierung:** Juni 2026
**Status:** Production-Ready ✅
