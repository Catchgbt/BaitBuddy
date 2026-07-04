import { supabase } from '../lib/supabase.js';

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Kein Token' });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Ungültiger Token' });

  req.user = data.user;
  next();
}

export async function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    const { data } = await supabase.auth.getUser(token);
    if (data?.user) req.user = data.user;
  }
  next();
}

// Muss NACH requireAuth in der Middleware-Kette stehen (braucht req.user).
// Admin-Status ist eine Allowlist per E-Mail statt eines DB-Flags — es gibt
// aktuell keine Rollen-Spalte, die vom Backend gepflegt wird.
export function requireAdmin(req, res, next) {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!req.user?.email || !adminEmails.includes(req.user.email.toLowerCase())) {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }
  next();
}
