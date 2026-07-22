# BaitBuddy Premium-Sektion — Umfassender Test-Leitfaden (Schritte 11-15)

## 📋 Übersicht

Dies ist der praktische Verifikationsleitfaden für die vollständige Premium-Funktionalität. Die Tests decken reale Szenarien ab (Web-Kauf, App-Kauf, Referrals, Feature-Gating, Fehlerbehandlung).

---

## 🌐 **Schritt 11: Web-Kauf Test (Stripe)**

### Voraussetzungen
- Browser (Chrome, Firefox, Safari)
- Zugang zur Live-Vercel-Site: `https://bait-buddy.vercel.app` (oder lokale Dev-Umgebung)
- Stripe Account im Test-Modus
- Test-Kartennummern von Stripe bereitgestellt

### Stripe Test-Kartennummern
| Karte | Nummer | Verhalten |
|-------|--------|-----------|
| Erfolg | 4242 4242 4242 4242 | Zahlung bestätigt |
| Abgelehnt | 4000 0000 0000 0002 | Zahlung blockiert |
| 3D Secure nötig | 4000 0025 0000 3155 | Zusätzliche Verifikation |

### Test 11.1: Basis Web-Kauf (Plan: Basic €8,99)

**Setup:**
```
1. Logout (falls eingeloggt)
2. Neu registrieren: Beliebiger Email + Passwort
3. Navigiere zu /PremiumPlans
```

**Aktion:**
```
1. Wähle "Basic €8,99"
2. Klicke "Karte / Google Pay / Apple Pay" (WebCheckoutButton)
3. Button sollte "Weiterleitung..." anzeigen (Loading State)
4. Warte auf Redirect zu Stripe Checkout
```

**Verifikation (Stripe Checkout):**
- [ ] URL beginnt mit `https://checkout.stripe.com/pay/`
- [ ] Session enthält Plan-Name: "Basic"
- [ ] Preis: €8,99
- [ ] Gebe Test-Kartennummer ein: `4242 4242 4242 4242`
- [ ] Beliebiges Ablaufdatum (z.B. 12/26)
- [ ] Beliebiges CVV (z.B. 123)
- [ ] Klicke "Bezahlen"

**Verifikation (Nach Zahlung):**
- [ ] Redirect zurück zu `/PremiumPlans?checkout=success&plan_id=basic&session_id=cs_...`
- [ ] Toast zeigt: "Plan aktiviert" mit Beschreibung "Deine Zahlung wurde bestätigt..."
- [ ] URL-Parameter werden entfernt (replace history)
- [ ] Dashboard zeigt: "Plan aktiv bis [Datum +30 Tage]"
- [ ] `localStorage.bb_premium_plan_id` = `"basic"`
- [ ] `localStorage.bb_premium_expires_at` = Timestamp +30 Tage
- [ ] Backend `GET /api/premium/status` zeigt:
  ```json
  {
    "ok": true,
    "plan": {
      "id": "basic",
      "is_active": true,
      "remaining_days": 30,
      "ultimate_discount_cents": 0
    }
  }
  ```

**Fehlerfall 11.2: Zahlung abgelehnt**
- Gebe Test-Kartennummer ein: `4000 0000 0000 0002`
- Klicke "Bezahlen"
- Erwartung: Stripe zeigt Fehler "Zahlung abgelehnt"
- Zurück zu `/PremiumPlans?checkout=cancelled`
- Toast zeigt: "Kauf abgebrochen"
- Plan wird NOT aktiviert

**Fehlerfall 11.3: Checkout abgebrochen (ESC)**
- Öffne Checkout
- Drücke ESC oder klicke "Zurück"
- Stripe leitet zurück zu `cancelUrl`
- Toast zeigt: "Kauf abgebrochen"

---

## 📱 **Schritt 12: App-Kauf Test (Google Play IAP)**

### Voraussetzungen
- Android-Emulator oder echtes Gerät mit Google Play Services
- Google Play Billing Library integriert (`android/build.gradle`)
- Google Play Console Account mit Test-Setup

### Android-Emulator Setup
```bash
# 1. Emulator mit Google Play Services starten
emulator -avd Pixel_6_API_31 -no-snapshot

# 2. BaitBuddy-App bauen
npm run android

# 3. APK auf Emulator installieren
adb install -r dist/baitbuddy.apk
```

