import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Mic, Camera, Waves, ChevronRight, ChevronLeft, Zap, Loader2, Cable } from 'lucide-react';
import { toast } from 'sonner';
import { speakWithFallback, cancelElevenLabs } from '@/components/utils/elevenLabsTTS';
import { functions } from '@/api/frontendClient';

// Tabs, die ein Live-Kamerabild brauchen. Der Kamera-Stream wird nur solange
// gehalten, wie einer dieser Tabs aktiv (und das Overlay offen) ist.
const CAMERA_TABS = ['bite', 'camera', 'ar'];

const KNOTS = [
  { id: 1, name: 'Palomar', difficulty: 'Leicht', purpose: 'Universal', steps: ['Schnur doppeln', 'Knoten formen', 'Festziehen'] },
  { id: 2, name: 'Verbesserter Clinch', difficulty: 'Leicht', purpose: 'Wirbel/Haken', steps: ['5x Windungen', 'Durch erste Schlaufe', 'Festziehen'] },
  { id: 3, name: 'Blutknoten', difficulty: 'Mittel', purpose: 'Schnurverbindung', steps: ['Nebeneinander legen', 'Je 4x winden', 'Festziehen'] },
  { id: 4, name: 'FG Knoten', difficulty: 'Schwer', purpose: 'Fluo/Main', steps: ['X-Form bilden', '8x Umwindung', 'Festziehen'] },
];

// ── Module-level Subkomponenten ─────────────────────────────────────────────
// Bewusst aus der Render-Funktion herausgezogen: Zuvor wurden VoiceTab/BiteTab/
// … bei jeder State-Änderung (z. B. orbState-Wechsel) neu definiert, wodurch
// React den kompletten Tab-Teilbaum un- und remountete. Als stabile Komponenten
// bleibt der Baum erhalten und teure Re-Renders/Remounts entfallen.

