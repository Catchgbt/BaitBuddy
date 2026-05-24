import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import Stripe from 'stripe';

const router = Router();

// ── POST /api/textToSpeech ────────────────────────────────────────────────
router.post('/textToSpeech', requireAuth, async (req, res) => {
  try {
    const { text, speechRate = 1.0, voiceId = '21m00Tcm4TlvDq8ikWAM' } = req.body;
    if (!text || typeof text !== 'string') return res.status(400).json({ error: 'Text ist erforderlich' });

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ElevenLabs API Key nicht konfiguriert' });

    const cleanText = String(text).slice(0, 1000).trim();
    const clampedRate = Math.min(2.0, Math.max(0.5, speechRate));

    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify({ text: cleanText, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.75, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true, speaking_rate: clampedRate } })
    });

    if (!elevenRes.ok) {
      const errText = await elevenRes.text().catch(() => '');
      return res.status(elevenRes.status).json({ error: `TTS fehlgeschlagen: ${elevenRes.status}`, details: errText });
    }

    const audioData = await elevenRes.arrayBuffer();
    if (!audioData.byteLength) return res.status(500).json({ error: 'Leere Audio-Antwort' });

    res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': audioData.byteLength });
    return res.send(Buffer.from(audioData));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/freeNeuralTTS ───────────────────────────────────────────────
