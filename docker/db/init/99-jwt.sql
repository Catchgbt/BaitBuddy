-- Hinterlegt das JWT-Secret in der DB, damit auth.uid()/auth.jwt() und
-- PostgREST dieselben Tokens verifizieren wie GoTrue.
-- Entspricht volumes/db/jwt.sql aus dem offiziellen Self-Hosting-Setup.
\set jwt_secret `echo "$JWT_SECRET"`
\set jwt_exp `echo "$JWT_EXP"`

alter database postgres set "app.settings.jwt_secret" to :'jwt_secret';
alter database postgres set "app.settings.jwt_exp" to :'jwt_exp';
