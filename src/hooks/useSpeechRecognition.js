import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

const VOICE_RECOGNITION_TIMEOUT = 30000;

export function useSpeechRecognition(options = {}) {
  const { language = 'de-DE', timeout = VOICE_RECOGNITION_TIMEOUT, onResult, onError } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);

  const recognition = useRef(null);
  const timeoutIdRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech Recognition not supported');
      return;
    }

    recognition.current = new SpeechRecognition();
    recognition.current.lang = language;
    recognition.current.continuous = false;
    recognition.current.interimResults = false;

    recognition.current.onstart = () => {
      setIsListening(true);
      setError(null);
      setTranscript('');

      timeoutIdRef.current = setTimeout(() => {
        if (recognition.current && recognition.current.state !== 'ended') {
          recognition.current.abort();
        }
      }, timeout);
    };

    recognition.current.onresult = (event) => {
      const result = Array.from(event.results)
        .map((res) => res[0].transcript)
        .join('');

      setTranscript(result);

      if (onResult) {
        onResult(result);
      }
    };

    recognition.current.onend = () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      setIsListening(false);
    };

    recognition.current.onerror = (event) => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      setIsListening(false);

      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        const errorMsg = `Speech recognition error: ${event.error}`;
        setError(errorMsg);
        console.warn(errorMsg);
        toast.error(`Sprachfehler: ${event.error}`);

        if (onError) {
          onError(new Error(errorMsg));
        }
      }
    };

    return () => {
      if (recognition.current) {
        try {
          recognition.current.abort();
        } catch {}
        recognition.current.onstart = null;
        recognition.current.onresult = null;
        recognition.current.onend = null;
        recognition.current.onerror = null;
        recognition.current = null;
      }
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [language, timeout, onResult, onError]);

  const start = useCallback(() => {
    if (recognition.current && !isListening) {
      try {
        setTranscript('');
        recognition.current.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    }
  }, [isListening]);

  const stop = useCallback(() => {
    if (recognition.current && isListening) {
      try {
        recognition.current.stop();
      } catch (e) {
        console.error('Failed to stop recognition:', e);
      }
    }
  }, [isListening]);

  return {
    isListening,
    transcript,
    start,
    stop,
    error,
    recognition,
  };
}
