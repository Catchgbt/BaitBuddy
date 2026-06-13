import { useState, useRef, useCallback, useEffect } from 'react';
import { functions } from "@/api/frontendClient";

/**
 * Hook für ElevenLabs Text-to-Speech Voice Output
 * Nutzt die Backend-Integrationsroute /api/ai/tts
 * Unterstützt Audio-Streaming und Kontrollfunktionen
 */
export function useElevenLabsVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const urlRef = useRef(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
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

    try {
      const response = await functions.invoke('textToSpeech', { text });

      // Backend gibt audioBase64 zurück
      const audioBase64 = response?.audioBase64;
      if (!audioBase64) {
        throw new Error('Keine Audio-Daten erhalten');
      }

      // Base64 in Blob konvertieren
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mpeg' });

      // Blob-URL erstellen und Audio abspielen
      const url = URL.createObjectURL(blob);
      urlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        urlRef.current = null;
        options.onEnd?.();
      };

      audio.onerror = (err) => {
        setIsSpeaking(false);
        setError('Audio playback error');
        URL.revokeObjectURL(url);
        urlRef.current = null;
        options.onError?.(err);
      };

      setIsLoading(false);
      setIsSpeaking(true);
      await audio.play();
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
