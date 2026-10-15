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
  const requestRef = useRef(0);

  const stop = useCallback(() => {
    requestRef.current += 1;
    cancelElevenLabs();
    audioRef.current = null;
    setIsLoading(false);
    setIsSpeaking(false);
    setError(null);
  }, []);

  const speak = useCallback(async (text, options = {}) => {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      setError('Text is empty');
      return false;
    }

    stop();
    const request = requestRef.current;
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
          if (request !== requestRef.current) return;
          setIsSpeaking(false);
          options.onEnd?.();
        },
        onError: (err) => {
          if (request !== requestRef.current) return;
          setIsSpeaking(false);
          setError('Audio playback error');
          options.onError?.(err);
        },
      });
      if (request !== requestRef.current) return true;
      setIsLoading(false);
      // null = während des Requests von einem neueren speak/stop abgelöst —
      // der neuere Aufruf steuert den State, hier nichts mehr anfassen.
      if (!audio) { setIsSpeaking(false); return true; }
      audioRef.current = audio;
      audio.finished?.then(() => {
        if (request !== requestRef.current) return;
        audioRef.current = null;
        setIsSpeaking(false);
      });
      return true;
    } catch (err) {
      if (request !== requestRef.current) return true;
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
      // play() kann rejecten (z. B. Autoplay-Policy nach Tab-Wechsel) —
      // unbehandelt würde das als Unhandled Rejection im Log landen.
      audioRef.current.play().catch(() => {
        setIsSpeaking(false);
      });
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
