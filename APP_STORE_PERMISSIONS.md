# App Store Berechtigungen & Compliance — BaitBuddy

**Für:** iOS App Store & Google Play Store  
**Version:** 1.0  
**Gültig ab:** Dezember 2024

---

## 1. Berechtigungen nach iOS (App Store)

### 1.1 Standort (Location)
**Permission:** `NSLocationWhenInUseUsageDescription`

- **Erforderlich für:**
  - Spot-Tracking (Angelplätze markieren mit GPS)
  - Wetter-Integration (lokale Vorhersagen)
  - KI-Buddy Kontext (regionale Schonzeiten)
  - Karten-Anzeige

- **Modus:** "While Using" (Nur wenn App offen)
- **Genauigkeit:** Präzise (~10m für Spot-Genauigkeit)
- **Datenschutz:** Nur mit expliziter Nutzer-Erlaubnis; kann jederzeit deaktiviert werden

**Beschreibung in App Store:**  
_"BaitBuddy benötigt Zugriff auf Ihren Standort, um Angelplätze zu markieren, lokales Wetter anzuzeigen und KI-Buddy mit regionalen Informationen (Schonzeiten, Events) zu versorgen. Sie können dies in den Einstellungen jederzeit ändern."_

---

### 1.2 Kamera (Camera)
**Permission:** `NSCameraUsageDescription`

- **Erforderlich für:**
  - Fangfotos aufnehmen (Dokumentation von Fängen)
  - Köder-Fotos (für Ausrüstungs-Verwaltung)
  - KI-Bildanalyse (Fischart-Erkennung, Gewichtsschätzung)

- **Datenschutz:** 
  - Fotos werden lokal erfasst, dann optional zu Supabase hochgeladen
  - Private Fotos (Standard) sind nicht öffentlich
  - Benutzer steuert, wer Fotos sieht

**Beschreibung in App Store:**  
_"BaitBuddy benötigt Kamerazugriff, um Fotos von Ihren Fängen und Ausrüstung aufzunehmen. Diese Fotos werden lokal gespeichert und können von Ihnen optional mit der Community geteilt werden. Die KI analysiert Fischfotos, um Art und Gewicht automatisch zu erkennen."_

---

### 1.3 Mikrofon (Microphone)
**Permission:** `NSMicrophoneUsageDescription`

- **Erforderlich für:**
  - Sprachgespräche mit KI-Buddy (Voice Chat)
  - Spracherkennung für Fragen an Jule
  - Optionale Voice-to-Text Eingabe

- **Datenschutz:**
  - Sprache wird **nicht persistent gespeichert**
  - Nur für Live-Transkription verarbeitet (Browser Web Speech API)
  - Optional: OpenAI Realtime API (Benutzer wählt Voice-Chat-Modus)

**Beschreibung in App Store:**  
_"BaitBuddy benötigt Mikrofon-Zugriff für Sprachgespräche mit dem KI-Buddy und Spracherkennung. Ihre Sprachaufnahmen werden nicht aufgezeichnet oder gespeichert, sondern nur für die Transkription verarbeitet."_

---

### 1.4 Fotobibliothek (Photo Library)
**Permission:** `NSPhotoLibraryUsageDescription`

- **Erforderlich für:**
  - Fotos aus der Bibliothek hochladen (für Fänge, Ausrüstung)
  - Backup von Fangfotos

- **Datenschutz:**
  - Nur Fotos, die der Benutzer bewusst auswählt
  - Keine automatische Synchronisation aller Fotos

**Beschreibung in App Store:**  
_"BaitBuddy benötigt Zugriff auf Ihre Fotobibliothek, um bereits aufgenommene Fotos hochzuladen und mit Ihren Angeltouren zu verknüpfen."_

---

### 1.5 Bewegung & Bewegungssensor (Motion)
**Permission:** `NSMotionUsageDescription`

- **Erforderlich für:**
  - AR-Funktionen (Augmented Reality Wassertiefe-Anzeige)
  - Geräte-Neigungserkennung

- **Datenschutz:** Keine Speicherung oder Weitergabe

**Beschreibung in App Store:**  
_"BaitBuddy nutzt Beschleunigungsmesser für AR-Features und Geräte-Navigation."_

---

### 1.6 Health Kit (optional, zukünftig)
**Permission:** `NSHealthShareUsageDescription`

- **Erforderlich für:**
  - Verbindung von Fitness-Daten (optional)
  - Kalorienverbrennung während Angeltouren tracken

- **Datenschutz:** Benutzer muss explizit aktivieren

---

## 2. Berechtigungen nach Android (Google Play Store)

Äquivalente zu iOS oben:

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

