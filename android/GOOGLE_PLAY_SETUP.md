# Google Play Billing Setup

## Überblick

Die BaitBuddy Android-App nutzt **Google Play Billing** für Premium-Plan-Käufe. Diese Anleitung erklärt, wie man die In-App-Produkte in der Google Play Console konfiguriert.

## Voraussetzungen

- Google Play Developer Account mit Zugriff auf die BaitBuddy App
- Zugriff auf Ihren Google Play Console Project

## Step 1: In-App-Produkte in der Play Console erstellen

Öffne https://play.google.com/console und navigiere zu:
**Deine App → Monetarisierung → Produkte → In-App-Produkte**

Erstelle folgende **In-App-Produkte** (Type: Einmaliger Einkauf):

### Basic Plan
- **Product ID:** `catchgbt_basic_monthly`
- **Name:** Basic (monatlich)
- **Preis:** 4,99 EUR
- **Beschreibung:** BaitBuddy Basic Plan — 1 Monat

### Pro Plan
- **Product ID:** `catchgbt_pro_monthly`
- **Name:** Pro (monatlich)
- **Preis:** 9,99 EUR
- **Beschreibung:** BaitBuddy Pro Plan — 1 Monat

### Ultimate (Elite) Plan
- **Product ID:** `catchgbt_ultimate_monthly`
- **Name:** Ultimate (monatlich)
- **Preis:** 19,99 EUR
- **Beschreibung:** BaitBuddy Ultimate Plan — 1 Monat

Alias für Kompatibilität (optional):
- **Product ID:** `catchgbt_elite_monthly` → verweist auf `catchgbt_ultimate_monthly`

### Freundschaft Plan (Jahresplan)
- **Product ID:** `catchgbt_friends_yearly`
- **Name:** Freundschaft (Jahresplan)
- **Preis:** 54,99 EUR
- **Beschreibung:** BaitBuddy Freundschaft Plan — 12 Monate

### Freundschaft Plan (Monatlich)
- **Product ID:** `catchgbt_friends_monthly`
- **Name:** Freundschaft (monatlich)
- **Preis:** 39,00 EUR
- **Beschreibung:** BaitBuddy Freundschaft Plan — 1 Monat

### Trial (optional)
- **Product ID:** `catchgbt_trial_10_10`
- **Name:** Trial 10 Tage
- **Preis:** 0,10 EUR (Symbolpreis)
- **Beschreibung:** Test-Plan für neue Nutzer

## Step 2: Test-Käufe konfigurieren (optional aber empfohlen)

In der Play Console:
1. Gehe zu **Einstellungen → Lizenzen und Lizenzverwaltung**
2. Trage die E-Mail-Adressen von Test-Geräten ein
3. Test-Geräte können kostenlos In-App-Käufe durchführen

## Step 3: Service Account für Backend-Verifikation (optional)

Falls Sie die Backend-seitige Verifikation nutzen möchten (zur Validierung von Käufen):

1. Gehe in der Google Play Console zu **Einstellungen → APIs und Berechtigungen**
2. Erstelle einen **Service Account** mit Zugriff auf die Android Publisher API
3. Lade den JSON-Key herunter
4. Setze die `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` Umgebungsvariable im Backend auf diesen JSON

**Hinweis:** BaitBuddy verarbeitet Käufe aktuell über die Google Play Billing Library (native Verifikation). Die Backend-Verifikation ist optional für zusätzliche Sicherheit.

## Step 4: App-Freigabe

Vor der Veröffentlichung:
1. Teste die Käufe mit einem echten Test-Gerät (Emulator funktioniert nicht mit Billing)
2. Stelle sicher, dass die App auf mindestens **API Level 24** zielt (erforderlich für Billing Library 7.x)
3. Starte einen Beta-Test mit ein paar Nutzern

## Troubleshooting

### "Produkt nicht gefunden"
- Überprüfe, ob die Product ID exakt mit der Play Console übereinstimmt
- Warte 15 Minuten nach der Erstellung — die Produkte sind nicht sofort verfügbar

### "Billing-Dienst nicht verfügbar"
- Das Gerät hat Google Play Services nicht korrekt installiert
- Installiere Google Play Services über Play Store Updates oder Factory Reset
- Emulator funktioniert nicht — nutze ein echtes Gerät

### Testgerät kann nicht kaufen
- Stelle sicher, die E-Mail des Gerätes ist in der Play Console als Test-Gerät eingetragen
- Der Nutzer muss mit derselben Google-Konto angemeldet sein, die auf dem Gerät konfiguriert ist
- Warte 15 Minuten nach der Registrierung

## Code-Referenz

Die Implementierung befindet sich in:
- `android/app/src/main/java/app/baitbuddy/mobile/GooglePlayBillingBridge.kt` — Billing-Logik
- `android/app/src/main/java/app/baitbuddy/mobile/MainActivity.java` — Integration

Das Frontend spricht über `window.AndroidBilling.purchase(productId)` mit der Bridge.
