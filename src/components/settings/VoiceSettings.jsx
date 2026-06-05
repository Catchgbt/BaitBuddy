import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { useOptimisticMutation } from "@/lib/useOptimisticMutation";

export default function VoiceSettings() {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [speechSpeed, setSpeechSpeed] = useState(1.0);
  const [initialState, setInitialState] = useState({ audioEnabled: true, speechSpeed: 1.0 });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const user = await base44.auth.me();
      const settings = user?.settings || {};
      
      const state = {
        audioEnabled: settings.audio_enabled !== false,
        speechSpeed: settings.speech_speed || 1.0
      };
      setAudioEnabled(state.audioEnabled);
      setSpeechSpeed(state.speechSpeed);
      setInitialState(state);
    } catch (error) {
      console.error("Fehler beim Laden der Einstellungen:", error);
    }
  };

  const voiceSettingsMutation = useOptimisticMutation({
    queryKey: 'userSettings',
    mutationFn: async (settings) => {
      const user = await base44.auth.me();
      await base44.auth.updateMe({
        settings: {
          ...user.settings,
          audio_enabled: settings.audioEnabled,
          speech_speed: settings.speechSpeed
        }
      });
      window.dispatchEvent(new CustomEvent('voiceSettingsUpdated'));
      return settings;
    },
    optimisticUpdate: () => ({ audioEnabled, speechSpeed }),
    onSuccess: () => {
      setInitialState({ audioEnabled, speechSpeed });
      toast.success("Audio-Einstellungen gespeichert!");
    },
    onError: (error) => {
      console.error("Fehler beim Speichern:", error);
      toast.error("Fehler beim Speichern der Einstellungen");
    },
    invalidateOnSettle: true
  });

  const saveSettings = () => {
    voiceSettingsMutation.mutate({ audioEnabled, speechSpeed });
  };

  const hasChanges = audioEnabled !== initialState.audioEnabled || speechSpeed !== initialState.speechSpeed;

  return (
    <Card className="glass-morphism border-gray-800">
      <CardHeader>
        <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)] flex items-center gap-2">
          {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          Audio-Einstellungen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Audio aktivieren/deaktivieren */}
        <div className="flex items-center justify-between">
          <Label htmlFor="audio-enabled" className="text-gray-300">
            Sprachausgabe aktivieren
          </Label>
          <Switch
            id="audio-enabled"
            checked={audioEnabled}
            onCheckedChange={setAudioEnabled}
          />
        </div>

        {/* Sprechgeschwindigkeit */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-gray-300">Sprechgeschwindigkeit</Label>
            <span className="text-sm text-cyan-400">{speechSpeed.toFixed(1)}x</span>
          </div>
          <Slider
            value={[speechSpeed]}
            onValueChange={(value) => setSpeechSpeed(value[0])}
            min={0.5}
            max={2.0}
            step={0.1}
            disabled={!audioEnabled}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0.5x (Langsam)</span>
            <span>2.0x (Schnell)</span>
          </div>
        </div>

        {/* Hinweis */}
        <div className="text-xs text-gray-500 bg-gray-800/50 p-3 rounded-lg">
          💡 Tipp: Die Sprechgeschwindigkeit beeinflusst, wie schnell der KI-Buddy antwortet.
        </div>

        {/* Speichern Button */}
        <Button 
          onClick={saveSettings}
          disabled={voiceSettingsMutation.isPending || !hasChanges}
          className="w-full bg-cyan-600 active:scale-95 active:bg-cyan-700 focus:ring-2 focus:ring-cyan-400"
          aria-label="Einstellungen speichern"
        >
          {voiceSettingsMutation.isPending ? 'Speichere...' : 'Einstellungen speichern'}
        </Button>
      </CardContent>
    </Card>
  );
}