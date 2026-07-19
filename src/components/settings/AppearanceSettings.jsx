import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Moon, Sun, Monitor, Leaf, Eye } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';

export default function AppearanceSettings() {
  const { theme, setTheme, animationsEnabled, setAnimationsEnabled } = useTheme();

  const themeOptions = [
    {
      id: 'natur',
      label: 'Natur-Modus',
      description: 'Grün/Teal — für Angler',
      icon: Leaf,
      badge: 'Standard'
    },
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
    },
    {
      id: 'high-contrast',
      label: 'High-Contrast',
      description: 'Maximale Barrierefreiheit',
      icon: Eye
    }
  ];

  return (
    <Card className="glass-morphism border-border rounded-2xl">
      <CardHeader>
        <CardTitle className="text-primary flex items-center gap-2">
          <Monitor className="w-5 h-5 text-accent" />
          Darstellung
        </CardTitle>
        <p className="text-muted-foreground text-sm mt-2">
          Passe das Aussehen der App an deine Vorlieben an
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Selection */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Design-Modus</h3>
          <div className="grid grid-cols-2 gap-3">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setTheme(option.id)}
                  className={`p-4 rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-2 relative ${
                    isActive
                      ? 'bg-primary/20 border-2 border-primary shadow-lg'
                      : 'bg-secondary/30 border-2 border-border hover:border-primary/50'
                  }`}
                >
                  {option.badge && (
                    <span className="absolute top-2 right-2 text-xs font-semibold text-primary">
                      {option.badge}
                    </span>
                  )}
                  <Icon className={`w-6 h-6 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {option.label}
                  </span>
                  <span className={`text-xs ${isActive ? 'text-foreground/70' : 'text-muted-foreground'}`}>
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Animations Toggle */}
        <div className="border-t border-border pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Animationen</p>
              <p className="text-xs text-muted-foreground mt-1">
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
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-sm text-primary">
          <span className="ml-2">Änderungen werden automatisch gespeichert und in allen Fenstern synchronisiert</span>
        </div>
      </CardContent>
    </Card>
  );
}
