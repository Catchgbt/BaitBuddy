// Angel-Level, XP und Tool-Freischaltung — serverseitige Autorität.
// =============================================================================
// Der Client rendert denselben Regelsatz (shared/toolUnlocks.js) für eine
// sofortige UI, darf aber nie allein entscheiden: jeder Zugriff auf ein
// gesperrtes Tool ist über POST /api/progression/tools/access prüfbar, und
// Käufe werden ausschließlich hier nach echter Zahlungsverifikation
// eingetragen.

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import { sendDbError } from '../lib/errorResponse.js';
import { resolvePlan } from '../lib/planResolver.js';
import { getUserXpState, invalidateXpCache, XP_WEIGHTS } from '../lib/xpEngine.js';
import {
  verifyGooglePlayPurchase,
  verifyStripePayment,
  createStripeCheckoutSession,
} from '../lib/purchaseVerification.js';
import {
  LEVELS,
  LEVEL_XP_THRESHOLDS,
  MAX_LEVEL,
  PRESTIGE_XP_STEP,
  TOOL_BY_ID,
  TOOL_UNLOCK_CURRENCY,
  TOOL_UNLOCK_PRICE_CENTS,
  buildToolStatusList,
  evaluateToolAccess,
  googlePlayProductIdForTool,
  nextLockedTools,
  toolIdFromGooglePlayProductId,
  toolsUnlockedBetween,
  unlockableTools,
} from '../../../shared/toolUnlocks.js';

const router = Router();

const STRIPE_CONFIGURED = !!process.env.STRIPE_SECRET_KEY;
const GOOGLE_PLAY_CONFIGURED = !!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;

// Der zuletzt vom Nutzer gesehene Level-Stand liegt in den User-Metadaten
// (kein eigener Tabellen-Roundtrip). Daraus leitet das Frontend ab, ob die
// Level-Up-Animation noch gezeigt werden muss.
const SEEN_LEVEL_KEY = 'progression_seen_level';

function seenLevel(user) {
  const raw = Number(user?.user_metadata?.[SEEN_LEVEL_KEY]);
  if (!Number.isFinite(raw) || raw < 1) return 1;
  return Math.min(Math.trunc(raw), MAX_LEVEL);
}

