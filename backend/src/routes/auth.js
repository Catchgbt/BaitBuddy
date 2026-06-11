import { Router } from 'express';
import { supabase, supabaseUrl, supabaseKey } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich' });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });

  return res.json({
    token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: {
      id: data.user.id,
      email: data.user.email,
      full_name: data.user.user_metadata?.full_name || '',
    },
  });
});

// Tauscht ein Refresh-Token gegen ein frisches Access-Token. Supabase-Access-
// Tokens laufen nach ~1h ab; das Frontend ruft diesen Endpunkt bei 401 auf,
// statt den Nutzer auszuloggen. Direkter GoTrue-REST-Call, um den geteilten
// Service-Role-Client nicht mit einer User-Session zu verunreinigen.
router.post('/auth/refresh', async (req, res) => {
  const { refresh_token } = req.body || {};
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token erforderlich' });

  try {
    const r = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: supabaseKey },
      body: JSON.stringify({ refresh_token }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.access_token) {
      return res.status(401).json({ error: 'Sitzung abgelaufen – bitte neu anmelden' });
    }
    return res.json({ token: data.access_token, refresh_token: data.refresh_token });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/auth/register', async (req, res) => {
  const { email, password, full_name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich' });

  // Nutzer direkt bestätigt anlegen (Admin-API, Service-Role) — kein Warten auf
  // Bestätigungs-E-Mail nötig, damit der Login unmittelbar funktioniert.
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (createError) {
    const msg = /already.*registered|already.*exists|duplicate/i.test(createError.message || '')
      ? 'E-Mail ist bereits registriert. Bitte melde dich an.'
      : createError.message;
    return res.status(400).json({ error: msg });
  }

  // Neue Nutzer bekommen 24h Vollzugriff (Elite-Trial). Wir setzen die Metadaten
  // final NACH createUser, da der email_confirm-Schritt die Metadaten überschreibt.
  if (created?.user?.id) {
    await supabase.auth.admin.updateUserById(created.user.id, {
      user_metadata: {
        full_name,
        premium_plan_id: 'elite',
        premium_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        premium_trial: true,
      },
    }).catch(() => {});
  }

  // Frisch angelegten (bestätigten) Nutzer direkt einloggen, um ein Token zu liefern.
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });

  return res.json({
    token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: {
      id: data.user.id,
      email: data.user.email,
      full_name: data.user.user_metadata?.full_name || '',
    },
  });
});

router.get('/auth/me', requireAuth, (req, res) => {
  return res.json({
    id: req.user.id,
    email: req.user.email,
    full_name: req.user.user_metadata?.full_name || '',
    created_at: req.user.created_at,
  });
});

export default router;
