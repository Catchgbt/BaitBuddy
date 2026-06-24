import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, PhoneOff, Phone, X, Loader2 } from 'lucide-react';
import { api } from '@/api/client';
import { toast } from 'sonner';

// Status-Phasen des Gesprächs
const PHASE = {
  IDLE: 'idle',          // noch nicht gestartet
  CONNECTING: 'connecting',
  LISTENING: 'listening', // BaitBuddy hört zu
  SPEAKING: 'speaking',   // BaitBuddy spricht
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
  // Puffer für die laufende Assistenten-Antwort (Delta-Stream)
  const assistantBufRef = useRef('');

  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [transcript]);

  const cleanup = useCallback(() => {
    try { dcRef.current?.close(); } catch { /* noop */ }
    try { pcRef.current?.getSenders?.().forEach(s => s.track?.stop()); } catch { /* noop */ }
    try { pcRef.current?.close(); } catch { /* noop */ }
    try { micStreamRef.current?.getTracks().forEach(t => t.stop()); } catch { /* noop */ }
    if (audioElRef.current) { audioElRef.current.srcObject = null; }
    pcRef.current = null; dcRef.current = null; micStreamRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const handleEvent = useCallback((evt) => {
    switch (evt.type) {
      case 'input_audio_buffer.speech_started':
        // Nutzer redet -> BaitBuddy hört
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
        // eslint-disable-next-line no-console
        console.error('Realtime error event', evt);
        break;
      default:
        break;
    }
  }, []);

  const start = useCallback(async () => {
    setErrorMsg('');
    setPhase(PHASE.CONNECTING);
    try {
      // 1) Kurzlebiges Token vom eigenen Backend holen (echter Key bleibt serverseitig)
      const session = await api.post('/ai/realtime-session', {});
      const ephemeralKey = session?.client_secret?.value;
      const model = session?.model || 'gpt-4o-realtime-preview-2024-12-17';
      if (!ephemeralKey) throw new Error('Kein Voice-Token erhalten');

      // 2) Audio-Element für die Antwort-Stimme vorbereiten
      const audioEl = audioElRef.current || new Audio();
      audioEl.autoplay = true;
      audioElRef.current = audioEl;

      // 3) WebRTC-Peer aufbauen
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

      // 4) Mikrofon holen und senden
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = mic;
      mic.getTracks().forEach(t => pc.addTrack(t, mic));

      // 5) Datenkanal für Events / Transkript
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;
      dc.onmessage = (e) => { try { handleEvent(JSON.parse(e.data)); } catch { /* noop */ } };
      dc.onopen = () => setPhase(PHASE.LISTENING);

      // 6) SDP-Offer erstellen und an OpenAI senden
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
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    } catch (e) {
      cleanup();
      const msg = e?.message?.includes('Permission') || e?.name === 'NotAllowedError'
        ? 'Mikrofon-Zugriff wurde verweigert. Bitte erlauben und erneut versuchen.'
        : (e?.message || 'Start fehlgeschlagen');
      setErrorMsg(msg);
      setPhase(PHASE.ERROR);
      toast.error(msg);
    }
  }, [cleanup, handleEvent]);

  // phase als Ref, damit Callbacks die aktuelle Phase kennen
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const hangUp = useCallback(() => {
    cleanup();
    setPhase(PHASE.IDLE);
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    const tracks = micStreamRef.current?.getAudioTracks() || [];
    const next = !muted;
    tracks.forEach(t => { t.enabled = !next; });
    setMuted(next);
  }, [muted]);

  const active = phase === PHASE.LISTENING || phase === PHASE.SPEAKING;
  const statusText = {
    [PHASE.IDLE]: 'Tippe auf den Button und unterhalte dich wie am Telefon.',
    [PHASE.CONNECTING]: 'Verbinde…',
    [PHASE.LISTENING]: muted ? 'Mikrofon stumm' : 'Ich höre zu…',
    [PHASE.SPEAKING]: 'BaitBuddy spricht…',
    [PHASE.ERROR]: errorMsg,
  }[phase];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gradient-to-b from-gray-950 to-gray-900">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div>
          <h1 className="text-lg font-bold text-white">🎙️ Live-Gespräch</h1>
          <p className="text-xs text-gray-500">Echtzeit-Sprache · OpenAI Realtime</p>
        </div>
        <button onClick={() => { hangUp(); navigate('/app/chat'); }} className="p-2 text-gray-500 hover:text-white">
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
            animate={active ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ duration: 1.4, repeat: active ? Infinity : 0 }}
            className={`w-32 h-32 rounded-full flex items-center justify-center shadow-2xl ${
              phase === PHASE.SPEAKING ? 'bg-cyan-600' : active ? 'bg-emerald-600' : 'bg-gray-700'
            }`}
          >
            {phase === PHASE.CONNECTING
              ? <Loader2 size={42} className="text-white animate-spin" />
              : <Mic size={42} className="text-white" />}
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
      <div className="p-6 border-t border-gray-800 flex items-center justify-center gap-6">
        {!active && phase !== PHASE.CONNECTING ? (
          <button
            onClick={start}
            className="flex items-center gap-2 px-8 py-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg transition-colors"
          >
            <Phone size={20} /> Gespräch starten
          </button>
        ) : (
          <>
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
            <button
              onClick={hangUp}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg transition-colors"
              title="Auflegen"
            >
              <PhoneOff size={26} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