/** Alle dauerhaft gespeicherten Freischaltungen eines Nutzers. */
async function loadUnlockRows(userId) {
  const { data, error } = await supabase
    .from('user_tool_unlocks')
    .select('tool_id, source, created_at, unlocked_at_level')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

/**
 * Schreibt Level-Freischaltungen fest, sobald das Level erreicht ist.
 * Damit bleibt ein einmal freigeschaltetes Tool erhalten, selbst wenn der aus
 * den Nutzerdaten abgeleitete XP-Stand später sinkt. Läuft nur, wenn es
 * tatsächlich etwas Neues gibt — im Normalfall also gar nicht.
 */
async function persistLevelUnlocks(userId, level, existingIds) {
  const missing = unlockableTools().filter(
    (tool) => level >= tool.requiredLevel && !existingIds.has(tool.id)
  );
  if (missing.length === 0) return [];

  const rows = missing.map((tool) => ({
    user_id: userId,
    tool_id: tool.id,
    source: 'level',
    unlocked_at_level: level,
  }));

  // ignoreDuplicates: bei parallelen Requests gewinnt der erste Insert, der
  // zweite ist dann ein No-op statt eines 23505-Fehlers.
  const { error } = await supabase
    .from('user_tool_unlocks')
    .upsert(rows, { onConflict: 'user_id,tool_id', ignoreDuplicates: true });
  if (error) throw error;

  return missing.map((tool) => tool.id);
}

/**
 * Gesamtzustand: XP, Level, gespeicherte Freischaltungen, Plan.
 * Einzige Stelle, die den Zustand zusammensetzt — alle Endpunkte bauen darauf.
 */
async function loadProgressionState(user, { force = false } = {}) {
  const xp = await getUserXpState(user, { force });
  const rows = await loadUnlockRows(user.id);
  const storedIds = new Set(rows.map((r) => r.tool_id));

  const newlyPersisted = await persistLevelUnlocks(user.id, xp.level, storedIds);
  newlyPersisted.forEach((id) => storedIds.add(id));

  const { effectiveId: planId } = resolvePlan(user);

  // Gespeicherte Freischaltungen wirken wie ein Kauf: einmal frei, immer frei.
  const access = {
    level: xp.level,
    planId,
    purchasedTools: [...storedIds],
  };

  return {
    xp,
    planId,
    access,
    unlockRows: rows,
    purchasedIds: rows.filter((r) => r.source === 'purchase').map((r) => r.tool_id),
    storedIds,
  };
}

// ── Status ───────────────────────────────────────────────────────────────────

router.get('/progression/me', requireAuth, async (req, res) => {
  try {
    const state = await loadProgressionState(req.user, { force: req.query.refresh === '1' });
    const tools = buildToolStatusList(state.access);
    const lastSeen = seenLevel(req.user);

    return res.json({
      ok: true,
      xp: {
        total: state.xp.total_xp,
        breakdown: state.xp.breakdown,
        incomplete_sources: state.xp.incomplete_sources,
      },
      level: {
        current: state.xp.level,
        rank: state.xp.rank,
        rank_icon: state.xp.rank_icon,
        prestige: state.xp.prestige,
        is_max_level: state.xp.is_max_level,
        level_floor_xp: state.xp.level_floor_xp,
        next_level_xp: state.xp.next_level_xp,
        xp_in_level: state.xp.xp_in_level,
        xp_to_next: state.xp.xp_to_next,
        progress: state.xp.progress,
        max_level: MAX_LEVEL,
        prestige_xp_step: PRESTIGE_XP_STEP,
      },
      plan_id: state.planId,
      tools,
      unlocked_tools: tools.filter((t) => t.unlocked).map((t) => t.id),
      purchased_tools: state.purchasedIds,
      next_unlocks: nextLockedTools(state.access, 4),
      // Level-Up-Animation: alles, was seit dem letzten quittierten Level neu
      // dazugekommen ist. Das Frontend zeigt sie und quittiert per
      // POST /progression/level-seen.
      pending_level_up:
        state.xp.level > lastSeen
          ? {
              from_level: lastSeen,
              to_level: state.xp.level,
              rank: state.xp.rank,
              new_tools: toolsUnlockedBetween(lastSeen, state.xp.level).map((t) => ({
                id: t.id,
                name: t.name,
                description: t.description,
                icon: t.icon,
                page: t.page,
                is_endgame: !!t.isEndgame,
              })),
            }
          : null,
      seen_level: lastSeen,
    });
  } catch (e) {
    return sendDbError(res, e);
  }
});

// Statischer Katalog inkl. Level-Kurve — für Übersichtsseiten, die den Stand
// eines Nutzers nicht brauchen (und für die Buddy-Wissensbasis).
router.get('/progression/catalog', async (req, res) => {
  return res.json({
    ok: true,
    levels: LEVELS.map((entry) => ({
      ...entry,
      tools: unlockableTools()
        .filter((t) => t.requiredLevel === entry.level)
        .map((t) => ({ id: t.id, name: t.name, description: t.description, icon: t.icon })),
    })),
    level_xp_thresholds: LEVEL_XP_THRESHOLDS,
    max_level: MAX_LEVEL,
    prestige_xp_step: PRESTIGE_XP_STEP,
    xp_weights: XP_WEIGHTS,
    price_cents: TOOL_UNLOCK_PRICE_CENTS,
    currency: TOOL_UNLOCK_CURRENCY,
  });
});

router.get('/progression/tools', requireAuth, async (req, res) => {
  try {
    const state = await loadProgressionState(req.user);
    return res.json({ ok: true, tools: buildToolStatusList(state.access) });
  } catch (e) {
    return sendDbError(res, e);
  }
});

// Verbindliche Zugriffsprüfung. Das Frontend rendert zwar selbst, aber jede
// Seite, die echte Daten liefert, kann (und soll) hier gegenprüfen.
router.post('/progression/tools/access', requireAuth, async (req, res) => {
  const toolId = typeof req.body?.tool_id === 'string' ? req.body.tool_id : '';
  if (!TOOL_BY_ID[toolId]) {
    return res.status(400).json({ error: 'Unbekannte tool_id' });
  }

  try {
    const state = await loadProgressionState(req.user);
    const result = evaluateToolAccess(toolId, state.access);
    return res.json({
      ok: true,
      tool_id: toolId,
      allowed: result.unlocked,
      reason: result.reason,
      required_level: result.tool.requiredLevel,
      current_level: state.xp.level,
      xp_to_next: state.xp.xp_to_next,
    });
  } catch (e) {
    return sendDbError(res, e);
  }
});

// Quittiert die Level-Up-Animation, damit sie nicht bei jedem Start erneut
// erscheint. Es wird nur nach oben geschrieben (nie zurück).
router.post('/progression/level-seen', requireAuth, async (req, res) => {
  const raw = Number(req.body?.level);
  if (!Number.isFinite(raw) || raw < 1 || raw > MAX_LEVEL) {
    return res.status(400).json({ error: 'level muss zwischen 1 und ' + MAX_LEVEL + ' liegen' });
  }

  const current = req.user.user_metadata || {};
  const next = Math.max(seenLevel(req.user), Math.trunc(raw));
  if (next === seenLevel(req.user)) {
    return res.json({ ok: true, seen_level: next });
  }

  const { error } = await supabase.auth.admin.updateUserById(req.user.id, {
    user_metadata: { ...current, [SEEN_LEVEL_KEY]: next },
  });
  if (error) return sendDbError(res, error);

  return res.json({ ok: true, seen_level: next });
});

// ── Geführte Tour ────────────────────────────────────────────────────────────
// Der Tour-Zustand gehört in dieselben User-Metadaten wie der übrige
// Fortschritt. Die Tour lag ursprünglich auf public.users und griff per
// Anon-Key direkt aus dem Frontend darauf zu — das konnte nicht funktionieren:
// auf der Tabelle ist RLS aktiv und es existiert keine einzige Policy, also
// verweigert Postgres Lesen UND Schreiben. `tutorial_completed` wurde damit nie
// wahr und die Tour startete bei jedem Dashboard-Besuch erneut. Ausserdem ist
// public.users nicht die Wahrheit der App (Plan, Referral und Level leben in
// user_metadata), und das Frontend spricht sonst nirgends direkt mit Supabase.

const TOUR_STEP_KEY = 'guided_tour_step';
const TOUR_COMPLETED_KEY = 'guided_tour_completed';
const TOUR_LEVEL_KEY = 'tour_user_level';

const TOUR_LEVELS = new Set(['beginner', 'experienced', 'professional']);

function readTourState(user) {
  const meta = user?.user_metadata || {};
  const step = Number(meta[TOUR_STEP_KEY]);
  const level = meta[TOUR_LEVEL_KEY];
  return {
    step: Number.isFinite(step) && step >= 0 ? Math.trunc(step) : 0,
    completed: meta[TOUR_COMPLETED_KEY] === true,
    user_level: TOUR_LEVELS.has(level) ? level : 'beginner',
  };
}

router.get('/progression/tour', requireAuth, async (req, res) => {
  return res.json({ ok: true, ...readTourState(req.user) });
});

// Teil-Update: nur mitgeschickte Felder werden geändert, damit ein Fortschritt
// den Abschluss nicht überschreibt und umgekehrt.
router.patch('/progression/tour', requireAuth, async (req, res) => {
  const { step, completed, user_level: userLevel } = req.body || {};
  const current = req.user.user_metadata || {};
  const patch = {};

  if (step !== undefined) {
    const parsed = Number(step);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return res.status(400).json({ error: 'step muss eine Zahl >= 0 sein' });
    }
    patch[TOUR_STEP_KEY] = Math.trunc(parsed);
  }

  if (completed !== undefined) {
    if (typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'completed muss ein Boolean sein' });
    }
    patch[TOUR_COMPLETED_KEY] = completed;
  }

  if (userLevel !== undefined) {
    if (!TOUR_LEVELS.has(userLevel)) {
      return res.status(400).json({ error: `user_level muss eines von ${[...TOUR_LEVELS].join(', ')} sein` });
    }
    patch[TOUR_LEVEL_KEY] = userLevel;
  }

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'Kein Feld zum Aktualisieren angegeben' });
  }

  const merged = { ...current, ...patch };
  const { error } = await supabase.auth.admin.updateUserById(req.user.id, {
    user_metadata: merged,
  });
  if (error) return sendDbError(res, error);

  return res.json({ ok: true, ...readTourState({ user_metadata: merged }) });
});

