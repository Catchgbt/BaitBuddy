import { timingSafeEqual } from 'node:crypto';

// Authentifizierung für die geplanten Jobs aus vercel.json.
// =============================================================================
// Vorher lag diese Prüfung in zwei Varianten vor: admin.js akzeptierte nur
// `x-cron-secret` bzw. `?secret=` und fiel ohne gesetzte Env auf das
// hartcodierte 'dev-secret' zurück; events.js prüfte `Authorization: Bearer`
// bzw. `x-api-key` inline — derselbe Block dreimal kopiert. Zwei Folgen:
//
//   1. Ohne gesetztes CRON_SECRET war 'dev-secret' ein öffentlich bekanntes
//      Passwort für /api/admin/premium/check-expiry, das über alle Nutzer
//      iteriert und deren Metadaten schreibt. CRON_SECRET ist in
//      .env.example nicht dokumentiert, der Fallback also der Normalfall.
//   2. Vercel Cron schickt das Secret als `Authorization: Bearer <CRON_SECRET>`
//      (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
//      admin.js hat diesen Header nie gelesen — der 03:00-Job lief seit
//      Einführung in einen 401 und hat nie etwas abgelaufen gesetzt.
//
// Diese Middleware ist die eine Stelle für beides: kein Fallback-Secret, und
// alle Header-Varianten, die im Einsatz sind.

// Zeitkonstanter Vergleich, damit ein Angreifer das Secret nicht zeichenweise
// über Laufzeitunterschiede erraten kann.
function secretsMatch(candidate, expected) {
  if (typeof candidate !== 'string' || candidate.length === 0) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function requireCronAuth(req, res, next) {
  // Bewusst bei jedem Request gelesen statt beim Import: sonst friert ein
  // Testlauf oder ein Neustart ohne Env den Wert ein.
  const secret = process.env.CRON_SECRET || process.env.ADMIN_API_KEY;
  if (!secret) {
    // Kein Fallback-Secret. Lieber ein toter Cron als ein offener Endpunkt.
    console.error('[cron] CRON_SECRET ist nicht gesetzt — Job abgewiesen');
    return res.status(500).json({ error: 'Cron-Secret nicht konfiguriert' });
  }

  // `Authorization: Bearer` ist der Weg von Vercel Cron; die beiden Header
  // daneben bleiben für manuelle Aufrufe und Bestands-Automatisierung gültig.
  // `?secret=` wird NICHT mehr akzeptiert — Query-Strings landen in Access-Logs.
  const bearer = (req.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const authorized =
    secretsMatch(bearer, secret) ||
    secretsMatch((req.get('x-cron-secret') || '').trim(), secret) ||
    secretsMatch((req.get('x-api-key') || '').trim(), secret);

  if (!authorized) return res.status(401).json({ error: 'Unauthorised' });
  return next();
}
