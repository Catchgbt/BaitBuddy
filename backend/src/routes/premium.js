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

// Referral-Belohnung: Kauft ein eingeladener Freund den Basic-Plan, bekommt der
// Referrer 10 € Rabatt auf den nächsten Ultimate-Kauf, gedeckelt bei 3 Freunden
// (30 €). Der Rabatt lebt in den Referrer-Metadaten (ultimate_discount_cents)
// und wird beim Ultimate-Web-Checkout eingelöst.
const ULTIMATE_DISCOUNT_PER_REFERRAL_CENTS = 1000;
const ULTIMATE_DISCOUNT_MAX_CENTS = 3000;
const ULTIMATE_MIN_CHECKOUT_CENTS = 999;

// Laufzeit je Plan in Tagen, wenn der Zahlungsanbieter kein eigenes Ablaufdatum
// liefert (Stripe-Einmalzahlung, Play-Einmalprodukt). Google-Play-ABOS bringen
// ihr echtes Ablaufdatum mit — das hat immer Vorrang, siehe verifiedExpiryFrom().
const PLAN_DURATION_DAYS = {
  trial_10_10: 10, // Einmalprodukt: 10 Tage Vollzugriff
  friends: 365,    // Jahresabo (friends_monthly bleibt monatlich)
};
const DEFAULT_PLAN_DURATION_DAYS = 30;

const PLAN_DISPLAY_NAMES = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
  elite: 'Ultimate',
  ultimate: 'Ultimate',
  friends: 'Freundschaft',
  friends_monthly: 'Freundschaft',
  trial_10_10: '10-Tage-Zugang',
};

// Google-Play-Abos tragen ihr echtes Ablaufdatum (expiryTimeMillis). Das ist die
// einzige Wahrheit über die Laufzeit: Play verlängert automatisch weiter, ohne
// dass sich der purchaseToken ändert. Würde der Server stattdessen stur
// +30 Tage rechnen, verlöre ein zahlender Abonnent nach einem Monat den Zugang,
// obwohl Play weiter abbucht.
function verifiedExpiryFrom(verification) {
  const ms = Number(verification?.raw?.expiryTimeMillis);
  if (!Number.isFinite(ms) || ms <= Date.now()) return null;
  return new Date(ms).toISOString();
}

function readDiscountCents(user) {
  const raw = Number(user?.user_metadata?.ultimate_discount_cents);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(Math.floor(raw), ULTIMATE_DISCOUNT_MAX_CENTS);
}

// Schreibt dem Referrer eine 10-€-Ultimate-Gutschrift gut, sobald der von ihm
// eingeladene Nutzer erstmals Basic aktiviert. Best-effort: Fehler werden
// geloggt, blockieren die Basic-Aktivierung aber nicht. Idempotent über das
// Flag referrals.basic_reward_granted (eine Gutschrift je Einladung).
async function grantReferralBasicReward(referredUser) {
  try {
    if (!referredUser?.user_metadata?.referred_by) return;

    const { data: row, error } = await supabase
      .from('referrals')
      .select('id, referrer_user_id, basic_reward_granted')
      .eq('referred_user_id', referredUser.id)
      .maybeSingle();
    if (error || !row || row.basic_reward_granted) return;

    const { data: refRes, error: refErr } =
      await supabase.auth.admin.getUserById(row.referrer_user_id);
    if (refErr || !refRes?.user) return;

    const refMeta = refRes.user.user_metadata || {};
    const current = readDiscountCents(refRes.user);
    const next = Math.min(current + ULTIMATE_DISCOUNT_PER_REFERRAL_CENTS, ULTIMATE_DISCOUNT_MAX_CENTS);

    const { error: updErr } = await supabase.auth.admin.updateUserById(row.referrer_user_id, {
      user_metadata: { ...refMeta, ultimate_discount_cents: next },
    });
    if (updErr) return;

    await supabase.from('referrals').update({ basic_reward_granted: true }).eq('id', row.id);
  } catch (e) {
    console.error('[premium] grantReferralBasicReward fehlgeschlagen:', e?.message || e);
  }
}

