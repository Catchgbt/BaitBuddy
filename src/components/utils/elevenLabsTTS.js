// src/components/utils/elevenLabsTTS.js
// Zentrale ElevenLabs Text-to-Speech Utility.
// Das Backend (/api/ai/tts) liefert JSON { audioBase64, contentType }.
// Diese Helfer dekodieren das Base64-Audio und spielen es ab.
//
// Es gibt bewusst NUR diesen einen Sprach-Pfad: Die App spricht ausschließlich
// mit der natürlichen ElevenLabs-Stimme. Die frühere Browser-TTS
// (speechSynthesis, Roboterstimme) wurde komplett entfernt — schlägt ElevenLabs
// fehl (offline, kein API-Key, Autoplay blockiert), bleibt die Ausgabe still
// und der Text steht weiterhin im Chat.

import { functions } from "@/api/frontendClient";
import { getPreferredTtsVoice } from "@/lib/ttsVoice";

// Modul-globaler Singleton: Es spielt bewusst immer nur EINE Stimme gleichzeitig.
// Konsequenz: Gleichzeitiges TTS aus dem KI-Buddy (KiBuddyBeta) und dem schwebenden Widget
// teilt sich diese eine Wiedergabe – ein neuer speak-Aufruf bricht den vorherigen ab
// (cancelElevenLabs). Das ist gewolltes Verhalten und kein Bug bei paralleler Nutzung.
let currentAudio = null;
let currentUrl = null;

// Generation-Token gegen überlappende Aufrufe: Startet während des laufenden
// TTS-Requests ein neuer speak-/cancel-Aufruf, würde die ältere Antwort nach
// ihrem await trotzdem abgespielt und zwei Stimmen sprächen gleichzeitig.
// Jeder Aufruf merkt sich seine Generation; nur die neueste darf abspielen.
let generation = 0;

/**
 * Bricht eine laufende ElevenLabs-Wiedergabe ab — auch eine, deren
 * TTS-Request gerade noch läuft (via Generation-Token).
 */
export function cancelElevenLabs() {
  generation += 1;
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
 * Wirft einen Fehler, wenn kein Audio geliefert wird (z. B. API-Key fehlt 501)
 * oder die Wiedergabe blockiert ist (Autoplay-Policy).
 *
 * @param {string} text
 * @param {{ onEnd?: () => void, onError?: (e:any) => void }} [callbacks]
 * @param {{ rate?: number }} [options] rate = Wiedergabegeschwindigkeit (0.5–2.0)
 * @returns {Promise<HTMLAudioElement|null>} null, wenn der Aufruf während des
 *   Requests von einem neueren speak-/cancel-Aufruf abgelöst wurde (dann wird
 *   nichts abgespielt und keiner der Callbacks feuert).
 */
export async function speakWithElevenLabs(text, callbacks = {}, options = {}) {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Kein Text für TTS");
  }

  cancelElevenLabs();
  const myGeneration = generation;

  // Die in den Einstellungen gewählte Stimme mitsenden; das Backend prüft den
  // Plan (weibliche Stimme nur ab Ultimate) und fällt sonst auf Standard zurück.
  const response = await functions.invoke("textToSpeech", { text, voice: getPreferredTtsVoice() });

  // Während des Requests hat ein neuerer speak-/cancel-Aufruf übernommen:
  // dieses Audio verwerfen statt es parallel zur neuen Stimme abzuspielen.
  if (myGeneration !== generation) return null;

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

  // Die in den Audio-Einstellungen gewählte Sprechgeschwindigkeit gilt auch
  // für die ElevenLabs-Wiedergabe.
  const rate = Number(options.rate);
  if (Number.isFinite(rate) && rate >= 0.5 && rate <= 2.0 && rate !== 1.0) {
    audio.playbackRate = rate;
  }

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

  try {
    await audio.play();
  } catch (err) {
    // Wiedergabe blockiert (z. B. Autoplay-Policy): Blob-URL sofort freigeben,
    // damit kein Leak entsteht, und den Fehler an den Aufrufer durchreichen.
    if (currentUrl === url) {
      URL.revokeObjectURL(url);
      currentUrl = null;
    }
    if (currentAudio === audio) currentAudio = null;
    throw err;
  }
  return audio;
}

/**
 * Zentrale Sprech-Funktion der App: Spielt den Text mit der natürlichen
 * ElevenLabs-Stimme ab und löst auf, wenn die Wiedergabe beendet ist.
 * Es gibt bewusst KEINEN Browser-TTS-Fallback — schlägt die Ausgabe fehl,
 * löst das Promise still auf, damit Aufrufer (Status-Reset, Gesprächs-Loops)
 * normal weiterlaufen. Respektiert das voiceEnabled-Setting.
 *
 * @param {string} text
 * @param {{ voiceEnabled?: boolean, rate?: number }} [options]
 */
export async function speakWithFallback(text, options = {}) {
  const { voiceEnabled = true, rate = 1.0 } = options;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return;
  }

  if (!voiceEnabled) {
    return;
  }

  let audio;
  try {
    audio = await speakWithElevenLabs(text, {}, { rate });
  } catch (err) {
    console.warn('[TTS] ElevenLabs nicht verfügbar, Ausgabe bleibt still:', err?.message);
    return;
  }

  // Von einem neueren speak-Aufruf abgelöst — der steuert die Wiedergabe.
  if (!audio) return;

  await new Promise((resolve) => {
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
}