router.post('/freeNeuralTTS', async (req, res) => {
  try {
    const { text, lang = 'de-DE', voice: voiceOverride } = req.body;
    if (!text) return res.json({ fallback_to_browser: true, reason: 'No text' });

    const VOICE_MAP = { 'de': 'Vicki', 'de-DE': 'Vicki', 'en': 'Joanna', 'en-US': 'Joanna', 'en-GB': 'Amy', 'fr': 'Lea', 'es': 'Lucia', 'it': 'Bianca', 'nl': 'Lotte', 'ru': 'Tatyana' };
    const voice = voiceOverride || VOICE_MAP[lang] || VOICE_MAP[lang.split('-')[0]] || 'Vicki';
    const cleanText = String(text).slice(0, 3000).trim();

    const ttsRes = await fetch(`https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(cleanText)}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });

    if (!ttsRes.ok) return res.json({ fallback_to_browser: true, reason: `TTS HTTP ${ttsRes.status}` });

    const contentType = ttsRes.headers.get('content-type') || '';
    if (!contentType.includes('audio') && !contentType.includes('mpeg')) return res.json({ fallback_to_browser: true, reason: `Unexpected content-type: ${contentType}` });

    const audioData = await ttsRes.arrayBuffer();
    if (!audioData?.byteLength) return res.json({ fallback_to_browser: true, reason: 'Empty audio' });

    res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': audioData.byteLength, 'Cache-Control': 'public, max-age=3600' });
    return res.send(Buffer.from(audioData));
  } catch (e) {
    return res.json({ fallback_to_browser: true, reason: e.message });
  }
});

// ── POST /api/backendTextToSpeech ─────────────────────────────────────────
router.post('/backendTextToSpeech', requireAuth, async (req, res) => {
  return res.json({ fallback_to_browser: true, reason: 'Using free browser-native Web Speech API' });
});

// ── POST /api/geminiTextToSpeech ──────────────────────────────────────────
router.post('/geminiTextToSpeech', requireAuth, async (req, res) => {
  return res.json({ fallback_to_browser: true, reason: 'Using browser TTS' });
});

// ── POST /api/deleteAccount ───────────────────────────────────────────────
router.post('/deleteAccount', requireAuth, async (req, res) => {
  const txId = `del_${req.user.email}_${Date.now()}`;
  try {
    const email = req.user.email;
    const userId = req.user.id;
    const byEmail = { created_by: email };

    const tables = [
      ['voting_likes', byEmail], ['voting_submissions', byEmail], ['clan_catches', byEmail],
      ['catches', byEmail], ['spots', byEmail], ['bathymetric_maps', byEmail],
      ['depth_data_points', byEmail], ['water_analysis_history', byEmail],
      ['usage_sessions', { user_id: email }], ['premium_events', { user_id: email }],
      ['premium_wallets', { user_id: email }]
    ];

    let totalDeleted = 0;
    const failedEntities = [];

    for (const [table, filter] of tables) {
      try {
        const filterKey = Object.keys(filter)[0];
        const filterVal = Object.values(filter)[0];
        const { data: records } = await supabase.from(table).select('id').eq(filterKey, filterVal);
        if (records?.length) {
          await supabase.from(table).delete().eq(filterKey, filterVal);
          totalDeleted += records.length;
        }
      } catch (e) {
        failedEntities.push({ table, error: e.message });
      }
    }

    // Supabase Auth User löschen
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) failedEntities.push({ table: 'auth.users', error: authError.message });

    return res.json({ success: !authError, deleted_records: totalDeleted, failed_entities: failedEntities, transaction_id: txId, message: authError ? 'Partial deletion. Contact support.' : 'Account erfolgreich gelöscht.' });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message, transaction_id: txId });
  }
});

// ── POST /api/activateDemoMode ────────────────────────────────────────────
router.post('/activateDemoMode', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    if (typeof password !== 'string') return res.status(400).json({ success: false, error: 'Password must be a string' });

    const demoPassword = process.env.DEMO_PASSWORD;
    if (!demoPassword) return res.status(500).json({ success: false, error: 'Demo mode not configured' });

    if (password === demoPassword) {
      await supabase.auth.admin.updateUserById(req.user.id, { user_metadata: { ...req.user.user_metadata, is_demo_user: true } });
      return res.json({ success: true, message: 'Demo-Modus aktiviert!' });
    } else if (password === '') {
      await supabase.auth.admin.updateUserById(req.user.id, { user_metadata: { ...req.user.user_metadata, is_demo_user: false } });
      return res.json({ success: true, message: 'Demo-Modus deaktiviert!' });
    } else {
      return res.status(403).json({ success: false, error: 'Ungültiges Passwort' });
    }
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// ── POST /api/admin/assignPlan ────────────────────────────────────────────
router.post('/admin/assignPlan', requireAdmin, async (req, res) => {
  try {
    const { target_user_id, plan_id, duration_days = 30 } = req.body;
    if (!target_user_id || !plan_id) return res.status(400).json({ error: 'target_user_id und plan_id erforderlich' });

    const validPlans = ['free', 'basic', 'pro', 'ultimate'];
    if (!validPlans.includes(plan_id)) return res.status(400).json({ error: 'Ungültiger Plan' });

    let expiresAt = null;
    if (plan_id !== 'free') {
      const expires = new Date();
      expires.setDate(expires.getDate() + duration_days);
      expiresAt = expires.toISOString();
    }

    const { data: user } = await supabase.auth.admin.getUserById(target_user_id);
    await supabase.auth.admin.updateUserById(target_user_id, { user_metadata: { ...user?.user?.user_metadata, premium_plan_id: plan_id, premium_expires_at: expiresAt } });

    return res.json({ ok: true, message: `Plan ${plan_id} erfolgreich zugewiesen`, expires_at: expiresAt });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/admin/resetWallet ───────────────────────────────────────────
router.post('/admin/resetWallet', requireAdmin, async (req, res) => {
  try {
    const { target_user_email } = req.body;
    if (!target_user_email) return res.status(400).json({ error: 'target_user_email erforderlich' });

    const { data: wallet } = await supabase.from('premium_wallets').select('*').eq('user_id', target_user_email).single();
    if (!wallet) return res.status(404).json({ error: 'Wallet nicht gefunden' });

    await supabase.from('usage_sessions').update({ status: 'stopped', stopped_at: new Date().toISOString() }).eq('user_id', target_user_email).eq('status', 'active');
    await supabase.from('premium_wallets').update({ purchased_credits: 10000, consumed_credits: 0 }).eq('id', wallet.id);
    await supabase.from('premium_events').insert({ user_id: target_user_email, event_type: 'purchase', credits_amount: 10000, payload: { admin_user: req.user.email, action: 'reset_wallet', timestamp: new Date().toISOString() } });

    return res.json({ ok: true, message: `Wallet für ${target_user_email} wurde zurückgesetzt`, wallet: { user_id: target_user_email, purchased_credits: 10000, consumed_credits: 0, remaining_credits: 10000 } });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/admin/setCredits ────────────────────────────────────────────
router.post('/admin/setCredits', requireAdmin, async (req, res) => {
  try {
    const { target_user_email, credits_amount } = req.body;
    if (!target_user_email || typeof credits_amount !== 'number') return res.status(400).json({ error: 'target_user_email und credits_amount erforderlich' });

    let { data: wallet } = await supabase.from('premium_wallets').select('*').eq('user_id', target_user_email).single();
    if (!wallet) {
      const { data: nw } = await supabase.from('premium_wallets').insert({ user_id: target_user_email, purchased_credits: credits_amount, consumed_credits: 0, total_spent_eur: 0 }).select().single();
      wallet = nw;
    } else {
      await supabase.from('premium_wallets').update({ purchased_credits: credits_amount }).eq('id', wallet.id);
      wallet.purchased_credits = credits_amount;
    }

    await supabase.from('premium_events').insert({ user_id: target_user_email, event_type: 'admin_credit_grant', credits_amount, payload: { admin_user: req.user.email, action: 'set_credits', timestamp: new Date().toISOString() } });
    return res.json({ ok: true, message: `${credits_amount.toLocaleString()} Credits für ${target_user_email} gesetzt`, wallet: { user_id: target_user_email, purchased_credits: credits_amount, consumed_credits: wallet.consumed_credits || 0, remaining_credits: credits_amount - (wallet.consumed_credits || 0) } });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/admin/autoRenewPlans ────────────────────────────────────────
router.post('/admin/autoRenewPlans', requireAdmin, async (req, res) => {
  try {
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const now = new Date();
    let renewedCount = 0, expiredCount = 0;
    const renewedUsers = [], expiredUsers = [];

    for (const u of users || []) {
      const meta = u.user_metadata || {};
      if (!meta.premium_plan_id || meta.premium_plan_id === 'free' || !meta.premium_expires_at) continue;
      const expiresAt = new Date(meta.premium_expires_at);
      const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry <= 0) {
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 30);
        await supabase.auth.admin.updateUserById(u.id, { user_metadata: { ...meta, premium_expires_at: newExpiresAt.toISOString() } });
        renewedCount++;
        renewedUsers.push({ email: u.email, plan: meta.premium_plan_id, new_expiry: newExpiresAt.toISOString() });
      } else if (daysUntilExpiry <= 3) {
        expiredCount++;
        expiredUsers.push({ email: u.email, plan: meta.premium_plan_id, days_remaining: daysUntilExpiry });
      }
    }

    return res.json({ ok: true, renewed_count: renewedCount, expiring_soon_count: expiredCount, renewed_users: renewedUsers, expiring_users: expiredUsers, timestamp: now.toISOString() });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// ── POST /api/verifyPlayIntegrity ─────────────────────────────────────────
router.post('/verifyPlayIntegrity', requireAuth, async (req, res) => {
  try {
    const { integrityToken, packageName } = req.body;
    if (!integrityToken || !packageName) return res.status(400).json({ error: 'integrityToken und packageName erforderlich' });

    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) return res.status(500).json({ error: 'Google Service Account nicht konfiguriert' });

    let serviceAccount;
    try { serviceAccount = JSON.parse(serviceAccountJson); }
    catch { return res.status(500).json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON ist kein gültiges JSON' }); }

    // OAuth2 Token mit Service Account holen (node.js Implementierung)
    const { createSign } = await import('crypto');
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const claim = Buffer.from(JSON.stringify({ iss: serviceAccount.client_email, scope: 'https://www.googleapis.com/auth/playintegrity', aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now })).toString('base64url');
    const unsignedJwt = `${header}.${claim}`;
    const sign = createSign('RSA-SHA256');
    sign.update(unsignedJwt);
    const signature = sign.sign(serviceAccount.private_key, 'base64url');
    const jwt = `${unsignedJwt}.${signature}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) });
    if (!tokenRes.ok) return res.status(502).json({ error: 'Google OAuth Token fehlgeschlagen' });
    const { access_token } = await tokenRes.json();

    const verifyRes = await fetch(`https://playintegrity.googleapis.com/v1/${packageName}:decodeIntegrityToken`, { method: 'POST', headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ integrity_token: integrityToken }) });
    if (!verifyRes.ok) return res.status(502).json({ error: 'Play Integrity Verifizierung fehlgeschlagen' });

    const verifyData = await verifyRes.json();
    const payload = verifyData.tokenPayloadExternal || {};
    const appIntegrity = payload.appIntegrity || {};
    const deviceIntegrity = payload.deviceIntegrity || {};
    const accountDetails = payload.accountDetails || {};

    const verdict = { appRecognized: appIntegrity.appRecognitionVerdict === 'PLAY_RECOGNIZED', deviceVerdicts: deviceIntegrity.deviceRecognitionVerdict || [], licensed: accountDetails.appLicensingVerdict === 'LICENSED', packageNameMatches: appIntegrity.packageName === packageName };
    const isTrusted = verdict.appRecognized && verdict.packageNameMatches && verdict.deviceVerdicts.includes('MEETS_DEVICE_INTEGRITY');

    return res.json({ success: true, trusted: isTrusted, verdict, raw: payload });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/createStripeCheckoutSession ─────────────────────────────────
