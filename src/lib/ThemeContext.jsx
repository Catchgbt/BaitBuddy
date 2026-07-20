import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { auth } from '@/api/auth';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');
  const [isLoading, setIsLoading] = useState(true);
  const [batteryMode, setBatteryMode] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const settingsRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const user = await auth.me();
        if (user?.settings) {
          settingsRef.current = user.settings;
          const savedTheme = user.settings.theme || 'dark';
          const savedBatteryMode = user.settings.battery_mode || false;
          const savedAnimations = user.settings.animations_enabled !== false;

          setTheme(savedTheme);
          setBatteryMode(savedBatteryMode);
          setAnimationsEnabled(savedAnimations);
          applyTheme(savedTheme, savedBatteryMode, savedAnimations);
        } else {
          applyTheme('dark', false, true);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Theme-Einstellungen:', error);
        applyTheme('dark', false, true);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const applyTheme = (selectedTheme, batteryModeActive, animationsActive) => {
    const html = document.documentElement;

    if (selectedTheme === 'light') {
      html.classList.remove('dark');
      html.classList.add('light');
    } else {
      html.classList.add('dark');
      html.classList.remove('light');
    }

    if (batteryModeActive) {
      html.classList.add('battery-mode');
    } else {
      html.classList.remove('battery-mode');
    }

    if (!animationsActive) {
      html.classList.add('no-animations');
    } else {
      html.classList.remove('no-animations');
    }
  };

  const saveSettings = async (patch, rollback) => {
    try {
      const merged = { ...settingsRef.current, ...patch };
      await auth.updateMe({ settings: merged });
      settingsRef.current = merged;
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
      rollback();
    }
  };

  const toggleTheme = async (newTheme = null) => {
    const previousTheme = theme;
    const selectedTheme = newTheme || (theme === 'dark' ? 'light' : 'dark');
    setTheme(selectedTheme);
    applyTheme(selectedTheme, batteryMode, animationsEnabled);

    await saveSettings({ theme: selectedTheme }, () => {
      setTheme(previousTheme);
      applyTheme(previousTheme, batteryMode, animationsEnabled);
    });
  };

  const toggleBatteryMode = async (enabled = null) => {
    const previousBatteryMode = batteryMode;
    const newBatteryMode = enabled !== null ? enabled : !batteryMode;
    setBatteryMode(newBatteryMode);
    applyTheme(theme, newBatteryMode, animationsEnabled);

    await saveSettings({ battery_mode: newBatteryMode }, () => {
      setBatteryMode(previousBatteryMode);
      applyTheme(theme, previousBatteryMode, animationsEnabled);
    });
  };

  const toggleAnimations = async (enabled = null) => {
    const previousAnimationsEnabled = animationsEnabled;
    const newAnimationsEnabled = enabled !== null ? enabled : !animationsEnabled;
    setAnimationsEnabled(newAnimationsEnabled);
    applyTheme(theme, batteryMode, newAnimationsEnabled);

    await saveSettings({ animations_enabled: newAnimationsEnabled }, () => {
      setAnimationsEnabled(previousAnimationsEnabled);
      applyTheme(theme, batteryMode, previousAnimationsEnabled);
    });
  };

  const value = {
    theme,
    setTheme: toggleTheme,
    batteryMode,
    setBatteryMode: toggleBatteryMode,
    animationsEnabled,
    setAnimationsEnabled: toggleAnimations,
    isLoading
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
