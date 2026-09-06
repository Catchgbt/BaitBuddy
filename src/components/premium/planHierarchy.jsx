// Zentrale Plan-Hierarchie für die ganze App.
// Höhere Zahl = mehr Berechtigungen.
// Spiegel von backend/src/lib/planResolver.js (PLAN_RANK) — beide Seiten müssen
// dieselbe Rangfolge kennen, sonst schaltet der Server ein Feature frei, das die
// UI sperrt (oder umgekehrt).
export const PLAN_HIERARCHY = {
  free: 0,
  basic: 1,
  pro: 2,
  elite: 3,
  ultimate: 3,        // Alias zu elite (UI-Name "Ultimate")
  friends_monthly: 3, // Freundschaftsplan = Ultimate-Level
  trial_10_10: 3,     // Bezahlter 10-Tage-Vollzugang = Ultimate-Level
  friends: 4          // Jahresplan, höchste Stufe
};

export function getPlanLevel(planId) {
  if (!planId) return 0;
  return PLAN_HIERARCHY[planId] ?? 0;
}

export function planMeetsRequirement(currentPlanId, requiredPlanId) {
  const currentLevel = getPlanLevel(currentPlanId);
  const requiredLevel = getPlanLevel(requiredPlanId);
  return currentLevel >= requiredLevel;
}