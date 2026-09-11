-- Setzt die Passwoerter der internen Supabase-Rollen auf POSTGRES_PASSWORD.
--
-- Wichtig: nur Rollen anfassen, die es in diesem Image wirklich gibt.
-- Der Rollenbestand unterscheidet sich je nach Postgres-Version (z. B. gibt es
-- supabase_functions_admin in 17.x nicht mehr). migrate.sh bricht beim ersten
-- Fehler ab — ein hartes "alter user" auf eine fehlende Rolle wuerde also das
-- gesamte Schema-Init verhindern. Deshalb ueber pg_roles filtern und die
-- Statements per \gexec erzeugen.
\set pgpass `echo "$POSTGRES_PASSWORD"`

select format('alter user %I with password %L', rolname, :'pgpass')
from pg_roles
where rolname in (
  'authenticator',
  'pgbouncer',
  'supabase_auth_admin',
  'supabase_functions_admin',
  'supabase_storage_admin'
)
\gexec
