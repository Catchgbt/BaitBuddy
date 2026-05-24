import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

// ── GET /api/getPlanStatus ──────────────────────────────────────────────────
router.post('/getPlanStatus', optionalRequireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ ok: true, plan: { id: 'free', name: 'Free', price_eur: 0, is_active: false, expires_at: null, remaining_days: null } });
    }

    const meta = req.user.user_metadata || {};
    const planId = meta.premium_plan_id || 'free';
    const expiresAt = meta.premium_expires_at;

    let isActive = true;
    let remainingDays = null;

    if (expiresAt) {
      const diff = Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
      remainingDays = diff;
      isActive = diff > 0;
    }

    const planNames = { free: 'Free', basic: 'Basic', pro: 'Pro', elite: 'Elite', ultimate: 'Ultimate' };
    const planPrices = { free: 0, basic: 4.99, pro: 9.99, elite: 19.99, ultimate: 29.99 };

    return res.json({
      ok: true,
      plan: {
        id: planId,
        name: planNames[planId] || 'Free',
        price_eur: planPrices[planId] || 0,
        is_active: isActive,
        expires_at: expiresAt || null,
        remaining_days: remainingDays
      }
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// ── POST /api/activatePlan ─────────────────────────────────────────────────
router.post('/activatePlan', requireAuth, async (req, res) => {
  try {
    const { plan_id, payment_method, transaction_id, purchase_token, product_id } = req.body;

    const validPlans = ['free', 'basic', 'pro', 'ultimate', 'elite', 'friends', 'friends_monthly', 'trial_10_10'];
    if (!validPlans.includes(plan_id)) {
      return res.status(400).json({ ok: false, error: 'Ungültiger Plan' });
    }

    let normalizedPlan = plan_id;
    if (plan_id === 'elite') normalizedPlan = 'ultimate';
    if (plan_id === 'trial_10_10') normalizedPlan = 'ultimate';

    let expiresAt = null;
    let durationDays = 0;
    if (normalizedPlan !== 'free') {
      const expires = new Date();
      if (plan_id === 'friends') { expires.setDate(expires.getDate() + 365); durationDays = 365; }
      else if (plan_id === 'trial_10_10') { expires.setDate(expires.getDate() + 10); durationDays = 10; }
      else { expires.setDate(expires.getDate() + 30); durationDays = 30; }
      expiresAt = expires.toISOString();
    }

    const updateData = {
      premium_plan_id: normalizedPlan,
      premium_expires_at: expiresAt
    };
    if (payment_method) updateData.premium_payment_method = payment_method;
    if (transaction_id) updateData.premium_transaction_id = transaction_id;
    if (purchase_token) updateData.premium_purchase_token = purchase_token;
    if (product_id) updateData.premium_product_id = product_id;

    const { error } = await supabase.auth.admin.updateUserById(req.user.id, {
      user_metadata: { ...req.user.user_metadata, ...updateData }
    });

    if (error) throw error;

    const names = { free: 'Kostenlos', basic: 'Basic', pro: 'Pro', ultimate: 'Ultimate', friends: 'Freundschaft (Jahr)', friends_monthly: 'Freundschaft (Monat)', trial_10_10: '10-Tage-Trial' };

    return res.json({
      ok: true,
      message: `${names[normalizedPlan] || normalizedPlan} Plan erfolgreich aktiviert!`,
      plan: { id: normalizedPlan, expires_at: expiresAt, duration_days: durationDays }
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// ── POST /api/checkFeatureAccess ───────────────────────────────────────────
router.post('/checkFeatureAccess', requireAuth, async (req, res) => {
  try {
    const { feature_id } = req.body;
    if (!feature_id) return res.status(400).json({ error: 'feature_id required' });

    const meta = req.user.user_metadata || {};
    const planId = meta.premium_plan_id || 'free';
    const expiresAt = meta.premium_expires_at;

    let isPlanActive = true;
    if (planId !== 'free' && expiresAt) {
      isPlanActive = new Date(expiresAt) > new Date();
    }
    const effectivePlan = isPlanActive ? planId : 'free';
    const allPlans = ['free', 'basic', 'pro', 'elite', 'ultimate'];

    // Alle Features sind momentan für alle Pläne freigeschaltet (wie im Original)
    const featureAccess = {
      dashboard: allPlans, logbook: allPlans, ranking: allPlans, community: allPlans,
      profile: allPlans, settings: allPlans, weather_basic: allPlans, arcade: allPlans,
      gear: allPlans, map_advanced: allPlans, rules: allPlans, trips: allPlans,
      ai_chat_standard: allPlans, ai_voice_standard: allPlans, licenses: allPlans,
      devices: allPlans, ai_chat_deluxe: allPlans, ai_voice_deluxe: allPlans,
      exam_prep: allPlans, camera_analysis: allPlans, bite_detector: allPlans, ar_view: allPlans
    };

    const allowedPlans = featureAccess[feature_id] || [];
    const hasAccess = allowedPlans.includes(effectivePlan);

    return res.json({ ok: true, has_access: hasAccess, current_plan: effectivePlan, feature_id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/premiumStatus ────────────────────────────────────────────────
router.post('/premiumStatus', requireAuth, async (req, res) => {
  try {
    const meta = req.user.user_metadata || {};
    const premiumUntil = meta.premium_until ? new Date(meta.premium_until) : null;
    const now = new Date();
    const isPremiumActive = premiumUntil && premiumUntil > now;
    const createdAt = req.user.created_at ? new Date(req.user.created_at) : now;
    const accountAge = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

    return res.json({
      kibuddy_credits: meta.credits || 0,
      premium_minutes_left: isPremiumActive ? Math.floor((premiumUntil - now) / (1000 * 60)) : 0,
      account_age_days: accountAge,
      ads_enabled: accountAge >= 3 && !isPremiumActive,
      premium_active: isPremiumActive
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Hilfsmiddleware: Auth optional für getPlanStatus
async function optionalRequireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  const token = authHeader.slice(7);
  try {
    const { data: { user } } = await supabase.auth.getUser(token);
    req.user = user || null;
  } catch { req.user = null; }
  next();
}

export default router;
