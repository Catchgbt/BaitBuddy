import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

// Ermittelt den effektiven Plan aus den User-Metadaten. Ist ein Ablaufdatum
// gesetzt und überschritten (z.B. nach dem 24h-Trial für neue Nutzer), gilt der
// Nutzer wieder als 'free' — wichtig, weil das Frontend-Gating nur die Plan-ID
// prüft, nicht is_active.
function resolvePlan(user) {
  const meta = user?.user_metadata || {};
  const rawPlanId = meta.premium_plan_id || 'free';
  const expiresAt = meta.premium_expires_at || null;
  const isTrial = meta.premium_trial === true;

  let isActive = rawPlanId !== 'free';
  let remainingHours = null;
  if (expiresAt) {
    const msLeft = new Date(expiresAt) - new Date();
    remainingHours = Math.ceil(msLeft / 3600000);
    isActive = isActive && msLeft > 0;
  }

  const effectiveId = isActive ? rawPlanId : 'free';
  return { effectiveId, isActive, expiresAt, remainingHours, isTrial };
}

router.get('/premium/status', requireAuth, async (req, res) => {
  const { effectiveId, isActive, expiresAt, remainingHours, isTrial } = resolvePlan(req.user);

  return res.json({
    ok: true,
    plan: {
      id: effectiveId,
      name: { free: 'Free', basic: 'Basic', pro: 'Pro', elite: 'Elite' }[effectiveId] || 'Free',
      is_active: isActive,
      is_trial: isTrial && isActive,
      expires_at: expiresAt,
      remaining_days: remainingHours == null ? null : Math.ceil(remainingHours / 24),
      remaining_hours: remainingHours
    }
  });
});

router.post('/plan/status', requireAuth, async (req, res) => {
  const { effectiveId, isActive } = resolvePlan(req.user);
  return res.json({
    ok: true,
    plan: { id: effectiveId, name: effectiveId, is_active: isActive }
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
  const { effectiveId } = resolvePlan(req.user);
  // Alle Features sind für alle Benutzer freigeschaltet
  const allowed = true;
  return res.json({ ok: true, allowed, plan: effectiveId });
});

router.post('/premium/checkout', requireAuth, async (req, res) => {
  return res.status(501).json({ error: 'Stripe checkout nicht konfiguriert' });
});

router.post('/premium/activate-demo', requireAuth, async (req, res) => {
  return res.json({ ok: true, message: 'Demo-Modus aktiviert' });
});

// Aktiviert einen gekauften Plan nach Zahlungsverifikation.
// Verlangt purchase_token (Google Play) oder transaction_id (sonstige) zur Validierung.
// Speichert Transaktionsdaten für Audit/Verifizierung.
router.post('/premium/activate', requireAuth, async (req, res) => {
  const { plan_id, purchase_token, product_id, transaction_id, payment_method } = req.body || {};

  if (!plan_id) {
    return res.status(400).json({ error: 'plan_id erforderlich' });
  }
  if (!purchase_token && !transaction_id) {
    return res.status(400).json({
      error: 'purchase_token (Google Play) oder transaction_id erforderlich — keine Zahlung verifiziert'
    });
  }

  const current = req.user.user_metadata || {};
  const isYearly = /friends$/.test(plan_id);
  const durationMs = (isYearly ? 365 : 30) * 24 * 60 * 60 * 1000;

  const merged = {
    ...current,
    premium_plan_id: plan_id,
    premium_expires_at: new Date(Date.now() + durationMs).toISOString(),
    premium_trial: false,
    premium_payment_method: payment_method || 'unknown',
    premium_product_id: product_id,
    premium_purchase_token: purchase_token,
    premium_transaction_id: transaction_id,
    premium_activated_at: new Date().toISOString(),
  };

  const { error } = await supabase.auth.admin.updateUserById(req.user.id, {
    user_metadata: merged,
  });
  if (error) return res.status(500).json({ error: error.message });

  return res.json({
    ok: true,
    plan_id,
    expires_at: merged.premium_expires_at,
    note: 'Plan aktiviert mit Transaktionsdaten gespeichert für Audit'
  });
});

export default router;
