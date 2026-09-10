import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// Der AuthContext liegt in src/lib/, nicht neben dieser Datei — src/contexts/
// enthaelt sonst nichts. Der relative Import './AuthContext' liess den Build
// scheitern ("Could not resolve ./AuthContext").
import { useAuth } from '@/lib/AuthContext';
import { progression } from '@/api/frontendClient';

// Der Tour-Zustand laeuft ueber das Backend (GET/PATCH /api/progression/tour),
// nicht ueber einen direkten supabase.from('users')-Zugriff.
//
// Der urspruengliche Weg konnte nicht funktionieren: auf public.users ist RLS
// aktiv und es existiert keine einzige Policy, also verweigert Postgres Lesen
// und Schreiben. `tutorial_completed` wurde damit nie wahr und die Tour startete
// bei jedem Dashboard-Besuch von vorn. Dazu kommt, dass die App ihre
// Nutzerdaten in den Auth-Metadaten fuehrt (Plan, Referral, Angel-Level) und
// das Frontend sonst nirgends direkt mit Supabase spricht — der Datenzugriff
// laeuft ueber frontendClient gegen das Backend.

const GuidedTourContext = createContext();

export function GuidedTourProvider({ children }) {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [userLevel, setUserLevel] = useState('beginner');
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Lade User-Level und Tour-Status beim Mount oder User-Wechsel
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const loadUserTourStatus = async () => {
      try {
        const data = await progression.tour();
        setUserLevel(data?.user_level || 'beginner');
        setTutorialCompleted(data?.completed === true);
        setCurrentStep(data?.step || 0);
      } catch (err) {
        // Offline oder Serverfehler: Startwerte behalten. Die Tour dann NICHT
        // automatisch anzustossen ist die freundlichere Annahme — sonst laeuft
        // sie bei jedem Verbindungsproblem erneut los.
        console.error('[GuidedTourContext] Tour-Status nicht ladbar:', err?.message || err);
        setTutorialCompleted(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserTourStatus();
  }, [user]);

  // Speichere Tour-Fortschritt in Supabase
  const updateTourStatus = useCallback(
    async (step, completed = false) => {
      if (!user) return;
      try {
        await progression.updateTour({ step, completed });
      } catch (err) {
        // Ein verlorener Fortschritt darf die laufende Tour nicht abbrechen.
        console.error('[GuidedTourContext] Tour-Status nicht speicherbar:', err?.message || err);
      }
    },
    [user]
  );

  // Navigiere zum nächsten Schritt
  const nextStep = useCallback(
    (newStep) => {
      setCurrentStep(newStep);
      updateTourStatus(newStep, false);
    },
    [updateTourStatus]
  );

  // Beende die Tour
  const completeTour = useCallback(async () => {
    setTutorialCompleted(true);
    setIsActive(false);
    await updateTourStatus(0, true);
  }, [updateTourStatus]);

  // Überspringe die Tour
  const skipTour = useCallback(async () => {
    setIsActive(false);
    setTutorialCompleted(true);
    await updateTourStatus(0, true);
  }, [updateTourStatus]);

  // Starte/Stoppe die Tour
  const startTour = useCallback(() => {
    if (!tutorialCompleted) {
      setCurrentStep(0);
      setIsActive(true);
    }
  }, [tutorialCompleted]);

  const stopTour = useCallback(() => {
    setIsActive(false);
  }, []);

  // Setze User-Level (Admin/Test)
  const setUserLevelDirectly = useCallback(
    async (level) => {
      if (!user) return;

      setUserLevel(level);
      try {
        await progression.updateTour({ user_level: level });
      } catch (err) {
        console.error('[GuidedTourContext] Level nicht speicherbar:', err?.message || err);
      }
    },
    [user]
  );

  // Resetiere Tour (Testing)
  const resetTour = useCallback(async () => {
    if (!user) return;

    setCurrentStep(0);
    setTutorialCompleted(false);
    setIsActive(false);
    await updateTourStatus(0, false);
  }, [user, updateTourStatus]);

  const value = {
    // State
    isActive,
    currentStep,
    userLevel,
    tutorialCompleted,
    isLoading,

    // Actions
    startTour,
    stopTour,
    nextStep,
    completeTour,
    skipTour,
    setUserLevelDirectly,
    resetTour,
  };

  return (
    <GuidedTourContext.Provider value={value}>
      {children}
    </GuidedTourContext.Provider>
  );
}

export function useGuidedTour() {
  const context = useContext(GuidedTourContext);
  if (!context) {
    throw new Error('useGuidedTour must be used inside GuidedTourProvider');
  }
  return context;
}
