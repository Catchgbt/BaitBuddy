-- Referral-Belohnung: 10-EUR-Ultimate-Rabatt bei Basic-Kauf eines eingeladenen Freundes
-- =============================================================================
-- Ergaenzt die Log-Tabelle `referrals` um ein Flag, das festhaelt, ob fuer die
-- jeweilige Einladung bereits die Rabatt-Gutschrift ausgeloest wurde (naemlich
-- dann, wenn der eingeladene Freund erstmals den Basic-Plan kauft/aktiviert).
--
-- Die eigentliche Gutschrift lebt in den user_metadata des Referrers
-- (`ultimate_discount_cents`, gedeckelt bei 3000 = 3 Freunde x 10 EUR) und wird
-- beim naechsten Ultimate-Web-Checkout (Stripe) eingeloest. Dieses Flag dient
-- ausschliesslich der Idempotenz: pro Einladung genau eine Gutschrift.
--
-- Nur das Backend (Service-Role) schreibt in `referrals`; RLS bleibt aktiv.

alter table referrals
  add column if not exists basic_reward_granted boolean not null default false;
