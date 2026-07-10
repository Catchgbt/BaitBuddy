import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import JuleAvatar from '@/components/ai/JuleAvatar';
import { getTipForPage } from '@/lib/buddyTips';
import { getRandomBuddyJoke, getRandomFarewellMessage } from '@/lib/buddyJokes';
import { useAuth } from '@/lib/AuthContext';
import { ai } from '@/api/frontendClient';
import { speakWithFallback } from '@/components/utils/elevenLabsTTS';
import { speakWithBrowserTTS } from '@/components/utils/browserTTS';
import { findOfflineBuddyAnswer, getOfflineBuddyFallback } from '@/lib/offlineBuddyQuestions';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Mic, Send, X } from 'lucide-react';

import { useChatMessages } from '@/hooks/useChatMessages';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useBuddyStorage } from '@/hooks/useBuddyStorage';
import { executeBuddyAction } from '@/utils/buddyActions';
import {
  BUDDY_STORAGE_KEYS,
  BUDDY_TIMEOUTS,
  BUDDY_AVATAR_SIZE,
} from '@/lib/buddyStorageKeys';

const AVATAR_SIZE = BUDDY_AVATAR_SIZE;
const DRAG_THRESHOLD = BUDDY_TIMEOUTS.DRAG_THRESHOLD;

function clampPos(x, y) {
  if (typeof window === 'undefined') return { x, y };
  return {
    x: Math.max(0, Math.min(x, window.innerWidth - AVATAR_SIZE)),
    y: Math.max(0, Math.min(y, window.innerHeight - AVATAR_SIZE)),
  };
}

function getDefaultPos() {
  if (typeof window === 'undefined') return { x: 300, y: 500 };
  return {
    x: window.innerWidth - AVATAR_SIZE - 24,
    y: window.innerHeight - AVATAR_SIZE - 100,
  };
}

// Eigener State + React.memo: Tastenanschläge im Eingabefeld rendern so nur
// diese Subkomponente neu, nicht die gesamte Nachrichtenliste/Avatar-Animation.
const ChatInput = React.memo(function ChatInput({ isLoading, isListening, onSend, onVoiceInput }) {
  const [value, setValue] = useState('');

  const submit = () => {
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue('');
  };

  return (
    <div className="border-t border-gray-200 bg-white p-3 space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder="Schreib eine Frage..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900 placeholder-gray-400"
          disabled={isLoading}
          aria-label="Chat-Eingabefeld"
        />
        <button
          onClick={submit}
          disabled={isLoading || !value.trim()}
          className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors flex-shrink-0"
          aria-label="Nachricht senden"
          title="Nachricht senden (Enter)"
        >
          <Send size={16} />
        </button>
      </div>

      <button
        onClick={onVoiceInput}
        disabled={isLoading}
        className={`w-full py-2 px-4 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-colors ${
          isListening
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
            : 'bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-300'
        }`}
        aria-label={isListening ? 'Spracherkennung stoppen' : 'Spracherkennung starten'}
        aria-pressed={isListening}
      >
        <Mic size={14} />
        {isListening ? 'Höre zu...' : 'Sprich'}
      </button>
    </div>
  );
});

