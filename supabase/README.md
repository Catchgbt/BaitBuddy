# Supabase-Migrationen

Alle Schema-Änderungen laufen über Dateien in `supabase/migrations/` und werden
vom Workflow `.github/workflows/supabase-migrations.yml` automatisch auf die
Produktions-Datenbank angewendet.

## Namenskonvention (verbindlich)

```
<14-stelliger Zeitstempel>_<name>.sql      z. B. 20260727180333_create_referrals_tables.sql
```

Der Zeitstempel ist die **Version**, mit der die Supabase-CLI abgleicht, ob eine
Migration bereits angewendet wurde (Tabelle `supabase_migrations.schema_migrations`).
Kürzere Präfixe wie `20260719_...` führen dazu, dass die CLI die Migration als
unangewendet betrachtet und beim nächsten Deploy erneut ausführt.

Neue Migration anlegen — am einfachsten mit der CLI, die den Zeitstempel korrekt
erzeugt:

```bash
npx supabase migration new <name>
```

## Ablauf

| Auslöser | Was passiert |
|---|---|
| Pull Request, der `supabase/migrations/**` ändert | Trockenlauf (`db push --dry-run`); das Log zeigt, was der Merge anwenden würde |
| Merge auf `main` | Migrationen werden angewendet (`db push`) |
| Täglich 03:00 UTC | Drift-Kontrolle: schlägt fehl, wenn das Repo Migrationen enthält, die auf der Datenbank fehlen |
| Manuell (`workflow_dispatch`) | Migrationen anwenden, z. B. nachdem eine Drift-Meldung kam |

## Benötigte Repository-Secrets

Unter *Settings → Secrets and variables → Actions*:

- `SUPABASE_ACCESS_TOKEN` — Personal Access Token (Supabase-Dashboard → Account → Access Tokens)
- `SUPABASE_DB_PASSWORD` — Datenbank-Passwort des Projekts

Die Projekt-Referenz (`yejiqenqdzupauddjcyi`) steht direkt im Workflow — sie ist
kein Geheimnis und liegt ohnehin als Default-URL in `backend/src/lib/supabase.js`.

Solange die Secrets fehlen, überspringt der **Trockenlauf im PR** seine Schritte
mit einer Warnung (er ist rein informativ und soll keinen PR blockieren).
**`apply` und die Drift-Kontrolle schlagen dagegen hart fehl** — ein Deploy-Pfad
ohne Zugangsdaten ist kaputt und soll das sichtbar machen, statt still nichts zu
tun.

## Migrationen idempotent schreiben

Der Deploy wendet jede Migration genau einmal an. Trotzdem sollten Migrationen
wiederholbar sein, damit ein erneuter Lauf (etwa nach einer Reparatur der
Historie) nicht scheitert:

- `create table if not exists`, `create index if not exists`,
  `add column if not exists` verwenden.
- **Achtung bei Policies:** `CREATE POLICY` kennt in Postgres **kein**
  `IF NOT EXISTS`. Entweder vorher `drop policy if exists <name> on <tabelle>;`
  absetzen oder die Migration bewusst als einmalig behandeln.
- Bei Indizes reicht `IF NOT EXISTS` nicht, um Duplikate zu vermeiden — es prüft
  nur den Index-**Namen**. Deckt ein bestehender Index die Spalte bereits als
  führende Spalte ab, ist ein zusätzlicher Index reine Schreiblast. Siehe
  `20260727121456_scaling_indexes_hot_filter_columns.sql` als Beispiel für die
  entsprechende Prüfung.

## Historischer Hinweis

Die Dateinamen wurden einmalig an die auf der Datenbank registrierten Versionen
angeglichen. Vorher stimmte keine einzige Version überein, weil Migrationen von
Hand (über das Dashboard bzw. die Management-API) eingespielt worden waren, die
dabei eigene Zeitstempel vergeben. Folge: Zwei Migrationen des Referral-Systems
sind nie auf der Produktions-Datenbank angekommen — das Feature war live defekt.
Die tägliche Drift-Kontrolle existiert, damit genau das auffällt.

Die Datenbank enthält zusätzlich rund 25 ältere Migrationen aus der Aufbauphase,
für die es keine Dateien im Repo gibt. Das stört den Deploy nicht: `db push`
wendet nur lokale Migrationen an, die remote fehlen — remote-only Einträge bleiben
unberührt.
