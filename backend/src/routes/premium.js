import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

router.get('/premium/status', requireAuth, async (req, res) => {
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

router.post('/plan/status', requireAuth, async (req, res) => {
  const meta = req.user.user_metadata || {};
  const planId = meta.premium_plan_id || 'free';
  return res.json({
    ok: true,
    plan: { id: planId, name: planId, is_active: true }
  });
});

router.get('/premium/products', async (req, res) => {
  return res.json([
    { id: 'basic', name: 'Basic', price: 2.99, features: ['Fangbuch', 'Spots', 'Wetter'] },
    { id: 'pro', name: 'Pro', price: 6.99, features: ['Alles in Basic', 'KI-Assistent', 'Community'] },
    { id: 'elite', name: 'Elite', price: 12.99, features: ['Alles in Pro', 'Offline', 'Premium-Support'] },
  ]);
});

router.post('/premium/check-feature', requireAuth, async (req, res) => {
  const { feature } = req.body;
  const meta = req.user.user_metadata || {};
  const planId = meta.premium_plan_id || 'free';
  const freeFeatures = ['catches', 'spots', 'weather'];
  const allowed = planId !== 'free' || freeFeatures.includes(feature);
  return res.json({ ok: true, allowed, plan: planId });
});

router.post('/premium/checkout', requireAuth, async (req, res) => {
  return res.status(501).json({ error: 'Stripe checkout nicht konfiguriert' });
});

router.post('/premium/activate-demo', requireAuth, async (req, res) => {
  return res.json({ ok: true, message: 'Demo-Modus aktiviert' });
});

router.post('/premium/activate', requireAuth, async (req, res) => {
  return res.json({ ok: true });
});

export default router;
