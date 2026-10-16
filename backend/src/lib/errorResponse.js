// Supabase/Postgrest-Fehler enthalten oft interne Details (Spalten-/
// Tabellennamen, Constraint-Namen, RLS-Policy-Hinweise) — `res.json({error:
// error.message})` reichte das bislang 1:1 an den Client durch. sendDbError()
// loggt den echten Fehler serverseitig und schickt eine generische Meldung.
export function sendDbError(res, error, status = 500) {
  console.error('[DB error]', error?.message || error);
  // Supabase/PostgREST kann den Upstream-Status mitliefern. Bewahre
  // transiente Fehler auf, damit der Frontend-Client seine vorhandenen
  // Backoff-Wiederholungen nutzen kann. Ein permanenter SQL-/Schemafehler
  // bleibt bewusst ein 500er und wird nicht als vorübergehend maskiert.
  const upstreamStatus = Number(error?.status);
  const responseStatus = [408, 429, 502, 503, 504].includes(upstreamStatus)
    ? upstreamStatus
    : status;
  return res.status(responseStatus).json({ error: 'Datenbankfehler — bitte später erneut versuchen' });
}

// KI-Fehler separat behandeln; keine Provider-Antwort oder Schlüssel offenlegen.
export function sendAiError(res, error) {
  console.error('[AI error]', error?.code || 'LLM_ERROR');
  let status = 502;
  let message = 'Die KI-Anfrage ist fehlgeschlagen. Bitte erneut versuchen.';
  if (['LLM_NOT_CONFIGURED', 'LLM_AUTH_ERROR'].includes(error?.code)) {
    status = 503;
    message = 'Der KI-Dienst ist derzeit nicht verfügbar. Bitte den Support kontaktieren.';
  } else if (error?.status === 429) {
    status = 429;
    message = 'Der KI-Dienst ist ausgelastet. Bitte später erneut versuchen.';
  } else if (error?.code === 'LLM_TIMEOUT') {
    status = 504;
    message = 'Die KI-Anfrage hat zu lange gedauert. Bitte erneut versuchen.';
  } else if (error?.code === 'LLM_REFUSAL') {
    status = 422;
    message = 'Die KI kann diese Anfrage nicht beantworten.';
  }
  return res.status(status).json({ error: message });
}
