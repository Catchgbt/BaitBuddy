import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import FemaleFisherSvg from '@/components/fish/FemaleFisherSvg';
import { getTipForPage } from '@/lib/buddyTips';
import { useAuth } from '@/lib/AuthContext';
import { ai } from '@/api/frontendClient';
import { useElevenLabsVoice } from '@/hooks/useElevenLabsVoice';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic, Send, X, ChevronUp, Phone } from 'lucide-react';

const STORAGE_KEY = 'buddy-widget-pos';
const VISITED_PAGES_KEY = 'buddy-visited-pages';

/**
 * AI-Buddy Widget — weiblicher Avatar mit Chat und Voice-Unterstützung
 * Position: Fixed unten rechts (draggbar)
 * Features:
 * - Seiten-spezifische Hinweise (Auto-Show on first visit)
 * - Chat Interface (Slide-up Panel)
 * - Voice Input/Output (Text-to-Speech)
 */
export default function AIBuddyWidget() {
  const location = useLocation();
  const { user } = useAuth();
  const { speak, stop, isSpeaking } = useElevenLabsVoice();

  // State
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : { x: 16, y: 16 }; // bottom-right
    } catch {
      return { x: 16, y: 16 };
    }
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showBubble, setShowBubble] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isNodding, setIsNodding] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatError, setChatError] = useState(null);

  const recognition = useRef(null);
  const widgetRef = useRef(null);
  const chatPanelRef = useRef(null);
  const currentPage = location.pathname.replace(/^\//, '').split('/')[0] || 'Dashboard';
  const tip = getTipForPage(currentPage);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition.current = new SpeechRecognition();
      recognition.current.lang = 'de-DE';
      recognition.current.continuous = false;
      recognition.current.interimResults = false;

      recognition.current.onstart = () => setIsListening(true);
      recognition.current.onend = () => setIsListening(false);

      recognition.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('');

        if (transcript.trim()) {
          setInputValue(transcript);
          // Auto-send voice input
          handleSendMessage(transcript);
        }
      };

      recognition.current.onerror = () => {
        setIsListening(false);
        setInputValue('');
      };
    }
  }, []);

  // Auto-show bubble on first visit to page
  useEffect(() => {
    if (!user) return;

    try {
      const visitedPages = JSON.parse(localStorage.getItem(VISITED_PAGES_KEY) || '[]');
      const hasVisited = visitedPages.includes(currentPage);

      if (!hasVisited) {
        setShowBubble(true);
        // Mark page as visited
        visitedPages.push(currentPage);
        localStorage.setItem(VISITED_PAGES_KEY, JSON.stringify(visitedPages));

        // Auto-hide after 5 seconds
        const timer = setTimeout(() => {
          setShowBubble(false);
        }, 5000);

        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [currentPage, user]);

  // Persist position to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    } catch {
      // Ignore localStorage errors
    }
  }, [pos]);

  // Handle drag
  const handleMouseDown = (e) => {
    if (showChat) return;
    setIsDragging(true);
    const rect = widgetRef.current?.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - (rect?.left || 0),
      y: e.clientY - (rect?.top || 0),
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      const size = { width: 100, height: 120 };

      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;

      // Constrain to viewport
      newX = Math.max(0, Math.min(newX, viewport.width - size.width));
      newY = Math.max(0, Math.min(newY, viewport.height - size.height));

      // Calculate as bottom-right distance
      const distFromRight = viewport.width - (newX + size.width);
      const distFromBottom = viewport.height - (newY + size.height);

      setPos({ x: Math.max(distFromRight, 0), y: Math.max(distFromBottom, 0) });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Handle send message
  const handleSendMessage = useCallback(
    async (text = inputValue) => {
      if (!text.trim()) return;

      const userMessage = text.trim();
      setInputValue('');
      setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
      setIsLoading(true);
      setChatError(null);
      setIsNodding(true);

      try {
        const response = await ai.chat(
          [{ role: 'user', content: userMessage }],
          null
        );

        const botMessage = response.message || response;
        setMessages((prev) => [...prev, { role: 'assistant', content: botMessage }]);
        setIsTalking(true);

        // Speak response
        try {
          await speak(botMessage);
        } catch (err) {
          console.warn('ElevenLabs TTS failed:', err?.message);
        }
      } catch (err) {
        console.error('Chat error:', err);
        setChatError('Fehler beim Laden der Antwort');
      } finally {
        setIsLoading(false);
        setIsTalking(false);
        setIsNodding(false);
      }
    },
    [inputValue, speak]
  );

  // Handle voice input
  const handleVoiceInput = () => {
    if (!recognition.current) {
      alert('Spracherkennung wird nicht unterstützt');
      return;
    }

    if (isListening) {
      recognition.current.stop();
    } else {
      try {
        recognition.current.start();
      } catch {
        // Ignore if already listening
      }
    }
  };

  // Handle close chat
  const handleCloseChat = () => {
    setShowChat(false);
    stop();
  };

  if (!user) return null;

  const bubbleVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.8, y: 20 },
  };

  const chatVariants = {
    hidden: { y: '100%' },
    visible: { y: 0 },
    exit: { y: '100%' },
  };

  return (
    <>
      {/* Avatar Widget */}
      <div
        ref={widgetRef}
        className="fixed z-50 cursor-move select-none"
        style={{
          right: `${pos.x}px`,
          bottom: `${pos.y}px`,
          transition: isDragging ? 'none' : 'right 0.3s ease, bottom 0.3s ease',
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Avatar Button */}
        <motion.button
          onClick={() => {
            if (!isDragging) setShowChat(!showChat);
          }}
          className="relative group"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-blue-400 rounded-full opacity-0 group-hover:opacity-20 blur-lg transition-opacity" />

          {/* Avatar */}
          <div className="relative w-[100px] h-[120px] bg-gradient-to-b from-sky-50 to-blue-100 rounded-full shadow-lg hover:shadow-xl transition-shadow">
            <FemaleFisherSvg
              uid="buddy"
              isTalking={isTalking}
              isNodding={isNodding}
            />
          </div>

          {/* Voice indicator */}
          {isSpeaking && (
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
          )}
          {isListening && (
            <div className="absolute bottom-0 left-0 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
          )}
        </motion.button>

        {/* Sprechblase mit Tipps */}
        <AnimatePresence>
          {showBubble && !showChat && (
            <motion.div
              variants={bubbleVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute bottom-full right-0 mb-4 w-64"
            >
              <div className="bg-white rounded-2xl shadow-2xl p-4 border-2 border-blue-200">
                {/* Close Button */}
                <button
                  onClick={() => setShowBubble(false)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>

                {/* Tip Content */}
                <h3 className="font-bold text-sm text-gray-800 mb-2">{tip.title}</h3>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  {tip.message}
                </p>

                {/* Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowBubble(false);
                      setShowChat(true);
                    }}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <Send size={12} /> Frage
                  </button>
                  <button
                    onClick={() => {
                      setShowBubble(false);
                      setShowChat(true);
                      setTimeout(() => handleVoiceInput(), 100);
                    }}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <Phone size={12} /> Voice
                  </button>
                </div>
              </div>

              {/* Bubble Tail */}
              <div className="absolute bottom-[-8px] right-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat Panel Slide-up */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            variants={chatVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-40 pointer-events-none flex items-end"
          >
            <motion.div
              className="w-full h-[60vh] max-h-[600px] bg-white rounded-t-3xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
              ref={chatPanelRef}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">M</span>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-800">Marina</h2>
                    <p className="text-xs text-gray-500">Dein Angel-Buddy</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseChat}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <ChevronUp size={20} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm mt-4">
                    <p className="font-semibold mb-1">👋 Hallo!</p>
                    <p>Wie kann ich dir heute helfen?</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                          msg.role === 'user'
                            ? 'bg-blue-500 text-white rounded-br-none'
                            : 'bg-gray-200 text-gray-900 rounded-bl-none'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 px-4 py-3 rounded-lg">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                )}

                {chatError && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg text-sm">
                    {chatError}
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-gray-200 bg-white p-4 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSendMessage();
                      }
                    }}
                    placeholder="Schreib eine Frage..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={isLoading || !inputValue.trim()}
                    className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </div>

                {/* Voice Button */}
                <button
                  onClick={handleVoiceInput}
                  disabled={isLoading}
                  className={`w-full py-2 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                    isListening
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-300'
                  }`}
                >
                  <Mic size={18} />
                  {isListening ? 'Höre zu...' : 'Sprich'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