### Test 12.1: Google Play IAP Kauf (Plan: Basic)

**Setup:**
```
1. App starten auf Emulator/Device
2. Login mit Test-Account
3. Navigiere zu Settings → Premium (oder /PremiumPlans)
4. Stelle sicher: isGooglePlayBillingAvailable() = true
```

**Aktion:**
```
1. Wähle "Basic €8,99"
2. Klicke "Im Play Store kaufen" (Google Play IAP Button)
3. Button zeigt Loading State
4. Google Play Billing Dialog sollte erscheinen
```

**Verifikation (Google Play Dialog):**
- [ ] Dialog zeigt Plan-Details: "Basic", "€8,99", "monatlich"
- [ ] Dialog hat "Kaufen" und "Abbrechen" Button
- [ ] Klicke "Kaufen"
- [ ] Play Store führt Kauf durch (Test-Konto, kostenlos)

**Verifikation (Nach Kauf):**
- [ ] Callback wird ausgelöst: `play-billing-success`
- [ ] Frontend erhält `planId` + `purchaseToken`
- [ ] Automatischer Aufruf zu `POST /api/premium/activate` mit Token
- [ ] Backend verifiziert mit Google Play API
- [ ] Toast zeigt: "Plan aktiviert" mit "Dein Premium-Plan ist jetzt aktiv."
- [ ] Dashboard aktualisiert sich: "Plan aktiv bis [+30 Tage]"
- [ ] CustomEvent `plan-updated` wird ausgelöst
- [ ] `localStorage.bb_premium_plan_id` = `"basic"`

**Fehlerfall 12.2: Kauf abgebrochen**
- Google Play Dialog zeigen
- Klicke "Abbrechen"
- Erwartung: Callback `play-billing-cancel`
- Toast zeigt: "Kauf abgebrochen"
- Plan wird NOT aktiviert

**Fehlerfall 12.3: Netzwerk-Fehler während Kauf**
- Deaktiviere Netzwerk (Flugzeugmodus)
- Versuche Kauf
- Erwartung: Fehler-Callback mit Code
- Toast zeigt: Fehler + "Retry"-Button verfügbar
- Aktiviere Netzwerk und klicke Retry

### Test 12.4: Käufe wiederherstellen

**Szenario:** User hat Plan auf altem Gerät gekauft, neues Gerät

**Aktion:**
```
1. Plan auf Gerät 1 kaufen (Basic)
2. Plan auf Gerät 1 verifizieren (aktiv)
3. Zu Gerät 2 wechseln, App starten
4. Navigiere zu Premium-Seite
5. Klicke "Käufe wiederherstellen"
```

**Verifikation:**
- [ ] `restoreGooglePlayPurchases()` wird aufgerufen
- [ ] Verbindung zu Google Play hergestellt
- [ ] Plan wird erkannt und `POST /api/premium/activate` aufgerufen
- [ ] Toast zeigt: "Käufe wiederhergestellt" + "Plan [X] aktiviert"
- [ ] Dashboard zeigt aktiven Plan (gleiche Ablaufdatum wie Gerät 1)
- [ ] Keine Doppel-Aktivierung (Idempotenz prüfen)

---

## 🎁 **Schritt 13: Referral-Flow Test (7 Tage + Rabatt)**

### Test 13.1: Neuer User über Referral-Link (7-Tage Reward)

**Szenario: User A → Elite-Plan, lädt User B ein**

**Setup User A (Referrer):**
```
1. Registriere User A (z.B. referrer@test.de)
2. Kaufe Elite-Plan (€36 / Stripe oder IAP)
3. Verifiziere Plan aktiv
4. Hole Referral-Code: GET /api/referrals/me
5. Code sollte sein: z.B. "ABC12XYZ"
```

**Generiere Link für User B:**
```
Link: https://bait-buddy.vercel.app?ref=ABC12XYZ
oder lokal: http://localhost:5173?ref=ABC12XYZ
```

**Setup User B (Neuer User):**
```
1. Öffne Link mit ref-Parameter
2. Code wird in localStorage.bb_pending_referral_code gespeichert
3. Navigiere zu /Register oder Home zeigt Einladungs-Popup
4. Registriere mit neuer Email (z.B. friend@test.de)
5. Nach erfolgreicher Registrierung: Login
```

