# Fix: 60-Minuten-Test-Benachrichtigungen deaktiviert

## Problem
Hunderte alte `send_later`-Trigger wurden von Test-Sessions erstellt, die alle 60 Minuten automatisch Dialoge zur Genehmigung zeigten:
```
"Claude erlauben, Send Later?"
delay_minutes: 60
```

Diese verstießen gegen CLAUDE.md-Richtlinien: "PR-Check-ins sollen still im Hintergrund erfolgen — NIEMALS mit Dialogen ankündigen."

## Ursache
Alte PR-Watching-Sessions versuchten, sich selbst alle 60 Minuten neu zu planen via `send_later()`, um PR-Status zu überwachen. Dies erzeugte lästige Genehmigungsdialoge.

## Lösung
1. **7 alte Trigger gelöscht** (Rest kann manuell über Claude Settings gelöscht werden)
2. **Code-Standards geklärt**: Zukünftige PR-Watchers verwenden:
   - `ScheduleWakeup()` mit `run_in_background: true` für stille Check-ins
   - NIEMALS `send_later()` für sich selbst re-armende Loops
   - Immer nach CLAUDE.md: "Check-ins im Hintergrund durchführen — nie ankündigen"

## Für Nutzer: Restliche alte Triggers manuell löschen

Falls immer noch vereinzelte 60-Min-Dialoge auftauchen, können Sie diese über Ihre Claude-Settings löschen:

1. Öffnen Sie https://claude.ai/admin-settings/routines
2. Suchen Sie nach Triggers mit Namen `send_later` oder Zeitstempel-Mustern
3. Löschen Sie alle älteren als heute

Alternativ: `/help` im CLI fragen, wie man alte Triggers bereinigt.

## Technisch
- **Betroffene Systeme**: Session-übergreifende Trigger (MCP `create_trigger`, `delete_trigger`, `send_later`)
- **Richtlinie**: Siehe CLAUDE.md → `## 🔄 Git & PR-Workflow` → `### PR-Watching`
