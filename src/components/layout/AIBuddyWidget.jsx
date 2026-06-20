import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';
import { BUDDY_TEXT_CSS } from '@/components/layout/BuddyTextAvatar';
import { getTipForPage } from '@/lib/buddyTips';
import { getRandomBuddyJoke, getRandomFarewellMessage } from '@/lib/buddyJokes';
import { useAuth } from '@/lib/AuthContext';
import { ai } from '@/api/frontendClient';
import { useElevenLabsVoice } from '@/hooks/useElevenLabsVoice';
import { speakWithBrowserTTS } from '@/components/utils/browserTTS';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic, Send, X, MessageCircle } from 'lucide-react';

const STORAGE_KEY = 'buddy-widget-pos';
const VISITED_PAGES_KEY = 'buddy-visited-pages';
const HIDDEN_KEY = 'buddy-widget-hidden';
const BUDDY_VOICE_ENABLED_KEY = 'buddy-voice-enabled';
const SMALL_BUBBLE_TIMEOUT = 15000; // 15 Sekunden

/**
 * AI-Buddy Widget — animierter "HilfeBuddy" Text mit Chat und Voice-Unterstützung
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
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(() => {
    try {
      return localStorage.getItem(HIDDEN_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [isTalking, setIsTalking] = useState(false);
  const [isNodding, setIsNodding] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [buddyVoiceEnabled, setBuddyVoiceEnabled] = useState(() => {
    try {
      return localStorage.getItem(BUDDY_VOICE_ENABLED_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const [smallBubbleText, setSmallBubbleText] = useState('');
  const [showSmallBubble, setShowSmallBubble] = useState(false);

  const recognition = useRef(null);
  const widgetRef = useRef(null);
  const chatPanelRef = useRef(null);
  const messagesEndRef = useRef(null);
  const smallBubbleTimerRef = useRef(null);
  const userActivityTimerRef = useRef(null);
  const currentPage = location.pathname.replace(/^\//, '').split('/')[0] || 'Dashboard';
  const tip = getTipForPage(currentPage);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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

  // Auto-show bubble on first visit to page (unless user has hidden it)
  useEffect(() => {
    try {
      const isHidden = localStorage.getItem(HIDDEN_KEY) === 'true';
      if (isHidden) {
        return;
      }

      const visitedPages = JSON.parse(localStorage.getItem(VISITED_PAGES_KEY) || '[]');
      const hasVisited = visitedPages.includes(currentPage);

      if (!hasVisited && !isOpen) {
        setIsOpen(true);
        // Mark page as visited
        visitedPages.push(currentPage);
        localStorage.setItem(VISITED_PAGES_KEY, JSON.stringify(visitedPages));

        // Auto-hide after 5 seconds
        const timer = setTimeout(() => {
          setIsOpen(false);
        }, 5000);

        // Show small buddy voice bubble if enabled
        if (buddyVoiceEnabled) {
          const jokeTimer = setTimeout(() => {
            const joke = getRandomBuddyJoke();
            showSmallBubbleWithText(joke);
          }, 6000);
          return () => {
            clearTimeout(timer);
            clearTimeout(jokeTimer);
          };
        }

        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [currentPage, isOpen, buddyVoiceEnabled]);

  // Persist position to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    } catch {
      // Ignore localStorage errors
    }
  }, [pos]);

  // Handle drag - DISABLED (fixed position)
  const handleMouseDown = (e) => {
    // Drag disabled - widget is fixed
    return;
  };

  // Drag disabled - no drag listener needed

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
        } catch {
          // Fallback to browser TTS
          await speakWithBrowserTTS(botMessage, {
            lang: 'de-DE',
            rate: 1.0,
          });
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
      toast.error('Spracherkennung wird nicht unterstützt');
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

  // Handle close bubble
  const handleCloseBubble = () => {
    setIsOpen(false);
    stop();
    setIsHidden(true);
    try {
      localStorage.setItem(HIDDEN_KEY, 'true');
    } catch {
      // Ignore localStorage errors
    }
  };

  // Handle show bubble again
  const handleShowBubble = () => {
    setIsHidden(false);
    try {
      localStorage.removeItem(HIDDEN_KEY);
    } catch {
      // Ignore localStorage errors
    }
    setIsOpen(true);
  };

  // Toggle KI Buddy voice (kleine Sprechblase)
  const handleToggleBuddyVoice = () => {
    const newState = !buddyVoiceEnabled;
    setBuddyVoiceEnabled(newState);
    try {
      localStorage.setItem(BUDDY_VOICE_ENABLED_KEY, newState ? 'true' : 'false');
    } catch {
      // Ignore localStorage errors
    }
  };

  // Zeige kleine Sprechblase mit Text und Auto-Close nach 15s Inaktivität
  const showSmallBubbleWithText = useCallback((text) => {
    setSmallBubbleText(text);
    setShowSmallBubble(true);

    // Clear existing timers
    if (smallBubbleTimerRef.current) clearTimeout(smallBubbleTimerRef.current);
    if (userActivityTimerRef.current) clearTimeout(userActivityTimerRef.current);

    // Auto-hide after 15 seconds
    userActivityTimerRef.current = setTimeout(() => {
      const farewell = getRandomFarewellMessage();
      setSmallBubbleText(farewell);

      smallBubbleTimerRef.current = setTimeout(() => {
        setShowSmallBubble(false);
      }, 2000);
    }, SMALL_BUBBLE_TIMEOUT);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (smallBubbleTimerRef.current) clearTimeout(smallBubbleTimerRef.current);
      if (userActivityTimerRef.current) clearTimeout(userActivityTimerRef.current);
    };
  }, []);

  const bubbleVariants = {
    hidden: { opacity: 0, scale: 0.85, x: 20 },
    visible: { opacity: 1, scale: 1, x: 0 },
    exit: { opacity: 0, scale: 0.85, x: 20 },
  };

  return (
    <>
      {/* Buddy-spezifische SVG-Animationen (einmalig global injiziert) */}
      <style>{BUDDY_TEXT_CSS}</style>

      {/* Avatar Widget + Chat Bubble */}
      <div
        ref={widgetRef}
        className="fixed z-50 select-none bottom-6 right-6"
      >
        {/* Animated Bubble Container */}
        <div className="flex flex-col items-end gap-3 relative">
          {/* Small Buddy Voice Bubble */}
          <AnimatePresence>
            {showSmallBubble && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                className="absolute -top-24 right-0 bg-white border-2 border-blue-300 rounded-2xl px-4 py-3 shadow-lg max-w-xs"
              >
                <p className="text-sm text-gray-800 leading-relaxed">{smallBubbleText}</p>
                <div className="absolute -bottom-2 right-8 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-blue-300" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat Bubble */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                variants={bubbleVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-80 max-h-80 rounded-3xl shadow-2xl overflow-hidden flex flex-col bg-white border-2 border-blue-200"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-blue-300 bg-blue-100">
                      <img
                        src="/assets/buddy/marina-avatar.png"
                        alt="Sabrina"
                        className="w-full h-full object-cover object-top"
                        draggable={false}
                      />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-800">Sabrina</h2>
                      <p className="text-xs text-gray-500">Dein Angel-Buddy</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseBubble}
                    className="p-1 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                  >
                    <X size={18} className="text-gray-600" />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-white to-blue-50">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-start justify-start h-full gap-3">
                      <div className="text-sm">
                        <p className="font-semibold text-gray-800 mb-1">{tip?.title || 'Hallo!'}</p>
                        <p className="text-xs text-gray-600 leading-relaxed">{tip?.message || 'Wie kann ich dir helfen?'}</p>
                      </div>

                      {tip?.suggestions && tip.suggestions.length > 0 && (
                        <div className="w-full space-y-2">
                          <p className="text-xs font-semibold text-gray-500 px-2">Fragen:</p>
                          {tip.suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setInputValue(suggestion);
                                setTimeout(() => handleSendMessage(suggestion), 50);
                              }}
                              disabled={isLoading}
                              className="w-full text-left px-3 py-2 bg-blue-100 hover:bg-blue-200 disabled:bg-gray-200 text-blue-900 text-xs rounded-lg transition-colors truncate"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
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
                          className={`max-w-xs px-4 py-2 rounded-lg text-sm break-words ${
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
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg text-xs">
                      {chatError}
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Section */}
                <div className="border-t border-gray-200 bg-white p-3 space-y-2">
                  {/* Text Input */}
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900 placeholder-gray-400"
                      disabled={isLoading}
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={isLoading || !inputValue.trim()}
                      className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors flex-shrink-0"
                    >
                      <Send size={16} />
                    </button>
                  </div>

                  {/* Voice Button */}
                  <button
                    onClick={handleVoiceInput}
                    disabled={isLoading}
                    className={`w-full py-2 px-4 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-colors ${
                      isListening
                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                        : 'bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-300'
                    }`}
                  >
                    <Mic size={14} />
                    {isListening ? 'Höre zu...' : 'Sprich'}
                  </button>
                </div>

                {/* Bubble Tail */}
                <div className="absolute -bottom-2 right-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-blue-200" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Avatar with Voice Toggle */}
          <div className="flex items-center gap-2">
            {/* Voice Toggle Button */}
            <motion.button
              onClick={handleToggleBuddyVoice}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`p-2 rounded-full transition-colors ${
                buddyVoiceEnabled
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
              }`}
              title={buddyVoiceEnabled ? 'KI Buddy Voice aktiviert' : 'KI Buddy Voice deaktiviert'}
            >
              <MessageCircle size={18} />
            </motion.button>

            {/* Avatar Button */}
            <motion.button
              key={currentPage}
              onClick={() => {
                if (isHidden) {
                  handleShowBubble();
                } else {
                  setIsOpen(!isOpen);
                }
              }}
              className="relative group cursor-pointer"
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.95 }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{
                scale: (isSpeaking || isTalking || isListening) ? [1, 1.06, 1, 1.04, 1] : 1,
                opacity: 1,
                y: (isSpeaking || isTalking || isListening)
                  ? [0, -8, 0, -4, 0]
                  : [0, -6, 0],
              }}
              transition={{
                scale: (isSpeaking || isTalking || isListening)
                  ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' }
                  : { type: 'spring', stiffness: 300, damping: 12 },
                opacity: { duration: 0.3 },
                y: {
                  duration: (isSpeaking || isTalking || isListening) ? 0.7 : 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                },
              }}
            >
            {/* Runder Foto-Avatar Sabrina */}
            <div
              className={`relative w-24 h-24 rounded-full overflow-hidden bg-transparent transition-all ${
                isSpeaking
                  ? 'drop-shadow-[0_0_8px_rgba(74,222,128,0.7)]'
                  : isListening
                  ? 'drop-shadow-[0_0_8px_rgba(248,113,113,0.7)]'
                  : 'drop-shadow-lg'
              }`}
            >
              <img
                src="/assets/buddy/marina-avatar.png"
                alt="Sabrina – dein Angel-Buddy"
                className={`w-full h-full object-cover object-top ${
                  isTalking ? 'buddy-text-speaking' : isListening ? 'buddy-text-listening' : 'buddy-text-breathing'
                }`}
                draggable={false}
              />
            </div>

            {/* Voice indicator */}
            {isSpeaking && (
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
            {isListening && (
              <div className="absolute bottom-0 left-0 w-4 h-4 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
            </motion.button>
          </div>
        </div>
      </div>
    </>
  );
}