**Verifikation User B (Nach Login):**
- [ ] ReferralInvitePopup erscheint
- [ ] Text zeigt: "7 Tage Ultimate für dich kostenfrei"
- [ ] Popup hat "Bestätigen" und "Später"-Button
- [ ] localStorage.bb_pending_referral_code = "ABC12XYZ"

**Aktion (Referral einlösen):**
```
1. Klicke "Bestätigen" im Popup
2. Backend ruft POST /api/referrals/redeem auf
3. Header sendet plan_id, token mit Referral-Code
```

**Verifikation nach Einlösung:**
- [ ] Fehlerfall prüfen: Wenn Code bereits eingelöst → 409 Conflict
- [ ] Bei erfolgreicher Einlösung:
  - User B `premium_plan_id` = `"elite"` (Ultimate-Level)
  - User B `premium_expires_at` = NOW + 7 Tage
  - User B `referred_by` = Referral-Code-ID
  - Supabase `referrals` Tabelle: Neue Zeile mit User B als `referred_user_id`
  - User A `referral_reward_count` inkrementiert (+1)
- [ ] Toast zeigt: "7 Tage Ultimate aktiviert"
- [ ] Dashboard zeigt: "Plan aktiv bis [+7 Tage]"
- [ ] localStorage.bb_premium_plan_id = "elite"

**Fehlerfall 13.2: Code nicht gültig**
- Versuche Code einzulösen mit ungültigem Code
- Erwartung: 404 oder 400
- Toast zeigt: "Referral-Code nicht gültig"
- Plan wird nicht aktiviert

### Test 13.3: Basic-Kauf Rabatt für Referrer

**Szenario: User B (Referral von User A) kauft Basic**

**Voraussetzung:**
- User A hat Ultimate-Plan + minimum 1 Referral (User B)
- User B hat 7-Tage Ultimate aktiv (von Referral)

**Aktion User B:**
```
1. User B warten auf Tag 8 (Trial ablaufen, auf Free downgrade)
   ODER manuell Premium Plan auf Free resetten (für Test)
2. Navigiere zu /PremiumPlans
3. Wähle "Basic €8,99"
4. Checkout durchführen (Stripe oder IAP)
5. Plan aktivieren
```

**Verifikation:**
- [ ] Backend erkennt: User B hat `referred_by` + `basic_reward_granted` = false
- [ ] Referrer (User A) erhält `ultimate_discount_cents += 1000` (10€)
- [ ] Supabase `referrals` Zeile: `basic_reward_granted` = true
- [ ] User A kann jetzt Elite mit Rabatt kaufen:
  ```
  Normaler Preis: €36,00
  Mit Rabatt (10€): €26,00
  ```

**Test 13.4: User A nutzt Referral-Rabatt**

**Aktion User A (nach Basic-Kauf von User B):**
```
1. User A hat 10€ Rabatt (`ultimate_discount_cents = 1000`)
2. Navigiere zu /PremiumPlans
3. Wähle "Elite €36,00"
4. Klicke "Karte / Google Pay / Apple Pay"
5. Stripe Checkout sollte €26,00 anzeigen (nicht €36,00)
```

**Verifikation:**
- [ ] Stripe Session: `amountCents` = 2600 (nicht 3600)
- [ ] Checkout-Seite zeigt: "€26,00" (Rabatt abgezogen)
- [ ] Toast oder Plan-Beschreibung zeigt Rabatt-Info
- [ ] Nach erfolgreicher Zahlung: User A `ultimate_discount_cents` = 0 (verbraucht)

**Test 13.5: Max. 3 Freunde Rabatt (30€ gedeckelt)**

**Szenario: User A lädt 4 Freunde ein, 3 kaufen Basic**

**Aktion:**
```
1. User A lädt 3 Freunde (B, C, D) ein
2. Alle 3 registrieren sich und lösen Referral-Code ein
3. Alle 3 kaufen später Basic-Plan
4. User A sollte €30 Rabatt haben (max)
5. 4. Freund (E) wird eingeladen und kauft Basic
   → User A Rabatt bleibt €30 (nicht €40)
```

**Verifikation:**
- [ ] Nach 3. Basic-Kauf: `ultimate_discount_cents` = 3000
- [ ] Nach 4. Basic-Kauf: `ultimate_discount_cents` bleibt 3000 (gedeckelt)

---

## 🔐 **Schritt 14: Feature-Gating Verifikation**

### Test 14.1: Free-User Feature-Gating

