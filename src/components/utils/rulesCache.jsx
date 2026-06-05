// Offline-Cache für Angelregeln via localStorage
// TTL: 7 Tage (Regeln ändern sich selten)

const CACHE_KEY = "catchgbt_rules_cache";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function saveRulesToCache(rules) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      rules,
      cachedAt: Date.now()
    }));
  } catch (e) {
    console.warn("[RulesCache] Speichern fehlgeschlagen:", e);
  }
}

export function loadRulesFromCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { rules, cachedAt } = JSON.parse(raw);
    if (Date.now() - cachedAt > CACHE_TTL_MS) return null;
    return { rules, cachedAt };
  } catch (e) {
    console.warn("[RulesCache] Laden fehlgeschlagen:", e);
    return null;
  }
}

export function clearRulesCache() {
  localStorage.removeItem(CACHE_KEY);
}

export function getRulesCacheAge(cachedAt) {
  if (!cachedAt) return null;
  const diffMs = Date.now() - cachedAt;
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return "vor wenigen Minuten";
  if (diffH < 24) return `vor ${diffH} Std.`;
  const diffD = Math.floor(diffH / 24);
  return `vor ${diffD} Tag${diffD > 1 ? "en" : ""}`;
}