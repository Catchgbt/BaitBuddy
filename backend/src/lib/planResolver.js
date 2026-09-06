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

// Ermittelt den effektiven Plan aus den User-Metadaten. Ist ein Ablaufdatum
// gesetzt und überschritten (z.B. nach dem 24h-Trial für neue Nutzer), gilt der
// Nutzer wieder als 'free' — wichtig, weil das Frontend-Gating nur die Plan-ID
// prüft, nicht is_active.
export function resolvePlan(user) {
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
