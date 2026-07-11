import { useState, useCallback, useEffect, useRef } from 'react';
import { BUDDY_DRAG_DEBOUNCE } from '@/lib/buddyStorageKeys';

const STORAGE_KEYS = {
  WIDGET_POSITION: 'buddy-widget-pos',
  WIDGET_HIDDEN: 'buddy-widget-hidden',
  VOICE_ENABLED: 'buddy-voice-enabled',
  USER_LOCATION: 'userLocation',
};

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

  // Positions-Persistenz gedrosselt: setWidgetPos feuert pro Drag-Frame, ein
  // synchroner localStorage-Write je Frame würde das Ziehen ruckeln lassen.
  // Deshalb wird der Schreibvorgang zentral hier gebündelt (einziger Pfad).
  const posPersistTimerRef = useRef(null);
  useEffect(() => {
    if (posPersistTimerRef.current) {
      clearTimeout(posPersistTimerRef.current);
    }
    posPersistTimerRef.current = setTimeout(() => {
      try {
        if (widgetPos) {
          localStorage.setItem(STORAGE_KEYS.WIDGET_POSITION, JSON.stringify(widgetPos));
        }
      } catch {}
    }, BUDDY_DRAG_DEBOUNCE);

    return () => {
      if (posPersistTimerRef.current) {
        clearTimeout(posPersistTimerRef.current);
      }
    };
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
    userLocation,
    getLocation,
    setLocation: setLocationValue,
  };
}
