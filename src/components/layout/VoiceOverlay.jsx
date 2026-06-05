import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Camera, Waves, ChevronRight, ChevronLeft, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const VoiceOverlay = ({ isOpen, onClose, currentPageName }) => {
  const [activeTab, setActiveTab] = useState('voice');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [orbState, setOrbState] = useState('idle'); // idle, listening, thinking, speaking
  const [messageCount, setMessageCount] = useState(0);
  const [rateLimitTime, setRateLimitTime] = useState(0);
  
  // Bite detection
  const [biteMode, setBiteMode] = useState(null); // 'string' or 'tip'
  const [isRecording, setIsRecording] = useState(false);
  const [biteDetected, setBiteDetected] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Knoten (Knots)
  const [selectedKnot, setSelectedKnot] = useState(null);
  const [knotStep, setKnotStep] = useState(0);
  
  const knots = [
    { id: 1, name: 'Palomar', difficulty: 'Leicht', purpose: 'Universal', steps: ['Schnur doppeln', 'Knoten formen', 'Festziehen'] },
    { id: 2, name: 'Verbesserter Clinch', difficulty: 'Leicht', purpose: 'Wirbel/Haken', steps: ['5x Windungen', 'Durch erste Schlaufe', 'Festziehen'] },
    { id: 3, name: 'Blutknoten', difficulty: 'Mittel', purpose: 'Schnurverbindung', steps: ['Nebeneinander legen', 'Je 4x winden', 'Festziehen'] },
    { id: 4, name: 'FG Knoten', difficulty: 'Schwer', purpose: 'Fluo/Main', steps: ['X-Form bilden', '8x Umwindung', 'Festziehen'] }
  ];
  
  // Rate limiter
  useEffect(() => {
    if (rateLimitTime > 0) {
      const timer = setTimeout(() => setRateLimitTime(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [rateLimitTime]);
  
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
      
      // Call catchgbtChat
      const response = await fetch('/api/functions/catchgbtChat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationHistory: chatHistory })
      });
      
      const data = await response.json();
      const aiResponse = data.reply || 'Keine Antwort';
      
      setChatHistory(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      setOrbState('speaking');
      
      // TTS
      try {
        const ttsResponse = await fetch('/api/functions/backendTextToSpeech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: aiResponse })
        });
        
        const ttsData = await ttsResponse.json();
        if (ttsData.audioUrl) {
          const audio = new Audio(ttsData.audioUrl);
          await audio.play();
          audio.onended = () => {
            setOrbState('listening');
            setIsListening(true);
          };
        }
      } catch {
        // Fallback Browser TTS
        const utterance = new SpeechSynthesisUtterance(aiResponse);
        utterance.lang = 'de-DE';
        window.speechSynthesis.speak(utterance);
        utterance.onend = () => {
          setOrbState('listening');
          setIsListening(true);
        };
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Fehler beim Senden');
      setOrbState('idle');
    } finally {
      setIsLoading(false);
    }
  };
  
  const startListening = () => {
    setIsListening(true);
    setOrbState('listening');
    setTranscript('');
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech Recognition nicht verfügbar');
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    
    recognition.onstart = () => {
      setOrbState('listening');
    };
    
    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setTranscript(prev => prev + ' ' + transcript);
          handleSendMessage((transcript).trim());
        } else {
          interimTranscript += transcript;
        }
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech error:', event.error);
      toast.error('Fehler beim Erkennen');
      setOrbState('idle');
      setIsListening(false);
    };
    
    recognition.start();
  };
  
  // Animated Orb
  const AnimatedOrb = ({ size = 'md', state = orbState }) => {
    const sizeMap = { sm: 'w-6 h-6', md: 'w-12 h-12', lg: 'w-24 h-24' };
    const sizeClass = sizeMap[size];
    
    return (
      <motion.div
        className={`${sizeClass} rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 relative overflow-hidden`}
        animate={{
          scale: state === 'listening' ? [1, 1.1, 1] : state === 'thinking' ? 1 : 1,
          boxShadow: 
            state === 'speaking' ? ['0 0 20px rgba(34,211,238,0.8)', '0 0 40px rgba(34,211,238,0.8)']
            : state === 'listening' ? '0 0 20px rgba(34,211,238,0.6)'
            : '0 0 10px rgba(34,211,238,0.3)'
        }}
        transition={{ duration: state === 'thinking' ? 2 : 0.8, repeat: Infinity }}
      >
        {state === 'thinking' && (
          <motion.div
            className="absolute inset-0 border-2 border-transparent border-t-white"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </motion.div>
    );
  };
  
  // Voice Tab
  const VoiceTab = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full relative"
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        <AnimatedOrb size="lg" state={orbState} />
        
        {/* Transcript */}
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 rounded-lg p-4 max-w-sm text-center text-sm text-gray-200"
          >
            {transcript}
          </motion.div>
        )}
        
        {/* Chat bubbles - last 2 */}
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
            animate={{
              height: isListening || orbState === 'speaking'
                ? [8, 20, 8, 12, 8]
                : 8
            }}
            transition={{
              duration: 0.6,
              delay: i * 0.05,
              repeat: Infinity
            }}
          />
        ))}
      </div>
      
      {/* Mic Button */}
      <div className="flex justify-center pb-6">
        <motion.button
          onClick={startListening}
          disabled={isLoading}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
            orbState === 'speaking'
              ? 'bg-green-600 hover:bg-green-700'
              : isLoading
              ? 'bg-gray-600'
              : 'bg-cyan-600 hover:bg-cyan-700'
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
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
  
  // Bite Tab
  const BiteTab = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      
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
      
      {/* Mode buttons */}
      <div className="absolute bottom-32 left-0 right-0 flex justify-center gap-4 px-4">
        <motion.button
          onClick={() => setBiteMode(biteMode === 'string' ? null : 'string')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            biteMode === 'string'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-700/60 text-gray-300 hover:bg-gray-600'
          }`}
          whileHover={{ scale: 1.05 }}
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
          whileHover={{ scale: 1.05 }}
        >
          Spitze
        </motion.button>
      </div>
      
      {/* Small orb */}
      <div className="absolute top-4 right-4">
        <AnimatedOrb size="sm" state={orbState} />
      </div>
    </motion.div>
  );
  
  // Camera Tab
  const CameraTab = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
      />
      
      {/* Scan points */}
      <motion.div className="absolute inset-0">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute w-6 h-6 border-2 border-cyan-400 rounded-full"
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
            style={{
              left: `${20 + i * 30}%`,
              top: `${30 + i * 20}%`
            }}
          />
        ))}
      </motion.div>
      
      {/* Analyze button */}
      <div className="absolute bottom-24 left-0 right-0 flex justify-center">
        <motion.button
          onClick={() => handleSendMessage('Analysiere mein aktuelles Angelbild und gib mir Tipps zu Köder, Stelle und Technik')}
          disabled={isLoading}
          className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          Analysieren
        </motion.button>
      </div>
      
      {/* Small orb */}
      <div className="absolute top-4 right-4">
        <AnimatedOrb size="sm" state={orbState} />
      </div>
    </motion.div>
  );
  
  // AR Tab
  const ARTab = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
      />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-blue-600/20" />
      
      {/* Water waves */}
      <motion.svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {[0, 1, 2].map((i) => (
          <motion.path
            key={i}
            d="M 0 50 Q 25 30 50 50 T 100 50"
            stroke="rgba(34,211,238,0.4)"
            strokeWidth="2"
            fill="none"
            animate={{
              d: ['M 0 50 Q 25 30 50 50 T 100 50', 'M 0 50 Q 25 70 50 50 T 100 50', 'M 0 50 Q 25 30 50 50 T 100 50']
            }}
            transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
            style={{ y: `${20 + i * 20}%` }}
          />
        ))}
      </motion.svg>
      
      {/* Hotspots */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute flex flex-col items-center"
          style={{
            left: `${20 + i * 30}%`,
            top: `${40 + i * 15}%`
          }}
          animate={{
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.div
            className="w-3 h-3 bg-yellow-400 rounded-full"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <div className="text-xs text-yellow-300 mt-1">Spot {i + 1}</div>
        </motion.div>
      ))}
      
      {/* Info */}
      <div className="absolute top-4 left-4 bg-black/50 rounded p-2 text-xs text-cyan-300">
        <div>Tiefe: {Math.floor(Math.random() * 8 + 2)}m</div>
        <div>Temperatur: {Math.floor(Math.random() * 6 + 12)}°C</div>
        <div>3 Hotspots</div>
      </div>
      
      {/* Small orb */}
      <div className="absolute top-4 right-4">
        <AnimatedOrb size="sm" state={orbState} />
      </div>
    </motion.div>
  );
  
  // Knot Tab
  const KnotTab = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full overflow-y-auto"
    >
      {!selectedKnot ? (
        <div className="flex-1 p-4 space-y-3">
          {knots.map((knot) => (
            <motion.div
              key={knot.id}
              onClick={() => {
                setSelectedKnot(knot);
                setKnotStep(0);
              }}
              className="bg-gray-800/50 rounded-lg p-4 cursor-pointer hover:bg-gray-700/50 transition-colors"
              whileHover={{ scale: 1.02 }}
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
            
            {/* Step indicator */}
            <div className="flex gap-2 justify-center mb-6">
              {selectedKnot.steps.map((_, idx) => (
                <motion.div
                  key={idx}
                  className={`w-2 h-2 rounded-full ${
                    idx <= knotStep ? 'bg-cyan-400' : 'bg-gray-600'
                  }`}
                  animate={idx === knotStep ? { scale: 1.5 } : { scale: 1 }}
                />
              ))}
            </div>
            
            {/* Current step */}
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
          
          {/* Navigation buttons */}
          <div className="flex gap-4 justify-center mb-4">
            <motion.button
              onClick={() => setKnotStep(prev => Math.max(0, prev - 1))}
              disabled={knotStep === 0}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.05 }}
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
            
            <motion.button
              onClick={() => setKnotStep(prev => Math.min(selectedKnot.steps.length - 1, prev + 1))}
              disabled={knotStep === selectedKnot.steps.length - 1}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.05 }}
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
          
          {/* AI Buddy button */}
          <motion.button
            onClick={() => {
              setSelectedKnot(null);
              setActiveTab('voice');
              handleSendMessage(`Ich möchte den ${selectedKnot.name} lernen. Kannst du mir dabei helfen?`);
            }}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold text-white flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
          >
            <Zap className="w-4 h-4" /> KI-Buddy fragen
          </motion.button>
          
          <motion.button
            onClick={() => {
              setSelectedKnot(null);
              setKnotStep(0);
            }}
            className="w-full mt-2 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold text-gray-200"
            whileHover={{ scale: 1.02 }}
          >
            Zurück
          </motion.button>
        </div>
      )}
    </motion.div>
  );
  
  const tabs = [
    { id: 'voice', label: 'Voice', icon: Mic, component: VoiceTab },
    { id: 'bite', label: 'Biss', icon: Zap, component: BiteTab },
    { id: 'camera', label: 'Kamera', icon: Camera, component: CameraTab },
    { id: 'ar', label: 'AR', icon: Waves, component: ARTab },
    { id: 'knot', label: 'Knoten', icon: null, component: KnotTab }
  ];
  
  if (!isOpen) return null;
  
  const CurrentTab = tabs.find(t => t.id === activeTab)?.component || VoiceTab;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black"
        style={{
          background: 'radial-gradient(ellipse at 50% 20%, #0a1628 0%, #050d1a 60%, #000 100%)'
        }}
      >
        {/* Floating particles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-cyan-400/20"
            animate={{
              x: [0, Math.random() * 100 - 50],
              y: [0, Math.random() * 100 - 50],
              opacity: [0, 0.5, 0]
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
          />
        ))}
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-40 pt-safe">
          <div className="flex items-center gap-3">
            <AnimatedOrb size="sm" state={orbState} />
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
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <X className="w-6 h-6 text-gray-400 hover:text-white" />
          </motion.button>
        </div>
        
        {/* Content */}
        <div className="absolute inset-0 top-20 bottom-24 pt-4 pb-safe-lg">
          <CurrentTab />
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
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {tab.icon && <tab.icon className="w-5 h-5" />}
                {!tab.icon && <span className="text-lg font-bold">🪢</span>}
                
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
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