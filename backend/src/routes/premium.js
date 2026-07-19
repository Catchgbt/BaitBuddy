import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import { verifyGooglePlayPurchase, verifyStripePayment, createStripeCheckoutSession } from '../lib/purchaseVerification.js';
import { sendDbError } from '../lib/errorResponse.js';
import { resolvePlan, PLAN_RANK } from '../lib/planResolver.js';

const router = Router();

// Ohne server-seitige Kaufverifikation (Google-Play-Service-Account bzw.
// Stripe-Secret) darf /premium/activate niemanden freischalten — sonst reicht
// ein beliebiger nicht-leerer purchase_token/transaction_id, um sich selbst
// Elite zu geben. Beide Env-Variablen sind in backend/.env.example
// dokumentiert; ohne STRIPE_SECRET_KEY bleiben auch /premium/checkout und
// die Stripe-Aktivierung mit 501 gesperrt.
const GOOGLE_PLAY_VERIFICATION_CONFIGURED = !!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
const STRIPE_PAYMENT_VERIFICATION_CONFIGURED = !!process.env.STRIPE_SECRET_KEY;

// resolvePlan/PLAN_RANK kommen zentral aus lib/planResolver.js — auch der
// TTS-Endpunkt (Ultimate-Stimme) nutzt dieselbe Auflösung.

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

const PRODUCTS = [
  { id: 'basic', name: 'Basic', price: 4.99, features: ['Fangbuch', 'Spots', 'Wetter'] },
  { id: 'pro', name: 'Pro', price: 9.99, features: ['Alles in Basic', 'KI-Assistent', 'Community'] },
  { id: 'elite', name: 'Ultimate', price: 19.99, features: ['Alles in Pro', 'Offline', 'Premium-Support'] },
];

router.get('/premium/products', async (req, res) => {
  return res.json(PRODUCTS);
});

// Mindest-Plan je Feature-Key, abgeleitet aus den Produktbeschreibungen oben
// (fangbuch/spots/wetter = Basic; ki_assistent/community = Pro; offline/
// premium_support = Elite). check-feature wird vom Frontend aktuell NICHT
// aufgerufen (die client-seitige PlanGuard/PlanContext-Komponente prueft den
// Plan direkt) — die Haerte hier ist Vorbereitung fuer zukuenftige serverseitige
// Durchsetzung, nicht Ersatz fuer PlanGuard. Unbekannte/neue Feature-Keys
// werden bewusst erlaubt (fail-open), damit dieser Endpunkt nicht kuenftige,
// hier noch nicht katalogisierte Features blockiert.
const FEATURE_MIN_PLAN = {
  fangbuch: 'basic',
  spots: 'basic',
  wetter: 'basic',
  ki_assistent: 'pro',
  community: 'pro',
  offline: 'elite',
  premium_support: 'elite',
};

router.post('/premium/check-feature', requireAuth, async (req, res) => {
  const { feature } = req.body || {};
  const { effectiveId } = resolvePlan(req.user);

  const requiredPlan = feature ? FEATURE_MIN_PLAN[feature] : null;
  const allowed = !requiredPlan || PLAN_RANK[effectiveId] >= PLAN_RANK[requiredPlan];

  return res.json({ ok: true, allowed, plan: effectiveId, required_plan: requiredPlan || null });
});

// Preise serverseitig als Source of Truth — der Client sendet nur die plan_id,
// niemals den Preis. Muss mit der Plan-Anzeige in src/pages/PremiumPlans.jsx
// übereinstimmen.
const CHECKOUT_PLANS = {
  basic:           { name: 'Basic', amountCents: 499 },
  pro:             { name: 'Pro', amountCents: 999 },
  elite:           { name: 'Ultimate', amountCents: 1999 },
  friends:         { name: 'Freundschaft (Jahresplan)', amountCents: 5499 },
  // Der beworbene 19-€-Freundes-Rabatt hat noch keine serverseitige
  // Freund-Erkennung — bis dahin gilt der reguläre Monatspreis.
  friends_monthly: { name: 'Freundschaft Monatlich', amountCents: 3900 },
};

