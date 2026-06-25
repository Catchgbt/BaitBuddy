import React, { useState, useEffect, useCallback } from "react";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/api/auth";
import { speakWithElevenLabs, cancelElevenLabs } from "@/components/utils/elevenLabsTTS";
import { cleanTextForSpeech, stopCurrentAudio, playTextWithBrowserTTS } from "@/utils/ttsUtils";

export default function BuddyOutput({ text, autoPlay = true }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const handleSpeak = useCallback(async () => {
    if (!text || isMuted || isSpeaking) return;

    try {
      setIsSpeaking(true);
      console.log("BuddyOutput: Starting speech for text:", text.substring(0, 50));

      const cleanText = cleanTextForSpeech(text);
      console.log("BuddyOutput: Cleaned text:", cleanText.substring(0, 50));
      
      if (!cleanText) {
        console.log("BuddyOutput: No text to speak after cleaning");
        setIsSpeaking(false);
        return;
      }

      let user = null;
      try {
        user = await auth.me();
      } catch (e) {
        console.log("BuddyOutput: User not authenticated, using defaults");
      }

      if (user?.settings?.audio_enabled === false) {
        console.log("BuddyOutput: Audio disabled in settings");
        setIsSpeaking(false);
        return;
      }

      const speechRate = user?.settings?.speech_speed || 1.0;

      console.log("BuddyOutput: Attempting ElevenLabs TTS");

      // Primär: ElevenLabs. Bei Fehler (z. B. fehlender API-Key) → Browser-TTS.
      try {
        await new Promise((resolve, reject) => {
          speakWithElevenLabs(cleanText, {
            onEnd: resolve,
            onError: reject,
          }).catch(reject);
        });
        console.log("BuddyOutput: ElevenLabs audio finished");
      } catch (backendError) {
        console.warn("BuddyOutput: ElevenLabs failed, using browser fallback:", backendError?.message);
        await playTextWithBrowserTTS(cleanText, speechRate);
      }
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
      stopCurrentAudio();
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