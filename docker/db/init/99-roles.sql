-- Setzt die Passwoerter der internen Supabase-Rollen auf POSTGRES_PASSWORD.
-- Entspricht volumes/db/roles.sql aus dem offiziellen Self-Hosting-Setup.
\set pgpass `echo "$POSTGRES_PASSWORD"`

alter user authenticator with password :'pgpass';
alter user pgbouncer with password :'pgpass';
alter user supabase_auth_admin with password :'pgpass';
alter user supabase_functions_admin with password :'pgpass';
alter user supabase_storage_admin with password :'pgpass';
