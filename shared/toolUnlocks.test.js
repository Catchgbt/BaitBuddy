import { describe, it, expect } from 'vitest';
import { PLAN_RANK as BACKEND_PLAN_RANK } from '../backend/src/lib/planResolver.js';
import { PLAN_HIERARCHY } from '../src/components/premium/planHierarchy.jsx';
import {
  LEVEL_XP_THRESHOLDS,
  LEVELS,
  MAX_LEVEL,
  PRESTIGE_XP_STEP,
  PLAN_RANK,
  TOOLS,
  TOOL_BY_ID,
  TOOL_UNLOCK_PRICE_CENTS,
  buildToolStatusList,
  evaluateToolAccess,
  googlePlayProductIdForTool,
  levelForXp,
  nextLockedTools,
  prestigeForXp,
  progressForXp,
  toolIdFromGooglePlayProductId,
  toolsUnlockedAtLevel,
  toolsUnlockedBetween,
  unlockableTools,
} from './toolUnlocks.js';

describe('Level-Kurve', () => {
  it('Schwellen sind streng monoton und starten bei 0', () => {
    expect(LEVEL_XP_THRESHOLDS[0]).toBe(0);
    for (let i = 1; i < LEVEL_XP_THRESHOLDS.length; i += 1) {
      expect(LEVEL_XP_THRESHOLDS[i]).toBeGreaterThan(LEVEL_XP_THRESHOLDS[i - 1]);
    }
  });

  it('LEVELS deckt sich mit den Schwellen', () => {
    expect(LEVELS).toHaveLength(MAX_LEVEL);
    LEVELS.forEach((entry, index) => {
      expect(entry.level).toBe(index + 1);
      expect(entry.minXp).toBe(LEVEL_XP_THRESHOLDS[index]);
      expect(entry.rank).toBeTruthy();
    });
  });

  it('levelForXp trifft die Grenzen exakt', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(249)).toBe(1);
    expect(levelForXp(250)).toBe(2);
    expect(levelForXp(1799)).toBe(4);
    expect(levelForXp(1800)).toBe(5);
    expect(levelForXp(9600)).toBe(10);
    expect(levelForXp(999999)).toBe(10);
  });

  it('levelForXp behandelt ungültige Eingaben als 0 XP', () => {
    expect(levelForXp(undefined)).toBe(1);
    expect(levelForXp(NaN)).toBe(1);
    expect(levelForXp(-500)).toBe(1);
  });

  it('progressForXp liefert Restbedarf bis zum nächsten Level', () => {
    const p = progressForXp(1250);
    expect(p.level).toBe(4);
    expect(p.rank).toBe('Petri-Pilot');
    expect(p.next_level_xp).toBe(1800);
    expect(p.xp_to_next).toBe(550);
    expect(p.progress).toBeCloseTo((1250 - 1100) / (1800 - 1100), 5);
    expect(p.is_max_level).toBe(false);
  });

  it('zählt nach Level 10 als Prestige weiter', () => {
    expect(prestigeForXp(9600)).toBe(0);
    expect(prestigeForXp(9600 + PRESTIGE_XP_STEP)).toBe(1);
    expect(prestigeForXp(9600 + 2 * PRESTIGE_XP_STEP + 10)).toBe(2);

    const p = progressForXp(9600 + PRESTIGE_XP_STEP + 500);
    expect(p.level).toBe(10);
    expect(p.prestige).toBe(1);
    expect(p.is_max_level).toBe(true);
    expect(p.xp_to_next).toBe(PRESTIGE_XP_STEP - 500);
  });
});