router.post('/createStripeCheckoutSession', requireAuth, async (req, res) => {
  try {
    const { plan_id, price_eur, credits } = req.body;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const priceInCents = Math.round(price_eur * 100);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: { currency: 'eur', product_data: { name: plan_id ? `CatchGBT ${plan_id} Plan` : `${credits?.toLocaleString()} Credits` }, unit_amount: priceInCents },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${process.env.APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/premium`,
      client_reference_id: req.user.id,
      metadata: { user_id: req.user.id, user_email: req.user.email, plan_id: plan_id || '', credits: credits?.toString() || '' }
    });

    return res.json({ ok: true, checkout_url: session.url, session_id: session.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/stripeWebhook ───────────────────────────────────────────────
// WICHTIG: Raw body middleware, MUSS vor express.json() registriert werden!
router.post('/stripeWebhook', async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).json({ error: 'No signature' });

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id || session.client_reference_id;
      const planId = session.metadata?.plan_id;
      const creditsStr = session.metadata?.credits;

      if (userId) {
        if (planId) {
          // Plan aktivieren
          let durationDays = 30;
          if (planId === 'friends') durationDays = 365;
          else if (planId === 'trial_10_10') durationDays = 10;
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + durationDays);
          let normalizedPlan = planId;
          if (planId === 'elite' || planId === 'trial_10_10') normalizedPlan = 'ultimate';

          const { data: u } = await supabase.auth.admin.getUserById(userId);
          await supabase.auth.admin.updateUserById(userId, { user_metadata: { ...u?.user?.user_metadata, premium_plan_id: normalizedPlan, premium_expires_at: expiresAt.toISOString() } });
        }

        if (creditsStr) {
          // Credits gutschreiben
          const credits = parseInt(creditsStr);
          const userEmail = session.metadata?.user_email;
          if (userEmail && credits > 0) {
            const { data: wallet } = await supabase.from('premium_wallets').select('*').eq('user_id', userEmail).single();
            if (wallet) {
              await supabase.from('premium_wallets').update({ purchased_credits: wallet.purchased_credits + credits, total_spent_eur: (wallet.total_spent_eur || 0) + (session.amount_total / 100) }).eq('id', wallet.id);
            } else {
              await supabase.from('premium_wallets').insert({ user_id: userEmail, purchased_credits: credits, consumed_credits: 0, total_spent_eur: session.amount_total / 100 });
            }
            await supabase.from('premium_events').insert({ user_id: userEmail, event_type: 'purchase', credits_amount: credits, payload: { stripe_session_id: session.id, amount_eur: session.amount_total / 100 } });
          }
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;
      if (userId) {
        const { data: u } = await supabase.auth.admin.getUserById(userId);
        await supabase.auth.admin.updateUserById(userId, { user_metadata: { ...u?.user?.user_metadata, premium_plan_id: 'free', premium_expires_at: null } });
      }
    }

    return res.json({ received: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
