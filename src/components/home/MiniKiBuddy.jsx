import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { catchgbtChat } from "@/functions/catchgbtChat";
import { textToSpeech } from "@/functions/textToSpeech";

const SYSTEM_PROMPT = `Du bist CatchGBT, ein erfahrener Angel-Assistent. Du hilfst Anglern mit Tipps zu Fischarten, Koeder, Spots, Wetter, Ausruestung und Technik. Antworte auf Deutsch, freundlich und direkt. Halte Antworten kurz und praxisnah.`;

// Globale Referenz auf aktuelle Audio-Wiedergabe, damit alte Wiedergaben gestoppt werden koennen
let currentAudioRef = null;

function stopCurrentAudio() {
  if (currentAudioRef) {
    try {
      currentAudioRef.pause();
      currentAudioRef.src = '';
    } catch {}
    currentAudioRef = null;
  }
}

async function speakText(text) {
  if (!text) return;

  // Vorherige Wiedergabe stoppen
  stopCurrentAudio();

  try {
    // Aufruf ueber Base44 SDK (axios), liefert response mit data als ArrayBuffer/Blob
    const res = await textToSpeech({ text: text.slice(0, 1000) }, { responseType: 'blob' });

    let blob = res?.data;
    if (!blob) throw new Error('Leere Audio-Antwort');

    // Falls SDK ArrayBuffer liefert, in Blob konvertieren
    if (!(blob instanceof Blob)) {
      blob = new Blob([blob], { type: 'audio/mpeg' });
    }
    if (blob.size === 0) throw new Error('Leere Audio-Antwort');

    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.volume = 1.0;
    audio.preload = 'auto';

    // Aufraeumen, sobald Wiedergabe endet oder fehlschlaegt
    const cleanup = () => {
      URL.revokeObjectURL(audioUrl);
      if (currentAudioRef === audio) currentAudioRef = null;
    };
    audio.onended = cleanup;
    audio.onerror = cleanup;

    currentAudioRef = audio;

    try {
      await audio.play();
    } catch (playErr) {
      console.warn('Audio play blocked (autoplay policy):', playErr);
      cleanup();
    }
  } catch (error) {
    console.error('TTS error:', error);
  }
}

export default function MiniKiBuddy() {
  const EXAMPLE_QUESTIONS = [
    "Welcher Koeoder ist jetzt gut?",
    "Beste Angelzeit heute?",
    "Tipps fuer Anfaenger",
    "Hecht oder Zander angeln?"
  ];

  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hallo! Ich bin dein KI-Buddy. Stelle mir eine Angel-Frage!" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const messagesEndRef = useRef(null);
  const isFirstRender = useRef(true);
  const recognitionRef = useRef(null);
  const autoSendRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem('userLocation');
    if (stored) {
      try { setUserLocation(JSON.parse(stored)); } catch {}
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserLocation(loc);
        localStorage.setItem('userLocation', JSON.stringify(loc));
      }, () => {});
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'de-DE';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);

        if (event.results[event.results.length - 1].isFinal) {
          setIsListening(false);
          const finalText = transcript.trim();
          if (finalText) {
            autoSendRef.current = true;
            // Voice-Antwort erzwingen, da Eingabe per Sprache erfolgte
            sendMessage(finalText, true);
          }
        }
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Disable auto-scroll on dashboard to prevent page scroll
  // useEffect(() => {
  //   if (isFirstRender.current) {
  //     isFirstRender.current = false;
  //     return;
  //   }
  //   messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // }, [messages]);

  const sendMessage = async (overrideText, forceVoice = false) => {
    const text = (typeof overrideText === 'string' ? overrideText : input).trim();
    if (!text || isLoading) return;

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await catchgbtChat({
        messages: newMessages,
        context: 'dashboard',
        userLocation: userLocation || null
      });

      const response = res?.data?.reply || "Ich konnte keine Antwort generieren.";
      setMessages(prev => [...prev, { role: "assistant", content: response }]);

      if ((voiceEnabled || forceVoice) && response) {
        await speakText(response);
      }
    } catch (error) {
      console.error("Fehler bei KI-Anfrage:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "Entschuldigung, ich habe gerade technische Probleme. Bitte versuche es erneut." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  return (
    <div className="flex flex-col bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden" style={{ height: '24rem' }}>
      <div 
        className="sr-only"
        role="region"
        aria-live="polite"
        aria-label="KI-Buddy Konversation"
        aria-atomic="false"
      >
        {messages[messages.length - 1] && `${messages[messages.length - 1].role === 'assistant' ? 'Assistent' : 'Du'}: ${messages[messages.length - 1].content}`}
      </div>
      <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
        <span className="text-cyan-400 font-medium text-sm">KI-Buddy</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setVoiceEnabled(v => !v)}
            className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
              voiceEnabled
                ? "bg-cyan-600/30 border-cyan-500/50 text-cyan-300"
                : "bg-gray-700/50 border-gray-600/50 text-gray-400"
            }`}
          >
            {voiceEnabled ? "Ton an" : "Ton aus"}
          </button>
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col min-h-0">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === "user"
                ? "self-end bg-cyan-600/30 text-white border border-cyan-500/30"
                : "self-start bg-gray-700/50 text-gray-100 border border-gray-600/30"
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
            <button
              key={i}
              onClick={async () => {
                const newMessages = [...messages, { role: "user", content: q }];
                setMessages(newMessages);
                setInput("");
                setIsLoading(true);
                try {
                  const res = await catchgbtChat({ messages: newMessages, context: 'dashboard', userLocation: userLocation || null });
                  const response = res?.data?.reply || "Ich konnte keine Antwort generieren.";
                  setMessages(prev => [...prev, { role: "assistant", content: response }]);
                  if (voiceEnabled && response) await speakText(response);
                } catch {
                  setMessages(prev => [...prev, { role: "assistant", content: "Entschuldigung, bitte erneut versuchen." }]);
                } finally {
                  setIsLoading(false);
                }
              }}
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
          placeholder="Frage stellen oder sprechen..."
          disabled={isLoading}
          className="flex-1 min-w-0 bg-gray-900/60 border border-gray-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
        />
        <button
          onClick={toggleListening}
          disabled={isLoading}
          className={`flex-shrink-0 px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors ${
            isListening
              ? 'bg-red-600 hover:bg-red-500'
              : 'bg-gray-700 hover:bg-gray-600 disabled:opacity-40'
          }`}
          title={isListening ? 'Hoere zu...' : 'Sprechen'}
        >
          {isListening ? 'Stop' : 'Sprache'}
        </button>
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          className="flex-shrink-0 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          Senden
        </button>
      </div>
    </div>
  );
}