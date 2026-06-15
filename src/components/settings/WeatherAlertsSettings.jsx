import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useHaptic } from "@/components/utils/HapticFeedback";
import { useSound } from "@/components/utils/SoundManager";

export default function WeatherAlertsSettings() {
  const { triggerHaptic } = useHaptic();
  const { playSound } = useSound();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    rain_alert_enabled: true,
    rain_probability_threshold: 60,
    wind_alert_enabled: true,
    wind_speed_threshold: 10,
    temp_alert_enabled: false,
    temp_low_threshold: 5,
    temp_high_threshold: 30,
    storm_alert_enabled: true,
    storm_gust_threshold: 15,
    uv_alert_enabled: false,
    uv_index_threshold: 6,
    visibility_alert_enabled: false,
    visibility_threshold_km: 1,
    dewpoint_alert_enabled: false,
    dewpoint_diff_threshold: 2,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const user = await User.me();
      if (user?.settings?.weather_alerts) {
        setSettings({
          ...settings,
          ...user.settings.weather_alerts
        });
      }
    } catch (error) {
      console.error("Fehler beim Laden der Einstellungen:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    triggerHaptic('medium');
    
    try {
      const user = await User.me();
      await User.updateMyUserData({
        settings: {
          ...user.settings,
          weather_alerts: settings
        }
      });

      // Event dispatchen damit andere Komponenten reagieren können
      window.dispatchEvent(new CustomEvent('weather-alerts-updated', { 
        detail: settings 
      }));

      toast.success("Wetter-Warnungen gespeichert!", {
        description: "Deine Einstellungen wurden aktualisiert",
        duration: 3000
      });
      
      playSound('success');
      triggerHaptic('success');
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      toast.error("Fehler beim Speichern", {
        description: "Bitte versuche es erneut",
        duration: 4000
      });
      playSound('error');
      triggerHaptic('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-morphism border-gray-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 animate-spin text-cyan-400">⟳</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-morphism border-gray-800 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">
          Alarm-Einstellungen
        </CardTitle>
        <p className="text-gray-400 text-sm mt-2">
          Lege fest, bei welchen Wetterbedingungen du gewarnt werden möchtest
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Regen-Warnung */}
        <div className="space-y-3 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-blue-400 text-xl">🌧️</span>
              <div>
                <Label className="text-base text-white">Regen-Warnung</Label>
                <p className="text-xs text-gray-400 mt-0.5">
                  Warnung bei hoher Regenwahrscheinlichkeit
                </p>
              </div>
            </div>
            <Switch
              checked={settings.rain_alert_enabled}
              aria-label="Regen-Warnung aktivieren"
              onCheckedChange={(checked) => {
                triggerHaptic('light');
                setSettings({ ...settings, rain_alert_enabled: checked });
              }}
            />
          </div>
          {settings.rain_alert_enabled && (
            <div className="flex items-center gap-3 ml-8">
              <Label className="text-sm text-gray-300 w-32">Ab</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={settings.rain_probability_threshold}
                onChange={(e) => setSettings({ ...settings, rain_probability_threshold: parseInt(e.target.value) || 0 })}
                className="w-20 bg-gray-800/50 border-gray-700 text-white"
              />
              <span className="text-sm text-gray-400">% Regenwahrscheinlichkeit</span>
            </div>
          )}
        </div>

        {/* Wind-Warnung */}
        <div className="space-y-3 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-xl">🌬️</span>
              <div>
                <Label className="text-base text-white">Wind-Warnung</Label>
                <p className="text-xs text-gray-400 mt-0.5">
                  Warnung bei starkem Wind
                </p>
              </div>
            </div>
            <Switch
              checked={settings.wind_alert_enabled}
              aria-label="Wind-Warnung aktivieren"
              onCheckedChange={(checked) => {
                triggerHaptic('light');
                setSettings({ ...settings, wind_alert_enabled: checked });
              }}
            />
          </div>
          {settings.wind_alert_enabled && (
            <div className="flex items-center gap-3 ml-8">
              <Label className="text-sm text-gray-300 w-32">Ab</Label>
              <Input
                type="number"
                min="0"
                max="50"
                value={settings.wind_speed_threshold}
                onChange={(e) => setSettings({ ...settings, wind_speed_threshold: parseInt(e.target.value) || 0 })}
                className="w-20 bg-gray-800/50 border-gray-700 text-white"
              />
              <span className="text-sm text-gray-400">m/s Windgeschwindigkeit</span>
            </div>
          )}
        </div>

        {/* Sturm-Warnung */}
        <div className="space-y-3 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-red-400 text-xl">🌪️</span>
              <div>
                <Label className="text-base text-white">Sturm-Warnung</Label>
                <p className="text-xs text-gray-400 mt-0.5">
                  Warnung bei starken Windböen
                </p>
              </div>
            </div>
            <Switch
              checked={settings.storm_alert_enabled}
              aria-label="Sturm-Warnung aktivieren"
              onCheckedChange={(checked) => {
                triggerHaptic('light');
                setSettings({ ...settings, storm_alert_enabled: checked });
              }}
            />
          </div>
          {settings.storm_alert_enabled && (
            <div className="flex items-center gap-3 ml-8">
              <Label className="text-sm text-gray-300 w-32">Ab</Label>
              <Input
                type="number"
                min="0"
                max="50"
                value={settings.storm_gust_threshold}
                onChange={(e) => setSettings({ ...settings, storm_gust_threshold: parseInt(e.target.value) || 0 })}
                className="w-20 bg-gray-800/50 border-gray-700 text-white"
              />
              <span className="text-sm text-gray-400">m/s Windböen</span>
            </div>
          )}
        </div>

        {/* Temperatur-Warnung */}
        <div className="space-y-3 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-orange-400 text-xl">🌡️</span>
              <div>
                <Label className="text-base text-white">Temperatur-Warnung</Label>
                <p className="text-xs text-gray-400 mt-0.5">
                  Warnung bei extremen Temperaturen
                </p>
              </div>
            </div>
            <Switch
              checked={settings.temp_alert_enabled}
              aria-label="Temperatur-Warnung aktivieren"
              onCheckedChange={(checked) => {
                triggerHaptic('light');
                setSettings({ ...settings, temp_alert_enabled: checked });
              }}
            />
          </div>
          {settings.temp_alert_enabled && (
            <div className="space-y-2 ml-8">
              <div className="flex items-center gap-3">
                <Label className="text-sm text-gray-300 w-32">Kälte unter</Label>
                <Input
                  type="number"
                  min="-20"
                  max="40"
                  value={settings.temp_low_threshold}
                  onChange={(e) => setSettings({ ...settings, temp_low_threshold: parseInt(e.target.value) || 0 })}
                  className="w-20 bg-gray-800/50 border-gray-700 text-white"
                />
                <span className="text-sm text-gray-400">°C</span>
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-sm text-gray-300 w-32">Hitze über</Label>
                <Input
                  type="number"
                  min="-20"
                  max="50"
                  value={settings.temp_high_threshold}
                  onChange={(e) => setSettings({ ...settings, temp_high_threshold: parseInt(e.target.value) || 0 })}
                  className="w-20 bg-gray-800/50 border-gray-700 text-white"
                />
                <span className="text-sm text-gray-400">°C</span>
              </div>
            </div>
          )}
        </div>

        {/* UV-Index-Warnung */}
        <div className="space-y-3 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-yellow-400 text-xl">☀️</span>
              <div>
                <Label className="text-base text-white">UV-Index-Warnung</Label>
                <p className="text-xs text-gray-400 mt-0.5">
                  Warnung bei hoher UV-Strahlung
                </p>
              </div>
            </div>
            <Switch
              checked={settings.uv_alert_enabled}
              aria-label="UV-Index-Warnung aktivieren"
              onCheckedChange={(checked) => {
                triggerHaptic('light');
                setSettings({ ...settings, uv_alert_enabled: checked });
              }}
            />
          </div>
          {settings.uv_alert_enabled && (
            <div className="flex items-center gap-3 ml-8">
              <Label className="text-sm text-gray-300 w-32">Ab UV-Index</Label>
              <Input
                type="number"
                min="0"
                max="11"
                value={settings.uv_index_threshold}
                onChange={(e) => setSettings({ ...settings, uv_index_threshold: parseInt(e.target.value) || 0 })}
                className="w-20 bg-gray-800/50 border-gray-700 text-white"
              />
              <span className="text-xs text-gray-400">(6+ = hoch, 8+ = sehr hoch)</span>
            </div>
          )}
        </div>

        {/* Sichtweiten-Warnung (Nebel) */}
        <div className="space-y-3 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-cyan-400 text-xl">👁️</span>
              <div>
                <Label className="text-base text-white">Sichtweiten-Warnung (Nebel)</Label>
                <p className="text-xs text-gray-400 mt-0.5">
                  Warnung bei geringer Sichtweite
                </p>
              </div>
            </div>
            <Switch
              checked={settings.visibility_alert_enabled}
              aria-label="Sichtweiten-Warnung aktivieren"
              onCheckedChange={(checked) => {
                triggerHaptic('light');
                setSettings({ ...settings, visibility_alert_enabled: checked });
              }}
            />
          </div>
          {settings.visibility_alert_enabled && (
            <div className="flex items-center gap-3 ml-8">
              <Label className="text-sm text-gray-300 w-32">Unter</Label>
              <Input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={settings.visibility_threshold_km}
                onChange={(e) => setSettings({ ...settings, visibility_threshold_km: parseFloat(e.target.value) || 0 })}
                className="w-20 bg-gray-800/50 border-gray-700 text-white"
              />
              <span className="text-sm text-gray-400">km Sichtweite</span>
            </div>
          )}
        </div>

        {/* Taupunkt-Warnung */}
        <div className="space-y-3 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-blue-300 text-xl">💧</span>
              <div>
                <Label className="text-base text-white">Taupunkt-Warnung</Label>
                <p className="text-xs text-gray-400 mt-0.5">
                  Warnung wenn Taupunkt nah an Temperatur (Nebel/Feuchtigkeit)
                </p>
              </div>
            </div>
            <Switch
              checked={settings.dewpoint_alert_enabled}
              aria-label="Taupunkt-Warnung aktivieren"
              onCheckedChange={(checked) => {
                triggerHaptic('light');
                setSettings({ ...settings, dewpoint_alert_enabled: checked });
              }}
            />
          </div>
          {settings.dewpoint_alert_enabled && (
            <div className="flex items-center gap-3 ml-8">
              <Label className="text-sm text-gray-300 w-32">Differenz unter</Label>
              <Input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={settings.dewpoint_diff_threshold}
                onChange={(e) => setSettings({ ...settings, dewpoint_diff_threshold: parseFloat(e.target.value) || 0 })}
                className="w-20 bg-gray-800/50 border-gray-700 text-white"
              />
              <span className="text-sm text-gray-400">°C</span>
            </div>
          )}
        </div>

        {/* Speichern Button */}
        <div className="pt-4 border-t border-gray-700">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Speichere...
              </>
            ) : (
              <>
                💾 Einstellungen speichern
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}