import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

const ADMIN_SECRET = process.env.CRON_SECRET || 'dev-secret';

function requireCronAuth(req, res, next) {
  const secret = req.get('x-cron-secret') || req.query.secret;
  if (secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorised' });
  }
  next();
}

router.get('/admin/premium/check-expiry', requireCronAuth, async (req, res) => {
  try {
    const now = new Date().toISOString();

    const { data: users, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('[admin] listUsers fehlgeschlagen:', error);
      return res.status(500).json({ error: 'Benutzer-Listing fehlgeschlagen' });
    }

    let expiredCount = 0;
    for (const user of users) {
      const meta = user.user_metadata || {};
      const expiresAt = meta.premium_expires_at;
      const planId = meta.premium_plan_id;

      if (!planId || !expiresAt) continue;

      if (new Date(expiresAt) < new Date(now)) {
        const currentVersion = meta.premium_check_expiry_version || 0;
        const nextVersion = currentVersion + 1;

        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...meta,
            premium_plan_id: null,
            premium_expires_at: null,
            premium_trial: null,
            premium_check_expiry_version: nextVersion,
          },
        });

        if (!updateError) {
          expiredCount++;
          console.log(`[admin] Plan abgelaufen für User ${user.id}: ${planId}`);
        } else {
          console.error(`[admin] Fehler beim Reset für User ${user.id}:`, updateError);
        }
      }
    }

    return res.json({
      ok: true,
      message: `${expiredCount} abgelaufene Pläne zurückgesetzt`,
      checked: users.length,
      expired: expiredCount,
    });
  } catch (e) {
    console.error('[admin] check-expiry Fehler:', e?.message || e);
    return res.status(500).json({ error: 'Interner Fehler' });
  }
});

export default router;