describe('Tool-Katalog', () => {
  it('hat eindeutige IDs und Pflichtfelder', () => {
    const ids = new Set();
    for (const tool of TOOLS) {
      expect(ids.has(tool.id)).toBe(false);
      ids.add(tool.id);
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.page).toBeTruthy();
      expect(tool.icon).toBeTruthy();
      expect(tool.requiredLevel).toBeGreaterThanOrEqual(1);
      expect(tool.requiredLevel).toBeLessThanOrEqual(MAX_LEVEL);
    }
  });

  it('schaltet je Level 2..10 genau zwei Tools frei', () => {
    for (let level = 2; level <= MAX_LEVEL; level += 1) {
      expect(toolsUnlockedAtLevel(level)).toHaveLength(2);
    }
    expect(unlockableTools()).toHaveLength((MAX_LEVEL - 1) * 2);
  });

  it('Basis-Tools hängen an Level 1 und sind nie sperrbar', () => {
    const base = TOOLS.filter((t) => t.alwaysAvailable);
    expect(base.length).toBeGreaterThan(0);
    for (const tool of base) {
      expect(tool.requiredLevel).toBe(1);
      expect(evaluateToolAccess(tool.id, { level: 1, planId: 'free' }).unlocked).toBe(true);
    }
    // Profil und Einstellungen müssen laut Produktvorgabe immer erreichbar sein.
    expect(TOOL_BY_ID.profile.alwaysAvailable).toBe(true);
    expect(TOOL_BY_ID.settings.alwaysAvailable).toBe(true);
  });

  it('toolsUnlockedBetween liefert nur die neu erreichten Tools', () => {
    const jump = toolsUnlockedBetween(4, 6);
    expect(jump.map((t) => t.id).sort()).toEqual(
      [...toolsUnlockedAtLevel(5), ...toolsUnlockedAtLevel(6)].map((t) => t.id).sort()
    );
    expect(toolsUnlockedBetween(6, 6)).toHaveLength(0);
    expect(toolsUnlockedBetween(7, 3)).toHaveLength(0);
  });

  it('kein sperrbares Tool teilt sich die Seite mit einem freien Basis-Tool', () => {
    // Sonst wäre die Freischaltung wirkungslos: die Seite ist über das
    // Basis-Tool ohnehin erreichbar.
    const basePages = new Set(TOOLS.filter((t) => t.alwaysAvailable).map((t) => t.page));
    for (const tool of unlockableTools()) {
      expect(basePages.has(tool.page)).toBe(false);
    }
  });

  it('jede Seite gehört zu höchstens einem sperrbaren Tool', () => {
    const pages = unlockableTools().map((t) => t.page);
    expect(new Set(pages).size).toBe(pages.length);
  });

  it('Play-SKU-Mapping ist verlustfrei', () => {
    for (const tool of unlockableTools()) {
      const sku = googlePlayProductIdForTool(tool.id);
      expect(sku.startsWith('baitbuddy_tool_')).toBe(true);
      expect(toolIdFromGooglePlayProductId(sku)).toBe(tool.id);
    }
    expect(toolIdFromGooglePlayProductId('baitbuddy_basic_monthly')).toBeNull();
    expect(toolIdFromGooglePlayProductId('baitbuddy_tool_gibt_es_nicht')).toBeNull();
  });
});

describe('Freischaltlogik (ODER-Regel)', () => {
  it('Level erreicht schaltet frei', () => {
    const r = evaluateToolAccess('water-analysis', { level: 6, planId: 'free' });
    expect(r.unlocked).toBe(true);
    expect(r.reason).toBe('level');
  });

  it('Kauf schaltet unabhängig vom Level frei', () => {
    const r = evaluateToolAccess('water-analysis', {
      level: 2,
      planId: 'free',
      purchasedTools: ['water-analysis'],
    });
    expect(r.unlocked).toBe(true);
    expect(r.reason).toBe('purchase');
  });

  it('bestehendes Abo umgeht das Level-Gate (keine Regression für Zahlende)', () => {
    const r = evaluateToolAccess('catch-cam', { level: 1, planId: 'elite' });
    expect(r.unlocked).toBe(true);
    expect(r.reason).toBe('plan');
  });

  it('zu niedriger Plan hilft nicht', () => {
    const r = evaluateToolAccess('catch-cam', { level: 1, planId: 'basic' });
    expect(r.unlocked).toBe(false);
    expect(r.reason).toBe('locked');
  });

  it('Tools ohne Plan-Anforderung sind rein level-/kaufgesteuert', () => {
    expect(evaluateToolAccess('fishing-map', { level: 1, planId: 'friends' }).unlocked).toBe(false);
    expect(evaluateToolAccess('fishing-map', { level: 2, planId: 'free' }).unlocked).toBe(true);
  });

  it('unbekannte Tool-IDs bleiben gesperrt', () => {
    const r = evaluateToolAccess('gibt-es-nicht', { level: 10, planId: 'friends' });
    expect(r.unlocked).toBe(false);
    expect(r.tool).toBeNull();
  });
});

describe('Katalog-Status', () => {
  it('nennt Preis nur für sperrbare Tools', () => {
    const list = buildToolStatusList({ level: 1, planId: 'free' });
    for (const entry of list) {
      expect(entry.price_cents).toBe(entry.always_available ? 0 : TOOL_UNLOCK_PRICE_CENTS);
    }
  });

  it('nextLockedTools sortiert nach Level und respektiert das Limit', () => {
    const next = nextLockedTools({ level: 1, planId: 'free' }, 3);
    expect(next).toHaveLength(3);
    expect(next.every((t) => !t.unlocked)).toBe(true);
    expect(next[0].required_level).toBeLessThanOrEqual(next[2].required_level);
  });

  it('Level 10 mit Ultimate schaltet den gesamten Katalog frei', () => {
    const list = buildToolStatusList({ level: 10, planId: 'elite' });
    expect(list.every((t) => t.unlocked)).toBe(true);
  });
});

describe('Plan-Rangfolge bleibt mit Backend und Frontend synchron', () => {
  it('stimmt mit planResolver.js überein', () => {
    expect(PLAN_RANK).toEqual(BACKEND_PLAN_RANK);
  });

  it('stimmt mit planHierarchy.jsx überein', () => {
    for (const [planId, rank] of Object.entries(PLAN_HIERARCHY)) {
      expect(PLAN_RANK[planId]).toBe(rank);
    }
  });

  it('jede requiredPlan-Angabe ist ein bekannter Plan', () => {
    for (const tool of TOOLS) {
      if (tool.requiredPlan) expect(PLAN_RANK[tool.requiredPlan]).toBeGreaterThan(0);
    }
  });
});
