import { useState, useRef, useCallback, useEffect } from 'react';
import { usePlan } from '@/components/premium/PlanContext';
import { planMeetsRequirement } from '@/components/premium/planHierarchy';
import { speakWithElevenLabs, cancelElevenLabs } from '@/components/utils/elevenLabsTTS';

export function useAITTS() {
  const { plan } = usePlan();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef(null);

  const planId = plan?.id || 'free';
  // ElevenLabs ist der einzige Sprachausgabe-Pfad (kein Browser-TTS Fallback mehr)
  const isPremiumVoice = planMeetsRequirement(planId, 'elite');

  const stop = useCallback(() => {
    cancelElevenLabs();
    audioRef.current = null;
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text) => {
    if (!text || typeof text !== 'string') return;
    stop();

    try {
      setIsSpeaking(true);
      const audio = await speakWithElevenLabs(text, {
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
      audioRef.current = audio;
    } catch (err) {
      console.error('[useAITTS] ElevenLabs TTS failed:', err?.message);
      setIsSpeaking(false);
    }
  }, [stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { speak, stop, isSpeaking, isPremiumVoice };
}
