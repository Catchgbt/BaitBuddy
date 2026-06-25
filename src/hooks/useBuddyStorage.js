import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEYS = {
  WIDGET_POSITION: 'buddy-widget-pos',
  VISITED_PAGES: 'buddy-visited-pages',
  WIDGET_HIDDEN: 'buddy-widget-hidden',
  VOICE_ENABLED: 'buddy-voice-enabled',
  USER_LOCATION: 'userLocation',
};

const MAX_VISITED_PAGES = 100;

export function useBuddyStorage() {
  const [widgetPos, setWidgetPos] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.WIDGET_POSITION);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return null;
  });

  const [isWidgetHidden, setIsWidgetHidden] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.WIDGET_HIDDEN) === 'true';
    } catch {
      return false;
    }
  });

  const [isVoiceEnabled, setIsVoiceEnabled] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.VOICE_ENABLED) !== 'false';
    } catch {
      return true;
    }
  });

  const [userLocation, setUserLocation] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_LOCATION);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return null;
  });

  useEffect(() => {
    try {
      if (widgetPos) {
        localStorage.setItem(STORAGE_KEYS.WIDGET_POSITION, JSON.stringify(widgetPos));
      }
    } catch {}
  }, [widgetPos]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WIDGET_HIDDEN, isWidgetHidden ? 'true' : 'false');
    } catch {}
  }, [isWidgetHidden]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.VOICE_ENABLED, isVoiceEnabled ? 'true' : 'false');
    } catch {}
  }, [isVoiceEnabled]);

  useEffect(() => {
    try {
      if (userLocation) {
        localStorage.setItem(STORAGE_KEYS.USER_LOCATION, JSON.stringify(userLocation));
      }
    } catch {}
  }, [userLocation]);

  const getWidgetPos = useCallback(() => widgetPos, [widgetPos]);

  const setWidgetPosValue = useCallback((pos) => {
    setWidgetPos(pos);
  }, []);

  const getVisitedPages = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.VISITED_PAGES) || '[]');
    } catch {
      return [];
    }
  }, []);

  const addVisitedPage = useCallback((page) => {
    try {
      const visited = getVisitedPages();
      if (!visited.includes(page)) {
        visited.push(page);
        localStorage.setItem(STORAGE_KEYS.VISITED_PAGES, JSON.stringify(visited));
      }
    } catch {}
  }, [getVisitedPages]);

  const cleanupVisitedPages = useCallback(() => {
    try {
      const visited = getVisitedPages();
      if (visited.length > MAX_VISITED_PAGES) {
        const trimmed = visited.slice(-MAX_VISITED_PAGES);
        localStorage.setItem(STORAGE_KEYS.VISITED_PAGES, JSON.stringify(trimmed));
      }
    } catch (e) {
      // Nur bei kritischem Fehler löschen (z.B. localStorage voll)
      // Nicht bei JSON-Parse-Fehlern
      if (e instanceof Error && e.message.includes('QuotaExceededError')) {
        try {
          localStorage.removeItem(STORAGE_KEYS.VISITED_PAGES);
        } catch {}
      }
    }
  }, [getVisitedPages]);

  const hideWidget = useCallback(() => {
    setIsWidgetHidden(true);
  }, []);

  const showWidget = useCallback(() => {
    setIsWidgetHidden(false);
  }, []);

  const toggleVoice = useCallback(() => {
    setIsVoiceEnabled(prev => !prev);
  }, []);

  const getLocation = useCallback(() => userLocation, [userLocation]);

  const setLocationValue = useCallback((location) => {
    setUserLocation(location);
  }, []);

  return {
    widgetPos,
    setWidgetPos: setWidgetPosValue,
    getWidgetPos,
    isWidgetHidden,
    hideWidget,
    showWidget,
    isVoiceEnabled,
    toggleVoice,
    getVisitedPages,
    addVisitedPage,
    cleanupVisitedPages,
    userLocation,
    getLocation,
    setLocation: setLocationValue,
  };
}