**Setup:**
```
1. Registriere neuen User
2. Logout + Login (um planMeetsRequirement-Gating zu testen)
3. Kein Premium-Plan kaufen (Free-Tier)
```

**Test KI-Buddy Rate-Limit:**
```
1. Öffne KI-Buddy Widget oder Chat
2. Schreibe 1. Nachricht: "Hallo KI-Buddy"
   → Erfolg (1/3)
3. Schreibe 2. Nachricht: "Wie führe ich einen Karpfen?"
   → Erfolg (2/3)
4. Schreibe 3. Nachricht: "Was ist der beste Köder?"
   → Erfolg (3/3)
5. Versuche 4. Nachricht
   → 429 Too Many Requests
   → Toast: "3/3 tägliche KI-Anfragen verbraucht"
```

**Verifikation Rate-Limit:**
- [ ] Backend setzt Redis-Schlüssel: `bb:chat:free:{userId}:{YYYYMMDD}`
- [ ] Counter startet bei 0
- [ ] Mit jedem Chat-Request inkrementiert (+1)
- [ ] Bei Counter >= 3: 429 Status
- [ ] Nach 24 Stunden: Limit zurückgesetzt
- [ ] Basic+ User überspringt dieses Limit komplett

**Test AR-Feature (Pro-Plan erforderlich):**
```
1. Navigiere zu AR-Köder
2. Button sollte greyed out sein oder Lock-Icon haben
3. Klicke auf Button
4. PlanGuard-Modal erscheint: "Upgrade zu Pro für AR-Köder"
5. Upgrade-Button verlinkt zu /PremiumPlans
```

**Test Voice-Chat (Elite erforderlich):**
```
1. Navigiere zu KiBuddyBeta (Voice-Chat)
2. Klicke "Starte Voice-Chat"
3. Popup/Modal: "Upgrade zu Ultimate für Voice-Chat"
4. Button sollte verlinkt sein
```

**Test Matilda TTS-Stimme (Elite erforderlich):**
```
1. Navigiere zu Settings → Audio
2. Voice-Optionen anzeigen
3. "Matilda (weiblich)" sollte locked/disabled sein
4. Lock-Icon oder Tooltip: "Ultimate erforderlich"
5. Versuche auszuwählen: Info oder Modal "Upgrade zu Ultimate"
```

### Test 14.2: Basic-User Feature-Gating

**Setup:**
```
1. Neuer User, Basic-Plan gekauft (€8,99)
2. Verifiziere Plan aktiv
```

**Test KI-Buddy (unbegrenzt):**
```
1. Öffne KI-Buddy
2. Schreibe 10+ Nachrichten
3. Alle sollten funktionieren (kein Rate-Limit)
4. Response sollte schnell sein (< 2 Sek)
```

**Test AR-Köder (noch gesperrt):**
```
1. Navigiere zu AR
2. Sollte noch Lock-Icon zeigen (Pro erforderlich)
```

**Test Voice-Chat (noch gesperrt):**
```
1. Navigiere zu Voice
2. Sollte Upgrade-Modal zeigen (Elite erforderlich)
```

### Test 14.3: Pro-User Feature-Gating

**Setup:**
```
1. Kaufe Pro-Plan (€18,00)
2. Verifiziere aktiv
```

**Test AR-Köder (jetzt verfügbar):**
```
1. Navigiere zu AR
2. Button sollte aktiv sein (kein Lock)
3. Klicke auf AR → sollte 3D-Köder-Animation laden
4. Verschiedene Animationen auswählen
5. Alle sollten funktionieren
```

**Test Community-Features:**
```
1. Community-Sektion öffnen
2. Rankings sichtbar
3. Events sichtbar und beitrittbar
```

**Test Voice-Chat (noch gesperrt):**
```
1. Navigiere zu Voice
2. Sollte noch Upgrade-Modal zeigen (Elite erforderlich)
```

### Test 14.4: Elite/Ultimate-User Feature-Gating

**Setup:**
```
1. Kaufe Elite-Plan (€36,00)
2. Verifiziere aktiv
```

**Test Voice-Chat (jetzt verfügbar):**
```
1. Navigiere zu KiBuddyBeta
2. "Starte Voice-Chat" Button sollte aktiv sein
3. Klicke → Voice-Chat sollte starten
4. Spreche zu Mikrofon
5. KI sollte antworten mit Stimme
6. Audio sollte mit ElevenLabs-TTS erfolgen
```

