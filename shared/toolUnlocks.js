// Angel-Level & Tool-Freischaltung — gemeinsame Quelle für Frontend und Backend.
// =============================================================================
// Dieses Modul enthält NUR Daten und reine Funktionen (keine Imports, kein
// Node-/Browser-API-Zugriff), damit es sowohl vom Vite-Bundle (`@shared/...`)
// als auch vom Express-Backend (relativer Import) genutzt werden kann. Die
// Freischalt-Regeln existieren dadurch exakt einmal — der Server bleibt die
// Autorität (siehe backend/src/routes/progression.js), das Frontend rendert
// dieselbe Logik nur vor, um sofort reagieren zu können.
//
// Gating-Regel (ODER-Logik):
//   Zugang, wenn  Level erreicht  ODER  Tool gekauft  ODER  Plan deckt es ab.
// Ein Level-Up ist damit ein echter, kostenloser Zugangsweg; bestehende
// Abonnenten verlieren nichts, weil ihr Plan das Level-Gate erfüllt.

// ── Level & XP ───────────────────────────────────────────────────────────────

// Kumulative XP-Schwelle je Level. Index 0 = Level 1 (Start).
// Die Kurve wächst ~linear-quadratisch: die ersten Level fallen schnell,
// Level 10 verlangt eine echte Saison Angeln.
export const LEVEL_XP_THRESHOLDS = [0, 250, 600, 1100, 1800, 2700, 3900, 5400, 7300, 9600];

export const MAX_LEVEL = LEVEL_XP_THRESHOLDS.length; // 10

// Nach Level 10 läuft die XP-Sammlung als Prestige weiter (Meisterangler —
// Prestige 1, 2, …). Kein weiterer Rang, keine weiteren Tools.
export const PRESTIGE_XP_STEP = 2500;

export const LEVELS = [
  { level: 1,  rank: 'Angelküken',      icon: 'Egg',        minXp: 0 },
  { level: 2,  rank: 'Wurmflüsterer',   icon: 'Worm',       minXp: 250 },
  { level: 3,  rank: 'Hakenheld',       icon: 'Anchor',     minXp: 600 },
  { level: 4,  rank: 'Petri-Pilot',     icon: 'Fish',       minXp: 1100 },
  { level: 5,  rank: 'Köder-Kapitän',   icon: 'Ship',       minXp: 1800 },
  { level: 6,  rank: 'Gewässer-Guru',   icon: 'Waves',      minXp: 2700 },
  { level: 7,  rank: 'Biss-Professor',  icon: 'Brain',      minXp: 3900 },
  { level: 8,  rank: 'Spot-Sherlock',   icon: 'MapPinned',  minXp: 5400 },
  { level: 9,  rank: 'Angel-Legende',   icon: 'Crown',      minXp: 7300 },
  { level: 10, rank: 'Meisterangler',   icon: 'Trophy',     minXp: 9600 },
];

/** Rang-Metadaten zu einem Level (fällt auf Level 1 bzw. MAX_LEVEL zurück). */
export function levelInfo(level) {
  const clamped = Math.min(Math.max(Math.trunc(level) || 1, 1), MAX_LEVEL);
  return LEVELS[clamped - 1];
}

