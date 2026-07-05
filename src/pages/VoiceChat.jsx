import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, PhoneOff, Phone, X, Loader2 } from 'lucide-react';
import { functions } from '@/api/frontendClient';
import { speakWithFallback, cancelElevenLabs } from '@/components/utils/elevenLabsTTS';
import SabrinaAvatar from '@/components/ai/SabrinaAvatar';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

// Status-Phasen des Gesprächs
const PHASE = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  LISTENING: 'listening',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
  ERROR: 'error',
};

export default function VoiceChat() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(PHASE.IDLE);
  const [errorMsg, setErrorMsg] = useState('');
  const [transcript, setTranscript] = useState([]); // {role, text}
  const [muted, setMuted] = useState(false);

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const micStreamRef = useRef(null);
  const audioElRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const assistantBufRef = useRef('');
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Fallback-Modus (turn-basiert): greift, wenn die OpenAI-Realtime-Verbindung
  // nicht zustande kommt. Nutzt die bewährte Pipeline STT -> catchgbtChat -> TTS.
  const [fallbackMode, setFallbackMode] = useState(false);
  const fallbackActiveRef = useRef(false);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef([]);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [transcript]);

  const cleanup = useCallback(() => {
    try { dcRef.current?.close(); } catch { /* noop */ }
    try { pcRef.current?.getSenders?.().forEach(s => s.track?.stop()); } catch { /* noop */ }
    try { pcRef.current?.close(); } catch { /* noop */ }
    try { micStreamRef.current?.getTracks().forEach(t => t.stop()); } catch { /* noop */ }
    if (audioElRef.current) { audioElRef.current.srcObject = null; }
    pcRef.current = null; dcRef.current = null; micStreamRef.current = null;
  }, []);

  useEffect(() => () => {
    cleanup();
    fallbackActiveRef.current = false;
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    recognitionRef.current = null;
    cancelElevenLabs();
    try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
  }, [cleanup]);

  const handleEvent = useCallback((evt) => {
    switch (evt.type) {
      case 'input_audio_buffer.speech_started':
        setPhase(PHASE.LISTENING);
        break;
      case 'response.created':
        assistantBufRef.current = '';
        setPhase(PHASE.SPEAKING);
        break;
      case 'response.audio_transcript.delta':
        if (evt.delta) assistantBufRef.current += evt.delta;
        break;
      case 'response.audio_transcript.done':
      case 'response.done': {
        const text = (evt.transcript || assistantBufRef.current || '').trim();
        if (text) setTranscript(prev => [...prev, { role: 'assistant', text }]);
        assistantBufRef.current = '';
        setPhase(PHASE.LISTENING);
        break;
      }
      case 'conversation.item.input_audio_transcription.completed': {
        const text = (evt.transcript || '').trim();
        if (text) setTranscript(prev => [...prev, { role: 'user', text }]);
        break;
      }
      case 'error':
        console.error('Realtime error event', evt);
        break;
      default:
        break;
    }
  }, []);

  // ── Fallback-Pipeline (turn-basiert) ───────────────────────────────────────
  // Als Funktions-Deklarationen (hoisted), damit sie sich gegenseitig aufrufen
  // können. Sie arbeiten ausschließlich über Refs/Setter und haben daher keine
  // veralteten Closures.
  function stopFallbackRecognition() {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    recognitionRef.current = null;
  }

  function speakFallbackAndListen(text) {
    setPhase(PHASE.SPEAKING);
    speakWithFallback(text, { voiceEnabled: true, lang: 'de-DE', rate: 1.0 })
      .catch(() => { /* Audio nicht kritisch */ })
      .finally(() => { if (fallbackActiveRef.current) startFallbackRecognition(); });
  }

  async function askFallback(q) {
    setPhase(PHASE.THINKING);
    const history = transcriptRef.current.map(t => ({
      role: t.role === 'user' ? 'user' : 'assistant',
      content: t.text,
    }));
    let answer = '';
    try {
      const res = await functions.invoke('catchgbtChat', {
        messages: [...history, { role: 'user', content: q }],
        context: 'voice_chat',
      });
      answer = res?.reply || res?.message || res?.data?.reply
        || 'Entschuldige, ich habe gerade keine Antwort parat.';
    } catch {
      answer = 'Es gab ein Verbindungsproblem. Bitte versuche es gleich noch einmal.';
    }
    if (!fallbackActiveRef.current) return;
    setTranscript(prev => [...prev, { role: 'assistant', text: answer }]);
    speakFallbackAndListen(answer);
  }

  function startFallbackRecognition() {
    if (!fallbackActiveRef.current || recognitionRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setErrorMsg('Spracherkennung wird von diesem Browser nicht unterstützt.');
      setPhase(PHASE.ERROR);
      fallbackActiveRef.current = false;
      return;
    }
    const rec = new SR();
    rec.lang = 'de-DE';
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const q = (e.results?.[e.results.length - 1]?.[0]?.transcript || '').trim();
      stopFallbackRecognition();
      if (!q) { if (fallbackActiveRef.current) startFallbackRecognition(); return; }
      setTranscript(prev => [...prev, { role: 'user', text: q }]);
      askFallback(q);
    };
    rec.onerror = (ev) => {
      stopFallbackRecognition();
      if (ev?.error === 'not-allowed' || ev?.error === 'service-not-allowed') {
        setErrorMsg('Mikrofon-Zugriff wurde verweigert. Bitte erlauben und erneut versuchen.');
        setPhase(PHASE.ERROR);
        fallbackActiveRef.current = false;
        setFallbackMode(false);
      } else if (fallbackActiveRef.current) {
        // no-speech u. Ä.: einfach weiter zuhören
        startFallbackRecognition();
      }
    };
    try {
      rec.start();
      recognitionRef.current = rec;
      setPhase(PHASE.LISTENING);
    } catch {
      recognitionRef.current = null;
    }
  }

  function startFallbackConversation() {
    fallbackActiveRef.current = true;
    setFallbackMode(true);
    setErrorMsg('');
    if (transcriptRef.current.length) {
      startFallbackRecognition();
    } else {
      const greeting = 'Hi, ich bin Sabrina, deine Angel-Expertin. Was möchtest du wissen?';
      setTranscript([{ role: 'assistant', text: greeting }]);
      speakFallbackAndListen(greeting);
    }
  }

  const start = useCallback(async () => {
    setErrorMsg('');
    setPhase(PHASE.CONNECTING);
    try {
      // 1) Kurzlebiges Token vom eigenen Backend holen (echter Key bleibt serverseitig)
      const session = await functions.invoke('realtimeSession');
      const ephemeralKey = session?.client_secret?.value;
      const model = session?.model || 'gpt-4o-realtime-preview-2024-12-17';
      if (!ephemeralKey) {
        throw new Error(session?.error || 'Kein Voice-Token erhalten. Ist OPENAI_API_KEY gesetzt?');
      }

      // 2) Audio-Element für die Antwort-Stimme
      const audioEl = audioElRef.current || new Audio();
      audioEl.autoplay = true;
      audioElRef.current = audioEl;

      // 3) WebRTC-Peer
      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };
      pc.onconnectionstatechange = () => {
        const st = pc.connectionState;
        if (st === 'failed' || st === 'disconnected' || st === 'closed') {
          if (phaseRef.current !== PHASE.IDLE && phaseRef.current !== PHASE.ERROR) {
            setErrorMsg('Verbindung verloren.');
            setPhase(PHASE.ERROR);
          }
        }
      };

      // 4) Mikrofon
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = mic;
      mic.getTracks().forEach(t => pc.addTrack(t, mic));

      // 5) Datenkanal für Events / Transkript
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;
      dc.onmessage = (e) => { try { handleEvent(JSON.parse(e.data)); } catch { /* noop */ } };
      dc.onopen = () => setPhase(PHASE.LISTENING);

      // 6) SDP-Offer an OpenAI
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const resp = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
          'OpenAI-Beta': 'realtime=v1',
        },
      });
      if (!resp.ok) throw new Error('OpenAI-Verbindung fehlgeschlagen (' + resp.status + ')');
      const answerSdp = await resp.text();
      // Falls der Nutzer zwischenzeitlich aufgelegt/die Seite verlassen hat,
      // ist die Verbindung schon zu — dann nicht mehr fortsetzen.
      if (pcRef.current !== pc) return;
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    } catch (e) {
      cleanup();
      // Mikrofon-Verweigerung würde auch den Fallback treffen -> direkt melden.
      if (e?.name === 'NotAllowedError' || /Permission/i.test(e?.message || '')) {
        const msg = 'Mikrofon-Zugriff wurde verweigert. Bitte erlauben und erneut versuchen.';
        setErrorMsg(msg);
        setPhase(PHASE.ERROR);
        toast.error(msg);
        return;
      }
      // Realtime nicht verfügbar (kein Key, Netzfehler, 4xx/5xx) -> nahtlos auf
      // die bewährte Pipeline STT -> catchgbtChat -> TTS wechseln, damit das
      // Gespräch trotzdem funktioniert.
      console.warn('[VoiceChat] Realtime nicht verfügbar, wechsle auf Fallback:', e?.message);
      startFallbackConversation();
    }
  }, [cleanup, handleEvent]);

  const hangUp = useCallback(() => {
    fallbackActiveRef.current = false;
    stopFallbackRecognition();
    cancelElevenLabs();
    try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    cleanup();
    setFallbackMode(false);
    setPhase(PHASE.IDLE);
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    const tracks = micStreamRef.current?.getAudioTracks() || [];
    const next = !muted;
    tracks.forEach(t => { t.enabled = !next; });
    setMuted(next);
  }, [muted]);

  const active = phase === PHASE.LISTENING || phase === PHASE.SPEAKING || phase === PHASE.THINKING;
  const statusText = {
    [PHASE.IDLE]: 'Tippe auf Gespräch starten und unterhalte dich wie am Telefon.',
    [PHASE.CONNECTING]: 'Verbinde…',
    [PHASE.LISTENING]: muted ? 'Mikrofon stumm' : 'Ich höre zu…',
    [PHASE.THINKING]: 'Sabrina überlegt…',
    [PHASE.SPEAKING]: 'Sabrina spricht…',
    [PHASE.ERROR]: errorMsg,
  }[phase];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 pb-28">
      <div className="flex items-center justify-between p-4 border-b border-gray-800 sticky top-0 z-10 backdrop-blur-xl bg-gray-950/80">
        <div>
          <h1 className="text-lg font-bold text-white">Live-Gespräch</h1>
          <p className="text-xs text-gray-500">Echtzeit-Sprache mit Sabrina</p>
        </div>
        <button
          onClick={() => { hangUp(); navigate(createPageUrl('AIAssistant')); }}
          className="p-2 text-gray-500 hover:text-white"
          title="Schließen"
        >
          <X size={20} />
        </button>
      </div>

      {/* Visualizer / Orb */}
      <div className="flex flex-col items-center justify-center gap-6 py-10">
        <div className="relative flex items-center justify-center">
          <AnimatePresence>
            {active && (
              <>
                <motion.span
                  className={`absolute rounded-full ${phase === PHASE.SPEAKING ? 'bg-cyan-500/20' : 'bg-emerald-500/20'}`}
                  initial={{ width: 120, height: 120, opacity: 0.6 }}
                  animate={{ width: 220, height: 220, opacity: 0 }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                />
                <motion.span
                  className={`absolute rounded-full ${phase === PHASE.SPEAKING ? 'bg-cyan-500/20' : 'bg-emerald-500/20'}`}
                  initial={{ width: 120, height: 120, opacity: 0.6 }}
                  animate={{ width: 180, height: 180, opacity: 0 }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
                />
              </>
            )}
          </AnimatePresence>
          <motion.div
            animate={active ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={{ duration: 1.4, repeat: active ? Infinity : 0 }}
            className={`w-32 h-32 rounded-full flex items-center justify-center shadow-2xl overflow-hidden ring-4 ${
              phase === PHASE.SPEAKING ? 'ring-cyan-500/60' : active ? 'ring-emerald-500/60' : 'ring-gray-700'
            }`}
          >
            {phase === PHASE.CONNECTING ? (
              <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                <Loader2 size={42} className="text-white animate-spin" />
              </div>
            ) : (
              <SabrinaAvatar speaking={phase === PHASE.SPEAKING} size={128} />
            )}
          </motion.div>
        </div>
        <p className={`text-sm text-center px-8 ${phase === PHASE.ERROR ? 'text-red-400' : 'text-gray-300'}`}>
          {statusText}
        </p>
      </div>

      {/* Transkript */}
      <div className="flex-1 overflow-auto px-4 space-y-3">
        {transcript.length === 0 && phase !== PHASE.IDLE && (
          <p className="text-center text-xs text-gray-600 mt-4">Das Gespräch erscheint hier als Text…</p>
        )}
        {transcript.map((t, i) => (
          <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
              t.role === 'user' ? 'bg-cyan-600/80 text-white' : 'bg-gray-800 text-gray-100'
            }`}>{t.text}</div>
          </div>
        ))}
        <div ref={transcriptEndRef} />
      </div>

      {/* Steuerung */}
      <div className="fixed bottom-0 left-0 right-0 p-6 border-t border-gray-800 bg-gray-950/90 backdrop-blur flex items-center justify-center gap-6">
        {!active && phase !== PHASE.CONNECTING ? (
          <button
            onClick={start}
            className="flex items-center gap-2 px-8 py-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg transition-colors"
          >
            <Phone size={20} /> Gespräch starten
          </button>
        ) : (
          <>
            {/* Stummschalten nur im echten Realtime-Modus (persistenter Mic-Stream) */}
            {!fallbackMode && (
              <button
                onClick={toggleMute}
                disabled={phase === PHASE.CONNECTING}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 ${
                  muted ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                }`}
                title={muted ? 'Stummschaltung aufheben' : 'Stummschalten'}
              >
                <Mic size={22} className={muted ? 'opacity-40' : ''} />
              </button>
            )}
            <button
              onClick={hangUp}
              className="flex items-center gap-2 px-8 py-4 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold shadow-lg transition-colors"
            >
              <PhoneOff size={20} /> Gespräch beenden
            </button>
          </>
        )}
      </div>
    </div>
  );
}