**Test Matilda TTS-Stimme (jetzt verfügbar):**
```
1. Settings → Audio
2. "Matilda (weiblich)" sollte selektierbar sein
3. Wähle Matilda
4. localStorage.buddy-tts-voice = "matilda"
5. Voice-Chat sollte mit Matilda antworten
6. Optional: Wechsel zu Daniel, sollte auch funktionieren
```

**Test Live-Bissanzeiger:**
```
1. Öffne Live-Bissanzeiger Feature
2. Sollte voll funktionieren
3. Alle Alerts sollten aktiv sein
```

### Test 14.5: Friends-Plan Feature-Gating

**Setup:**
```
1. Kaufe Friends-Plan (€150,00 / 365 Tage)
2. Verifiziere aktiv
```

**Test Event-Erstellung:**
```
1. Navigiere zu Events
2. "Event erstellen" Button sollte aktiv sein
3. Erstelle neues Event
4. Lade Freund ein (über Referral-System)
5. Freund sollte Event sehen (auch wenn Free-Plan)
```

---

## ⏰ **Schritt 15: End-to-End Szenarien & Regression-Tests**

### Szenario A: Komplettes Referral-Ökosystem (3 User)

**Zeitrahmen:** ~30 Minuten

**Beteiligte:**
- User A (Referrer, Ultimate-Plan)
- User B (Referral #1)
- User C (Referral #2)

**Ablauf:**

**Phase 1: User A Setup**
```
1. Registriere User A (referrer@test.de)
2. Kaufe Elite-Plan (€36)
3. Verifiziere: Plan aktiv bis +30 Tage
4. Hole Referral-Code A: GET /api/referrals/me
   → Code: "ALPHA1"
5. Verifiziere: referral_code in Metadaten
```

**Phase 2: User B Referral (7-Tage Reward)**
```
1. Öffne Referral-Link mit ref=ALPHA1
2. Registriere User B (friendb@test.de)
3. Nach Login: ReferralInvitePopup
4. Klicke "Bestätigen"
5. Verifikation:
   - User B: premium_plan_id = "elite"
   - User B: premium_expires_at = NOW + 7 Tage
   - User A: referral_reward_count += 1 (jetzt 1)
   - Supabase referrals: Neue Zeile, referred_user_id = User B
```

**Phase 3: User B kauft Basic (Rabatt für User A)**
```
1. Warte oder setze User B Plan auf Free (für Test)
2. User B kauft Basic-Plan (€8,99)
3. Verifikation:
   - User A: ultimate_discount_cents += 1000 (jetzt 1000)
   - Supabase referrals: basic_reward_granted = true
   - User B: premium_plan_id = "basic"
```

**Phase 4: User A nutzt Rabatt**
```
1. User A kauft wieder Elite-Plan (€36)
2. Stripe Checkout sollte zeigen: €26,00 (€36 - €10)
3. Verifikation:
   - Nach Kauf: User A premium_expires_at = NOW + 30 Tage (verlängert)
   - After activation: ultimate_discount_cents = 0 (verbraucht)
```

**Phase 5: User C Referral (gleiches wie User B)**
```
1. Hole User A's Code wieder
2. Registriere User C
3. User C löst Code ein → 7 Tage Ultimate
4. User A: referral_reward_count = 2
5. User C kauft Basic
   → User A: ultimate_discount_cents = 2000 (jetzt 20€)
```

**Phase 6: Verifikation der Limits**
```
1. Lade User D ein
2. User D registriert + Code gelöst
3. User D kauft Basic
   → User A: ultimate_discount_cents = 3000 (bleibt bei 30€, max)
```

---

### Szenario B: Plan-Ablauf & Auto-Downgrade

**Zeitrahmen:** ~5 Minuten + manuelles Timing

**Ablauf:**

```
1. User X kauft Pro-Plan (€18)
2. Verifikation: premium_plan_id = "pro", expires_at = +30 Tage
3. Manueller Datenbankzugriff (SQL):
   UPDATE auth.users 
   SET user_metadata = jsonb_set(user_metadata, '{premium_expires_at}', 
       to_jsonb((NOW() - interval '1 hour')::text))
   WHERE id = 'user-x-id';
   
   ODER über Supabase-Admin:
   - GET /api/auth/admin/users/{id}
   - Modify premium_expires_at = NOW() - 1 Stunde
4. Cron-Job läuft täglich 03:00 UTC
   → Für Tests: manuell aufrufen:
   POST /api/admin/premium/check-expiry
   Header: cron: <VERCEL_CRON_SECRET>
5. Verifikation nach Cron:
   - User X: premium_plan_id = null
   - User X: premium_expires_at = null
   - User X: premium_trial = null
   - localStorage: Plan sollte auf "free" fallen
   - GET /api/premium/status sollte plan="free" zeigen
6. Toast bei nächstem Login/Reload:
   "Dein Plan ist abgelaufen, zurück zu Free"
```

---

### Szenario C: Doppel-Kauf-Schutz (Replay-Protection)

**Zeitrahmen:** ~5 Minuten

**Setup:**
```
1. User Y registrieren
2. Stripe-Kauf durchführen (Basic)
3. Notiere session_id: z.B. "cs_test_123"
```

**Test Idempotenz:**
```
1. POST /api/premium/activate
   Body: {
     plan_id: "basic",
     transaction_id: "cs_test_123",
     payment_method: "stripe"
   }
2. Erfolg: Plan aktiviert, expires_at = NOW + 30 Tage
3. Rufe SAME Endpoint nochmal auf (mit gleichem transaction_id)
4. Erwartung:
   - Status: 200 (ok)
   - expires_at bleibt GLEICH (wird nicht nochmal verlängert)
   - Note: "Transaktion bereits verarbeitet"
5. Verifiziere: Plan läuft nur 30 Tage, nicht 60
```

---

### Szenario D: Event-Freigabe Friends-Plan

**Zeitrahmen:** ~10 Minuten

**Setup:**
```
- User F: Friends-Plan gekauft (€150/Jahr)
- User G: Free-User, ist User F's Referral
```

**Ablauf:**

```
1. User F erstellt Event: "Karpfentreffen 2026-08-22"
   POST /api/events
   Body: { name: "Karpfentreffen...", is_active: true, ... }
   
2. Notiere event_id: z.B. "evt_abc123"

3. User G öffnet Events-Seite:
   GET /api/events
   Query: user_id = "user-g-id"

4. Verifikation: Event sollte in der Liste sichtbar sein
   - Weil User G in referrals Tabelle als referred_user_id
     mit referrer_user_id = User F

5. User G kann Event öffnen + beitreten:
   POST /api/events/{evt_abc123}/join

6. Verifikation: User G steht in event_participants
```

---

### Szenario E: Gleichzeitige Cron-Läufe (Race Condition)

**Zeitrahmen:** ~10 Minuten (nur mit mehreren Instanzen)

**Szenario:**
```
1. User Z hat abgelaufenen Premium-Plan
2. Zwei Backend-Instanzen laufen auf Vercel (parallele Lambdas)
3. Beide führen GET /api/admin/premium/check-expiry parallel aus
4. Erwartung: User Z's Plan wird NICHT doppelt reset
```

**Test (mit Vercel KV):**
```
1. Ruf manuell GET /api/admin/premium/check-expiry auf
2. Mit Header: cron: <SECRET>
3. System nutzt premium_check_expiry_version (Versionierung)
4. Parallel im selben Zyklus 2x aufrufen (simuliert zwei Instanzen)
5. Verifikation:
   - Nur eine Instanz setzt Version +1
   - Andere Instanz überspringt den User (schon bearbeitet)
   - User Z wird genau 1x reset (Idempotenz)
```

---

## 📊 **Test-Zusammenfassung & Checkliste**

Nach vollständiger Durchführung aller Tests (Schritte 11-15):

### ✅ Schritt 11 (Web-Kauf)
- [ ] Basic-Kauf erfolgreich (€8,99)
- [ ] Pro-Kauf erfolgreich (€18,00)
- [ ] Elite-Kauf erfolgreich (€36,00)
- [ ] Friends-Kauf erfolgreich (€150,00)
- [ ] Abgelehnte Zahlung → Toast zeigt Fehler
- [ ] Kauf abgebrochen → Plan NOT aktiviert

### ✅ Schritt 12 (Google Play IAP)
- [ ] IAP-Dialog erscheint korrekt
- [ ] Kauf funktioniert (Sandbox-Account)
- [ ] Token verifiziert serverseitig
- [ ] Plan nach Kauf aktiv
- [ ] Kaufabbruch funktioniert
- [ ] Käufe wiederherstellen funktioniert
- [ ] Keine Doppel-Aktivierung

### ✅ Schritt 13 (Referral-System)
- [ ] Referral-Code generiert korrekt
- [ ] 7-Tage Ultimate aktiv nach Einlösung
- [ ] Doppel-Einlösung verhindert (409)
- [ ] Basic-Kauf Rabatt gutgeschrieben (10€)
- [ ] Rabatt beim Ultimate-Kauf abgezogen
- [ ] Max 3-Freunde Limit durchgesetzt (30€ gedeckelt)

### ✅ Schritt 14 (Feature-Gating)
- [ ] Free: KI-Buddy auf 3 Anfragen/Tag limitiert
- [ ] Free: AR-Köder gesperrt (Lock)
- [ ] Free: Voice-Chat gesperrt
- [ ] Free: Matilda-Stimme gesperrt
- [ ] Basic: KI-Buddy unbegrenzt
- [ ] Basic: AR-Köder noch gesperrt
- [ ] Pro: AR-Köder freigegeben
- [ ] Pro: Community-Features verfügbar
- [ ] Elite: Voice-Chat verfügbar
- [ ] Elite: Matilda-Stimme verfügbar
- [ ] Friends: Event-Erstellung verfügbar

### ✅ Schritt 15 (End-to-End)
- [ ] Szenario A (Komplettes Referral): Erfolgreich
- [ ] Szenario B (Plan-Ablauf): Erfolgreich
- [ ] Szenario C (Replay-Protection): Idempotenz bestätigt
- [ ] Szenario D (Event-Freigabe): Friends-Events sichtbar
- [ ] Szenario E (Race Conditions): Kein Doppel-Reset

---

## 🐛 **Fehlerbehandlung & Edge Cases**

| Fehler | Erwartetes Verhalten | Test |
|--------|----------------------|------|
| Stripe Timeout | Toast Error, Plan NOT aktiviert | Netzwerk simulieren |
| Google Play API down | Toast Error, Retry möglich | Service deaktivieren |
| Ungültiger Referral-Code | 404 Error, Toast | Ungültigen Code testen |
| Plan abgelaufen, noch aktiv | Auto-Downgrade nach Cron | DB manuell testen |
| Gleichzeitige Zahlungen | Nur ein Plan aktiviert | Mit 2 Browsern testen |
| Feature-Gate Bypasss | Plan geprüft serverseitig | curl API direkt testen |

---

## 📝 **Dokumentation für QA-Team**

**Checklisten-Template für Regression-Tests:**

```markdown
## Premium-Sektion Regression (Build #XYZ)

### Basic Flow
- [ ] Stripe Web-Checkout funktioniert
- [ ] Google Play IAP funktioniert
- [ ] Plan wird aktiviert nach Kauf
- [ ] Ablaufdatum korrekt berechnet

### Referral Flow
- [ ] Neue User können Code einlösen
- [ ] 7 Tage Ultimate gewährt
- [ ] Rabatt auf Ultimate-Kauf abgezogen
- [ ] Limits durchgesetzt

### Feature-Gating
- [ ] Free-User KI-Buddy limitiert
- [ ] Pro-User AR-Köder verfügbar
- [ ] Elite-User Voice-Chat verfügbar
- [ ] Friends-User Events erstellen können

### Error Handling
- [ ] Zahlungsfehler: Toast + kein Plan
- [ ] Netzwerkfehler: Retry möglich
- [ ] Doppel-Kauf: Idempotenz gewährleistet
```

---

## 🚀 **Go-Live Checklist**

Vor Production-Release prüfen:

- [ ] Alle Tests (11-15) bestanden
- [ ] Keine Platzhalter in Fehlermeldungen
- [ ] Rate-Limiting funktioniert (Redis/KV)
- [ ] Cron-Job läuft täglich (Vercel KV aktiv)
- [ ] Backup-Strategie für Stripe-Webhooks dokumentiert
- [ ] Support-Prozess für Zahlungsfehler definiert
- [ ] Privacy-Policy aktualisiert (Zahlungs-Daten)
- [ ] App Store Review geplant (IAP)

---

**Zuletzt aktualisiert:** 2026-07-22
**Version:** 1.0
**Status:** Produktionsbereit nach vollständigem Test-Durchlauf