router.get('/premium/status', requireAuth, async (req, res) => {
  const { effectiveId, isActive, expiresAt, remainingHours, isTrial } = resolvePlan(req.user);

  return res.json({
    ok: true,
    plan: {
      id: effectiveId,
      name: PLAN_DISPLAY_NAMES[effectiveId] || 'Free',
      is_active: isActive,
      is_trial: isTrial && isActive,
      expires_at: expiresAt,
      remaining_days: remainingHours == null ? null : Math.ceil(remainingHours / 24),
      remaining_hours: remainingHours,
      // Angesammelter Referral-Rabatt (Cent) auf den nächsten Ultimate-Kauf.
      ultimate_discount_cents: readDiscountCents(req.user)
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
  { id: 'basic', name: 'Basic', price: 8.99, features: ['Werbefrei', 'KI-Buddy unbegrenzt', 'Fangbuch', 'Spots', 'Wetter'] },
  { id: 'pro', name: 'Pro', price: 18, features: ['Alles in Basic', 'KI-Fangprognosen', 'AR & 3D', 'Community'] },
  { id: 'elite', name: 'Ultimate', price: 36, features: ['Alles in Pro', 'Live-Bissanzeiger', 'CatchCam', 'Priorisierte KI'] },
  { id: 'friends', name: 'Freundschaft', price: 150, yearly: true, features: ['Alles in Ultimate (12 Monate)', 'Freundes-Einladungen', 'Geteilte Spot-Gruppen', 'Gruppen-Ranking'] },
];

router.get('/premium/products', async (req, res) => {
  return res.json(PRODUCTS);
});

// Öffentlich (kein Auth): Das Frontend muss VOR dem Kauf wissen, ob der Server
// den jeweiligen Zahlungsweg überhaupt verifizieren kann. Fehlt das Secret,
// bezahlt der Nutzer sonst erst und bekommt danach einen 501 zurück — Geld
// abgebucht, kein Plan. Mit dieser Info kann die Kauf-Schaltfläche vorher
// gesperrt werden. Es werden ausschließlich Boolean-Flags veröffentlicht,
// niemals die Secrets selbst.
router.get('/premium/config', (req, res) => {
  return res.json({
    ok: true,
    payment_methods: {
      google_play: GOOGLE_PLAY_VERIFICATION_CONFIGURED,
      stripe: STRIPE_PAYMENT_VERIFICATION_CONFIGURED,
    },
  });
});

// Mindest-Plan je Feature-Key, abgeleitet aus den Produktbeschreibungen oben
// (fangbuch/spots/wetter = Basic; ki_assistent/community = Pro; offline/
// premium_support = Elite). check-feature wird vom Frontend aktuell NICHT
// aufgerufen (die client-seitige PlanGuard/PlanContext-Komponente prueft den
// Plan direkt) — die Haerte hier ist Vorbereitung fuer zukuenftige serverseitige
// Durchsetzung, nicht Ersatz fuer PlanGuard. Unbekannte/neue Feature-Keys
// werden bewusst gesperrt (fail-closed), damit ein Tippfehler oder neuer
// Premium-Key niemals versehentlich Zugriff freischaltet.
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
  const allowed = Boolean(requiredPlan) && PLAN_RANK[effectiveId] >= PLAN_RANK[requiredPlan];

  return res.json({ ok: true, allowed, plan: effectiveId, required_plan: requiredPlan || null });
});

// Preise serverseitig als Source of Truth — der Client sendet nur die plan_id,
// niemals den Preis. Muss mit der Plan-Anzeige in src/pages/PremiumPlans.jsx
// übereinstimmen.
const CHECKOUT_PLANS = {
  basic:           { name: 'Basic', amountCents: 899 },
  pro:             { name: 'Pro', amountCents: 1800 },
  elite:           { name: 'Ultimate', amountCents: 3600 },
  friends:         { name: 'Freundschaft (Jahresabo)', amountCents: 15000 },
  // friends_monthly wird nicht mehr aktiv beworben (Freundschaftsplan ist ein
  // reines Jahresabo), bleibt aber für Bestandskäufe/Google-Play-Restore gültig.
  friends_monthly: { name: 'Freundschaft Monatlich', amountCents: 3600 },
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

  // Referral-Rabatt nur auf den Ultimate-Plan anwenden (elite). Betrag wird auf
  // einen Mindestpreis begrenzt und beim Aktivieren verbraucht.
  const isUltimate = plan_id === 'elite' || plan_id === 'ultimate';
  const discountCents = isUltimate ? readDiscountCents(req.user) : 0;
  const amountCents = Math.max(plan.amountCents - discountCents, ULTIMATE_MIN_CHECKOUT_CENTS);
  const appliedDiscountCents = plan.amountCents - amountCents;

  const session = await createStripeCheckoutSession({
    planId: plan_id,
    planName: appliedDiscountCents > 0 ? `${plan.name} (Freundschafts-Rabatt)` : plan.name,
    amountCents,
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

  // Ablaufdatum: Bei Google-Play-Abos gilt das von Play gelieferte
  // expiryTimeMillis, sonst rechnet der Server die Laufzeit selbst.
  const verifiedExpiresAt = verifiedExpiryFrom(verification);
  const durationDays = PLAN_DURATION_DAYS[plan_id] ?? DEFAULT_PLAN_DURATION_DAYS;
  const expiresAt = verifiedExpiresAt
    || new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  // Play verlängert Abos automatisch und behält dabei denselben purchaseToken
  // bei — nur das Ablaufdatum wandert nach vorne. Ein reiner Replay-Schutz über
  // den Token würde die Verlängerung deshalb verschlucken und den Nutzer nach
  // einem Monat aussperren, obwohl er weiter zahlt. Ein erneuter Aufruf darf die
  // Laufzeit also genau dann fortschreiben, wenn der Anbieter selbst ein
  // späteres Ablaufdatum bestätigt hat.
  const extendsRuntime = !!verifiedExpiresAt && (
    !current.premium_expires_at ||
    new Date(verifiedExpiresAt).getTime() > new Date(current.premium_expires_at).getTime()
  );

  // Replay-Schutz: Dieselbe Transaktion darf die Laufzeit nicht mehrfach
  // verlängern (z.B. wiederholtes Aufrufen der Stripe-Success-URL oder
  // "Käufe wiederherstellen" mit einem bereits verarbeiteten Play-Token).
  const alreadyProcessed =
    (transaction_id && current.premium_transaction_id === transaction_id) ||
    (purchase_token && current.premium_purchase_token === purchase_token);
  if (alreadyProcessed && current.premium_plan_id === plan_id && !extendsRuntime) {
    return res.json({
      ok: true,
      plan_id,
      expires_at: current.premium_expires_at,
      updated: false,
      note: 'Transaktion bereits verarbeitet'
    });
  }
  const previousActivatedAt = current.premium_activated_at;

  // Idempotenz: Wenn gleicher Plan in letzten 5 Sekunden aktiviert wurde, skip update
  if (previousActivatedAt && !extendsRuntime) {
    const timeSinceLastActivation = Date.now() - new Date(previousActivatedAt).getTime();
    if (timeSinceLastActivation < 5000 && current.premium_plan_id === plan_id) {
      return res.json({
        ok: true,
        plan_id,
        expires_at: current.premium_expires_at,
        updated: false,
        note: 'Plan bereits aktiviert (Idempotenz)'
      });
    }
  }

  const isUltimateTier = (PLAN_RANK[plan_id] ?? 0) >= PLAN_RANK.elite;

  const merged = {
    ...current,
    premium_plan_id: plan_id,
    premium_expires_at: expiresAt,
    premium_trial: false,
    premium_payment_method: payment_method || 'unknown',
    premium_product_id: product_id,
    premium_purchase_token: purchase_token,
    premium_transaction_id: transaction_id,
    premium_activated_at: new Date().toISOString(),
    premium_activation_version: (current.premium_activation_version || 0) + 1,
    // Angesammelten Referral-Rabatt beim Ultimate-Kauf verbrauchen.
    ...(isUltimateTier ? { ultimate_discount_cents: 0 } : {}),
  };

  const { error } = await supabase.auth.admin.updateUserById(req.user.id, {
    user_metadata: merged,
  });
  if (error) return sendDbError(res, error);

  // Referral-Belohnung: Aktiviert ein eingeladener Nutzer erstmals Basic,
  // bekommt sein Referrer 10 € Ultimate-Rabatt gutgeschrieben (best-effort).
  if (plan_id === 'basic') {
    await grantReferralBasicReward({ id: req.user.id, user_metadata: merged });
  }

  return res.json({
    ok: true,
    plan_id,
    expires_at: merged.premium_expires_at,
    // `updated` unterscheidet eine echte Änderung von einem no-op (Replay).
    // Der Client stößt nur bei einer echten Änderung ein Plan-Reload an.
    updated: true,
    note: 'Plan aktiviert mit Transaktionsdaten gespeichert für Audit'
  });
});

export default router;
