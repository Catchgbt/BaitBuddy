import { useState, useRef, useCallback, useEffect } from 'react';
import { speakWithElevenLabs, cancelElevenLabs } from '@/components/utils/elevenLabsTTS';

/**
 * Hook für ElevenLabs Text-to-Speech Voice Output
 * Nutzt die zentrale elevenLabsTTS-Utility (Backend /api/ai/tts)
 */
export function useElevenLabsVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);

  const stop = useCallback(() => {
    cancelElevenLabs();
    audioRef.current = null;
    setIsSpeaking(false);
    setError(null);
  }, []);

  const speak = useCallback(async (text, options = {}) => {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      setError('Text is empty');
      return false;
    }

    stop();
    setIsLoading(true);
    setError(null);

    // Optimistisch VOR dem await setzen: Bei sofort endendem/fehlerndem Audio
    // feuern onEnd/onError (setIsSpeaking(false)) synchron aus audio.play(),
    // also noch während wir im await hängen. Würde setIsSpeaking(true) erst
    // danach laufen, bliebe der State fälschlich auf true hängen (Race).
    setIsSpeaking(true);

    try {
      const audio = await speakWithElevenLabs(text, {
        onEnd: () => {
          setIsSpeaking(false);
          options.onEnd?.();
        },
        onError: (err) => {
          setIsSpeaking(false);
          setError('Audio playback error');
          options.onError?.(err);
        },
      });
      audioRef.current = audio;
      setIsLoading(false);
      return true;
    } catch (err) {
      setIsLoading(false);
      setIsSpeaking(false);
      setError(err.message || 'TTS Error');
      options.onError?.(err);
      console.error('[useElevenLabsVoice] Error:', err);
      return false;
    }
  }, [stop]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsSpeaking(false);
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsSpeaking(true);
    }
  }, []);

  // Cleanup beim Unmount
  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isLoading,
    error,
  };
}
