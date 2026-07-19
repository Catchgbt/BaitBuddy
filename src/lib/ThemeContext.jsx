import React, { createContext, useContext, useEffect, useState } from 'react';
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
  const [theme, setTheme] = useState('natur');
  const [isLoading, setIsLoading] = useState(true);
  const [batteryMode, setBatteryMode] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const user = await auth.me();
        if (user?.settings) {
          const savedTheme = user.settings.theme || 'natur';
          const batteryMode = user.settings.battery_mode || false;
          const animationsEnabled = user.settings.animations_enabled !== false;

          setTheme(savedTheme);
          setBatteryMode(batteryMode);
          setAnimationsEnabled(animationsEnabled);
          applyTheme(savedTheme, batteryMode, animationsEnabled);
        } else {
          applyTheme('natur', false, true);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Theme-Einstellungen:', error);
        applyTheme('natur', false, true);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const applyTheme = (selectedTheme, batteryModeActive, animationsActive) => {
    const html = document.documentElement;

    html.classList.remove('light', 'dark', 'natur', 'high-contrast');

    if (selectedTheme === 'light') {
      html.classList.add('light');
    } else if (selectedTheme === 'dark') {
      html.classList.add('dark');
    } else if (selectedTheme === 'high-contrast') {
      html.classList.add('high-contrast');
    } else {
      html.classList.add('natur');
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

  const toggleTheme = async (newTheme = null) => {
    const previousTheme = theme;
    const selectedTheme = newTheme;
    setTheme(selectedTheme);
    applyTheme(selectedTheme, batteryMode, animationsEnabled);

    try {
      const user = await auth.me();
      await auth.updateMe({
        settings: {
          ...user?.settings,
          theme: selectedTheme
        }
      });
    } catch (error) {
      console.error('Fehler beim Speichern des Themes:', error);
      setTheme(previousTheme);
      applyTheme(previousTheme, batteryMode, animationsEnabled);
    }
  };

  const toggleBatteryMode = async (enabled = null) => {
    const previousBatteryMode = batteryMode;
    const newBatteryMode = enabled !== null ? enabled : !batteryMode;
    setBatteryMode(newBatteryMode);
    applyTheme(theme, newBatteryMode, animationsEnabled);

    try {
      const user = await auth.me();
      await auth.updateMe({
        settings: {
          ...user?.settings,
          battery_mode: newBatteryMode
        }
      });
    } catch (error) {
      console.error('Fehler beim Speichern des Akku-Spar-Modus:', error);
      setBatteryMode(previousBatteryMode);
      applyTheme(theme, previousBatteryMode, animationsEnabled);
    }
  };

  const toggleAnimations = async (enabled = null) => {
    const previousAnimationsEnabled = animationsEnabled;
    const newAnimationsEnabled = enabled !== null ? enabled : !animationsEnabled;
    setAnimationsEnabled(newAnimationsEnabled);
    applyTheme(theme, batteryMode, newAnimationsEnabled);

    try {
      const user = await auth.me();
      await auth.updateMe({
        settings: {
          ...user?.settings,
          animations_enabled: newAnimationsEnabled
        }
      });
    } catch (error) {
      console.error('Fehler beim Speichern der Animationseinstellungen:', error);
      setAnimationsEnabled(previousAnimationsEnabled);
      applyTheme(theme, batteryMode, previousAnimationsEnabled);
    }
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
