// Auth für die von Vercel Cron aufgerufenen Admin-Endpunkte (vercel.json →
// "crons"). Vercel schickt das Secret als `Authorization: Bearer <CRON_SECRET>`.
//
// Diese Prüfung lag zuvor dupliziert in events.js (Bearer/x-api-key) und
// admin.js (x-cron-secret/?secret=). Die beiden Kopien waren auseinander
// gelaufen: admin.js akzeptierte den Bearer-Header NICHT, weshalb der tägliche
// Cron /api/admin/premium/check-expiry bei jedem Lauf mit 401 abgewiesen wurde.
// Eine gemeinsame Implementierung verhindert, dass das erneut auseinanderläuft.
export function cronSecret() {
  return process.env.CRON_SECRET || process.env.ADMIN_API_KEY || '';
}

/**
 * Prüft das Cron-Secret. Ist keins konfiguriert, wird der Endpunkt gesperrt
 * (fail-closed) statt auf einen bekannten Default zurückzufallen — ein
 * hartkodierter Fallback machte den Endpunkt faktisch öffentlich.
 */
export function requireCronAuth(req, res, next) {
  const secret = cronSecret();
  if (!secret) {
    return res.status(500).json({ error: 'Cron-Secret nicht konfiguriert' });
  }

  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const candidates = [
    bearer,
    req.headers['x-api-key'],
    req.headers['x-cron-secret'],
    req.query?.secret,
  ];

  if (!candidates.some((value) => typeof value === 'string' && value === secret)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
}
