import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Zap, Leaf, Cpu, Waves } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';

export default function BatterySettings() {
  const { batteryMode, setBatteryMode } = useTheme();

  const batteryFeatures = [
    {
      icon: Cpu,
      title: 'CPU-Last reduzieren',
      description: 'Deaktiviert aufwändige Berechnungen im Hintergrund'
    },
    {
      icon: Waves,
      title: 'Reduzierte Animationen',
      description: 'Weniger visuelle Effekte für schnellere Performance'
    },
    {
      icon: Leaf,
      title: 'Optimierte Ladezeiten',
      description: 'Verzögerte Hintergrund-Updates und Asset-Optimierung'
    },
    {
      icon: Zap,
      title: 'Stromersparnis',
      description: 'Geringerer Bildschirm-Refresh und Hintergrund-Aktivität'
    }
  ];

  return (
    <Card className="glass-morphism border-gray-800 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)] flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Akku-Spar-Modus
        </CardTitle>
        <p className="text-gray-400 text-sm mt-2">
          Optimiere die App-Performance für lange Akkulaufzeiten
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Toggle */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-900/20 to-yellow-900/20 rounded-xl border border-amber-500/30">
          <div>
            <p className="text-sm font-semibold text-white">Akku-Spar-Modus</p>
            <p className="text-xs text-gray-400 mt-1">
              {batteryMode ? 'Aktiv — App ist optimiert für Stromersparnis' : 'Inaktiv — Normal Performance'}
            </p>
          </div>
          <Switch
            checked={batteryMode}
            onCheckedChange={(checked) => setBatteryMode(checked)}
            aria-label="Akku-Spar-Modus umschalten"
            className="data-[state=checked]:bg-amber-600"
          />
        </div>

        {/* Battery Features */}
        {batteryMode && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white">Aktive Optimierungen:</h3>
            <div className="grid gap-3">
              {batteryFeatures.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={idx}
                    className="flex gap-3 p-3 bg-gray-800/40 rounded-lg border border-gray-700/50 hover:border-amber-500/30 transition-colors"
                  >
                    <Icon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-200">{feature.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 space-y-2">
          <div className="flex gap-2 text-sm">
            
            <div>
              <p className="font-medium text-yellow-300">Ideal für:</p>
              <p className="text-gray-400 text-xs mt-1">
                Lange Angelausflüge ohne Stromzugang oder wenn dein Akku schwach ist
              </p>
            </div>
          </div>
        </div>

        {/* Performance Impact */}
        <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
          <p className="text-xs text-gray-400">
            <span className="font-semibold text-gray-300">Impakt:</span> Reduziert Akkulast um ~25-35% mit minimalen visuellen Veränderungen
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
