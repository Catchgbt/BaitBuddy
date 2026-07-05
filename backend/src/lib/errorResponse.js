// Supabase/Postgrest-Fehler enthalten oft interne Details (Spalten-/
// Tabellennamen, Constraint-Namen, RLS-Policy-Hinweise) — `res.json({error:
// error.message})` reichte das bislang 1:1 an den Client durch. sendDbError()
// loggt den echten Fehler serverseitig und schickt eine generische Meldung.
export function sendDbError(res, error, status = 500) {
  console.error('[DB error]', error?.message || error);
  return res.status(status).json({ error: 'Datenbankfehler — bitte später erneut versuchen' });
}
