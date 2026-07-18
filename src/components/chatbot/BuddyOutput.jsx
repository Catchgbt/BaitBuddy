import React, { useState, useEffect, useCallback } from "react";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/api/auth";
import { speakWithFallback, cancelElevenLabs } from "@/components/utils/elevenLabsTTS";

export default function BuddyOutput({ text, autoPlay = true }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const handleSpeak = useCallback(async () => {
    if (!text || isMuted || isSpeaking) return;

    try {
      setIsSpeaking(true);

      let user = null;
      try {
        user = await auth.me();
      } catch {
        // Gastmodus: Standard-Einstellungen verwenden
      }

      if (user?.settings?.audio_enabled === false) {
        setIsSpeaking(false);
        return;
      }

      const speechRate = user?.settings?.speech_speed || 1.0;

      // Nur die natürliche ElevenLabs-Stimme; speakWithFallback löst auf,
      // wenn die Wiedergabe endet, und bleibt bei Fehlern still.
      await speakWithFallback(text, { voiceEnabled: true, rate: speechRate });
    } catch (error) {
      console.error("BuddyOutput: Speech error:", error);
    } finally {
      setIsSpeaking(false);
    }
  }, [text, isMuted, isSpeaking]);

  useEffect(() => {
    if (autoPlay && text && !isMuted) {
      const timer = setTimeout(() => {
        handleSpeak();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, text, isMuted, handleSpeak]);

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    if (isSpeaking) {
      cancelElevenLabs();
      setIsSpeaking(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggleMute}
        className="text-gray-400 hover:text-white"
        title={isMuted ? "Ton einschalten" : "Ton ausschalten"}
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </Button>

      {isSpeaking && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Spreche...</span>
        </div>
      )}
    </div>
  );
}
