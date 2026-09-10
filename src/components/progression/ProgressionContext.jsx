import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { progression as progressionApi } from '@/api/frontendClient';
import { evaluateToolAccess, TOOLS_BY_PAGE } from '@shared/toolUnlocks';

// Angel-Level, XP und freigeschaltete Tools für die gesamte App.
// =============================================================================
// Der Server (GET /api/progression/me) ist die Autorität. Dieser Context hält
// die Antwort vor, damit Sidebar, Guard, Dashboard und Profil nicht jeweils
// eigene Requests feuern, und rechnet mit derselben geteilten Logik
// (shared/toolUnlocks.js) sofort weiter, wenn sich lokal etwas ändert.

const ProgressionContext = createContext(null);

// Ohne Provider (z. B. Gastmodus-Zweig im Layout) soll nichts krachen: dann
// gilt der Startzustand — Basis-Tools frei, alles andere gesperrt.
const FALLBACK = {
  loading: false,
  error: null,
  level: 1,
  rank: 'Angelküken',
  totalXp: 0,
  planId: 'free',
  tools: [],
  unlockedToolIds: [],
  purchasedToolIds: [],
  nextUnlocks: [],
  levelInfo: null,
  pendingLevelUp: null,
  incompleteSources: [],
};

export function useProgression() {
  return useContext(ProgressionContext) || {
    ...FALLBACK,
    isToolUnlocked: (toolId) => evaluateToolAccess(toolId, { level: 1, planId: 'free' }).unlocked,
    getToolAccess: (toolId) => evaluateToolAccess(toolId, { level: 1, planId: 'free' }),
    isPageUnlocked: () => true,
    getToolForPage: () => null,
    reload: () => Promise.resolve(),
    acknowledgeLevelUp: () => Promise.resolve(),
    markToolUnlocked: () => {},
  };
}

export function ProgressionProvider({ children }) {
  const [state, setState] = useState({ ...FALLBACK, loading: true });
  // Verhindert parallele Ladevorgänge (Mount + 'progression-updated'-Event).
  const inFlight = useRef(false);
  const mounted = useRef(true);

  const load = useCallback(async ({ refresh = false } = {}) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const data = await progressionApi.me(refresh);
      if (!mounted.current) return;
      setState({
        loading: false,
        error: null,
        level: data?.level?.current ?? 1,
        rank: data?.level?.rank ?? FALLBACK.rank,
        totalXp: data?.xp?.total ?? 0,
        planId: data?.plan_id ?? 'free',
        tools: Array.isArray(data?.tools) ? data.tools : [],
        unlockedToolIds: Array.isArray(data?.unlocked_tools) ? data.unlocked_tools : [],
        purchasedToolIds: Array.isArray(data?.purchased_tools) ? data.purchased_tools : [],
        nextUnlocks: Array.isArray(data?.next_unlocks) ? data.next_unlocks : [],
        levelInfo: data?.level ?? null,
        pendingLevelUp: data?.pending_level_up ?? null,
        incompleteSources: Array.isArray(data?.xp?.incomplete_sources) ? data.xp.incomplete_sources : [],
      });
    } catch (error) {
      if (!mounted.current) return;
      // Offline oder nicht angemeldet: Startzustand statt Dauer-Spinner. Der
      // Server prüft ohnehin bei jedem echten Zugriff erneut.
      setState({ ...FALLBACK, error: error?.message || 'Fortschritt nicht ladbar' });
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    const onUpdate = () => load({ refresh: true });
    window.addEventListener('progression-updated', onUpdate);
    return () => {
      mounted.current = false;
      window.removeEventListener('progression-updated', onUpdate);
    };
  }, [load]);

  // Nach einem Kauf sofort freischalten, ohne auf den nächsten Serverabruf zu
  // warten. Der Server hat den Kauf zu diesem Zeitpunkt bereits eingetragen.
  const markToolUnlocked = useCallback((toolId) => {
    setState((prev) => {
      if (prev.unlockedToolIds.includes(toolId)) return prev;
      return {
        ...prev,
        unlockedToolIds: [...prev.unlockedToolIds, toolId],
        purchasedToolIds: prev.purchasedToolIds.includes(toolId)
          ? prev.purchasedToolIds
          : [...prev.purchasedToolIds, toolId],
        tools: prev.tools.map((t) =>
          t.id === toolId ? { ...t, unlocked: true, unlock_reason: 'purchase' } : t
        ),
        nextUnlocks: prev.nextUnlocks.filter((t) => t.id !== toolId),
      };
    });
  }, []);

  const acknowledgeLevelUp = useCallback(async (level) => {
    setState((prev) => ({ ...prev, pendingLevelUp: null }));
    try {
      await progressionApi.markLevelSeen(level);
    } catch {
      // Quittierung ist reine Anzeige-Kosmetik — schlägt sie fehl, erscheint
      // die Animation beim nächsten Start erneut. Kein Nutzer-Fehler nötig.
    }
  }, []);

  const value = useMemo(() => {
    const accessState = {
      level: state.level,
      planId: state.planId,
      purchasedTools: state.unlockedToolIds,
    };

    const getToolAccess = (toolId) => evaluateToolAccess(toolId, accessState);

    // Eine Seite gilt als frei, wenn mindestens ein Tool, das auf sie zeigt,
    // freigeschaltet ist. Seiten ohne Katalog-Eintrag sind nie gesperrt.
    const getToolForPage = (pageName) => {
      const candidates = TOOLS_BY_PAGE[pageName];
      if (!candidates || candidates.length === 0) return null;
      const unlocked = candidates.find((t) => getToolAccess(t.id).unlocked);
      if (unlocked) return unlocked;
      // Sonst das mit der niedrigsten Hürde — das ist das nächste Ziel.
      return [...candidates].sort((a, b) => a.requiredLevel - b.requiredLevel)[0];
    };

    return {
      ...state,
      isToolUnlocked: (toolId) => getToolAccess(toolId).unlocked,
      getToolAccess,
      getToolForPage,
      isPageUnlocked: (pageName) => {
        const candidates = TOOLS_BY_PAGE[pageName];
        if (!candidates || candidates.length === 0) return true;
        return candidates.some((t) => getToolAccess(t.id).unlocked);
      },
      reload: load,
      acknowledgeLevelUp,
      markToolUnlocked,
    };
  }, [state, load, acknowledgeLevelUp, markToolUnlocked]);

  return <ProgressionContext.Provider value={value}>{children}</ProgressionContext.Provider>;
}
