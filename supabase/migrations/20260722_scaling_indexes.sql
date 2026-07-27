-- Performance-Indizes für häufig gefilterte Spalten (Phase 4: Backend-Skalierung).
--
-- Das Backend filtert diese Spalten in heißen Pfaden (Fangbuch-Statistik,
-- Community-Kommentare, Likes, Clan-Aggregation, Wettbewerbs-Ranglisten). Ohne
-- Index führt PostgREST diese Queries als sequentiellen Table-Scan aus, was unter
-- Last (siehe k6-Test in load-tests/) zum Flaschenhals wird.
--
-- Doppelt defensiv, weil ein Teil des Schemas außerhalb dieser Migrations-
-- Historie entstanden ist:
--   1. Tabelle UND Spalte müssen existieren.
--   2. Es darf noch KEIN Index existieren, der die Spalte bereits als FÜHRENDE
--      Spalte abdeckt. Ein reines `CREATE INDEX IF NOT EXISTS` prüft nur den
--      Index-NAMEN — es hätte hier Duplikate zu bestehenden (teils zusammen-
--      gesetzten bzw. UNIQUE-) Indizes angelegt. Ein solches Duplikat bringt
--      keinen Lesevorteil, kostet aber bei jedem INSERT/UPDATE Schreibarbeit.
--
-- Auf baitbuddy-prod angewendet: 3 Indizes neu angelegt
-- (catches.created_by, clan_members.user_id, voting_submissions.competition_id);
-- 4 übersprungen, weil bereits abgedeckt durch:
--   community_comments_post_id_idx        (post_id)
--   post_likes_post_id_user_id_key        (post_id, user_id)
--   voting_likes_submission_user_unique   (submission_id, user_id)
--   idx_clan_members_clan                 (clan_id)
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
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = idx.tbl AND column_name = idx.col
    ) THEN
      RAISE NOTICE 'Überspringe %: Spalte %.% existiert nicht', idx.idxname, idx.tbl, idx.col;

    ELSIF EXISTS (
      SELECT 1
      FROM pg_index i
      JOIN pg_class tc ON tc.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = tc.relnamespace
      JOIN pg_attribute a ON a.attrelid = tc.oid AND a.attnum = i.indkey[0]
      WHERE n.nspname = 'public' AND tc.relname = idx.tbl AND a.attname = idx.col
    ) THEN
      RAISE NOTICE 'Überspringe %: %.% ist bereits führende Spalte eines Index', idx.idxname, idx.tbl, idx.col;

    ELSE
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)', idx.idxname, idx.tbl, idx.col);
      RAISE NOTICE 'Index % auf %.% angelegt', idx.idxname, idx.tbl, idx.col;
    END IF;
  END LOOP;
END $$;
