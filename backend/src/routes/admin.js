import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireCronAuth } from '../middleware/cronAuth.js';
import { invalidateCachedUser } from '../middleware/auth.js';

const router = Router();

// GoTrue liefert die Nutzer seitenweise (Default 50 pro Seite). Ohne
// Paginierung prüfte der Cron nur die erste Seite und ließ die Pläne aller
// weiteren Nutzer unbegrenzt "aktiv" stehen.
const USERS_PER_PAGE = 200;
const MAX_PAGES = 100; // Sicherheitsnetz gegen eine Endlosschleife

async function* iterateUsers() {
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: USERS_PER_PAGE,
    });
    if (error) throw error;
    // listUsers() liefert { data: { users: [...], nextPage, ... } } — `data`
    // selbst ist ein Objekt und NICHT iterierbar. Ein `for (const u of data)`
    // warf hier zuvor bei jedem Lauf einen TypeError, sodass der Cron nie einen
    // einzigen abgelaufenen Plan zurückgesetzt hat.
    const users = data?.users || [];
    if (users.length === 0) return;
    yield* users;
    if (users.length < USERS_PER_PAGE) return;
  }
}

router.get('/admin/premium/check-expiry', requireCronAuth, async (req, res) => {
  try {
    const now = Date.now();

    let checked = 0;
    let expiredCount = 0;

    for await (const user of iterateUsers()) {
      checked += 1;
      const meta = user.user_metadata || {};
      const expiresAt = meta.premium_expires_at;
      const planId = meta.premium_plan_id;

      if (!planId || !expiresAt) continue;

      const expiresAtMs = new Date(expiresAt).getTime();
      if (!Number.isFinite(expiresAtMs) || expiresAtMs >= now) continue;

      const currentVersion = meta.premium_check_expiry_version || 0;

      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...meta,
          premium_plan_id: null,
          premium_expires_at: null,
          premium_trial: null,
          premium_check_expiry_version: currentVersion + 1,
        },
      });

      if (updateError) {
        console.error(`[admin] Fehler beim Reset für User ${user.id}:`, updateError);
        continue;
      }
      invalidateCachedUser(user.id);
      expiredCount += 1;
      console.log(`[admin] Plan abgelaufen für User ${user.id}: ${planId}`);
    }

    return res.json({
      ok: true,
      message: `${expiredCount} abgelaufene Pläne zurückgesetzt`,
      checked,
      expired: expiredCount,
    });
  } catch (e) {
    console.error('[admin] check-expiry Fehler:', e?.message || e);
    return res.status(500).json({ error: 'Interner Fehler' });
  }
});

export default router;
