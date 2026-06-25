let currentAudioRef = null;

export const cleanTextForSpeech = (text) => {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text.replace(/[\u{1F600}-\u{1F64F}]/gu, '');
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F5FF}]/gu, '');
  cleaned = cleaned.replace(/[\u{1F680}-\u{1F6FF}]/gu, '');
  cleaned = cleaned.replace(/[\u{1F700}-\u{1F77F}]/gu, '');
  cleaned = cleaned.replace(/[\u{1F780}-\u{1F7FF}]/gu, '');
  cleaned = cleaned.replace(/[\u{1F800}-\u{1F8FF}]/gu, '');
  cleaned = cleaned.replace(/[\u{1F900}-\u{1F9FF}]/gu, '');
  cleaned = cleaned.replace(/[\u{1FA00}-\u{1FA6F}]/gu, '');
  cleaned = cleaned.replace(/[\u{1FA70}-\u{1FAFF}]/gu, '');
  cleaned = cleaned.replace(/[\u{2600}-\u{26FF}]/gu, '');
  cleaned = cleaned.replace(/[\u{2700}-\u{27BF}]/gu, '');
  cleaned = cleaned.replace(/[\*#_~`]/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned.trim();
};

export const stopCurrentAudio = () => {
  if (currentAudioRef) {
    try {
      currentAudioRef.pause();
      currentAudioRef.src = '';
    } catch {}
    currentAudioRef = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

export const playAudioBlob = (audioData, onEnded) => {
  return new Promise((resolve) => {
    stopCurrentAudio();
    try {
      const blob = new Blob([audioData], { type: 'audio/mpeg' });
      if (blob.size === 0) {
        resolve();
        return;
      }
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef = audio;
      audio.volume = 1.0;
      audio.preload = 'auto';

      audio.onended = () => {
        URL.revokeObjectURL(url);
        currentAudioRef = null;
        if (onEnded) onEnded();
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        currentAudioRef = null;
        resolve();
      };

      audio.play().catch(e => {
        console.warn('Audio playback blocked:', e);
        URL.revokeObjectURL(url);
        currentAudioRef = null;
        resolve();
      });
    } catch (error) {
      console.error('Audio playback error:', error);
      resolve();
    }
  });
};

export const playTextWithBrowserTTS = (text, speechRate = 1.0) => {
  return new Promise((resolve) => {
    stopCurrentAudio();
    try {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        console.log('Browser TTS not available');
        return resolve();
      }

      const speak = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'de-DE';
        utterance.rate = Math.min(2.0, Math.max(0.1, speechRate));
        utterance.pitch = 1.0;
        utterance.volume = 0.8;

        const voices = window.speechSynthesis.getVoices();
        const germanVoice = voices.find(voice => voice.lang.startsWith('de'));
        if (germanVoice) {
          utterance.voice = germanVoice;
        }

        utterance.onend = () => {
          currentAudioRef = null;
          resolve();
        };
        utterance.onerror = (e) => {
          if (e.error !== 'interrupted' && e.error !== 'canceled') {
            console.error('Browser TTS error:', e.error);
          }
          currentAudioRef = null;
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length === 0) {
        let voiceLoaded = false;
        window.speechSynthesis.onvoiceschanged = () => {
          if (voiceLoaded) return;
          voiceLoaded = true;
          window.speechSynthesis.onvoiceschanged = null;
          speak();
        };
        setTimeout(() => {
          if (!voiceLoaded) {
            window.speechSynthesis.onvoiceschanged = null;
            speak();
          }
        }, 500);
      } else {
        speak();
      }
    } catch (error) {
      console.error('Browser TTS error:', error);
      resolve();
    }
  });
};
