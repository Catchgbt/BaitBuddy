// Kostenlose Browser-TTS basierend auf Web Speech API.
// Funktioniert offline, ohne API-Keys, ohne Kosten.

let voicesCache = null;

const loadVoices = () => {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return resolve([]);
    }
    const existing = window.speechSynthesis.getVoices();
    if (existing && existing.length > 0) {
      voicesCache = existing;
      return resolve(existing);
    }
    const handler = () => {
      const v = window.speechSynthesis.getVoices();
      voicesCache = v;
      window.speechSynthesis.onvoiceschanged = null;
      resolve(v);
    };
    window.speechSynthesis.onvoiceschanged = handler;
    setTimeout(() => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        voicesCache = v;
        resolve(v);
      }
    }, 500);
  });
};

const pickVoice = (voices, lang) => {
  if (!voices || voices.length === 0) return null;
  const target = (lang || 'de-DE').split('-')[0].toLowerCase();
  return (
    voices.find(v => v.lang?.toLowerCase().startsWith(target) && /google|enhanced|natural|premium/i.test(v.name)) ||
    voices.find(v => v.lang?.toLowerCase().startsWith(target)) ||
    voices[0]
  );
};

export const isBrowserTTSAvailable = () => {
  return typeof window !== "undefined" && !!window.speechSynthesis;
};

export const cancelBrowserTTS = () => {
  if (isBrowserTTSAvailable()) {
    window.speechSynthesis.cancel();
  }
};

export const speakWithBrowserTTS = async (text, options = {}) => {
  const {
    lang = 'de-DE',
    rate = 1.05,
    pitch = 1.0,
    volume = 1.0,
    onStart,
    onEnd,
    onError,
  } = options;

  if (!isBrowserTTSAvailable()) {
    onError?.(new Error('Browser TTS nicht verfügbar'));
    return;
  }
  if (!text || typeof text !== 'string') {
    onError?.(new Error('Kein Text übergeben'));
    return;
  }

  window.speechSynthesis.cancel();

  const voices = voicesCache || await loadVoices();
  const voice = pickVoice(voices, lang);

  // In Chunks zerlegen (Browser-Limit ~200-300 Zeichen)
  const chunks = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];

  return new Promise((resolve) => {
    let idx = 0;
    let started = false;

    const speakNext = () => {
      if (idx >= chunks.length) {
        onEnd?.();
        return resolve();
      }
      const u = new SpeechSynthesisUtterance(chunks[idx].trim());
      u.lang = lang;
      u.rate = rate;
      u.pitch = pitch;
      u.volume = volume;
      if (voice) u.voice = voice;

      u.onstart = () => {
        if (!started) {
          started = true;
          onStart?.();
        }
      };
      u.onend = () => {
        idx++;
        setTimeout(speakNext, 100);
      };
      u.onerror = (e) => {
        // canceled durch Nutzer ist kein Fehler
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          onError?.(e);
        }
        idx++;
        setTimeout(speakNext, 100);
      };

      window.speechSynthesis.speak(u);
    };

    speakNext();
  });
};