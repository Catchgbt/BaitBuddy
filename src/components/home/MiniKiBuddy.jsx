import React, { useState, useRef, useEffect, useCallback } from 'react';
import { catchgbtChat } from '@/functions/catchgbtChat';
import { speakWithFallback, cancelElevenLabs } from '@/components/utils/elevenLabsTTS';
import { useChatMessages } from '@/hooks/useChatMessages';

const INITIAL_MESSAGE = 'Hallo! Ich bin dein KI-Buddy. Stelle mir eine Angel-Frage!';

const EXAMPLE_QUESTIONS = [
  'Welcher Koeoder ist jetzt gut?',
  'Beste Angelzeit heute?',
  'Tipps fuer Anfaenger',
  'Hecht oder Zander angeln?',
];

export default function MiniKiBuddy() {
  const { messages, setMessages } = useChatMessages(INITIAL_MESSAGE);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const messagesEndRef = useRef(null);
  // Guard gegen State-Updates nach dem Unmount und Anker für den TTS-Abbruch.
  const isMountedRef = useRef(true);

  // Initialize location
  useEffect(() => {
    const stored = localStorage.getItem('userLocation');
    if (stored) {
      try {
        setUserLocation(JSON.parse(stored));
      } catch {}
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setUserLocation(loc);
          localStorage.setItem('userLocation', JSON.stringify(loc));
        },
        () => {}
      );
    }
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = useCallback(
    async (text, forceVoice = false) => {
      const finalText = (typeof text === 'string' ? text : input).trim();
      if (!finalText || isLoading) return;

      const newMessages = [...messages, { role: 'user', content: finalText }];
      setMessages(newMessages);
      setInput('');
      setIsLoading(true);

      try {
        const res = await catchgbtChat({
          messages: newMessages,
          context: 'dashboard',
          userLocation: userLocation || null,
        });

        if (!isMountedRef.current) return;

        const response = res?.reply || res?.message || 'Ich konnte keine Antwort generieren.';
        setMessages((prev) => [...prev, { role: 'assistant', content: response }]);

        if ((voiceEnabled || forceVoice) && response) {
          await speakWithFallback(response, {
            voiceEnabled: true,
            lang: 'de-DE',
            rate: 1.0,
          });
        }
      } catch (error) {
        console.error('Chat error:', error);
        if (!isMountedRef.current) return;
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Entschuldigung, ich habe gerade technische Probleme. Bitte versuche es erneut.',
          },
        ]);
      } finally {
        if (isMountedRef.current) setIsLoading(false);
      }
    },
    [messages, setMessages, input, isLoading, voiceEnabled, userLocation]
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Laufende Sprachausgabe beim Unmount stoppen, damit der Buddy nach dem
  // Verlassen des Dashboards nicht weiterredet.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      try { cancelElevenLabs(); } catch { /* ignore */ }
    };
  }, []);

  return (
    <div className="flex flex-col bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden" style={{ height: '24rem' }}>
      <div
        className="sr-only"
        role="region"
        aria-live="polite"
        aria-label="KI-Buddy Konversation"
        aria-atomic="false"
      >
        {messages[messages.length - 1] &&
          `${messages[messages.length - 1].role === 'assistant' ? 'Assistent' : 'Du'}: ${messages[messages.length - 1].content}`}
      </div>

      <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
        <span className="text-cyan-400 font-medium text-sm">KI-Buddy</span>
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={() => setVoiceEnabled((v) => !v)}
            className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
              voiceEnabled
                ? 'bg-cyan-600/30 border-cyan-500/50 text-cyan-300'
                : 'bg-gray-700/50 border-gray-600/50 text-gray-400'
            }`}
          >
            {voiceEnabled ? 'Ton an' : 'Ton aus'}
          </button>
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col min-h-0">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'self-end bg-cyan-600/30 text-white border border-cyan-500/30'
                : 'self-start bg-gray-700/50 text-gray-100 border border-gray-600/30'
            }`}
          >
            {msg.content}
          </div>
        ))}

        {isLoading && (
          <div className="self-start bg-gray-700/50 border border-cyan-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="text-xs text-cyan-400/70 ml-1">KI denkt nach...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && !isLoading && (
        <div className="px-3 pb-1 flex flex-wrap gap-1.5 overflow-hidden max-h-20">
          {EXAMPLE_QUESTIONS.map((q, i) => (
            <button type="button"
              key={i}
              onClick={() => handleSendMessage(q)}
              className="text-xs px-3 py-1.5 rounded-full bg-gray-700/60 border border-gray-600/50 text-gray-300 hover:bg-cyan-700/40 hover:border-cyan-500/50 hover:text-white transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-gray-700/50 flex gap-2 items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Frage stellen..."
          disabled={isLoading}
          className="flex-1 min-w-0 bg-gray-900/60 border border-gray-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
        />
        <button type="button"
          onClick={() => handleSendMessage()}
          disabled={isLoading || !input.trim()}
          className="flex-shrink-0 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          Senden
        </button>
      </div>
    </div>
  );
}
