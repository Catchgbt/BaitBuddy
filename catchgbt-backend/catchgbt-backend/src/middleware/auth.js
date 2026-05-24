import { supabase } from '../lib/supabase.js';

/**
 * requireAuth – Middleware: Prüft Supabase JWT aus Authorization-Header.
 * Hängt req.user (Supabase User-Objekt + user_metadata) an den Request.
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized – kein Token' });
  }

  const token = authHeader.slice(7);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized – ungültiger Token' });
    }
    req.user = user;
    req.userToken = token;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized – Token-Fehler' });
  }
}

/**
 * requireAdmin – Middleware: Nur für Admins (role = 'admin' in user_metadata).
 */
export async function requireAdmin(req, res, next) {
  await requireAuth(req, res, () => {
    const role = req.user?.user_metadata?.role || req.user?.app_metadata?.role;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden – Admin erforderlich' });
    }
    next();
  });
}

/**
 * optionalAuth – Middleware: Auth optional. req.user ist null wenn nicht eingeloggt.
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.slice(7);
  try {
    const { data: { user } } = await supabase.auth.getUser(token);
    req.user = user || null;
  } catch {
    req.user = null;
  }
  next();
}
