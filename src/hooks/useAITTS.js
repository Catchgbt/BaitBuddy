import { useState, useRef, useCallback, useEffect } from 'react';
import { usePlan } from '@/components/premium/PlanContext';
import { planMeetsRequirement } from '@/components/premium/planHierarchy';
import { speakWithElevenLabs, cancelElevenLabs } from '@/components/utils/elevenLabsTTS';
import { speakWithBrowserTTS, cancelBrowserTTS, isBrowserTTSAvailable } from '@/components/utils/browserTTS';

export function useAITTS() {
  const { plan } = usePlan();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef(null);

  const planId = plan?.id || 'free';
  // ElevenLabs ist der Standard-Sprachausgabe-Pfad. Browser-TTS dient nur noch
  // als Fallback, wenn ElevenLabs nicht verfügbar ist (z. B. API-Key fehlt).
  const isPremiumVoice = planMeetsRequirement(planId, 'elite');

  const stop = useCallback(() => {
    cancelElevenLabs();
    audioRef.current = null;
    cancelBrowserTTS();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text) => {
    if (!text || typeof text !== 'string') return;
    stop();

    // Primär: ElevenLabs (für alle Pläne)
    try {
      setIsSpeaking(true);
      const audio = await speakWithElevenLabs(text, {
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
      audioRef.current = audio;
      return;
    } catch (err) {
      console.warn('[useAITTS] ElevenLabs fehlgeschlagen, fallback Browser-TTS:', err?.message);
      // Fallthrough zu Browser-TTS
    }

    // Fallback: Browser-TTS
    if (!isBrowserTTSAvailable()) {
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    await speakWithBrowserTTS(text, {
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { speak, stop, isSpeaking, isPremiumVoice };
}
