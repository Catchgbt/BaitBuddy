# Kartenansicht

Die Route `/Map` verwendet `MapPage.jsx` und `MapExplorerUI.jsx` mit dem auf die Karte begrenzten Stylesheet `map-explorer.css`.

- Satellitenansicht: Esri World Imagery mit Quellenangabe. Bei einem Ladefehler fällt die Ansicht auf OpenStreetMap zurück. Umschalten über Kartenebenen. Es werden keine illustrativen Tiefenlinien als Messdaten angezeigt.
- Die Suche durchsucht geladene Spots und öffentliche Angelorte lokal. Absenden fragt die bereits in der App verwendete Open-Meteo-Ortssuche (GeoNames) ab. Neue Eingaben brechen ausstehende Anfragen ab.
- Fischfilter berücksichtigen hinterlegte `target_species` bzw. `fische`. Ein Ort ohne Artenangaben erscheint unter „Alle Spots“, nicht unter einer geratenen Fischart.
- Auswahl öffnet eine kompakte Vorschau. Details, Favoriten und Routen verwenden vorhandene Spot-Daten und APIs. Entfernungen sind ausdrücklich Luftlinie. Das Plus übernimmt den aktuellen Kartenmittelpunkt nach dem Verschieben.
- Wetter und Zeitfenster verwenden `useFishingConditions`. Das Zeitfenster ist eine wetterbasierte Heuristik, keine KI-Fangprognose. Fehlende Wetterdaten erzeugen keine Empfehlung.
- Die Kartentour wird ausschließlich auf Wunsch unter Kartenoptionen geöffnet. Radar, Beißzeiten, öffentliche Orte, Verkaufsstellen und erweiterte Ebenen bleiben erreichbar.
- Die kompakte Hauptnavigation gilt nur auf Map/MapPage. Persönliche Navigationseinstellungen und Buddy-Sprachaktionen bleiben erhalten.

## Prüfung

`npm run build`, `npm run typecheck`, `npm run lint`

`npx vitest run --project frontend src/components/map/MapExplorerUI.test.jsx src/components/layout/BottomTabs.test.jsx`

`npx playwright test e2e/map-design.spec.js`

Der Browser-Test prüft Filter, lokale Suche, Ortsauflösung, Vorschau, Favorit, Details, Routenlink, optionale Tour und Spot-Anlage mit isolierten API-Fixtures. Screenshots werden für 320, 390 und 1280 Pixel Breite erstellt. Ein produktiver Login sowie Tests auf einem physischen Android-/iOS-Gerät bleiben separat erforderlich.
