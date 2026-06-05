import React, { useState, useEffect, useCallback } from "react";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

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

const playTextWithBrowserTTS = (text, speechRate = 1.0) => {
  return new Promise((resolve) => {
    try {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        console.log("Browser TTS not available");
        return resolve();
      }

      window.speechSynthesis.cancel();

      const speak = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'de-DE';
        utterance.rate = Math.min(2.0, Math.max(0.1, speechRate));
        utterance.pitch = 1.0;
        utterance.volume = 0.8;

        const voices = window.speechSynthesis.getVoices();
        const germanVoice = voices.find(voice => voice.lang.startsWith('de'));
        if (germanVoice) {
          utterance.voice = germanVoice;
        }

        utterance.onend = () => {
          console.log("Browser TTS finished");
          resolve();
        };
        utterance.onerror = (e) => {
          console.error("Browser TTS error:", e);
          resolve();
        };

        console.log("Starting Browser TTS:", text.substring(0, 50));
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          speak();
        };
        setTimeout(speak, 500);
      } else {
        speak();
      }
    } catch (error) {
      console.error("Browser TTS error:", error);
      resolve();
    }
  });
};

const playAudio = async (audioData) => {
  try {
    if (!audioData || !(audioData instanceof ArrayBuffer)) {
      throw new Error("Invalid audio data");
    }
    
    const blob = new Blob([audioData], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    
    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      audio.play().catch(reject);
    });
  } catch (error) {
    console.error("Audio playback error:", error);
    throw error;
  }
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
        user = await base44.auth.me();
      } catch (e) {
        console.log("BuddyOutput: User not authenticated, using defaults");
      }

      if (user?.settings?.audio_enabled === false) {
        console.log("BuddyOutput: Audio disabled in settings");
        setIsSpeaking(false);
        return;
      }

      const speechRate = user?.settings?.speech_speed || 1.0;
      const voiceId = user?.settings?.voice_id || "alloy";
      const planId = user?.premium_plan_id || 'free';
      const quality = (planId === 'pro' || planId === 'ultimate') ? 'hd' : 'standard';

      console.log("BuddyOutput: Attempting backend TTS with quality:", quality);

      try {
        const { backendTextToSpeech } = await import('@/functions/backendTextToSpeech');
        const response = await backendTextToSpeech({ 
          text: cleanText,
          speechRate,
          voiceId,
          quality
        }, {
          responseType: 'arraybuffer'
        });

        const contentType = response.headers?.['content-type'] || '';
        console.log("BuddyOutput: Backend response content-type:", contentType);

        if (contentType.includes('application/json')) {
          const decoder = new TextDecoder();
          const jsonData = JSON.parse(decoder.decode(response.data));
          
          if (jsonData.fallback_to_browser) {
            console.log("BuddyOutput: Backend requested browser fallback");
            await playTextWithBrowserTTS(cleanText, speechRate);
            return;
          }
        }

        if (response.data && response.data instanceof ArrayBuffer && response.data.byteLength > 0) {
          console.log("BuddyOutput: Playing backend audio, size:", response.data.byteLength);
          await playAudio(response.data);
          console.log("BuddyOutput: Backend audio finished");
        } else {
          console.log("BuddyOutput: Invalid audio data, using browser TTS");
          await playTextWithBrowserTTS(cleanText, speechRate);
        }
      } catch (backendError) {
        console.error("BuddyOutput: Backend TTS failed, using browser fallback:", backendError);
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
    if (isSpeaking && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
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