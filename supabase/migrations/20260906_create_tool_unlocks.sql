-- Tool-Freischaltung über Angel-Level (Progression)
-- =============================================================================
-- `user_tool_unlocks` hält fest, welche Tools ein Nutzer dauerhaft besitzt.
-- Zwei Quellen:
--
--   * source = 'level'    — beim Erreichen des nötigen Angel-Levels kostenlos
--                           freigeschaltet. Wird festgeschrieben, damit eine
--                           Freischaltung bestehen bleibt, auch wenn der
--                           abgeleitete XP-Stand später sinkt (z. B. weil der
--                           Nutzer Fänge löscht).
--   * source = 'purchase' — optionale Sofortfreischaltung für 0,99 € (Stripe
--                           Web-Checkout oder Google-Play-Einmalprodukt).
--                           Kein Abo, keine Laufzeit, kein Verfall.
--
-- Die Tabelle ist die serverseitige Wahrheit: der Client entscheidet nie
-- allein, ob ein gekauftes Tool benutzt werden darf (siehe
-- backend/src/routes/progression.js).
--
-- Geschrieben wird ausschließlich vom Backend über die Service-Role, deshalb
-- RLS an und nur eine SELECT-Policy für die eigenen Zeilen.

create extension if not exists "uuid-ossp";

create table if not exists user_tool_unlocks (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null,
  tool_id          text not null,
  source           text not null default 'level',
  -- Kaufdaten (nur bei source = 'purchase' gesetzt) für Audit und Support.
  price_cents      integer,
  payment_method   text,
  transaction_id   text,
  purchase_token   text,
  product_id       text,
  unlocked_at_level integer,
  created_at       timestamptz default now(),
  unique (user_id, tool_id),
  constraint user_tool_unlocks_source_check check (source in ('level', 'purchase'))
);

create index if not exists idx_user_tool_unlocks_user
  on user_tool_unlocks(user_id);

-- Replay-Schutz: eine Stripe-Session bzw. ein Play-Kauf-Token darf höchstens
-- eine Freischaltung erzeugen. Partielle Unique-Indizes, damit die vielen
-- NULL-Werte der Level-Freischaltungen nicht kollidieren.
create unique index if not exists uniq_user_tool_unlocks_transaction
  on user_tool_unlocks(transaction_id) where transaction_id is not null;

create unique index if not exists uniq_user_tool_unlocks_purchase_token
  on user_tool_unlocks(purchase_token) where purchase_token is not null;

alter table user_tool_unlocks enable row level security;

create policy "own_tool_unlocks_read"
  on user_tool_unlocks for select
  using (auth.uid() = user_id);
