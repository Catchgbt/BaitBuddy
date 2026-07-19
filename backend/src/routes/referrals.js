import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import { sendDbError } from '../lib/errorResponse.js';
import { PLAN_RANK } from '../lib/planResolver.js';

const router = Router();

const REWARD_DAYS = 7;
const REWARD_PLAN_ID = 'elite'; // Ultimate

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ohne 0/O/1/I für Lesbarkeit

function generateCode(length = 8) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function normalizeCode(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Erzeugt oder liest den Referral-Code des aktuellen Nutzers. Der Code wird in
// zwei Stellen gespiegelt: im user_metadata (fürs Frontend-Rendering ohne
// Backend-Call) UND in user_referral_codes (für den Reverse-Lookup beim
// Redeem). Bei einem Race auf demselben Code wird bis zu 5x neu gewürfelt.
async function ensureReferralCode(user) {
  const existingCode = normalizeCode(user.user_metadata?.referral_code || '');
  if (existingCode) {
    // Sicherstellen, dass der Code auch im Lookup-Table steht (ältere Nutzer
    // haben den Code bereits im user_metadata, aber noch keinen Eintrag).
    await supabase
      .from('user_referral_codes')
      .upsert({ code: existingCode, user_id: user.id }, { onConflict: 'code' });
    return existingCode;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateCode(8);
    const { error } = await supabase
      .from('user_referral_codes')
      .insert({ code: candidate, user_id: user.id });
    if (!error) {
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: { ...(user.user_metadata || {}), referral_code: candidate },
      });
      return candidate;
    }
    // 23505 = unique_violation → Code kollidiert, neu würfeln
    if (error.code !== '23505') throw error;
  }
  throw new Error('Konnte keinen eindeutigen Referral-Code erzeugen');
}

router.get('/referrals/me', requireAuth, async (req, res) => {
  try {
    const code = await ensureReferralCode(req.user);

    const { count, error: countError } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_user_id', req.user.id);
    if (countError) return sendDbError(res, countError);

    const meta = req.user.user_metadata || {};
    return res.json({
      ok: true,
      code,
      referral_count: count || 0,
      reward_days: REWARD_DAYS,
      reward_plan_id: REWARD_PLAN_ID,
      already_referred: !!meta.referred_by,
    });
  } catch (e) {
    return sendDbError(res, e);
  }
});

// Löst einen Referral-Code ein: markiert den aktuellen Nutzer als vom Inhaber
// des Codes eingeladen, protokolliert die Empfehlung und verlängert den
// Ultimate-Plan des Referrers um REWARD_DAYS Tage. Idempotent: pro Nutzer
// nur einmal möglich (via referred_by-Flag und UNIQUE auf referred_user_id).
router.post('/referrals/redeem', requireAuth, async (req, res) => {
  const code = normalizeCode(req.body?.code);
  if (!code) {
    return res.status(400).json({ error: 'Referral-Code fehlt' });
  }

  const meta = req.user.user_metadata || {};
  if (meta.referred_by) {
    return res.status(409).json({
      error: 'Du hast bereits einen Einladungscode eingelöst',
      code: 'already_redeemed',
    });
  }

  const { data: mapping, error: mapErr } = await supabase
    .from('user_referral_codes')
    .select('user_id')
    .eq('code', code)
    .maybeSingle();
  if (mapErr) return sendDbError(res, mapErr);
  if (!mapping) {
    return res.status(404).json({ error: 'Einladungscode ungültig' });
  }

  const referrerUserId = mapping.user_id;
  if (referrerUserId === req.user.id) {
    return res.status(400).json({ error: 'Der eigene Code kann nicht eingelöst werden' });
  }

  // Referral protokollieren. UNIQUE(referred_user_id) verhindert Doppelbuchung
  // selbst bei paralleler Anfrage.
  const { error: insertErr } = await supabase.from('referrals').insert({
    referrer_user_id: referrerUserId,
    referred_user_id: req.user.id,
    referral_code: code,
    reward_days: REWARD_DAYS,
    reward_plan_id: REWARD_PLAN_ID,
  });
  if (insertErr) {
    if (insertErr.code === '23505') {
      return res.status(409).json({
        error: 'Diese Einladung wurde bereits eingelöst',
        code: 'already_redeemed',
      });
    }
    return sendDbError(res, insertErr);
  }

  // Referrer belohnen: Ultimate um 7 Tage verlängern. Läuft der Plan bereits
  // (Ultimate/Elite/Friends) → an bestehendes Ablaufdatum ranhängen; sonst
  // ab jetzt +7 Tage. Ein niedrigerer Plan wird auf Elite hochgestuft.
  const { data: refUserRes, error: refUserErr } =
    await supabase.auth.admin.getUserById(referrerUserId);
  if (refUserErr || !refUserRes?.user) {
    // Referrer konnte nicht geladen werden → Log bleibt bestehen, aber wir
    // signalisieren dem Frontend "eingelöst" ohne Reward-Detail.
    return res.json({ ok: true, reward_extended: false });
  }

  const referrer = refUserRes.user;
  const referrerMeta = referrer.user_metadata || {};
  const now = Date.now();
  const currentPlanId = referrerMeta.premium_plan_id || 'free';
  const currentExpiresAt = referrerMeta.premium_expires_at
    ? new Date(referrerMeta.premium_expires_at).getTime()
    : 0;

  const isCurrentUltimateOrHigher =
    (PLAN_RANK[currentPlanId] ?? 0) >= PLAN_RANK.elite && currentExpiresAt > now;

  const base = isCurrentUltimateOrHigher ? currentExpiresAt : now;
  const newExpiresAt = new Date(base + REWARD_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const nextPlanId = isCurrentUltimateOrHigher ? currentPlanId : REWARD_PLAN_ID;

  const mergedMeta = {
    ...referrerMeta,
    premium_plan_id: nextPlanId,
    premium_expires_at: newExpiresAt,
    // Trial nur zurücksetzen, wenn wir von "trial" hochstufen — sonst
    // vorhandenen bezahlten Status nicht überschreiben.
    premium_trial: isCurrentUltimateOrHigher ? referrerMeta.premium_trial === true : false,
    referral_reward_count: (referrerMeta.referral_reward_count || 0) + 1,
    referral_last_reward_at: new Date().toISOString(),
  };

  const { error: updRefErr } = await supabase.auth.admin.updateUserById(referrerUserId, {
    user_metadata: mergedMeta,
  });
  if (updRefErr) return sendDbError(res, updRefErr);

  // Neuen Nutzer als eingelöst markieren, damit er nicht mehrfach einlöst.
  const { error: updSelfErr } = await supabase.auth.admin.updateUserById(req.user.id, {
    user_metadata: {
      ...meta,
      referred_by: code,
      referred_at: new Date().toISOString(),
    },
  });
  if (updSelfErr) return sendDbError(res, updSelfErr);

  return res.json({
    ok: true,
    reward_extended: true,
    reward_days: REWARD_DAYS,
    reward_plan_id: nextPlanId,
    reward_expires_at: newExpiresAt,
  });
});

export default router;