router.post('/premium/checkout', requireAuth, async (req, res) => {
  if (!STRIPE_PAYMENT_VERIFICATION_CONFIGURED) {
    return res.status(501).json({ error: 'Stripe checkout nicht konfiguriert' });
  }

  const { plan_id } = req.body || {};
  const plan = plan_id ? CHECKOUT_PLANS[plan_id] : null;
  if (!plan) {
    return res.status(400).json({ error: 'Unbekannte oder fehlende plan_id' });
  }

  // Rücksprung-Ziel nach der Zahlung: konfigurierte Basis-URL bevorzugen,
  // sonst Origin des Requests (Frontend und API laufen auf derselben
  // Vercel-Domain). {CHECKOUT_SESSION_ID} ersetzt Stripe beim Redirect.
  const origin = process.env.APP_BASE_URL || req.get('origin') || `${req.protocol}://${req.get('host')}`;
  const successUrl = `${origin}/PremiumPlans?checkout=success&plan_id=${encodeURIComponent(plan_id)}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/PremiumPlans?checkout=cancelled`;

  const session = await createStripeCheckoutSession({
    planId: plan_id,
    planName: plan.name,
    amountCents: plan.amountCents,
    userId: req.user.id,
    userEmail: req.user.email,
    successUrl,
    cancelUrl,
  });
  if (!session.ok) {
    return res.status(502).json({ error: `Checkout-Session konnte nicht erstellt werden: ${session.reason}` });
  }

  return res.json({ ok: true, checkout_url: session.url, session_id: session.id });
});

router.post('/premium/activate-demo', requireAuth, async (req, res) => {
  return res.json({ ok: true, message: 'Demo-Modus aktiviert' });
});

// Aktiviert einen gekauften Plan nach Zahlungsverifikation.
// Verlangt purchase_token (Google Play) oder transaction_id (sonstige) zur Validierung.
// Speichert Transaktionsdaten für Audit/Verifizierung.
// Schützt vor Race Conditions durch Versionierung.
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

  const verificationConfigured = purchase_token
    ? GOOGLE_PLAY_VERIFICATION_CONFIGURED
    : STRIPE_PAYMENT_VERIFICATION_CONFIGURED;
  if (!verificationConfigured) {
    return res.status(501).json({
      error: 'Kaufverifikation ist serverseitig noch nicht konfiguriert — Premium kann derzeit nicht aktiviert werden'
    });
  }

  // Echte Verifikation beim jeweiligen Anbieter — siehe purchaseVerification.js
  // (WICHTIG: dort als ungetestet gegen echte APIs markiert).
  const verification = purchase_token
    ? await verifyGooglePlayPurchase({ productId: product_id, purchaseToken: purchase_token })
    : await verifyStripePayment({ sessionId: transaction_id });
  if (!verification.valid) {
    return res.status(402).json({ error: `Zahlung konnte nicht verifiziert werden: ${verification.reason}` });
  }

  // Stripe: Die Session muss zu diesem Nutzer und Plan gehören (Metadata aus
  // /premium/checkout) — verhindert, dass eine fremde oder für einen
  // günstigeren Plan bezahlte Session einen höheren Plan freischaltet.
  if (!purchase_token) {
    const session = verification.raw || {};
    if (session.client_reference_id && session.client_reference_id !== req.user.id) {
      return res.status(403).json({ error: 'Zahlung gehört zu einem anderen Konto' });
    }
    if (session.metadata?.plan_id && session.metadata.plan_id !== plan_id) {
      return res.status(400).json({ error: 'Zahlung gehört zu einem anderen Plan' });
    }
  }

  const current = req.user.user_metadata || {};

  // Replay-Schutz: Dieselbe Transaktion darf die Laufzeit nicht mehrfach
  // verlängern (z.B. wiederholtes Aufrufen der Stripe-Success-URL oder
  // "Käufe wiederherstellen" mit einem bereits verarbeiteten Play-Token).
  const alreadyProcessed =
    (transaction_id && current.premium_transaction_id === transaction_id) ||
    (purchase_token && current.premium_purchase_token === purchase_token);
  if (alreadyProcessed && current.premium_plan_id === plan_id) {
    return res.json({
      ok: true,
      plan_id,
      expires_at: current.premium_expires_at,
      note: 'Transaktion bereits verarbeitet'
    });
  }
  const isYearly = /friends$/.test(plan_id);
  const durationMs = (isYearly ? 365 : 30) * 24 * 60 * 60 * 1000;
  const previousActivatedAt = current.premium_activated_at;

  // Idempotenz: Wenn gleicher Plan in letzten 5 Sekunden aktiviert wurde, skip update
  if (previousActivatedAt) {
    const timeSinceLastActivation = Date.now() - new Date(previousActivatedAt).getTime();
    if (timeSinceLastActivation < 5000 && current.premium_plan_id === plan_id) {
      return res.json({
        ok: true,
        plan_id,
        expires_at: current.premium_expires_at,
        note: 'Plan bereits aktiviert (Idempotenz)'
      });
    }
  }

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
    premium_activation_version: (current.premium_activation_version || 0) + 1,
  };

  const { error } = await supabase.auth.admin.updateUserById(req.user.id, {
    user_metadata: merged,
  });
  if (error) return sendDbError(res, error);

  return res.json({
    ok: true,
    plan_id,
    expires_at: merged.premium_expires_at,
    note: 'Plan aktiviert mit Transaktionsdaten gespeichert für Audit'
  });
});

export default router;
