import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

// ── POST /api/getPremiumWalletStatus ──────────────────────────────────────
router.post('/getPremiumWalletStatus', requireAuth, async (req, res) => {
  try {
    const userId = req.user.email;
    const role = req.user.user_metadata?.role || req.user.app_metadata?.role;

    let { data: wallet } = await supabase
      .from('premium_wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!wallet) {
      const startingCredits = role === 'admin' ? 100000 : 10000;
      const { data: newWallet, error } = await supabase
        .from('premium_wallets')
        .insert({ user_id: userId, purchased_credits: startingCredits, consumed_credits: 0, total_spent_eur: 0 })
        .select()
        .single();
      if (error) throw error;
      wallet = newWallet;
    }

    // Sicherheits-Korrekturen
    if (wallet.consumed_credits < 0) {
      await supabase.from('premium_wallets').update({ consumed_credits: 0 }).eq('id', wallet.id);
      wallet.consumed_credits = 0;
    }
    if (wallet.purchased_credits < wallet.consumed_credits) {
      await supabase.from('premium_wallets').update({ purchased_credits: wallet.consumed_credits }).eq('id', wallet.id);
      wallet.purchased_credits = wallet.consumed_credits;
    }

    const { data: activeSession } = await supabase
      .from('usage_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .single();

    const remainingCredits = Math.max(0, wallet.purchased_credits - wallet.consumed_credits);

    return res.json({
      ok: true,
      wallet: {
        id: wallet.id,
        purchased_credits: wallet.purchased_credits,
        consumed_credits: wallet.consumed_credits,
        remaining_credits: remainingCredits,
        total_spent_eur: wallet.total_spent_eur || 0
      },
      active_session: activeSession ? {
        session_id: activeSession.session_id,
        feature_id: activeSession.feature_id,
        started_at: activeSession.started_at,
        billed_credits: activeSession.billed_credits
      } : null,
      status: remainingCredits > 0 ? 'active' : 'exhausted',
      user_role: role,
      user_id: userId
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/startPremiumMeter ────────────────────────────────────────────
router.post('/startPremiumMeter', requireAuth, async (req, res) => {
  try {
    const meta = req.user.user_metadata || {};
    if (meta.is_demo_user) {
      return res.json({ ok: true, message: 'Demo user – no metering', session_id: 'demo-' + Date.now(), is_demo: true });
    }

    const { feature_id } = req.body;
    if (!feature_id) return res.status(400).json({ error: 'feature_id erforderlich' });

    const userId = req.user.email;
    const role = req.user.user_metadata?.role;
    const MIN_CREDITS = 200;

    let { data: wallet } = await supabase.from('premium_wallets').select('*').eq('user_id', userId).single();
    if (!wallet) {
      const startingCredits = role === 'admin' ? 100000 : 10000;
      const { data: nw } = await supabase.from('premium_wallets').insert({ user_id: userId, purchased_credits: startingCredits, consumed_credits: 0, total_spent_eur: 0 }).select().single();
      wallet = nw;
    }

    const remaining = wallet.purchased_credits - wallet.consumed_credits;
    if (remaining < MIN_CREDITS) {
      return res.status(402).json({ ok: false, error_type: 'insufficient_credits', message: `Mindestens ${MIN_CREDITS} Credits benötigt`, credits_available: remaining });
    }

    const sessionId = `${userId}_${feature_id}_${Date.now()}`;
    const now = new Date().toISOString();

    await supabase.from('usage_sessions').insert({ session_id: sessionId, user_id: userId, feature_id, started_at: now, last_heartbeat: now, billed_credits: 0, status: 'active' });
    await supabase.from('premium_events').insert({ user_id: userId, event_type: 'session_start', credits_amount: 0, payload: { session_id: sessionId, feature_id, timestamp: now } });

    return res.json({ ok: true, session_id: sessionId, feature_id, remaining_credits: remaining, started_at: now });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// ── POST /api/heartbeatPremiumMeter ───────────────────────────────────────
router.post('/heartbeatPremiumMeter', requireAuth, async (req, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ error: 'session_id erforderlich' });
    if (session_id.startsWith('demo-')) return res.json({ ok: true, message: 'Demo session – no billing', is_demo: true });

    const userId = req.user.email;
    const { data: sessions } = await supabase.from('usage_sessions').select('*').eq('session_id', session_id).eq('user_id', userId).eq('status', 'active');

    if (!sessions?.length) {
      return res.status(404).json({ ok: false, error_type: 'session_not_found', message: 'Session nicht gefunden oder bereits beendet' });
    }

    const session = sessions[0];
    const now = new Date();
    const elapsedMinutes = (now - new Date(session.started_at)) / 1000 / 60;
    const CREDITS_PER_MINUTE = 200;
    const totalCreditsRequired = Math.ceil(elapsedMinutes * CREDITS_PER_MINUTE);
    const newCreditsBilled = totalCreditsRequired - session.billed_credits;

    const { data: wallet } = await supabase.from('premium_wallets').select('*').eq('user_id', userId).single();
    if (!wallet) return res.status(500).json({ ok: false, error: 'Wallet nicht gefunden' });

    const remainingCredits = wallet.purchased_credits - wallet.consumed_credits;
    if (remainingCredits < newCreditsBilled) {
      await supabase.from('usage_sessions').update({ status: 'stopped', stopped_at: now.toISOString() }).eq('id', session.id);
      return res.status(402).json({ ok: false, error_type: 'insufficient_credits', message: 'Credits aufgebraucht', remaining_credits: remainingCredits });
    }

    await supabase.from('premium_wallets').update({ consumed_credits: wallet.consumed_credits + newCreditsBilled }).eq('id', wallet.id);
    await supabase.from('usage_sessions').update({ last_heartbeat: now.toISOString(), billed_credits: totalCreditsRequired }).eq('id', session.id);

    if (newCreditsBilled > 0) {
      await supabase.from('premium_events').insert({ user_id: userId, event_type: 'heartbeat', credits_amount: -newCreditsBilled, payload: { session_id, elapsed_minutes: elapsedMinutes, total_credits_billed: totalCreditsRequired } });
    }

    return res.json({ ok: true, elapsed_minutes: elapsedMinutes, total_credits_billed: totalCreditsRequired, new_credits_billed: newCreditsBilled, remaining_credits: remainingCredits - newCreditsBilled });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// ── POST /api/stopPremiumMeter ─────────────────────────────────────────────
router.post('/stopPremiumMeter', requireAuth, async (req, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ error: 'session_id erforderlich' });
    if (session_id.startsWith('demo-')) return res.json({ ok: true, message: 'Demo session – no billing', is_demo: true });

    const userId = req.user.email;
    const { data: sessions } = await supabase.from('usage_sessions').select('*').eq('session_id', session_id).eq('user_id', userId);

    if (!sessions?.length) return res.json({ ok: true, message: 'Session bereits beendet oder nicht gefunden', session_id });

    const session = sessions[0];
    if (session.status === 'stopped') return res.json({ ok: true, message: 'Session bereits beendet', session_id });

    const now = new Date();
    const totalElapsedMinutes = (now - new Date(session.started_at)) / 1000 / 60;

    await supabase.from('usage_sessions').update({ status: 'stopped', stopped_at: now.toISOString() }).eq('id', session.id);
    await supabase.from('premium_events').insert({ user_id: userId, event_type: 'session_stop', credits_amount: 0, payload: { session_id, total_elapsed_minutes: totalElapsedMinutes, total_credits_billed: session.billed_credits } });

    return res.json({ ok: true, session_id, total_elapsed_minutes: totalElapsedMinutes, total_credits_billed: session.billed_credits });
  } catch (e) {
    return res.json({ ok: true, message: 'Session stop attempted (with errors)', error: e.message });
  }
});

// ── POST /api/cleanupOldSessions ──────────────────────────────────────────
router.post('/cleanupOldSessions', requireAuth, async (req, res) => {
  try {
    const userId = req.user.email;
    const { data: activeSessions } = await supabase.from('usage_sessions').select('id').eq('user_id', userId).eq('status', 'active');

    if (!activeSessions?.length) return res.json({ ok: true, cleaned_sessions: 0, message: '0 alte Sessions bereinigt' });

    const now = new Date().toISOString();
    await supabase.from('usage_sessions').update({ status: 'stopped', stopped_at: now }).in('id', activeSessions.map(s => s.id));

    return res.json({ ok: true, cleaned_sessions: activeSessions.length, message: `${activeSessions.length} alte Sessions bereinigt` });
  } catch (e) {
    return res.json({ ok: true, error: e.message, cleaned_sessions: 0 });
  }
});

// ── POST /api/getPremiumProducts ──────────────────────────────────────────
router.post('/getPremiumProducts', requireAuth, async (req, res) => {
  try {
    const packages = [];
    for (let credits = 500; credits <= 10000; credits += 500) {
      const price = Math.round((2.21 + (credits * 0.002778)) * 100) / 100;
      const pricePerThousand = Math.round((price / credits * 1000) * 100) / 100;
      const discount = credits >= 5000 ? Math.round(((4.99 - pricePerThousand) / 4.99) * 100) : 0;
      packages.push({ id: `credits-${credits}`, label: `${credits.toLocaleString()} Credits`, credits, price_eur: price, price_per_thousand: pricePerThousand, discount_percent: Math.max(0, discount), is_popular: credits === 5000, is_best_value: credits === 10000 });
    }
    return res.json({ ok: true, products: packages, pricing_info: { base_price: 4.99, base_credits: 1000, max_discount_percent: 40 } });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/purchasePremium ─────────────────────────────────────────────
router.post('/purchasePremium', requireAuth, async (req, res) => {
  try {
    const { credits, price_eur, payment_method = 'demo' } = req.body;
    if (!credits || !price_eur || credits < 500 || credits > 10000) {
      return res.status(400).json({ error: 'Ungültige Credit-Menge oder Preis' });
    }

    const expectedPrice = Math.round((2.21 + (credits * 0.002778)) * 100) / 100;
    if (Math.abs(price_eur - expectedPrice) > 0.01) {
      return res.status(400).json({ error: 'Preisvalidierung fehlgeschlagen' });
    }

    const userId = req.user.email;
    let { data: wallet } = await supabase.from('premium_wallets').select('*').eq('user_id', userId).single();

    if (!wallet) {
      const { data: nw } = await supabase.from('premium_wallets').insert({ user_id: userId, purchased_credits: 0, consumed_credits: 0, total_spent_eur: 0 }).select().single();
      wallet = nw;
    }

    const { data: updatedWallet } = await supabase.from('premium_wallets').update({ purchased_credits: wallet.purchased_credits + credits, total_spent_eur: (wallet.total_spent_eur || 0) + price_eur }).eq('id', wallet.id).select().single();

    await supabase.from('premium_events').insert({ user_id: userId, event_type: 'purchase', credits_amount: credits, payload: { price_eur, payment_method, package_id: `credits-${credits}`, timestamp: new Date().toISOString() } });

    return res.json({ ok: true, message: `${credits.toLocaleString()} Credits erfolgreich gekauft!`, wallet: { purchased_credits: updatedWallet.purchased_credits, consumed_credits: updatedWallet.consumed_credits, remaining_credits: updatedWallet.purchased_credits - updatedWallet.consumed_credits, total_spent_eur: updatedWallet.total_spent_eur } });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
