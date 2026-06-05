// Zentrale Plan-Hierarchie für die ganze App.
// Höhere Zahl = mehr Berechtigungen.
export const PLAN_HIERARCHY = {
  free: 0,
  basic: 1,
  pro: 2,
  elite: 3,
  ultimate: 3,        // Alias zu elite (UI-Name "Ultimate")
  friends_monthly: 3, // Freundschaftsplan = Ultimate-Level
  friends: 4          // Jahresplan, höchste Stufe
};

export function getPlanLevel(planId) {
  if (!planId) return 0;
  return PLAN_HIERARCHY[planId] ?? 0;
}

export function planMeetsRequirement(currentPlanId, requiredPlanId) {
  return getPlanLevel(currentPlanId) >= getPlanLevel(requiredPlanId);
}