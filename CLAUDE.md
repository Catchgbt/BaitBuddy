# BaitBuddy — Entwicklungsregeln für Claude

## Kommunikation

**Immer auf Deutsch antworten** — alle Antworten, Erklärungen und Zusammenfassungen in dieser Session und in zukünftigen Sessions auf Deutsch. (Code, Commit-Messages und PR-Titel dürfen technisch/englisch bleiben, wo üblich.)

## Keine Platzhalter und keine Emojis im Code

**Niemals Platzhalter setzen.** Keine Dummy-/Fake-/Mock-Werte, keine `TODO`-Stubs, keine „Lorem ipsum"-Texte, keine Beispiel-/Demo-Platzhalter und keine leeren „Coming soon"-Hülsen im produktiven Code. Immer echte, vollständig funktionsfähige Implementierungen mit echten Daten und echten Anbindungen liefern. Fehlt eine Information oder ist etwas unklar, nachfragen — statt einen Platzhalter einzusetzen.

**Niemals Emojis im App-Code verwenden.** Weder in JSX/HTML-Text, noch in Labels, Buttons, Überschriften, Fehlermeldungen oder sonstigen UI-Elementen. Die App-Oberfläche bleibt emoji-frei — ausnahmslos.

## Infrastruktur: nur Vercel & Supabase

**Nur Vercel (Hosting/Deploy/Serverless) und Supabase (DB/Auth/Storage) verwenden.** Keine anderen externen Dienste/Backends einführen (kein base44, kein Render, keine sonstigen MCP-Services für Produktionslogik).

## App-Distribution: PlayStore & Apple Store

**Die App muss später auf PlayStore und Apple Store deployed werden.** Code wird darauf optimiert — native APIs, Permissions, Device-Features und Platform-spezifische Anforderungen beachten.

## Previews automatisch mergen

**Preview-Branches werden automatisch zu `main` gemergt**, wenn alle Checks grün sind.
