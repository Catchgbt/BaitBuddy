import React, { useState, useEffect } from 'react';
import { auth } from "@/api/auth";
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save, Zap, Moon, Gauge } from 'lucide-react';
import { useOptimisticMutation } from '@/lib/useOptimisticMutation';

const BATTERY_FEATURES = [
  { key: 'disableAnimations', label: 'Animationen & Übergänge', desc: 'Deaktiviert sanfte Animationen (spart RAM & CPU)' },
  { key: 'reduceGpsFrequency', label: 'GPS-Häufigkeit reduzieren', desc: 'GPS nur alle 60s statt 10s abfragen' },
  { key: 'reduceNotifications', label: 'Benachrichtigungen minimieren', desc: 'Nur wichtige Benachrichtigungen zeigen' },
  { key: 'aggressiveCaching', label: 'Aggressives Caching', desc: 'Mehr Karten-Tiles lokal speichern, weniger Netzwerk' },
  { key: 'disableAutoSync', label: 'Auto-Sync pausieren', desc: 'Hintergrund-Syncs deaktivieren (manuell auslösbar)' },
  { key: 'disableLocationTracking', label: 'Standortverlauf deaktivieren', desc: 'Live-Trip Tracking pausieren' },
];

export default function BatterySaverSettings() {
  const [batterySettings, setBatterySettings] = useState({
    batteryModeEnabled: false,
    disableAnimations: false,
    reduceGpsFrequency: false,
    reduceNotifications: false,
    aggressiveCaching: false,
    disableAutoSync: false,
    disableLocationTracking: false,
  });
  const [initialSettings, setInitialSettings] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const user = await auth.me();
        if (user && user.settings?.batterySettings) {
          const settings = user.settings.batterySettings;
          setBatterySettings(settings);
          setInitialSettings(settings);

          if (settings.batteryModeEnabled) {
            document.documentElement.style.colorScheme = 'dark';
            document.body.classList.add('battery-saver-mode');
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden der Akkuspar-Einstellungen:', error);
      }
    })();
  }, []);

  const settingsMutation = useOptimisticMutation({
    mutationFn: async (newSettings) => {
      const userSettings = (await auth.me()).settings || {};
      await auth.updateMe({
        settings: {
          ...userSettings,
          batterySettings: newSettings
        }
      });
      return newSettings;
    },
    optimisticUpdate: () => batterySettings,
    onSuccess: () => {
      setInitialSettings(batterySettings);

      if (batterySettings.batteryModeEnabled) {
        document.documentElement.style.colorScheme = 'dark';
        document.body.classList.add('battery-saver-mode');
        localStorage.setItem('batteryModeEnabled', 'true');
      } else {
        document.documentElement.style.colorScheme = 'normal';
        document.body.classList.remove('battery-saver-mode');
        localStorage.removeItem('batteryModeEnabled');
      }

      toast.success('Akkuspar-Einstellungen gespeichert!');
    },
    onError: () => {
      toast.error('Fehler beim Speichern der Einstellungen.');
    },
    invalidateOnSettle: false
  });

  const handleToggleBatteryMode = (enabled) => {
    setBatterySettings(prev => ({ ...prev, batteryModeEnabled: enabled }));
    if (enabled) {
      toast.info('Akkusparprogramm aktiviert — unnötige Features werden deaktiviert');
    }
  };

  const handleToggleFeature = (key) => {
    setBatterySettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    settingsMutation.mutate(batterySettings);
  };

  const hasChanges = JSON.stringify(batterySettings) !== JSON.stringify(initialSettings);
  const enabledFeatureCount = BATTERY_FEATURES.filter(f => batterySettings[f.key]).length;

  return (
    <div className="border-t border-gray-800 pt-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-yellow-400" />
        Akkuspar-Modus
      </h3>

      {/* Master Toggle */}
      <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-700/50 rounded-lg p-4 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Moon className="w-4 h-4 text-yellow-400" />
              <p className="font-semibold text-yellow-300">Akkusparprogramm</p>
            </div>
            <p className="text-sm text-gray-300">
              Aktiviert Black Mode (OLED spart Akku) und deaktiviert energiefressende Features.
              {batterySettings.batteryModeEnabled && enabledFeatureCount > 0 && (
                <span className="block mt-1 text-yellow-200">
                  ⚡ {enabledFeatureCount} von {BATTERY_FEATURES.length} Optimierungen aktiv
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => handleToggleBatteryMode(!batterySettings.batteryModeEnabled)}
            className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors ${
              batterySettings.batteryModeEnabled
                ? 'bg-yellow-500'
                : 'bg-gray-700'
            } relative`}
            aria-pressed={batterySettings.batteryModeEnabled}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                batterySettings.batteryModeEnabled ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Features (nur wenn Modus aktiv) */}
      {batterySettings.batteryModeEnabled && (
        <div className="space-y-3 mb-6">
          <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
            <Gauge className="w-3 h-3" /> Wähle, welche Features du sparen möchtest:
          </p>
          {BATTERY_FEATURES.map((feature) => (
            <div
              key={feature.key}
              className="flex items-start gap-3 p-3 bg-gray-800/40 rounded-lg hover:bg-gray-800/60 transition-colors"
            >
              <input
                type="checkbox"
                id={feature.key}
                checked={batterySettings[feature.key] || false}
                onChange={() => handleToggleFeature(feature.key)}
                className="mt-1 w-4 h-4 rounded bg-gray-700 border-gray-600 cursor-pointer accent-yellow-500"
              />
              <label htmlFor={feature.key} className="flex-1 cursor-pointer">
                <p className="text-sm font-medium text-gray-200">{feature.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{feature.desc}</p>
              </label>
            </div>
          ))}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={settingsMutation.isPending || !hasChanges}
          className="bg-yellow-600 hover:bg-yellow-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {settingsMutation.isPending ? 'Speichert...' : 'Änderungen speichern'}
        </Button>
      </div>
    </div>
  );
}