// ── Sofortfreischaltung (0,99 €) ─────────────────────────────────────────────

// Web-Kauf: Stripe-Checkout-Session für genau ein Tool. Der Preis kommt
// serverseitig aus shared/toolUnlocks.js — der Client sendet nur die tool_id.
router.post('/progression/tools/checkout', requireAuth, async (req, res) => {
  if (!STRIPE_CONFIGURED) {
    return res.status(501).json({ error: 'Stripe checkout nicht konfiguriert' });
  }

  const toolId = typeof req.body?.tool_id === 'string' ? req.body.tool_id : '';
  const tool = TOOL_BY_ID[toolId];
  if (!tool || tool.alwaysAvailable) {
    return res.status(400).json({ error: 'Unbekannte oder nicht käufliche tool_id' });
  }

  try {
    const state = await loadProgressionState(req.user);
    const access = evaluateToolAccess(toolId, state.access);
    if (access.unlocked) {
      // Nichts verkaufen, was der Nutzer bereits besitzt.
      return res.status(409).json({
        error: 'Tool ist bereits freigeschaltet',
        tool_id: toolId,
        reason: access.reason,
      });
    }

    const origin =
      process.env.APP_BASE_URL || req.get('origin') || `${req.protocol}://${req.get('host')}`;
    const successUrl = `${origin}/Tools?unlock=success&tool_id=${encodeURIComponent(toolId)}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/Tools?unlock=cancelled&tool_id=${encodeURIComponent(toolId)}`;

    const session = await createStripeCheckoutSession({
      planId: null,
      planName: tool.name,
      amountCents: TOOL_UNLOCK_PRICE_CENTS,
      userId: req.user.id,
      userEmail: req.user.email,
      successUrl,
      cancelUrl,
      metadata: { tool_id: toolId, purchase_type: 'tool_unlock' },
    });
    if (!session.ok) {
      return res
        .status(502)
        .json({ error: `Checkout-Session konnte nicht erstellt werden: ${session.reason}` });
    }

    return res.json({
      ok: true,
      checkout_url: session.url,
      session_id: session.id,
      tool_id: toolId,
      price_cents: TOOL_UNLOCK_PRICE_CENTS,
    });
  } catch (e) {
    return sendDbError(res, e);
  }
});

