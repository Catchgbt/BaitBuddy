# Last- und Chaos-Tests (Masterplan Phase 3)

Dieses Verzeichnis enthält die Skripte, um das BaitBuddy-Backend gezielt an seine
Grenzen zu bringen und Flaschenhälse zu finden, bevor echte Nutzer sie treffen.

## Voraussetzungen

- [k6](https://k6.io/docs/get-started/installation/) installiert (`k6 version`)
- Eine laufende, für Lasttests **freigegebene** Ziel-Umgebung (lokal oder Staging).
  Nicht gegen fremde Produktion laufen lassen.

## Last-Test (k6)

`api-load-test.js` simuliert Hunderte gleichzeitige Nutzer mit Ramp-up → Halten →
Spike → Ramp-down und prüft Statuscode und Antwortzeit (p95 < 500 ms, Fehlerrate
< 1 %). Getestet werden nur öffentliche, idempotente Lese-Endpunkte — keine
Mutationen, keine LLM-Kosten.

```bash
# Gegen ein lokal laufendes Backend (Standard: http://localhost:3000)
k6 run load-tests/api-load-test.js

# Gegen eine andere Umgebung
BASE_URL=https://<deine-staging-url> k6 run load-tests/api-load-test.js
```

Die `thresholds` in der Datei lassen den Lauf fehlschlagen (Exit-Code ≠ 0), sobald
p95 über 500 ms steigt oder die Fehlerrate 1 % überschreitet — so lässt sich der
Test auch in CI als Gate verwenden.

## Netzwerk-Chaos (Toxiproxy)

Für die Chaos-Szenarien aus dem Masterplan (Latenz, Jitter/Bandbreiten-Drosselung,
gekappte TCP-Verbindungen) wird [Toxiproxy](https://github.com/Shopify/toxiproxy)
vor das Backend geschaltet und k6 dann gegen den Proxy-Port statt direkt gegen das
Backend gerichtet:

```bash
# Beispiel: 2s künstliche Latenz auf einem Proxy vor dem Backend
toxiproxy-cli create baitbuddy -l 127.0.0.1:3001 -u 127.0.0.1:3000
toxiproxy-cli toxic add baitbuddy -t latency -a latency=2000

BASE_URL=http://localhost:3001 k6 run load-tests/api-load-test.js
```

Erwartetes Verhalten des Clients unter Chaos:
- **Latenz/Timeout** → der Frontend-Client (`src/api/frontendClient.js`) wiederholt
  transiente Serverfehler (408/429/502/503/504) mit Exponential Backoff (1s/2s/4s)
  und respektiert `Retry-After`.
- **Gekappte Verbindung / offline** → kein Retry-Sturm; der Offline-Fallback
  (gecachtes Profil, lokale Warteschlange) greift sofort.
