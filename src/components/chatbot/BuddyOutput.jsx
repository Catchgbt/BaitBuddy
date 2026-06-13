import React, { useState, useEffect, useCallback } from "react";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/api/auth";
import { speakWithElevenLabs, cancelElevenLabs } from "@/components/utils/elevenLabsTTS";

const cleanTextForSpeech = (text) => {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text.replace(/[\u{1F600}-\u{1F64F}]/gu, '');
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F5FF}]/gu, '');
  cleaned = cleaned.replace(/[\u{1F680}-\u{1F6FF}]/gu, '');
  cleaned = cleaned.replace(/[\u{1F700}-\u{1F77F}]/gu, '');
  cleaned = cleaned.replace(/[\u{1F780}-\u{1F7FF}]/gu, '');
  cleaned = cleaned.replace(/[\u{1F800}-\u{1F8FF}]/gu, '');
  cleaned = cleaned.replace(/[\u{1F900}-\u{1F9FF}]/gu, '');
  cleaned = cleaned.replace(/[\u{1FA00}-\u{1FA6F}]/gu, '');
  cleaned = cleaned.replace(/[\u{1FA70}-\u{1FAFF}]/gu, '');
  cleaned = cleaned.replace(/[\u{2600}-\u{26FF}]/gu, '');
  cleaned = cleaned.replace(/[\u{2700}-\u{27BF}]/gu, '');
  cleaned = cleaned.replace(/[\*#_~`]/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned.trim();
};

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

      console.log("BuddyOutput: Attempting ElevenLabs TTS");

      await new Promise((resolve, reject) => {
        speakWithElevenLabs(cleanText, {
          onEnd: resolve,
          onError: reject,
        }).catch(reject);
      });
      console.log("BuddyOutput: ElevenLabs audio finished");
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