export default function AIBuddyWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  // Use new hooks for centralized state
  const {
    messages,
    setMessages,
    messagesRef,
    messagesEndRef,
  } = useChatMessages();

  const {
    widgetPos: pos,
    setWidgetPos: setPos,
    isWidgetHidden,
    hideWidget,
    showWidget,
    isVoiceEnabled: buddyVoiceEnabled,
    toggleVoice: toggleBuddyVoice,
    addVisitedPage,
    cleanupVisitedPages,
    getLocation: getStoredLocation,
  } = useBuddyStorage();

  // Local UI states
  const [isOpen, setIsOpen] = useState(false);
  const [isTalking, setIsTalking] = useState(false);

  // Persisted state to localStorage
  const isHidden = isWidgetHidden;
  const [isNodding, setIsNodding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [smallBubbleText, setSmallBubbleText] = useState('');
  const [showSmallBubble, setShowSmallBubble] = useState(false);

  // Refs
  const widgetRef = useRef(null);
  const handleSendMessageRef = useRef(null);
  const handleAvatarClickRef = useRef(null);
  const smallBubbleTimerRef = useRef(null);
  const userActivityTimerRef = useRef(null);
  const isLoadingRef = useRef(false);

  const dragStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    moved: false,
  });

  // Stabiler Speech-Callback: verhindert, dass useSpeechRecognition die
  // Recognition-Instanz bei jedem Render neu aufbaut (das würde eine laufende
  // Aufnahme abbrechen). showWidget und die State-Setter sind stabil.
  const handleSpeechResult = useCallback((text) => {
    if (text?.trim()) {
      showWidget();
      setIsOpen(true);
      if (handleSendMessageRef.current) {
        handleSendMessageRef.current(text);
      }
    }
  }, [showWidget]);

  const {
    isListening,
    start: startListening,
    stop: stopListening,
  } = useSpeechRecognition({ onResult: handleSpeechResult });

  const currentPage = location.pathname.replace(/^\//, '').split('/')[0] || 'Dashboard';
  const tip = getTipForPage(currentPage);

  // Auto-Scroll bei neuen Nachrichten wird zentral in useChatMessages erledigt.

  // Page tracking for auto-open & jokes
  useEffect(() => {
    cleanupVisitedPages();

    try {
      if (isHidden) return;

      const visited = [];
      try {
        const stored = localStorage.getItem(BUDDY_STORAGE_KEYS.VISITED_PAGES);
        if (stored) {
          visited.push(...JSON.parse(stored));
        }
      } catch {}

      const hasVisited = visited.includes(currentPage);

      if (!hasVisited && !isOpen) {
        setIsOpen(true);
        addVisitedPage(currentPage);

        const timer = setTimeout(() => setIsOpen(false), 5000);
        let jokeTimer = null;

        if (buddyVoiceEnabled) {
          jokeTimer = setTimeout(() => {
            const joke = getRandomBuddyJoke();
            showSmallBubbleWithText(joke);
          }, 6000);
        }

        return () => {
          clearTimeout(timer);
          if (jokeTimer) clearTimeout(jokeTimer);
        };
      }
    } catch {}
  }, [currentPage, isOpen, isHidden, buddyVoiceEnabled, addVisitedPage, cleanupVisitedPages]);

  // Positions-Persistenz erfolgt gedrosselt zentral in useBuddyStorage.

  // Window resize clamping
  useEffect(() => {
    const handleResize = () => {
      setPos((prev) => clampPos(prev?.x || 0, prev?.y || 0));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setPos]);

  // Drag handlers
  const handleAvatarClickRef_current = useCallback(() => {
    if (isHidden) {
      showWidget();
      setIsOpen(true);
    } else {
      setIsOpen((prev) => !prev);
    }
  }, [isHidden, showWidget]);

  useEffect(() => {
    handleAvatarClickRef.current = handleAvatarClickRef_current;
  }, [handleAvatarClickRef_current]);

  const handleAvatarMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      if (dragStateRef.current.active) return;

      const currentPos = pos || getDefaultPos();
      dragStateRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.clientX - currentPos.x,
        offsetY: e.clientY - currentPos.y,
        moved: false,
      };

      const onMove = (ev) => {
        const ds = dragStateRef.current;
        if (!ds.active) return;

        const dx = Math.abs(ev.clientX - ds.startX);
        const dy = Math.abs(ev.clientY - ds.startY);
        if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
          ds.moved = true;
        }

        if (ds.moved) {
          const newPos = clampPos(ev.clientX - ds.offsetX, ev.clientY - ds.offsetY);
          setPos(newPos);
        }
      };

      const onUp = () => {
        const wasDrag = dragStateRef.current.moved;
        dragStateRef.current.active = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (!wasDrag && handleAvatarClickRef.current) {
          handleAvatarClickRef.current();
        }
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [pos, setPos]
  );

  const handleAvatarTouchStart = useCallback(
    (e) => {
      if (dragStateRef.current.active) return;
      const touch = e.touches[0];
      const currentPos = pos || getDefaultPos();
      dragStateRef.current = {
        active: true,
        startX: touch.clientX,
        startY: touch.clientY,
        offsetX: touch.clientX - currentPos.x,
        offsetY: touch.clientY - currentPos.y,
        moved: false,
      };
    },
    [pos]
  );

  const handleAvatarTouchMove = useCallback((e) => {
    const touch = e.touches[0];
    const ds = dragStateRef.current;
    if (!ds.active) return;

    const dx = Math.abs(touch.clientX - ds.startX);
    const dy = Math.abs(touch.clientY - ds.startY);
    if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
      ds.moved = true;
    }

    if (ds.moved) {
      const newPos = clampPos(touch.clientX - ds.offsetX, touch.clientY - ds.offsetY);
      setPos(newPos);
      e.preventDefault();
    }
  }, [setPos]);

  const handleAvatarTouchEnd = useCallback(() => {
    const wasDrag = dragStateRef.current.moved;
    dragStateRef.current = { active: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0, moved: false };
    if (!wasDrag && handleAvatarClickRef.current) {
      handleAvatarClickRef.current();
    }
  }, []);

  // Chat message handler
  const handleSendMessage = useCallback(
    async (userMessage) => {
      const text = userMessage?.trim();
      if (!text || isLoadingRef.current) return;

      isLoadingRef.current = true;
      setIsLoading(true);
      const history = [...messagesRef.current, { role: 'user', content: text }];
      setMessages(history);
      setChatError(null);
      setIsNodding(true);

      try {
        const response = await ai.chat(history, getStoredLocation());

        const botMessage = response.reply || response.message || '';
        if (botMessage) {
          setMessages((prev) => [...prev, { role: 'assistant', content: botMessage }]);
          setIsTalking(true);
        }

        const actionResult = await executeBuddyAction(response.action, {
          navigate,
          userLocation: getStoredLocation(),
        });

        const actionNote = actionResult?.message;
        if (actionNote) {
          setMessages((prev) => [...prev, { role: 'assistant', content: actionNote }]);
        }

        const speakText = actionNote ? `${botMessage} ${actionNote}`.trim() : botMessage;
        if (speakText && buddyVoiceEnabled) {
          try {
            await speakWithFallback(speakText, {
              voiceEnabled: buddyVoiceEnabled,
              lang: 'de-DE',
              rate: 1.0,
            });
          } catch {
            await speakWithBrowserTTS(speakText, { lang: 'de-DE', rate: 1.0 });
          }
        }
      } catch (err) {
        console.error('Chat error:', err);
        // Kein hartes Sackgassen-Fehlerbild: Jule antwortet aus dem
        // vorgefertigten Offline-Wissen weiter, damit sie nie stumm bleibt.
        const offlineReply = findOfflineBuddyAnswer(text) || getOfflineBuddyFallback();
        setMessages((prev) => [...prev, { role: 'assistant', content: offlineReply }]);
        setIsTalking(true);
        if (buddyVoiceEnabled) {
          try {
            await speakWithFallback(offlineReply, {
              voiceEnabled: buddyVoiceEnabled,
              lang: 'de-DE',
              rate: 1.0,
            });
          } catch {
            try {
              await speakWithBrowserTTS(offlineReply, { lang: 'de-DE', rate: 1.0 });
            } catch { /* TTS ist optional */ }
          }
        }
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
        setIsTalking(false);
        setIsNodding(false);
      }
    },
    [navigate, getStoredLocation, messagesRef, setMessages, buddyVoiceEnabled]
  );

  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }, [handleSendMessage]);

  // Voice input handler
  const handleVoiceInput = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Bubble controls
  const handleCloseBubble = useCallback(() => {
    setIsOpen(false);
    hideWidget();
  }, [hideWidget]);

  const handleShowBubble = useCallback(() => {
    showWidget();
    setIsOpen(true);
  }, [showWidget]);

  // Small bubble with auto-close & farewell
  const showSmallBubbleWithText = useCallback((text) => {
    setSmallBubbleText(text);
    setShowSmallBubble(true);

    if (smallBubbleTimerRef.current) clearTimeout(smallBubbleTimerRef.current);
    if (userActivityTimerRef.current) clearTimeout(userActivityTimerRef.current);

    userActivityTimerRef.current = setTimeout(() => {
      const farewell = getRandomFarewellMessage();
      setSmallBubbleText(farewell);

      smallBubbleTimerRef.current = setTimeout(() => {
        setShowSmallBubble(false);
      }, 2000);
    }, BUDDY_TIMEOUTS.SMALL_BUBBLE);
  }, []);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (smallBubbleTimerRef.current) clearTimeout(smallBubbleTimerRef.current);
      if (userActivityTimerRef.current) clearTimeout(userActivityTimerRef.current);
    };
  }, []);

  // Dynamic positioning
  const currentPos = pos || getDefaultPos();
  const isOnRight = currentPos.x + AVATAR_SIZE / 2 > (typeof window !== 'undefined' ? window.innerWidth / 2 : 200);
  const isOnBottom = currentPos.y + AVATAR_SIZE / 2 > (typeof window !== 'undefined' ? window.innerHeight / 2 : 400);

  const bubbleStyle = useMemo(() => ({
    position: 'absolute',
    ...(isOnBottom ? { bottom: AVATAR_SIZE + 12 } : { top: AVATAR_SIZE + 12 }),
    ...(isOnRight ? { right: 0 } : { left: 0 }),
  }), [isOnBottom, isOnRight]);

  const smallBubbleStyle = bubbleStyle;

  const bubbleVariants = useMemo(() => ({
    hidden: {
      opacity: 0,
      scale: 0.85,
      y: isOnBottom ? 20 : -20,
    },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: {
      opacity: 0,
      scale: 0.85,
      y: isOnBottom ? 20 : -20,
    },
  }), [isOnBottom]);

  const tailPosition = useMemo(() => (isOnBottom
    ? {
        className: `absolute -bottom-2 ${isOnRight ? 'right-6' : 'left-6'} w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-blue-200`,
      }
    : {
        className: `absolute -top-2 ${isOnRight ? 'right-6' : 'left-6'} w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-blue-200`,
      }), [isOnBottom, isOnRight]);

  // Avatar-Animation: Endlos-Loops (repeat: Infinity) verursachen konstante
  // Repaints/Akku-Last. Bei prefers-reduced-motion komplett statisch halten.
  const avatarAnimate = useMemo(() => {
    if (prefersReducedMotion) return { scale: 1, y: 0 };
    return {
      scale: isListening ? [1, 1.06, 1, 1.04, 1] : 1,
      y: isListening ? [0, -6, 0, -3, 0] : [0, -4, 0],
    };
  }, [prefersReducedMotion, isListening]);

  const avatarTransition = useMemo(() => {
    if (prefersReducedMotion) return { duration: 0 };
    return {
      scale: isListening
        ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' }
        : { type: 'spring', stiffness: 300, damping: 12 },
      y: {
        duration: isListening ? 0.7 : 3,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    };
  }, [prefersReducedMotion, isListening]);

  return (
    <>
      <div
        ref={widgetRef}
        className="fixed z-50"
        role="region"
        aria-label="KI-Buddy Chat Widget"
        style={{
          left: currentPos.x,
          top: currentPos.y,
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
        }}
      >
        {/* Small Buddy Bubble */}
        <AnimatePresence>
          {!isHidden && showSmallBubble && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className="bg-white border-2 border-blue-300 rounded-2xl px-4 py-3 shadow-lg max-w-xs whitespace-normal"
              style={smallBubbleStyle}
            >
              <p className="text-sm text-gray-800 leading-relaxed">{smallBubbleText}</p>
              <div className={`absolute ${isOnRight ? 'right-8' : 'left-8'} -bottom-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-blue-300`} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Bubble */}
        <AnimatePresence>
          {!isHidden && isOpen && (
            <motion.div
              variants={bubbleVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-80 max-h-[420px] rounded-3xl shadow-2xl overflow-hidden flex flex-col bg-white border-2 border-blue-200"
              style={bubbleStyle}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-blue-300 bg-blue-100">
                    <JuleAvatar size={36} showHints={false} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-800">Jule</h2>
                    <p className="text-xs text-gray-500">Dein Angel-Buddy</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseBubble}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                  aria-label="Chat schließen"
                  title="Chat schließen"
                >
                  <X size={18} className="text-gray-600" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-white to-blue-50" role="log" aria-live="polite" aria-label="Chat-Nachrichten">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-start justify-start h-full gap-3">
                    <div className="text-sm">
                      <p className="font-semibold text-gray-800 mb-1">{tip?.title || 'Hallo!'}</p>
                      <p className="text-xs text-gray-600 leading-relaxed">{tip?.message || 'Wie kann ich dir helfen?'}</p>
                    </div>

                    {tip?.suggestions && tip.suggestions.length > 0 && (
                      <div className="w-full space-y-2">
                        <p className="text-xs font-semibold text-gray-500 px-2">Fragen:</p>
                        {tip.suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => handleSendMessage(suggestion)}
                            disabled={isLoading}
                            className="w-full text-left px-3 py-2 bg-blue-100 hover:bg-blue-200 disabled:bg-gray-200 text-blue-900 text-xs rounded-lg transition-colors truncate"
                            aria-label={`Frage senden: ${suggestion}`}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={`${msg.role}-${idx}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
              <ChatInput
                isLoading={isLoading}
                isListening={isListening}
                onSend={handleSendMessage}
                onVoiceInput={handleVoiceInput}
              />

              {/* Bubble Tail */}
              <div {...tailPosition} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Draggable Avatar */}
        <motion.div
          className="relative cursor-grab active:cursor-grabbing select-none touch-none"
          onMouseDown={handleAvatarMouseDown}
          onTouchStart={handleAvatarTouchStart}
          onTouchMove={handleAvatarTouchMove}
          onTouchEnd={handleAvatarTouchEnd}
          whileHover={prefersReducedMotion ? undefined : { scale: 1.08 }}
          animate={avatarAnimate}
          transition={avatarTransition}
        >
          <div
            className={`relative w-14 h-14 transition-all ${
              isListening
                ? 'drop-shadow-[0_0_10px_rgba(63,224,208,0.8)]'
                : 'drop-shadow-lg'
            }`}
          >
            <JuleAvatar speaking={isTalking} listening={isListening} size={56} />
          </div>
        </motion.div>
      </div>
    </>
  );
}
