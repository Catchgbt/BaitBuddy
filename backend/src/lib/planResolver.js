// Zentrale Plan-Auflösung für serverseitiges Feature-Gating.
// Von premium.js (Status/Check-Feature) und ai.js (Ultimate-Stimme im TTS)
// gemeinsam genutzt, damit Plan-Regeln nur an einer Stelle leben.

// Rangfolge der Pläne, niedrig -> hoch. 'free' ist implizit Rang 0.
// 'ultimate' ist der UI-Name von 'elite'; die Friends-Pläne liegen auf
// Ultimate-Level (Spiegel der Frontend-Hierarchie in planHierarchy.jsx).
// 'trial_10_10' ist der 10-Tage-Vollzugang (Google-Play-Einmalprodukt) und
// schaltet deshalb Ultimate-Funktionen frei — ohne diesen Rang hätte ein
// bezahlter Trial denselben Zugriff wie 'free'.
export const PLAN_RANK = {
  free: 0,
  basic: 1,
  pro: 2,
  elite: 3,
  ultimate: 3,
  friends_monthly: 3,
  trial_10_10: 3,
  friends: 4,
};

export function planRank(planId) {
  return PLAN_RANK[planId] ?? 0;
}

// Ermittelt den effektiven Plan ausschließlich aus app_metadata. Diese Metadaten
// sind serverseitig/admin-verwaltet; user_metadata darf hier nicht als Premium-
// Quelle dienen, weil Clients sie teilweise selbst schreiben können.
export function resolvePlan(user, now = new Date()) {
  const meta = user?.app_metadata || {};
  const rawPlanId = meta.premium_plan_id || 'free';
  const expiresAt = meta.premium_expires_at || null;
  const trialExpiresAt = meta.trial_expires_at || null;
  const passExpiresAt = meta.premium_pass_expires_at || null;
  const rawIsTrial = meta.premium_trial === true;
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();

  let isActive = rawPlanId !== 'free';
  let subscriptionRemainingHours = null;
  if (expiresAt) {
    const msLeft = new Date(expiresAt).getTime() - nowMs;
    subscriptionRemainingHours = Math.ceil(msLeft / 3600000);
    isActive = isActive && msLeft > 0;
  }

  const passMsLeft = passExpiresAt ? new Date(passExpiresAt).getTime() - nowMs : 0;
  const fallbackTrialExpiresAt = rawIsTrial ? expiresAt : null;
  const effectiveTrialExpiresAt = trialExpiresAt || fallbackTrialExpiresAt;
  const trialMsLeft = effectiveTrialExpiresAt ? new Date(effectiveTrialExpiresAt).getTime() - nowMs : 0;

  let effectiveId = isActive && !rawIsTrial ? rawPlanId : 'free';
  let effectiveSource = isActive && !rawIsTrial ? 'subscription' : 'base';
  let effectiveExpiresAt = isActive && !rawIsTrial ? expiresAt : null;
  let remainingHours = isActive && !rawIsTrial ? subscriptionRemainingHours : null;
  let isTrial = false;
  let isPass = false;

  if (passMsLeft > 0 && planRank(effectiveId) < PLAN_RANK.elite) {
    effectiveId = 'elite';
    effectiveSource = 'premium_pass';
    effectiveExpiresAt = passExpiresAt;
    remainingHours = Math.ceil(passMsLeft / 3600000);
    isPass = true;
  }

  if (!isPass && trialMsLeft > 0 && planRank(effectiveId) < PLAN_RANK.elite) {
    effectiveId = 'elite';
    effectiveSource = 'trial';
    effectiveExpiresAt = effectiveTrialExpiresAt;
    remainingHours = Math.ceil(trialMsLeft / 3600000);
    isTrial = true;
  }

  return {
    effectiveId,
    isActive: effectiveId !== 'free',
    expiresAt: effectiveExpiresAt,
    remainingHours,
    isTrial,
    isPass,
    source: effectiveSource,
    trialUsed: meta.trial_used === true,
    trialStartedAt: meta.trial_started_at || null,
    trialExpiresAt,
    premiumPassStartedAt: meta.premium_pass_started_at || null,
    premiumPassExpiresAt: passExpiresAt,
  };
}
