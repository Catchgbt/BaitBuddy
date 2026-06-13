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
  const [theme, setTheme] = useState('dark');
  const [isLoading, setIsLoading] = useState(true);
  const [batteryMode, setBatteryMode] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const user = await auth.me();
        if (user?.settings) {
          const savedTheme = user.settings.theme || 'dark';
          const batteryMode = user.settings.battery_mode || false;
          const animationsEnabled = user.settings.animations_enabled !== false;

          setTheme(savedTheme);
          setBatteryMode(batteryMode);
          setAnimationsEnabled(animationsEnabled);
          applyTheme(savedTheme, batteryMode, animationsEnabled);
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

  const toggleTheme = async (newTheme = null) => {
    const selectedTheme = newTheme || (theme === 'dark' ? 'light' : 'dark');
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
    }
  };

  const toggleBatteryMode = async (enabled = null) => {
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
    }
  };

  const toggleAnimations = async (enabled = null) => {
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