**Anfrage-Runtime (Android 6+):**
- Standort → USER_GRANT_LOCATION bei erstem Besuch Karten-Seite
- Kamera → USER_GRANT_CAMERA bei erstem Foto-Button
- Mikrofon → USER_GRANT_MICROPHONE bei erstem Voice-Chat

---

## 3. Datenschutz-Labels (iOS)

Für iOS 14.5+, in der App Store-Einreichung unter "App Privacy":

| Datentyp | Erfasst | Verlinkt | Grund |
|---|---|---|---|
| **Standort** | Ja | Ja | Spot-Tracking, Wetter |
| **Kamera & Fotos** | Ja | Ja | Fangdokumentation |
| **Mikrofon** | Ja | Nein | Voice-Chat (nicht persistent) |
| **Kontaktdaten** | Nein | — | — |
| **Gesundheit & Fitness** | Nein | — | — |
| **Finanzinformationen** | Ja (Premium) | Nein | In-App Purchases |
| **Sensible Infos** | Nein | — | — |

---

## 4. Datenschutz-Labels (Android)

Für Google Play Policy (ab 2023):

**Erfasste Kategorien:**
- Location (precise)
- Photos & Media
- Audio Files
- User IDs
- Precise Location

**Für folgende Zwecke:**
- Funktionalität der App
- App-Betriebssicherheit
- Personalisierung

---

## 5. App Review Anforderungen

### 5.1 Apple App Store Review Guidelines
✅ **Bestanden:**
- [x] Datenschutzrichtlinie vorhanden (`PRIVACY.md`)
- [x] Berechtigungen dokumentiert
- [x] Keine versteckten Kosten/Features
- [x] Keine Spyware/Tracking
- [x] KI-Chat als Feature deklariert (nicht versteckt)

⚠️ **Zu beachten:**
- [ ] KI-Buddy Moderation: Keine illegalen Inhalte (Fischen in Schutzgebieten, etc.)
- [ ] Entfernung von umweltschädlichen Inhalten (z. B. überfischte Spots)
- [ ] Kontaktinformationen für Support müssen erreichbar sein

### 5.2 Google Play Store Policy
✅ **Bestanden:**
- [x] Berechtigungen rechtfertigt
- [x] Keine Malware/Adware
- [x] Mindestens 13 Jahre Altersfreigabe
- [x] Privacy Policy verlinkt

⚠️ **Zu beachten:**
- [ ] Biometrische Daten (falls Fingerprint Login): COPPA-Konformität
- [ ] Drittanbieter-SDKs auditieren (Groq, OpenAI, ElevenLabs)

---

## 6. COPPA & Kinder-Sicherheit

**BaitBuddy ist NICHT für Kinder < 13 Jahren konzipiert.**

- App-Store-Eintrag: **13+ Jahren** (iOS: 4+, Android: PEGI 3)
- Keine Zeichnung von Kindern erlaubt
- Keine Werbung für Kinder-Apps/Inhalte

---

## 7. Datenschutz-Audit Checklist

Vor jedem App Store Release:

- [ ] Privacy Policy aktuell & verlinkt in App
- [ ] Alle Berechtigungen in `Info.plist` (iOS) oder `AndroidManifest.xml` dokumentiert
- [ ] Berechtigungen nur anfordert, wenn nötig
- [ ] Keine Hintergrund-Tracking ohne explizite Zustimmung
- [ ] Drittanbieter (Groq, OpenAI, Supabase) haben eigene Privacy Policies
- [ ] Datenverarbeitung in Datenschutz-Labels dokumentiert
- [ ] Benutzerdaten nicht an Werbetreibende/Analytics weitergegeben (außer anonymisiert)
- [ ] Konto-Löschung = Datenlöschung innerhalb 30 Tage
- [ ] Support-Kontakt in der App (Settings → Hilfe → Support)

---

## 8. Berechtigungen in BaitBuddy-App

**Einstellungen → Datenschutz:**
- [ ] Standort-Tracking kontrollieren (aktivieren/deaktivieren)
- [ ] Kamera-Berechtigungen verwalten
- [ ] Mikrofon für Voice-Chat (Schalter)
- [ ] Tracking für Analytik abschalten
- [ ] Cookie-Einstellungen
- [ ] Datenhausen/Löschung anfordern

---

## 9. Support & Kontakt

**App Store Kontaktinformation:**
- E-Mail in App Store Listing: kaisaschnitt99@gmail.com
- Support-URL: https://baitbuddy.app/support (falls vorhanden)
- Privacy Policy Link: https://github.com/smokemoney81/BaitBuddy/blob/main/PRIVACY.md

---

**Version History:**
- **1.0** (Dezember 2024) – Initial Release Checklist

---

*Dieses Dokument wird vor jedem App Store Release aktualisiert.*
