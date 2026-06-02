import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/plan/status', requireAuth, async (req, res) => {
  const meta = req.user.user_metadata || {};
  const planId = meta.premium_plan_id || 'free';
  const expiresAt = meta.premium_expires_at;
  let isActive = true;
  let remainingDays = null;

  if (expiresAt) {
    const diff = Math.ceil((new Date(expiresAt) - new Date()) / 86400000);
    remainingDays = diff;
    isActive = diff > 0;
  }

  return res.json({
    ok: true,
    plan: {
      id: planId,
      name: { free: 'Free', basic: 'Basic', pro: 'Pro', elite: 'Elite' }[planId] || 'Free',
      is_active: isActive,
      expires_at: expiresAt,
      remaining_days: remainingDays
    }
  });
});

export default router;