const AnimatedOrb = ({ size = 'md', state = 'idle', reducedMotion = false }) => {
  const sizeMap = { sm: 'w-6 h-6', md: 'w-12 h-12', lg: 'w-24 h-24' };
  const sizeClass = sizeMap[size];

  const animate = reducedMotion
    ? {
        boxShadow:
          state === 'speaking' ? '0 0 24px hsl(var(--primary) / 0.45)'
          : state === 'listening' ? '0 0 16px hsl(var(--primary) / 0.35)'
          : '0 0 8px hsl(var(--primary) / 0.2)',
      }
    : {
        scale: state === 'listening' ? [1, 1.1, 1] : 1,
        boxShadow:
          state === 'speaking' ? ['0 0 14px hsl(var(--primary) / 0.4)', '0 0 24px hsl(var(--primary) / 0.45)']
          : state === 'listening' ? '0 0 16px hsl(var(--primary) / 0.35)'
          : '0 0 8px hsl(var(--primary) / 0.2)',
      };

  return (
    <motion.div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 relative overflow-hidden`}
      animate={animate}
      transition={reducedMotion ? { duration: 0 } : { duration: state === 'thinking' ? 2 : 0.8, repeat: Infinity }}
    >
      {state === 'thinking' && !reducedMotion && (
        <motion.div
          className="absolute inset-0 border-2 border-transparent border-t-white"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </motion.div>
  );
};

const VoiceTab = ({ orbState, transcript, chatHistory, isListening, isLoading, onMic, reducedMotion }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-col h-full relative"
  >
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
      <AnimatedOrb size="lg" state={orbState} reducedMotion={reducedMotion} />

      {transcript && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 rounded-lg p-4 max-w-sm text-center text-sm text-gray-200"
        >
          {transcript}
        </motion.div>
      )}

      <div className="w-full max-w-md space-y-3">
        {chatHistory.slice(-2).map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
              msg.role === 'user'
                ? 'bg-cyan-600/30 text-cyan-200'
                : 'bg-gray-700/50 text-gray-200'
            }`}>
              {msg.content}
            </div>
          </motion.div>
        ))}
      </div>
    </div>

    {/* Sound waves */}
    <div className="flex items-end justify-center gap-1 h-24 pb-6">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-gradient-to-t from-cyan-400 to-cyan-600 rounded-full"
          style={{ height: 8 }}
          animate={reducedMotion ? { height: 8 } : {
            height: isListening || orbState === 'speaking' ? [8, 20, 8, 12, 8] : 8,
          }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.6, delay: i * 0.05, repeat: Infinity }}
        />
      ))}
    </div>

    {/* Mic Button */}
    <div className="flex justify-center pb-6">
      <motion.button
        onClick={onMic}
        disabled={isLoading}
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
          orbState === 'speaking'
            ? 'bg-green-600 hover:bg-green-700'
            : isLoading
            ? 'bg-gray-600'
            : 'bg-cyan-600 hover:bg-cyan-700'
        }`}
        whileHover={reducedMotion ? undefined : { scale: 1.1 }}
        whileTap={reducedMotion ? undefined : { scale: 0.95 }}
      >
        {isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin text-white" />
        ) : (
          <Mic className="w-6 h-6 text-white" />
        )}
      </motion.button>
    </div>
  </motion.div>
);

const CameraStage = ({ videoRef, cameraError }) => (
  <>
    <video
      ref={videoRef}
      className="absolute inset-0 w-full h-full object-cover"
      autoPlay
      playsInline
      muted
    />
    {cameraError && (
      <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
        <div className="bg-black/60 rounded-lg p-4 text-sm text-gray-200 max-w-xs">
          {cameraError}
        </div>
      </div>
    )}
  </>
);

const BiteTab = ({ videoRef, canvasRef, cameraError, biteMode, setBiteMode, biteDetected, orbState, reducedMotion }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-col h-full"
  >
    <CameraStage videoRef={videoRef} cameraError={cameraError} />
    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

    {biteDetected && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [1, 0.5] }}
        className="fixed inset-0 bg-red-600/40 pointer-events-none"
      />
    )}

    {biteDetected && (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-bold text-red-400 z-50"
      >
        BISS!
      </motion.div>
    )}

    <div className="absolute bottom-32 left-0 right-0 flex justify-center gap-4 px-4">
      <motion.button
        onClick={() => setBiteMode(biteMode === 'string' ? null : 'string')}
        className={`px-6 py-3 rounded-lg font-semibold transition-all ${
          biteMode === 'string'
            ? 'bg-cyan-600 text-white'
            : 'bg-gray-700/60 text-gray-300 hover:bg-gray-600'
        }`}
        whileHover={reducedMotion ? undefined : { scale: 1.05 }}
      >
        Schnur
      </motion.button>
      <motion.button
        onClick={() => setBiteMode(biteMode === 'tip' ? null : 'tip')}
        className={`px-6 py-3 rounded-lg font-semibold transition-all ${
          biteMode === 'tip'
            ? 'bg-amber-600 text-white'
            : 'bg-gray-700/60 text-gray-300 hover:bg-gray-600'
        }`}
        whileHover={reducedMotion ? undefined : { scale: 1.05 }}
      >
        Spitze
      </motion.button>
    </div>

    <div className="absolute top-4 right-4">
      <AnimatedOrb size="sm" state={orbState} reducedMotion={reducedMotion} />
    </div>
  </motion.div>
);

const CameraTab = ({ videoRef, cameraError, isLoading, onAnalyze, orbState, reducedMotion }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-col h-full"
  >
    <CameraStage videoRef={videoRef} cameraError={cameraError} />

    {/* Scan points */}
    <motion.div className="absolute inset-0">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute w-6 h-6 border-2 border-cyan-400 rounded-full"
          animate={reducedMotion ? { opacity: 0.6 } : { opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={reducedMotion ? { duration: 0 } : { duration: 2, delay: i * 0.3, repeat: Infinity }}
          style={{ left: `${20 + i * 30}%`, top: `${30 + i * 20}%` }}
        />
      ))}
    </motion.div>

    <div className="absolute bottom-24 left-0 right-0 flex justify-center">
      <motion.button
        onClick={onAnalyze}
        disabled={isLoading}
        className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold flex items-center gap-2"
        whileHover={reducedMotion ? undefined : { scale: 1.05 }}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        Analysieren
      </motion.button>
    </div>

    <div className="absolute top-4 right-4">
      <AnimatedOrb size="sm" state={orbState} reducedMotion={reducedMotion} />
    </div>
  </motion.div>
);

const ARTab = ({ videoRef, cameraError, orbState, reducedMotion }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-col h-full"
  >
    <CameraStage videoRef={videoRef} cameraError={cameraError} />

    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-blue-600/20" />

    <motion.svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      {[0, 1, 2].map((i) => (
        <motion.path
          key={i}
          d="M 0 50 Q 25 30 50 50 T 100 50"
          stroke="hsl(var(--primary) / 0.4)"
          strokeWidth="2"
          fill="none"
          animate={reducedMotion ? undefined : {
            d: ['M 0 50 Q 25 30 50 50 T 100 50', 'M 0 50 Q 25 70 50 50 T 100 50', 'M 0 50 Q 25 30 50 50 T 100 50'],
          }}
          transition={reducedMotion ? { duration: 0 } : { duration: 2, delay: i * 0.3, repeat: Infinity }}
          style={{ y: `${20 + i * 20}%` }}
        />
      ))}
    </motion.svg>

    <div className="absolute top-4 right-4">
      <AnimatedOrb size="sm" state={orbState} reducedMotion={reducedMotion} />
    </div>
  </motion.div>
);

const KnotTab = ({ selectedKnot, setSelectedKnot, knotStep, setKnotStep, onAskBuddy, reducedMotion }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-col h-full overflow-y-auto"
  >
    {!selectedKnot ? (
      <div className="flex-1 p-4 space-y-3">
        {KNOTS.map((knot) => (
          <motion.div
            key={knot.id}
            onClick={() => { setSelectedKnot(knot); setKnotStep(0); }}
            className="bg-gray-800/50 rounded-lg p-4 cursor-pointer hover:bg-gray-700/50 transition-colors"
            whileHover={reducedMotion ? undefined : { scale: 1.02 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">{knot.name}</div>
                <div className="text-xs text-gray-400">{knot.purpose}</div>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-semibold ${
                knot.difficulty === 'Leicht' ? 'bg-green-600/20 text-green-300'
                : knot.difficulty === 'Mittel' ? 'bg-yellow-600/20 text-yellow-300'
                : 'bg-red-600/20 text-red-300'
              }`}>
                {knot.difficulty}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    ) : (
      <div className="flex-1 flex flex-col p-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white mb-6">{selectedKnot.name}</h2>

          <div className="flex gap-2 justify-center mb-6">
            {selectedKnot.steps.map((_, idx) => (
              <motion.div
                key={idx}
                className={`w-2 h-2 rounded-full ${idx <= knotStep ? 'bg-cyan-400' : 'bg-gray-600'}`}
                animate={idx === knotStep ? { scale: 1.5 } : { scale: 1 }}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={knotStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-gray-800/50 rounded-lg p-6 text-center text-lg font-semibold text-gray-200 mb-6"
            >
              {selectedKnot.steps[knotStep]}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex gap-4 justify-center mb-4">
          <motion.button
            onClick={() => setKnotStep(prev => Math.max(0, prev - 1))}
            disabled={knotStep === 0}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={reducedMotion ? undefined : { scale: 1.05 }}
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>

          <motion.button
            onClick={() => setKnotStep(prev => Math.min(selectedKnot.steps.length - 1, prev + 1))}
            disabled={knotStep === selectedKnot.steps.length - 1}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={reducedMotion ? undefined : { scale: 1.05 }}
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>

        <motion.button
          onClick={() => onAskBuddy(selectedKnot)}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold text-white flex items-center justify-center gap-2"
          whileHover={reducedMotion ? undefined : { scale: 1.02 }}
        >
          <Zap className="w-4 h-4" /> KI-Buddy fragen
        </motion.button>

        <motion.button
          onClick={() => { setSelectedKnot(null); setKnotStep(0); }}
          className="w-full mt-2 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold text-gray-200"
          whileHover={reducedMotion ? undefined : { scale: 1.02 }}
        >
          Zurück
        </motion.button>
      </div>
    )}
  </motion.div>
);

const VoiceOverlay = ({ isOpen, onClose, currentPageName }) => {
  const reducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState('voice');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [orbState, setOrbState] = useState('idle'); // idle, listening, thinking, speaking
  const [messageCount, setMessageCount] = useState(0);
  const [rateLimitTime, setRateLimitTime] = useState(0);
  const [hasInitialGreeting, setHasInitialGreeting] = useState(false);

  // Bite detection
  const [biteMode, setBiteMode] = useState(null); // 'string' or 'tip'
  const [biteDetected] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Kamera + Spracherkennung als Refs, damit sie im Cleanup sauber gestoppt
  // werden können (Ressourcen-/Berechtigungs-Leak vermeiden).
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const isMountedRef = useRef(true);
  const [cameraError, setCameraError] = useState(null);

  // Knoten (Knots)
  const [selectedKnot, setSelectedKnot] = useState(null);
  const [knotStep, setKnotStep] = useState(0);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => { try { t.stop(); } catch { /* ignore */ } });
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
  }, []);

  // Rate limiter
  useEffect(() => {
    if (rateLimitTime > 0) {
      const timer = setTimeout(() => setRateLimitTime(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [rateLimitTime]);

  // Live-Kamera an-/abschalten, je nach aktivem Tab und Overlay-Status.
  useEffect(() => {
    if (!isOpen || !CAMERA_TABS.includes(activeTab)) {
      stopCamera();
      setCameraError(null);
      return undefined;
    }

    let cancelled = false;
    setCameraError(null);
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try { await videoRef.current.play(); } catch { /* Autoplay-Policy: ignoriert */ }
        }
      } catch {
        if (!cancelled) {
          setCameraError('Kamera nicht verfügbar. Bitte Kamera-Berechtigung erlauben.');
          toast.error('Kamerazugriff nicht möglich');
        }
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [isOpen, activeTab, stopCamera]);

  // Initiale Begrüßung, wenn Voice-Tab geöffnet wird
  useEffect(() => {
    if (isOpen && activeTab === 'voice' && !hasInitialGreeting && chatHistory.length === 0) {
      setHasInitialGreeting(true);
      const greetings = [
        'Wie war\'s denn zuletzt beim Angeln?',
        'Hast du heute schon was geplant?',
        'Welcher Fisch ist gerade dein Traum-Fang?',
        'Wie siehts aus – gehts du eher aufs Volumen oder Big Game?',
      ];
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];
      setChatHistory([{ role: 'assistant', content: greeting }]);
      setOrbState('speaking');

      const afterSpeech = () => {
        if (isMountedRef.current) setOrbState('idle');
      };

      setTimeout(() => {
        if (!isMountedRef.current) return;
        // Nur die natürliche ElevenLabs-Stimme; bei Fehlern bleibt es still
        // und der Orb geht zurück in den Ruhezustand.
        speakWithFallback(greeting, { voiceEnabled: true, rate: 1.0 }).finally(afterSpeech);
      }, 500);
    }
  }, [isOpen, activeTab, hasInitialGreeting, chatHistory.length]);

  const checkRateLimit = () => {
    if (messageCount >= 8) {
      if (rateLimitTime === 0) {
        setMessageCount(0);
        setRateLimitTime(60);
        return true;
      }
      toast.error(`Rate limit. Bitte ${rateLimitTime}s warten.`);
      return false;
    }
    return true;
  };

  const handleSendMessage = async (text) => {
    if (!checkRateLimit()) return;

    setIsLoading(true);
    setOrbState('thinking');
    setMessageCount(prev => prev + 1);

    try {
      const newMessage = { role: 'user', content: text };
      setChatHistory(prev => [...prev, newMessage]);
      setTranscript('');

      // Call catchgbtChat über den authentifizierten Client (/api/ai/chat).
      // Backend erwartet { messages: [...] } und gibt { reply } zurück.
      const messages = [...chatHistory, newMessage].map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));
      const response = await functions.invoke('catchgbtChat', {
        messages,
        context: 'voice_overlay',
      });

      if (!isMountedRef.current) return;

      const aiResponse = response?.data?.reply || response?.reply || 'Keine Antwort';

      setChatHistory(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      setOrbState('speaking');

      // TTS — primär ElevenLabs, Browser-TTS nur als Fallback.
      // Push-to-talk: nach der Antwort zurück in den Ruhezustand, bis der Nutzer
      // erneut auf das Mikrofon tippt (es läuft keine Daueraufnahme).
      const afterSpeech = () => {
        if (!isMountedRef.current) return;
        setOrbState('idle');
        setIsListening(false);
      };
      // speakWithFallback löst auf, wenn die Wiedergabe beendet ist, und bleibt
      // bei Fehlern still (kein Roboterstimmen-Fallback mehr).
      await speakWithFallback(aiResponse, { voiceEnabled: true, rate: 1.0 });
      afterSpeech();
    } catch (error) {
      console.error('Chat error:', error);
      if (!isMountedRef.current) return;
      toast.error('Fehler beim Senden');
      setOrbState('idle');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech Recognition nicht verfügbar');
      return;
    }

    // Eventuell noch laufende Erkennung zuerst beenden.
    stopRecognition();

    setIsListening(true);
    setOrbState('listening');
    setTranscript('');

    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';

    recognition.onstart = () => {
      setOrbState('listening');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const resultText = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setTranscript(prev => prev + ' ' + resultText);
          handleSendMessage(resultText.trim());
        } else {
          interimTranscript += resultText;
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech error:', event.error);
      toast.error('Fehler beim Erkennen');
      setOrbState('idle');
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      // Endet die Erkennung ohne finales Ergebnis (Stille, Abbruch), darf der
      // Zustand nicht auf „Hört zu" hängen bleiben.
      setIsListening(false);
      setOrbState((prev) => (prev === 'listening' ? 'idle' : prev));
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      // start() wirft z. B. bei bereits laufender Erkennung (InvalidStateError).
      console.warn('[VoiceOverlay] Spracherkennung konnte nicht starten:', e?.message);
      setIsListening(false);
      setOrbState('idle');
    }
  };

  const handleAnalyze = useCallback(() => {
    handleSendMessage('Analysiere mein aktuelles Angelbild und gib mir Tipps zu Köder, Stelle und Technik');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatHistory, messageCount, rateLimitTime]);

  const handleAskBuddyForKnot = useCallback((knot) => {
    setSelectedKnot(null);
    setActiveTab('voice');
    handleSendMessage(`Ich möchte den ${knot.name} lernen. Kannst du mir dabei helfen?`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatHistory, messageCount, rateLimitTime]);

  const tabs = [
    { id: 'voice', label: 'Voice', icon: Mic },
    { id: 'bite', label: 'Biss', icon: Zap },
    { id: 'camera', label: 'Kamera', icon: Camera },
    { id: 'ar', label: 'AR', icon: Waves },
    // Ohne Icon wäre der Tab-Button unsichtbar (die Tab-Leiste rendert nur
    // das Icon) — der Knoten-Bereich wäre gar nicht erreichbar.
    { id: 'knot', label: 'Knoten', icon: Cable },
  ];

  // Reset greeting flag wenn Overlay geschlossen wird + Ressourcen freigeben.
  useEffect(() => {
    if (!isOpen) {
      setHasInitialGreeting(false);
      stopRecognition();
      stopCamera();
      setIsListening(false);
      setOrbState('idle');
      cancelElevenLabs();
    }
  }, [isOpen, stopRecognition, stopCamera]);

  // Unmount: alles stoppen (Kamera, Erkennung, Sprachausgabe).
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopRecognition();
      stopCamera();
      cancelElevenLabs();
    };
  }, [stopRecognition, stopCamera]);

  if (!isOpen) return null;

  const renderTab = () => {
    switch (activeTab) {
      case 'bite':
        return (
          <BiteTab
            videoRef={videoRef}
            canvasRef={canvasRef}
            cameraError={cameraError}
            biteMode={biteMode}
            setBiteMode={setBiteMode}
            biteDetected={biteDetected}
            orbState={orbState}
            reducedMotion={reducedMotion}
          />
        );
      case 'camera':
        return (
          <CameraTab
            videoRef={videoRef}
            cameraError={cameraError}
            isLoading={isLoading}
            onAnalyze={handleAnalyze}
            orbState={orbState}
            reducedMotion={reducedMotion}
          />
        );
      case 'ar':
        return (
          <ARTab
            videoRef={videoRef}
            cameraError={cameraError}
            orbState={orbState}
            reducedMotion={reducedMotion}
          />
        );
      case 'knot':
        return (
          <KnotTab
            selectedKnot={selectedKnot}
            setSelectedKnot={setSelectedKnot}
            knotStep={knotStep}
            setKnotStep={setKnotStep}
            onAskBuddy={handleAskBuddyForKnot}
            reducedMotion={reducedMotion}
          />
        );
      case 'voice':
      default:
        return (
          <VoiceTab
            orbState={orbState}
            transcript={transcript}
            chatHistory={chatHistory}
            isListening={isListening}
            isLoading={isLoading}
            onMic={startListening}
            reducedMotion={reducedMotion}
          />
        );
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black"
        style={{
          background: 'radial-gradient(ellipse at 50% 20%, #0a1628 0%, #050d1a 60%, #000 100%)',
        }}
      >
        {/* Floating particles */}
        {!reducedMotion && Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-cyan-400/20"
            animate={{
              x: [0, Math.random() * 100 - 50],
              y: [0, Math.random() * 100 - 50],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-40 pt-safe">
          <div className="flex items-center gap-3">
            <AnimatedOrb size="sm" state={orbState} reducedMotion={reducedMotion} />
            <div>
              <div className="text-white font-semibold">KI Buddy</div>
              <div className={`text-xs ${
                orbState === 'listening' ? 'text-cyan-300'
                : orbState === 'thinking' ? 'text-yellow-300'
                : orbState === 'speaking' ? 'text-green-300'
                : 'text-gray-400'
              }`}>
                {orbState === 'listening' ? 'Hört zu...'
                : orbState === 'thinking' ? 'Denkt...'
                : orbState === 'speaking' ? 'Spricht...'
                : 'Bereit'}
              </div>
            </div>
          </div>

          <motion.button
            onClick={onClose}
            className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
            whileHover={reducedMotion ? undefined : { scale: 1.1 }}
            whileTap={reducedMotion ? undefined : { scale: 0.95 }}
          >
            <X className="w-6 h-6 text-gray-400 hover:text-white" />
          </motion.button>
        </div>

        {/* Content */}
        <div className="absolute inset-0 top-20 bottom-24 pt-4 pb-safe-lg">
          {renderTab()}
        </div>

        {/* Bottom Tab Bar */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-sm rounded-t-3xl border-t border-gray-800/60 p-4"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          <div className="flex justify-around items-center max-w-md mx-auto">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative p-3 text-gray-400 hover:text-white transition-colors"
                whileHover={reducedMotion ? undefined : { scale: 1.1 }}
                whileTap={reducedMotion ? undefined : { scale: 0.95 }}
              >
                {tab.icon && <tab.icon className="w-5 h-5" />}

                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600"
                    animate={reducedMotion ? undefined : { scale: [1, 1.2, 1] }}
                    transition={reducedMotion ? { duration: 0 } : { duration: 1, repeat: Infinity }}
                  />
                )}
              </motion.button>
            ))}
          </div>

          <div className="text-center text-xs text-gray-500 mt-3">
            KI-Buddy hört mit
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VoiceOverlay;
