import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { User } from "@/entities/User";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { getPersonalizedGreeting } from "@/components/utils/greetings";
import { Volume2 } from "lucide-react";
import { getRandomDemoResponse } from "@/components/utils/guestMode";

export default function AIAssistant() {
  const [user, setUser] = useState(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSpeak = async (text) => {
    try {
      if (!text || typeof text !== 'string') return;
      
      setIsSpeaking(true);
      
      const cleanText = text
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
        .replace(/[\*#_~`]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (!cleanText) {
        setIsSpeaking(false);
        return;
      }

      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'de-DE';
        utterance.rate = 1.0;
        utterance.pitch = 1;
        utterance.volume = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const germanVoice = voices.find(voice => voice.lang.startsWith('de'));
        if (germanVoice) utterance.voice = germanVoice;

        utterance.onend = () => {
          setIsSpeaking(false);
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          toast.error('Vorlesen fehlgeschlagen');
        };

        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('TTS Error:', error);
      setIsSpeaking(false);
      toast.error('Vorlesen fehlgeschlagen');
    }
  };

  const [isGuest, setIsGuest] = useState(false);

  const loadUser = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      
      const greeting = `${getPersonalizedGreeting(currentUser)}! 🎣

Ich bin dein KI-Angel-Buddy und helfe dir bei allem rund ums Angeln:

🐟 **Fisch-Infos** - Alles über Hecht, Zander, Karpfen & Co.
🌤️ **Wetter-Tipps** - Wann beißen die Fische am besten?
🎣 **Köder-Empfehlungen** - Was funktioniert wann?
📍 **Spot-Strategien** - Wie finde ich die besten Stellen?
⏰ **Timing** - Beste Tageszeiten zum Angeln

Was möchtest du wissen?`;

      setMessages([{ role: "assistant", content: greeting }]);
    } catch (error) {
      console.error("Fehler beim Laden des Users:", error);
      // Gastmodus: Demo-Begruessung
      setIsGuest(true);
      setMessages([{
        role: "assistant",
        content: `Willkommen beim KI-Angel-Buddy!

Dies ist eine Vorschau im Gastmodus. Du siehst hier Demo-Antworten ohne echte KI.

**Verfuegbare Themen:**
- Hecht, Zander, Karpfen, Forelle und mehr
- Wetter und Angelzeiten
- Koeder-Empfehlungen
- Angelspots und Taktiken

Registriere dich kostenlos, um personalisierte KI-Antworten basierend auf deinem Standort und Wetter zu erhalten!`
      }]);
    }
  };

  const exampleQuestions = [
    {
      text: "Welcher Köder eignet sich am besten für Hecht im Herbst?",
      category: "Köder",
      gradient: "from-cyan-500 to-blue-600"
    },
    {
      text: "Bei welchem Wetter beißen Forellen am besten?",
      category: "Wetter",
      gradient: "from-blue-500 to-indigo-600"
    },
    {
      text: "Wann ist die beste Tageszeit zum Angeln auf Zander?",
      category: "Timing",
      gradient: "from-purple-500 to-pink-600"
    },
    {
      text: "Wie finde ich die besten Angelspots in meiner Nähe?",
      category: "Spots",
      gradient: "from-emerald-500 to-teal-600"
    },
    {
      text: "Welche Ausrüstung brauche ich für Karpfenangeln?",
      category: "Ausrüstung",
      gradient: "from-orange-500 to-red-600"
    },
    {
      text: "Welche Fische kann ich im Winter fangen?",
      category: "Jahreszeit",
      gradient: "from-slate-500 to-gray-600"
    }
  ];

  const handleAskQuestion = async (questionText = question) => {
    if (!questionText.trim()) {
      toast.error("Bitte gib eine Frage ein");
      return;
    }

    setIsLoading(true);
    
    const userMessage = {
      role: "user",
      content: questionText,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setQuestion("");

    try {
      let responseContent;

      if (isGuest) {
        // Demo-Antwort fuer Gastmodus
        await new Promise(resolve => setTimeout(resolve, 800)); // kurze Verzögerung simulieren
        responseContent = getRandomDemoResponse(questionText) + '\n\n---\n*Dies ist eine Demo-Antwort. Registriere dich kostenlos fuer echte KI-Antworten!*';
      } else {
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `Du bist ein erfahrener Angel-Experte und hilfst Anglern mit präzisen, praktischen Ratschlägen. 
          
Frage des Anglers: ${questionText}

Gib eine detaillierte, hilfreiche Antwort mit konkreten Tipps. Strukturiere deine Antwort klar mit:
- Kurze, direkte Antwort zuerst
- Dann detaillierte Erklärung
- Konkrete Empfehlungen
- Praktische Tipps

Verwende Emojis sparsam aber gezielt für bessere Lesbarkeit.`,
          add_context_from_internet: false
        });
        responseContent = response;
        await handleSpeak(responseContent);
      }

      const aiMessage = {
        role: "assistant",
        content: responseContent || "Entschuldigung, ich konnte keine Antwort generieren. Bitte versuche es erneut.",
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error("Fehler beim Abrufen der Antwort:", error);
      toast.error("Fehler beim Abrufen der Antwort");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (exampleText) => {
    setQuestion(exampleText);
    handleAskQuestion(exampleText);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 pb-40">
      <div className="max-w-5xl mx-auto">
        
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-gray-950/80 border-b border-gray-800/50">
          <div className="px-6 py-6">
            {isGuest && (
              <div className="mb-4 px-4 py-2 rounded-xl bg-amber-900/30 border border-amber-600/50 text-amber-300 text-sm text-center">
                Gastmodus - Demo-Antworten aktiv.{' '}
                <button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="underline font-semibold hover:text-amber-200"
                >
                  Jetzt anmelden
                </button>{' '}
                fuer echte KI.
              </div>
            )}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    KI-Angel-Buddy
                  </h1>
                  <p className="text-sm text-gray-400">
                    Dein intelligenter Begleiter
                  </p>
                </div>
                
                {messages.length > 1 && messages[messages.length - 1]?.role === 'assistant' && (
                  <Button
                    onClick={() => handleSpeak(messages[messages.length - 1].content)}
                    disabled={isSpeaking}
                    variant="outline"
                    size="sm"
                    className="border-cyan-600/50 hover:bg-cyan-600/20"
                  >
                    <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-pulse' : ''}`} />
                    <span className="ml-2">Vorlesen</span>
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        <div className="px-6 pt-6">
          
          {messages.length <= 1 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">
                  Was möchtest du wissen?
                </h2>
                <p className="text-gray-400 text-sm">
                  Wähle eine Frage oder stelle deine eigene
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {exampleQuestions.map((example, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => handleExampleClick(example.text)}
                    className="group relative p-4 rounded-2xl bg-gray-800/50 border border-gray-700/50 hover:border-cyan-500/50 transition-all overflow-hidden text-left"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${example.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                    
                    <div className="relative">
                      <Badge className="mb-2 bg-cyan-600/20 text-cyan-400 border-cyan-500/30 text-xs">
                        {example.category}
                      </Badge>
                      <p className="text-sm text-gray-200 group-hover:text-white transition-colors leading-relaxed">
                        {example.text}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          <div className="space-y-6 mb-6">
            <AnimatePresence>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mr-3 shadow-lg shadow-cyan-500/30">
                      <span className="text-white font-bold">AI</span>
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                        : 'bg-gray-800/70 border border-gray-700/50 text-gray-100 backdrop-blur-sm'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown 
                        className="prose prose-invert prose-sm max-w-none
                          prose-p:my-2 prose-p:leading-relaxed
                          prose-headings:text-cyan-400 prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
                          prose-ul:my-2 prose-li:my-1
                          prose-strong:text-white prose-strong:font-semibold
                          prose-code:bg-gray-900/50 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-cyan-400
                        "
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center ml-3 border border-gray-600">
                      <span className="text-lg">👤</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mr-3 shadow-lg shadow-cyan-500/30">
                  <span className="text-white font-bold">AI</span>
                </div>
                <div className="bg-gray-800/70 border border-gray-700/50 rounded-2xl px-5 py-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin text-cyan-400">⟳</div>
                    <span className="text-gray-300 text-sm">
                      KI-Buddy analysiert deine Frage...
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="fixed bottom-20 left-0 right-0 bg-gray-950/95 backdrop-blur-xl border-t border-gray-800/50 z-30">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAskQuestion();
                    }
                  }}
                  placeholder="Deine Frage an den KI-Buddy..."
                  className="min-h-[60px] max-h-[120px] bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 rounded-2xl resize-none pr-12 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                  disabled={isLoading}
                />
                <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                  {question.length}/500
                </div>
              </div>
              <Button
                onClick={() => handleAskQuestion()}
                disabled={isLoading || !question.trim() || question.length > 500}
                className="h-[60px] w-[60px] rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/30 transition-all"
              >
                {isLoading ? '⟳' : '→'}
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-500">
              <span>✨</span>
              <span>KI-gestützte Antworten können Fehler enthalten</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}