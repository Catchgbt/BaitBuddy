-- Security-Haertung fuer BaitBuddy (Supabase / Postgres)
--
-- Dieses Skript bildet die real angewendete Security-Haertung ab und ist
-- idempotent. Es ergaenzt schema.sql (Tabellen/Policies) und storage.sql
-- (Storage-Buckets).

-- 1) Trigger-Funktion set_trial_premium()
--    Diese SECURITY DEFINER Funktion ist als BEFORE INSERT Trigger auf
--    auth.users registriert (trg_set_trial_premium) und vergibt neuen Nutzern
--    einen 24h-Elite-Trial in den Metadaten.
--    Sie war zusaetzlich per RPC fuer anon/authenticated ausfuehrbar
--    (/rest/v1/rpc/set_trial_premium) -> unnoetige Angriffsflaeche.
--    Trigger feuern unabhaengig von EXECUTE-Grants, daher ist der Entzug
--    fuer den Trial-Mechanismus folgenlos.
revoke execute on function public.set_trial_premium() from anon, authenticated, public;

-- 2) support_tickets
--    Tickets werden ausschliesslich vom Backend per service_role eingefuegt
--    (backend/src/routes/support.js, umgeht RLS). Eine offene anon-INSERT-Policy
--    mit WITH CHECK (true) ist daher ueberfluessig und wird nicht benoetigt.
drop policy if exists "Allow all to insert support tickets" on public.support_tickets;

-- Hinweis (nicht per SQL setzbar, nur ueber Dashboard / Auth-Config):
-- "Leaked Password Protection" (Abgleich mit HaveIBeenPwned) sollte unter
-- Authentication -> Sign In / Providers -> Password aktiviert werden.