/** Level (1..10) für einen XP-Stand. */
export function levelForXp(totalXp) {
  const xp = Number.isFinite(totalXp) ? Math.max(0, Math.floor(totalXp)) : 0;
  let level = 1;
  for (let i = 0; i < LEVEL_XP_THRESHOLDS.length; i += 1) {
    if (xp >= LEVEL_XP_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

/** Prestige-Stufe (0 = noch kein Prestige) für einen XP-Stand ab Level 10. */
export function prestigeForXp(totalXp) {
  const xp = Number.isFinite(totalXp) ? Math.max(0, Math.floor(totalXp)) : 0;
  const cap = LEVEL_XP_THRESHOLDS[MAX_LEVEL - 1];
  if (xp < cap) return 0;
  return Math.floor((xp - cap) / PRESTIGE_XP_STEP);
}

/**
 * Fortschritt für die Anzeige: aktuelles Level, XP im Level, XP bis zum
 * nächsten Ziel. Ab Level 10 zählt das Ziel die nächste Prestige-Stufe —
 * die XP-Sammlung endet also nie.
 */
export function progressForXp(totalXp) {
  const xp = Number.isFinite(totalXp) ? Math.max(0, Math.floor(totalXp)) : 0;
  const level = levelForXp(xp);
  const prestige = prestigeForXp(xp);
  const info = levelInfo(level);

  let floorXp;
  let ceilXp;
  if (level < MAX_LEVEL) {
    floorXp = LEVEL_XP_THRESHOLDS[level - 1];
    ceilXp = LEVEL_XP_THRESHOLDS[level];
  } else {
    const cap = LEVEL_XP_THRESHOLDS[MAX_LEVEL - 1];
    floorXp = cap + prestige * PRESTIGE_XP_STEP;
    ceilXp = floorXp + PRESTIGE_XP_STEP;
  }

  const span = ceilXp - floorXp;
  const inLevel = xp - floorXp;
  return {
    total_xp: xp,
    level,
    rank: info.rank,
    rank_icon: info.icon,
    prestige,
    is_max_level: level >= MAX_LEVEL,
    level_floor_xp: floorXp,
    next_level_xp: ceilXp,
    xp_in_level: inLevel,
    xp_to_next: Math.max(0, ceilXp - xp),
    // 0..1, für Fortschrittsbalken
    progress: span > 0 ? Math.min(1, Math.max(0, inLevel / span)) : 1,
  };
}

// ── Tool-Katalog ─────────────────────────────────────────────────────────────

// Preis der optionalen Sofortfreischaltung. Serverseitig verbindlich; der
// Client sendet nie einen Betrag, nur die tool_id.
export const TOOL_UNLOCK_PRICE_CENTS = 99;
export const TOOL_UNLOCK_CURRENCY = 'eur';

// Google-Play-SKU-Schema für die Einmalkäufe (INAPP, kein Abo). Muss in der
// Play Console exakt so angelegt werden.
export const GOOGLE_PLAY_TOOL_SKU_PREFIX = 'baitbuddy_tool_';

/** Google-Play-Produkt-ID für ein Tool ("fishing-map" -> "baitbuddy_tool_fishing_map"). */
export function googlePlayProductIdForTool(toolId) {
  if (typeof toolId !== 'string' || !toolId) return null;
  return `${GOOGLE_PLAY_TOOL_SKU_PREFIX}${toolId.replace(/-/g, '_')}`;
}

/** Umkehrung: Play-Produkt-ID -> tool_id, oder null wenn kein Tool-Produkt. */
export function toolIdFromGooglePlayProductId(productId) {
  if (typeof productId !== 'string') return null;
  if (!productId.startsWith(GOOGLE_PLAY_TOOL_SKU_PREFIX)) return null;
  const slug = productId.slice(GOOGLE_PLAY_TOOL_SKU_PREFIX.length).replace(/_/g, '-');
  return TOOL_BY_ID[slug] ? slug : null;
}

export const TOOL_CATEGORIES = {
  basis: 'Basis',
  spots: 'Spots & Karte',
  planung: 'Planung',
  ausruestung: 'Ausrüstung',
  ki: 'KI & Analyse',
  community: 'Community',
};

// Der Katalog. Jeder Eintrag zeigt auf eine REAL existierende Seite
// (`page` = Schlüssel aus src/pages.config.js bzw. eine in App.jsx manuell
// registrierte Route). `requiredPlan` spiegelt das bereits vorhandene
// PremiumGuard-Gate der Seite — es wird hier nicht verschärft, sondern nur
// gespiegelt, damit ein Abonnent nie zusätzlich level-gesperrt wird.
//
// Level 1 = Basis (immer frei, nie sperrbar). Level 2..10 = je zwei Tools.
export const TOOLS = [
  // ── Level 1 — Angelküken (immer verfügbar) ────────────────────────────────
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Deine Startseite mit Wetter, letzten Fängen und Buddy-Tipps.',
    icon: 'LayoutDashboard',
    page: 'Dashboard',
    requiredLevel: 1,
    requiredPlan: null,
    category: 'basis',
    alwaysAvailable: true,
  },
  {
    // Der Buddy ist das schwebende Widget (AIBuddyWidget) und damit auf jeder
    // Seite erreichbar — als Ziel dient deshalb das Dashboard. Die eigene
    // Voice-Seite (KiBuddyBeta) behält ihr bestehendes Plan-Gate und ist
    // bewusst KEIN Katalog-Eintrag.
    id: 'ki-buddy',
    name: 'KI-Buddy',
    description: 'Dein Angel-Begleiter: Fragen stellen, Tipps holen, Aktionen auslösen.',
    icon: 'MessageCircle',
    page: 'Dashboard',
    requiredLevel: 1,
    requiredPlan: null,
    category: 'basis',
    alwaysAvailable: true,
  },
  {
    id: 'logbook',
    name: 'Fangbuch',
    description: 'Fänge erfassen, Fotos anhängen, Historie durchsuchen.',
    icon: 'BookOpen',
    page: 'Logbook',
    requiredLevel: 1,
    requiredPlan: null,
    category: 'basis',
    alwaysAvailable: true,
  },
  {
    id: 'profile',
    name: 'Profil',
    description: 'Angel-Level, XP, gekaufte Tools und persönliche Daten.',
    icon: 'User',
    page: 'Profile',
    requiredLevel: 1,
    requiredPlan: null,
    category: 'basis',
    alwaysAvailable: true,
  },
  {
    id: 'settings',
    name: 'Einstellungen',
    description: 'Benachrichtigungen, Sprache, Stimme, Datenschutz.',
    icon: 'Settings',
    page: 'Settings',
    requiredLevel: 1,
    requiredPlan: null,
    category: 'basis',
    alwaysAvailable: true,
  },

  // ── Level 2 — Wurmflüsterer ───────────────────────────────────────────────
  {
    id: 'fishing-map',
    name: 'Angel-Map',
    description: 'Interaktive Karte mit eigenen Spots, öffentlichen Gewässern und Angelparks.',
    icon: 'Map',
    page: 'Map',
    requiredLevel: 2,
    requiredPlan: null,
    category: 'spots',
  },
  {
    id: 'catch-stats',
    name: 'Fang-Übersicht',
    description: 'Auswertung deiner Fänge nach Art, Größe, Köder und Zeitraum.',
    icon: 'BarChart3',
    page: 'CatchStats',
    requiredLevel: 2,
    requiredPlan: null,
    category: 'basis',
  },

  // ── Level 3 — Hakenheld ───────────────────────────────────────────────────
  {
    id: 'weather',
    name: 'Wetter & Angelbedingungen',
    description: 'Vorhersage, Luftdruck, Wind und Beißzeiten für deinen Standort.',
    icon: 'CloudSun',
    page: 'Weather',
    requiredLevel: 3,
    requiredPlan: 'basic',
    category: 'planung',
  },
  {
    id: 'trip-planner',
    name: 'Angelkalender & Trips',
    description: 'Touren planen, Termine setzen, Ausrüstung je Trip vorbereiten.',
    icon: 'CalendarDays',
    page: 'TripPlanner',
    requiredLevel: 3,
    requiredPlan: 'basic',
    category: 'planung',
  },

  // ── Level 4 — Petri-Pilot ─────────────────────────────────────────────────
  {
    id: 'tackle-management',
    name: 'Tackle-Management',
    description: 'Ruten, Rollen, Schnüre und Köder verwalten — inklusive Packlisten.',
    icon: 'Backpack',
    page: 'Gear',
    requiredLevel: 4,
    requiredPlan: 'basic',
    category: 'ausruestung',
  },
  {
    id: 'live-trip',
    name: 'Live-Tour',
    description: 'Laufende Session mit Strecke, Fängen und Bedingungen mitschreiben.',
    icon: 'Navigation',
    page: 'LiveTrip',
    requiredLevel: 4,
    requiredPlan: null,
    category: 'planung',
  },

  // ── Level 5 — Köder-Kapitän ───────────────────────────────────────────────
  {
    id: 'bait-mixer',
    name: 'KI-Köder-Mischer',
    description: 'Futter- und Köder-Rezepte passend zu Gewässer, Zielfisch und Jahreszeit.',
    icon: 'FlaskConical',
    page: 'BaitMixer',
    requiredLevel: 5,
    requiredPlan: 'basic',
    category: 'ki',
  },
  {
    id: 'lure-3d',
    name: '3D-Köderführung',
    description: 'Kunstköder in 3D mit echtem Laufverhalten: Jiggen, Faulenzen, Twitchen.',
    icon: 'Box',
    page: 'Koeder3D',
    requiredLevel: 5,
    requiredPlan: null,
    category: 'ausruestung',
  },

  // ── Level 6 — Gewässer-Guru ───────────────────────────────────────────────
  {
    id: 'water-analysis',
    name: 'Satelliten-Gewässeranalyse',
    description: 'Wassertemperatur, Pegel und Trübung aus echten Messdaten für dein Gewässer.',
    icon: 'Waves',
    page: 'WaterAnalysis',
    requiredLevel: 6,
    requiredPlan: 'basic',
    category: 'ki',
  },
  {
    id: 'bathymetry',
    name: 'Tiefenkarten-Crowdsourcing',
    description: 'Tiefenprofile aufzeichnen, teilen und bathymetrische Karten erzeugen.',
    icon: 'Layers',
    page: 'BathymetricCrowdsourcing',
    requiredLevel: 6,
    requiredPlan: 'pro',
    category: 'spots',
  },

  // ── Level 7 — Biss-Professor ──────────────────────────────────────────────
  {
    id: 'ai-camera',
    name: 'KI-Kamera & Bisserkennung',
    description: 'Fischarten aus dem Foto bestimmen und Bissphasen automatisch erkennen.',
    icon: 'ScanEye',
    page: 'AI',
    requiredLevel: 7,
    requiredPlan: 'elite',
    category: 'ki',
  },
  {
    id: 'catch-cam',
    name: 'CatchCam',
    description: 'Live-Kameraanalyse mit Vermessung und direkter Übernahme ins Fangbuch.',
    icon: 'Camera',
    page: 'CatchCam',
    requiredLevel: 7,
    requiredPlan: 'elite',
    category: 'ki',
  },

  // ── Level 8 — Spot-Sherlock ───────────────────────────────────────────────
  {
    id: 'ar-water',
    name: 'AR-Gewässeransicht',
    description: 'Unterwasser-Struktur des Spots als 3D-Ansicht über die Kamera legen.',
    icon: 'Boxes',
    page: 'ARView',
    requiredLevel: 8,
    requiredPlan: 'pro',
    category: 'spots',
  },
  {
    id: 'ar-knots',
    name: 'AR-Knoten-Assistent',
    description: 'Angelknoten Schritt für Schritt in AR mitbinden — mit Kontrolle je Zug.',
    icon: 'Link2',
    page: 'ARKnotenAssistent',
    requiredLevel: 8,
    requiredPlan: null,
    category: 'ausruestung',
  },

  // ── Level 9 — Angel-Legende ───────────────────────────────────────────────
  {
    id: 'pro-analytics',
    name: 'Profi-Analyse',
    description: 'Zeitreihen, Trends und Korrelationen zwischen Bedingungen und Fangerfolg.',
    icon: 'TrendingUp',
    page: 'Analysis',
    requiredLevel: 9,
    requiredPlan: 'elite',
    category: 'ki',
  },
  {
    id: 'community-rank',
    name: 'Community-Ranking',
    description: 'Tages-, Monats- und All-Time-Rangliste gegen andere Angler.',
    icon: 'Trophy',
    page: 'Rank',
    requiredLevel: 9,
    requiredPlan: 'pro',
    category: 'community',
  },

  // ── Level 10 — Meisterangler (Endgame) ────────────────────────────────────
  {
    // Bewusst NICHT KiBuddyBeta: diese Seite deckt bereits das freie Basis-Tool
    // 'ki-buddy' ab — eine Freischaltung darauf wäre wirkungslos. VoiceChat ist
    // die eigenständige Echtzeit-Sprachsteuerung (POST /api/ai/realtime-session).
    id: 'voice-control',
    name: 'Master Voice-Control',
    description: 'Freihändige Echtzeit-Sprachsteuerung: fragen, protokollieren und navigieren im Drill.',
    icon: 'Mic',
    page: 'VoiceChat',
    requiredLevel: 10,
    requiredPlan: null,
    category: 'ki',
    isEndgame: true,
  },
  {
    id: 'device-hub',
    name: 'Profi-Geräte-Hub',
    description: 'Echolote, Waagen, Rollen und Sensoren per Bluetooth koppeln und auslesen.',
    icon: 'Bluetooth',
    page: 'Devices',
    requiredLevel: 10,
    requiredPlan: 'pro',
    category: 'ausruestung',
    isEndgame: true,
  },
];

export const TOOL_BY_ID = TOOLS.reduce((acc, tool) => {
  acc[tool.id] = tool;
  return acc;
}, {});

/** Seiten-Schlüssel -> Tools, die diese Seite abdecken. */
export const TOOLS_BY_PAGE = TOOLS.reduce((acc, tool) => {
  (acc[tool.page] = acc[tool.page] || []).push(tool);
  return acc;
}, {});

/** Alle Tools, die genau bei diesem Level neu dazukommen. */
export function toolsUnlockedAtLevel(level) {
  return TOOLS.filter((t) => !t.alwaysAvailable && t.requiredLevel === level);
}

/** Alle Tools, die bei einem Level-Sprung von -> nach neu dazukommen. */
export function toolsUnlockedBetween(fromLevel, toLevel) {
  const from = Number.isFinite(fromLevel) ? fromLevel : 1;
  const to = Number.isFinite(toLevel) ? toLevel : 1;
  if (to <= from) return [];
  return TOOLS.filter((t) => !t.alwaysAvailable && t.requiredLevel > from && t.requiredLevel <= to);
}

// ── Freischaltlogik ──────────────────────────────────────────────────────────

// Plan-Rangfolge, gespiegelt aus backend/src/lib/planResolver.js bzw.
// src/components/premium/planHierarchy.jsx. Bewusst hier dupliziert, damit
// dieses Modul importfrei bleibt; die Werte sind identisch und werden von
// toolUnlocks.test.js gegen beide Quellen geprüft.
export const PLAN_RANK = {
  free: 0,
  basic: 1,
  pro: 2,
  elite: 3,
  ultimate: 3,
  friends_monthly: 3,
  trial_10_10: 3, // Bezahltes 10-Tage-Einmalprodukt = Ultimate-Niveau
  friends: 4,
};

function planRank(planId) {
  return PLAN_RANK[planId] ?? 0;
}

/**
 * Entscheidet, ob ein Tool freigeschaltet ist — die eine Regel für Client und
 * Server.
 *
 * @param {string} toolId
 * @param {{ level?: number, purchasedTools?: string[], planId?: string }} state
 * @returns {{ unlocked: boolean, reason: 'always'|'level'|'purchase'|'plan'|'locked', tool: object|null }}
 */
export function evaluateToolAccess(toolId, state = {}) {
  const tool = TOOL_BY_ID[toolId] || null;
  if (!tool) return { unlocked: false, reason: 'locked', tool: null };

  if (tool.alwaysAvailable) return { unlocked: true, reason: 'always', tool };

  const level = Number.isFinite(state.level) ? state.level : 1;
  if (level >= tool.requiredLevel) return { unlocked: true, reason: 'level', tool };

  const purchased = Array.isArray(state.purchasedTools) ? state.purchasedTools : [];
  if (purchased.includes(tool.id)) return { unlocked: true, reason: 'purchase', tool };

  // Ein aktiver Plan, der die Seite ohnehin abdeckt, erfüllt das Level-Gate.
  // Ohne diese Regel würden zahlende Abonnenten durch das neue System Zugriff
  // verlieren, den sie bereits gekauft haben.
  if (tool.requiredPlan && planRank(state.planId) >= planRank(tool.requiredPlan)) {
    return { unlocked: true, reason: 'plan', tool };
  }

  return { unlocked: false, reason: 'locked', tool };
}

/** Kurzform für Aufrufer, die nur ein Boolean brauchen. */
export function isToolUnlocked(toolId, state) {
  return evaluateToolAccess(toolId, state).unlocked;
}

/**
 * Vollständiger Katalog-Status für einen Nutzer — die Antwortform von
 * GET /api/progression/tools.
 */
export function buildToolStatusList(state = {}) {
  return TOOLS.map((tool) => {
    const access = evaluateToolAccess(tool.id, state);
    return {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      icon: tool.icon,
      page: tool.page,
      category: tool.category,
      category_label: TOOL_CATEGORIES[tool.category] || tool.category,
      required_level: tool.requiredLevel,
      required_plan: tool.requiredPlan || null,
      always_available: !!tool.alwaysAvailable,
      is_endgame: !!tool.isEndgame,
      price_cents: tool.alwaysAvailable ? 0 : TOOL_UNLOCK_PRICE_CENTS,
      unlocked: access.unlocked,
      unlock_reason: access.reason,
    };
  });
}

/**
 * Die nächsten noch gesperrten Tools (aufsteigend nach Level) — für die
 * „Als Nächstes"-Anzeige im Profil.
 */
export function nextLockedTools(state = {}, limit = 4) {
  return buildToolStatusList(state)
    .filter((t) => !t.unlocked)
    .sort((a, b) => a.required_level - b.required_level)
    .slice(0, Math.max(0, limit));
}

/** Sperrbare Tools (alles außer Basis) — z. B. für die Katalog-Übersicht. */
export function unlockableTools() {
  return TOOLS.filter((t) => !t.alwaysAvailable);
}
