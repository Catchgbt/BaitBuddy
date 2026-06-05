import { useState, useRef, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { usePlan } from '@/components/premium/PlanContext';
import { speakWithBrowserTTS, cancelBrowserTTS, isBrowserTTSAvailable } from '@/components/utils/browserTTS';

// Plan-IDs, die ElevenLabs erhalten (Ultimate und höher).
const ELEVENLABS_PLANS = ['ultimate', 'elite', 'friends_monthly', 'friends'];

export function useAITTS() {
  const { plan } = usePlan();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef(null);

  const planId = plan?.id || 'free';
  const useElevenLabs = ELEVENLABS_PLANS.includes(planId);

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
        const response = await base44.functions.invoke('textToSpeech', { text });

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