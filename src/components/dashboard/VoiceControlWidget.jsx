import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { functions } from '@/api/frontendClient';
import { useNavigate } from 'react-router-dom';
import { useLocation } from '@/components/location/LocationManager';
import { speakWithFallback, cancelElevenLabs } from '@/components/utils/elevenLabsTTS';
import { executeBuddyAction } from '@/utils/buddyActions';

const WAKE_WORD_VARIANTS = ['hey buddy', 'hei buddy', 'hey budy', 'hey baddy', 'heybuddy', 'hey body', 'hallo buddy'];
const LANGUAGE = 'de-DE';

function parseActionFromReply(text) {
  if (!text) return { clean: text, action: null };
  const m = text.match(/<<ACTION>>([\s\S]*?)<<END>>/);
  if (!m) return { clean: text, action: null };
  let action = null;
  try { action = JSON.parse(m[1].trim()); } catch {}
  const clean = text.replace(m[0], "").trim();
  return { clean, action };
}

// Animierter Equalizer - zeigt klar ob Voice aktiv ist oder nicht
function VoiceEqualizer({ state }) {
  const isActive = state !== 'off';
  const barColor =
    state === 'listening' ? 'from-cyan-400 to-cyan-600' :
    state === 'thinking' ? 'from-yellow-400 to-amber-600' :
    state === 'speaking' ? 'from-emerald-400 to-emerald-600' :
    isActive ? 'from-cyan-500/60 to-blue-600/60' :
    'from-gray-600 to-gray-700';

  return (
    <div className="flex items-end justify-center gap-[3px] h-8" aria-hidden="true">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className={`w-1 rounded-full bg-gradient-to-t ${barColor}`}
          animate={{
            height: !isActive
              ? 4
              : state === 'listening' || state === 'speaking'
                ? [6, 22, 8, 26, 6]
                : state === 'thinking'
                  ? [6, 12, 6]
                  : [4, 8, 4]
          }}
          transition={{
            duration: state === 'listening' || state === 'speaking' ? 0.7 : 1.4,
            delay: i * 0.06,
            repeat: isActive ? Infinity : 0,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );
}

export default function VoiceControlWidget() {
  // off | waiting | listening | thinking | speaking
  const [voiceState, setVoiceState] = useState('off');
  const [transcript, setTranscript] = useState('');
  const [lastAnswer, setLastAnswer] = useState('');
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const { currentLocation } = useLocation();
  const recognitionRef = useRef(null);
  const isRunningRef = useRef(false);
  const awaitingCommandRef = useRef(false);
  // True während TTS spricht: blockt Echo-Erkennung und Auto-Restart
  const isSpeakingRef = useRef(false);
  const currentLocationRef = useRef(currentLocation);
  currentLocationRef.current = currentLocation;

  const handleQuestion = useCallback(async (question) => {
    setVoiceState('thinking');
    try {
      const loc = currentLocationRef.current;
      const response = await functions.invoke('catchgbtChat', {
        messages: [{ role: 'user', content: question }],
        context: 'voice_control',
        userLocation: loc?.lat ? { latitude: loc.lat, longitude: loc.lon } : null
      });
      const raw = response?.data?.reply || response?.reply || 'Tut mir leid, ich konnte keine Antwort generieren.';
      const { clean, action } = parseActionFromReply(raw);
      let finalText = clean || 'Erledigt.';
      if (action) {
        const actionResult = await executeBuddyAction(action, { navigate });
        if (actionResult.message) finalText = (finalText ? finalText + ' ' : '') + actionResult.message;
      }
      setLastAnswer(finalText);
      setVoiceState('speaking');
      isSpeakingRef.current = true;
      try { recognitionRef.current?.stop(); } catch {}
      await speakWithFallback(finalText, { voiceEnabled: true, lang: LANGUAGE, rate: 1.0 });
      isSpeakingRef.current = false;
      if (isRunningRef.current) {
        try { recognitionRef.current?.start(); } catch {}
        setVoiceState('waiting');
      }
    } catch (e) {
      console.error('Voice AI error:', e);
      isSpeakingRef.current = false;
      setLastAnswer('Entschuldigung, das hat nicht geklappt.');
      if (isRunningRef.current) {
        try { recognitionRef.current?.start(); } catch {}
        setVoiceState('waiting');
      }
    }
  }, [navigate]);

  const stopVoice = useCallback(() => {
    isRunningRef.current = false;
    awaitingCommandRef.current = false;
    isSpeakingRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}
    cancelElevenLabs();
    setVoiceState('off');
    setTranscript('');
    toast.info('Voice Control beendet');
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Spracherkennung wird von diesem Browser nicht unterstuetzt.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = LANGUAGE;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = async (event) => {
      // Während TTS läuft, Erkennung ignorieren (Echo-Schutz)
      if (isSpeakingRef.current) return;

      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += piece + ' ';
        else interimText += piece;
      }
      const fullText = (finalText + interimText).trim().toLowerCase();
      setTranscript(fullText);

      if (!awaitingCommandRef.current && WAKE_WORD_VARIANTS.some(v => fullText.includes(v))) {
        awaitingCommandRef.current = true;
        setVoiceState('listening');
        isSpeakingRef.current = true;
        await speakWithFallback('Ja, bitte?', { voiceEnabled: true, lang: LANGUAGE, rate: 1.0 });
        isSpeakingRef.current = false;
        setTranscript('');
        return;
      }

      if (awaitingCommandRef.current && event.results[event.results.length - 1].isFinal) {
        awaitingCommandRef.current = false;
        const question = fullText.replace(/hey\s*bu?d?d?y?|hallo buddy/gi, '').trim();
        if (/^(stopp|stop|aus|beenden)$/.test(question)) {
          stopVoice();
          return;
        }
        setTranscript('');
        if (question) await handleQuestion(question);
        else setVoiceState('waiting');
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Mikrofon-Zugriff verweigert. Bitte in den Browser-Einstellungen erlauben.');
        isRunningRef.current = false;
        setVoiceState('off');
      } else if (event.error === 'audio-capture') {
        setError('Kein Mikrofon gefunden.');
        isRunningRef.current = false;
        setVoiceState('off');
      }
    };

    recognition.onend = () => {
      // Kein Auto-Restart während der Assistent spricht (sonst Feedback-Schleife)
      if (isRunningRef.current && !isSpeakingRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    return () => {
      isRunningRef.current = false;
      try { recognition.stop(); } catch {}
    };
  }, [handleQuestion, stopVoice]);

  const startVoice = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch {
      setError('Mikrofon-Zugriff verweigert. Bitte erlauben.');
      return;
    }
    if (!recognitionRef.current) {
      setError('Spracherkennung nicht verfuegbar.');
      return;
    }
    try {
      isRunningRef.current = true;
      recognitionRef.current.start();
      setVoiceState('waiting');
      toast.success('Voice Control aktiv', { description: 'Sage "Hey Buddy" um zu starten' });
    } catch (err) {
      if (err.name === 'InvalidStateError') {
        isRunningRef.current = true;
        setVoiceState('waiting');
      } else {
        isRunningRef.current = false;
        setError('Konnte Spracherkennung nicht starten.');
      }
    }
  };

  const isActive = voiceState !== 'off';

  const statusText =
    voiceState === 'waiting' ? 'Warte auf "Hey Buddy"' :
    voiceState === 'listening' ? 'Hoere zu...' :
    voiceState === 'thinking' ? 'KI denkt nach...' :
    voiceState === 'speaking' ? 'Spricht...' :
    'Voice aus';

  const statusColor =
    voiceState === 'listening' ? 'text-cyan-400' :
    voiceState === 'thinking' ? 'text-yellow-400' :
    voiceState === 'speaking' ? 'text-emerald-400' :
    isActive ? 'text-cyan-300' :
    'text-gray-500';

  return (
    <div className="flex flex-col items-end gap-1.5 w-full max-w-xs">
      <button
        onClick={isActive ? stopVoice : startVoice}
        aria-label={isActive ? 'Voice Control beenden' : 'Voice Control starten'}
        aria-pressed={isActive}
        className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all min-h-[44px] w-full justify-between ${
          isActive
            ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border-cyan-400/60 shadow-[0_0_15px_rgba(34,211,238,0.25)]'
            : 'bg-gray-800/40 border-gray-700/60 hover:border-cyan-500/40'
        }`}
      >
        <div className="flex items-center gap-2">
          <motion.div
            className={`relative w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              isActive ? 'bg-gradient-to-br from-cyan-500 to-emerald-600' : 'bg-gray-700'
            }`}
            animate={isActive ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={{ duration: 1.6, repeat: isActive ? Infinity : 0, ease: 'easeInOut' }}
          >
            {voiceState === 'thinking' ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : isActive ? (
              <Mic className="w-4 h-4 text-white" />
            ) : (
              <MicOff className="w-4 h-4 text-gray-400" />
            )}
            {isActive && (
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-cyan-400"
                animate={{ scale: [1, 1.6], opacity: [0.8, 0] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
            )}
          </motion.div>
          <div className="text-left">
            <div className="text-xs font-semibold text-gray-200">KI Voice</div>
            <div className={`text-[11px] ${statusColor}`}>{statusText}</div>
          </div>
        </div>
        <VoiceEqualizer state={voiceState} />
      </button>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-[11px] text-red-400 text-right"
          >
            {error}
          </motion.p>
        )}
        {isActive && transcript && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full bg-cyan-900/30 border border-cyan-500/40 rounded-lg px-3 py-1.5"
          >
            <p className="text-xs text-cyan-200 break-words">{transcript}</p>
          </motion.div>
        )}
        {isActive && lastAnswer && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full bg-emerald-900/20 border border-emerald-500/30 rounded-lg px-3 py-1.5"
          >
            <p className="text-xs text-emerald-200 break-words">{lastAnswer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
