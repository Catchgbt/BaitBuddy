import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// Der AuthContext liegt in src/lib/, nicht neben dieser Datei — src/contexts/
// enthaelt sonst nichts. Der relative Import './AuthContext' liess den Build
// scheitern ("Could not resolve ./AuthContext").
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';

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
        const { data, error } = await supabase
          .from('users')
          .select('user_level,tutorial_completed,guided_tour_step')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('[GuidedTourContext] Error loading status:', error);
          return;
        }

        if (data) {
          setUserLevel(data.user_level || 'beginner');
          setTutorialCompleted(data.tutorial_completed || false);
          setCurrentStep(data.guided_tour_step || 0);
        }
      } catch (err) {
        console.error('[GuidedTourContext] Fetch failed:', err);
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
        const { error } = await supabase
          .from('users')
          .update({
            guided_tour_step: step,
            tutorial_completed: completed,
          })
          .eq('id', user.id);

        if (error) {
          console.error('[GuidedTourContext] Update failed:', error);
        }
      } catch (err) {
        console.error('[GuidedTourContext] Update error:', err);
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
        const { error } = await supabase
          .from('users')
          .update({ user_level: level })
          .eq('id', user.id);

        if (error) {
          console.error('[GuidedTourContext] Level update failed:', error);
        }
      } catch (err) {
        console.error('[GuidedTourContext] Level update error:', err);
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
