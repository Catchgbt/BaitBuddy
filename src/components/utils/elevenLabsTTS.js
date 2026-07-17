// src/components/utils/elevenLabsTTS.js
// Zentrale ElevenLabs Text-to-Speech Utility.
// Das Backend (/api/ai/tts) liefert JSON { audioBase64, contentType }.
// Diese Helfer dekodieren das Base64-Audio und spielen es ab.

import { functions } from "@/api/frontendClient";
import { getPreferredTtsVoice } from "@/lib/ttsVoice";

// Modul-globaler Singleton: Es spielt bewusst immer nur EINE Stimme gleichzeitig.
// Konsequenz: Gleichzeitiges TTS aus dem KI-Buddy (KiBuddyBeta) und dem schwebenden Widget
// teilt sich diese eine Wiedergabe – ein neuer speak-Aufruf bricht den vorherigen ab
// (cancelElevenLabs). Das ist gewolltes Verhalten und kein Bug bei paralleler Nutzung.
let currentAudio = null;
let currentUrl = null;

/**
 * Bricht eine laufende ElevenLabs-Wiedergabe ab.
 */
export function cancelElevenLabs() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.src = "";
    } catch { /* ignore */ }
    currentAudio = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
}

/**
 * Holt ElevenLabs-Audio fürs übergebene Text und spielt es ab.
 * Wirft einen Fehler, wenn kein Audio geliefert wird (z. B. API-Key fehlt 501),
 * damit der Aufrufer auf Browser-TTS zurückfallen kann.
 *
 * @param {string} text
 * @param {{ onEnd?: () => void, onError?: (e:any) => void }} [callbacks]
 * @returns {Promise<HTMLAudioElement>}
 */
export async function speakWithElevenLabs(text, callbacks = {}) {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Kein Text für TTS");
  }

  cancelElevenLabs();

  // Die in den Einstellungen gewählte Stimme mitsenden; das Backend prüft den
  // Plan (weibliche Stimme nur ab Ultimate) und fällt sonst auf Standard zurück.
  const response = await functions.invoke("textToSpeech", { text, voice: getPreferredTtsVoice() });

  // frontendClient liefert das geparste JSON direkt (kein axios-Wrapper).
  // Unterstütze zur Sicherheit auch ein response.data-Nesting.
  const payload = response?.audioBase64 ? response : response?.data;
  const audioBase64 = payload?.audioBase64;

  if (!audioBase64) {
    throw new Error("ElevenLabs lieferte kein Audio");
  }

  // Base64 Blob
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: payload.contentType || "audio/mpeg" });

  const url = URL.createObjectURL(blob);
  currentUrl = url;

  const audio = new Audio(url);
  currentAudio = audio;

  audio.onended = () => {
    if (currentUrl === url) {
      URL.revokeObjectURL(url);
      currentUrl = null;
    }
    if (currentAudio === audio) currentAudio = null;
    callbacks.onEnd?.();
  };

  audio.onerror = (e) => {
    if (currentUrl === url) {
      URL.revokeObjectURL(url);
      currentUrl = null;
    }
    if (currentAudio === audio) currentAudio = null;
    callbacks.onError?.(e);
  };

  await audio.play();
  return audio;
}

/**
 * Spielt rohe Audio-Daten (als Uint8Array) ab.
 * Wird für Backend-generierte MP3-Daten verwendet.
 */
export async function playAudioBlob(audioData, onEnded) {
  return new Promise((resolve) => {
    cancelElevenLabs();
    try {
      const blob = new Blob([audioData], { type: 'audio/mpeg' });
      if (blob.size === 0) {
        resolve();
        return;
      }
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;
      currentUrl = url;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        currentAudio = null;
        currentUrl = null;
        if (onEnded) onEnded();
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        currentAudio = null;
        currentUrl = null;
        resolve();
      };

      audio.play().catch(e => {
        console.warn('Audio playback blocked:', e);
        URL.revokeObjectURL(url);
        currentAudio = null;
        currentUrl = null;
        resolve();
      });
    } catch (error) {
      console.error('Audio playback error:', error);
      resolve();
    }
  });
}

/**
 * Zentrale Fallback-Strategie: Versucht ElevenLabs, fällt zu Browser-TTS zurück.
 * Respektiert voiceEnabled-Setting.
 */
export async function speakWithFallback(text, options = {}) {
  const { voiceEnabled = true, lang = 'de-DE', rate = 1.0, pitch = 1.0 } = options;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return Promise.resolve();
  }

  if (!voiceEnabled) {
    return Promise.resolve();
  }

  try {
    const audio = await speakWithElevenLabs(text, {
      onEnd: () => {},
      onError: () => {
        throw new Error('ElevenLabs fallback');
      },
    });
    return new Promise((resolve) => {
      // speakWithElevenLabs setzt bereits onended/onerror-Handler, die die
      // Blob-URL via URL.revokeObjectURL freigeben. Diese Handler NICHT
      // überschreiben (sonst Memory-Leak) – stattdessen wrappen: Original-
      // Cleanup zuerst ausführen, dann das Promise auflösen.
      const originalOnEnded = audio.onended;
      const originalOnError = audio.onerror;
      audio.onended = (e) => {
        originalOnEnded?.call(audio, e);
        resolve();
      };
      audio.onerror = (e) => {
        originalOnError?.call(audio, e);
        resolve();
      };
    });
  } catch {
    const { speakWithBrowserTTS } = await import('./browserTTS');
    return speakWithBrowserTTS(text, {
      lang,
      rate,
      pitch,
      volume: 1.0,
    });
  }
}
