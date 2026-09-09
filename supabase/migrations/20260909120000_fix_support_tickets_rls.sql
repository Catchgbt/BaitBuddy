-- Support-Tickets: Lesezugriff auf den eigenen Ticket-Ersteller einschränken
-- =============================================================================
-- Bisherige Policy:
--
--   create policy "Allow all to read their own tickets"
--     on public.support_tickets for select using (true);
--
-- Der Name sagt „their own", die Bedingung sagt `true`. Ohne `to`-Klausel gilt
-- eine Policy für `public`, also auch für `anon` — und der Anon-Key liegt im
-- ausgelieferten Client-Bundle (src/api/supabaseClient.js liest ihn aus
-- VITE_SUPABASE_ANON_KEY). Damit konnte jeder, der den Key aus dem Bundle
-- zieht, SÄMTLICHE Support-Tickets lesen: user_name, user_email, subject,
-- message und admin_response — also Klarnamen, E-Mail-Adressen und den
-- kompletten Schriftverkehr fremder Nutzer.
--
-- Die neue Policy setzt um, was der alte Name bereits versprach: ein
-- angemeldeter Nutzer sieht nur Tickets, die zu seiner E-Mail-Adresse gehören.
-- Dieselbe Form nutzen bereits user_backups_owner_select und
-- water_scenes_owner_select.
--
-- Kein Bruch für die App: support_tickets wird ausschließlich vom Backend
-- angefasst (backend/src/routes/support.js, backend/src/lib/accountDeletion.js)
-- und das arbeitet mit der Service-Role, die RLS ohnehin umgeht. Im Frontend
-- gibt es keinen einzigen direkten Zugriff auf diese Tabelle.

alter table public.support_tickets enable row level security;

-- CREATE POLICY kennt kein IF NOT EXISTS — vorher droppen (siehe CLAUDE.md).
drop policy if exists "Allow all to read their own tickets" on public.support_tickets;
drop policy if exists support_tickets_owner_select on public.support_tickets;

create policy support_tickets_owner_select
  on public.support_tickets for select
  to authenticated
  using (user_email = (auth.jwt() ->> 'email'));