// Schreibt die gekaufte Freischaltung fest — nach echter Verifikation bei
// Stripe (Web) bzw. Google Play (Android). Ohne konfigurierte Verifikation
// wird nichts freigeschaltet: sonst würde ein beliebiger String genügen.
router.post('/progression/tools/purchase', requireAuth, async (req, res) => {
  const { tool_id, transaction_id, purchase_token, product_id, payment_method } = req.body || {};

  const toolId = typeof tool_id === 'string' ? tool_id : '';
  const tool = TOOL_BY_ID[toolId];
  if (!tool || tool.alwaysAvailable) {
    return res.status(400).json({ error: 'Unbekannte oder nicht käufliche tool_id' });
  }
  if (!transaction_id && !purchase_token) {
    return res.status(400).json({
      error: 'purchase_token (Google Play) oder transaction_id (Stripe) erforderlich',
    });
  }

  const verificationConfigured = purchase_token ? GOOGLE_PLAY_CONFIGURED : STRIPE_CONFIGURED;
  if (!verificationConfigured) {
    return res.status(501).json({
      error: 'Kaufverifikation ist serverseitig nicht konfiguriert — Freischaltung nicht möglich',
    });
  }

  const verification = purchase_token
    ? await verifyGooglePlayPurchase({ productId: product_id, purchaseToken: purchase_token })
    : await verifyStripePayment({ sessionId: transaction_id });
  if (!verification.valid) {
    return res
      .status(402)
      .json({ error: `Zahlung konnte nicht verifiziert werden: ${verification.reason}` });
  }

  // Der verifizierte Kauf muss zu DIESEM Nutzer und DIESEM Tool gehören —
  // sonst ließe sich mit einer fremden (oder für ein anderes Tool bezahlten)
  // Transaktion ein beliebiges Tool freischalten.
  if (purchase_token) {
    if (toolIdFromGooglePlayProductId(product_id) !== toolId) {
      return res.status(400).json({ error: 'Kauf gehört zu einem anderen Tool' });
    }
  } else {
    const session = verification.raw || {};
    if (session.client_reference_id && session.client_reference_id !== req.user.id) {
      return res.status(403).json({ error: 'Zahlung gehört zu einem anderen Konto' });
    }
    if (session.metadata?.tool_id && session.metadata.tool_id !== toolId) {
      return res.status(400).json({ error: 'Zahlung gehört zu einem anderen Tool' });
    }
    if (!session.metadata?.tool_id) {
      return res.status(400).json({ error: 'Zahlung ist keine Tool-Freischaltung' });
    }
  }

  try {
    const state = await loadProgressionState(req.user);

    // Bereits vorhanden (Doppelklick, erneuter Aufruf der Success-URL,
    // "Käufe wiederherstellen"): idempotent bestätigen statt Fehler werfen.
    if (state.storedIds.has(toolId)) {
      return res.json({ ok: true, tool_id: toolId, already_unlocked: true });
    }

    const { error } = await supabase.from('user_tool_unlocks').insert({
      user_id: req.user.id,
      tool_id: toolId,
      source: 'purchase',
      price_cents: TOOL_UNLOCK_PRICE_CENTS,
      payment_method: payment_method || (purchase_token ? 'google_play' : 'stripe'),
      transaction_id: transaction_id || null,
      purchase_token: purchase_token || null,
      product_id: product_id || null,
      unlocked_at_level: state.xp.level,
    });

    if (error) {
      // 23505 = unique_violation. Entweder die Freischaltung existiert bereits
      // (paralleler Request) oder die Transaktion wurde schon verwendet.
      if (error.code === '23505') {
        const rows = await loadUnlockRows(req.user.id);
        const owned = rows.some((r) => r.tool_id === toolId);
        if (owned) return res.json({ ok: true, tool_id: toolId, already_unlocked: true });
        return res.status(409).json({ error: 'Diese Transaktion wurde bereits eingelöst' });
      }
      return sendDbError(res, error);
    }

    invalidateXpCache(req.user.id);

    return res.json({
      ok: true,
      tool_id: toolId,
      name: tool.name,
      price_cents: TOOL_UNLOCK_PRICE_CENTS,
      google_play_product_id: googlePlayProductIdForTool(toolId),
    });
  } catch (e) {
    return sendDbError(res, e);
  }
});

export default router;
