import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';

export default function AppearanceSettings() {
  const { theme, setTheme, animationsEnabled, setAnimationsEnabled } = useTheme();

  const themeOptions = [
    {
      id: 'light',
      label: 'Light Mode',
      description: 'Helles Design für tagsüber',
      icon: Sun
    },
    {
      id: 'dark',
      label: 'Dark Mode',
      description: 'Dunkles Design für Nacht',
      icon: Moon
    }
  ];

  return (
    <Card className="glass-morphism border-gray-800 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)] flex items-center gap-2">
          <Monitor className="w-5 h-5 text-emerald-400" />
          Darstellung
        </CardTitle>
        <p className="text-gray-400 text-sm mt-2">
          Passe das Aussehen der App an deine Vorlieben an
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Selection */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Design-Modus</h3>
          <div className="grid grid-cols-2 gap-3">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button type="button"
                  key={option.id}
                  onClick={() => setTheme(option.id)}
                  className={`p-4 rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                    theme === option.id
                      ? 'bg-gradient-to-br from-cyan-600 to-cyan-700 border-2 border-cyan-400 shadow-lg shadow-cyan-500/50'
                      : 'bg-gray-800/50 border-2 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${theme === option.id ? 'text-white' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${theme === option.id ? 'text-white' : 'text-gray-300'}`}>
                    {option.label}
                  </span>
                  <span className={`text-xs ${theme === option.id ? 'text-cyan-100' : 'text-gray-500'}`}>
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Animations Toggle */}
        <div className="border-t border-gray-800 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-200">Animationen</p>
              <p className="text-xs text-gray-400 mt-1">
                Aktiviere/deaktiviere sanfte Übergänge und Bewegungen
              </p>
            </div>
            <Switch
              checked={animationsEnabled}
              onCheckedChange={(checked) => setAnimationsEnabled(checked)}
              aria-label="Animationen umschalten"
            />
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 text-sm text-cyan-300">
          <span className="ml-2">Änderungen werden automatisch gespeichert und in allen Fenstern synchronisiert</span>
        </div>
      </CardContent>
    </Card>
  );
}
