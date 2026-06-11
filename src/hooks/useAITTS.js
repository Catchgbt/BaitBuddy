import { useState, useRef, useCallback, useEffect } from 'react';
import { functions } from "@/api/frontendClient";
import { usePlan } from '@/components/premium/PlanContext';
import { planMeetsRequirement } from '@/components/premium/planHierarchy';
import { speakWithBrowserTTS, cancelBrowserTTS, isBrowserTTSAvailable } from '@/components/utils/browserTTS';

export function useAITTS() {
  const { plan } = usePlan();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef(null);

  const planId = plan?.id || 'free';
  // ElevenLabs für Ultimate (elite) und höher.
  const useElevenLabs = planMeetsRequirement(planId, 'elite');

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    cancelBrowserTTS();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text) => {
    if (!text || typeof text !== 'string') return;
    stop();

    // Ultimate-Plan: ElevenLabs
    if (useElevenLabs) {
      try {
        setIsSpeaking(true);
        const response = await functions.invoke('textToSpeech', { text });

        // SDK liefert axios-ähnliches Objekt; bei Audio-Mpeg landet es in response.data
        const data = response?.data;
        if (data instanceof Blob) {
          const url = URL.createObjectURL(data);
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => {
            URL.revokeObjectURL(url);
            setIsSpeaking(false);
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            setIsSpeaking(false);
          };
          await audio.play();
          return;
        }
        // Fallback wenn ElevenLabs fehlschlug
        throw new Error('ElevenLabs lieferte kein Audio');
      } catch (err) {
        console.warn('[useAITTS] ElevenLabs fehlgeschlagen, fallback Browser-TTS:', err?.message);
        // Fallthrough zu Browser-TTS
      }
    }

    // Free / Basic / Pro: Browser-TTS
    if (!isBrowserTTSAvailable()) {
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    await speakWithBrowserTTS(text, {
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [useElevenLabs, stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { speak, stop, isSpeaking, isPremiumVoice: useElevenLabs };
}