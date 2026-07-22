-- Performance-Indizes für häufig gefilterte Spalten (Phase 4: Backend-Skalierung).
--
-- Das Backend filtert diese Spalten in heißen Pfaden (Fangbuch-Statistik,
-- Community-Kommentare, Likes, Clan-Aggregation, Wettbewerbs-Ranglisten). Ohne
-- Index führt PostgREST diese Queries als sequentiellen Table-Scan aus, was unter
-- Last (siehe k6-Test in load-tests/) zum Flaschenhals wird.
--
-- Defensiv umgesetzt: Einige Kern-Tabellen wurden außerhalb dieser Migrations-
-- Historie angelegt (Dashboard/frühere Migrationen). Jeder Index wird deshalb nur
-- erstellt, wenn Tabelle UND Spalte tatsächlich existieren, und via
-- `IF NOT EXISTS` idempotent — die Migration schlägt nie fehl, wenn ein Objekt
-- fehlt, sie überspringt es dann.

DO $$
DECLARE
  idx RECORD;
BEGIN
  FOR idx IN
    SELECT * FROM (VALUES
      ('catches',            'created_by',     'idx_catches_created_by'),
      ('community_comments', 'post_id',        'idx_community_comments_post_id'),
      ('post_likes',         'post_id',        'idx_post_likes_post_id'),
      ('voting_likes',       'submission_id',  'idx_voting_likes_submission_id'),
      ('clan_members',       'clan_id',        'idx_clan_members_clan_id'),
      ('clan_members',       'user_id',        'idx_clan_members_user_id'),
      ('voting_submissions', 'competition_id', 'idx_voting_submissions_competition_id')
    ) AS t(tbl, col, idxname)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = idx.tbl
        AND column_name = idx.col
    ) THEN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)',
        idx.idxname, idx.tbl, idx.col
      );
    ELSE
      RAISE NOTICE 'Überspringe Index %: Spalte %.% existiert nicht', idx.idxname, idx.tbl, idx.col;
    END IF;
  END LOOP;
END $$;
