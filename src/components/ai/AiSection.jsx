import React, { useState, useEffect, useRef } from "react";
import { User } from "@/entities/User";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Sparkles, Volume2, StopCircle, Loader2 } from "lucide-react";
import { catchgbtChat } from "@/functions/catchgbtChat";
import { backendTextToSpeech } from "@/functions/backendTextToSpeech";
import { toast } from "sonner";
import BuddyOutput from "@/components/chatbot/BuddyOutput";

// Audio-Wiedergabe-Funktion
let currentAudio = null;
const playAudio = (audioData, onEnded) => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  const blob = new Blob([audioData], { type: 'audio/mpeg' });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;
  audio.play().catch(e => console.error("Audio playback error:", e));
  audio.onended = () => {
    currentAudio = null;
    if (onEnded) onEnded();
  };
};

// Browser TTS Fallback (verbesserte Fehlerbehandlung)
const playTextWithBrowserTTS = (text, speechRate = 1.0) => {
  return new Promise((resolve) => {
    try {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        console.warn("Browser TTS nicht unterstützt.");
        return resolve();
      }

      // Stoppe alle laufenden Sprachausgaben
      window.speechSynthesis.cancel();

      const speak = () => {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'de-DE';
        utterance.rate = Math.min(2.0, Math.max(0.1, speechRate));
        utterance.pitch = 1;
        utterance.volume = 0.8;

        const voices = window.speechSynthesis.getVoices();
        const germanVoice = voices.find(voice => voice.lang.startsWith('de'));
        if (germanVoice) {
          utterance.voice = germanVoice;
        }

        utterance.onend = () => resolve();

        utterance.onerror = (event) => {
          // "interrupted" ist kein echter Fehler
          if (event.error === 'interrupted' || event.error === 'canceled') {
            console.log("Browser TTS wurde unterbrochen (normal)");
          } else {
            console.error(`Browser TTS Fehler: ${event.error}`);
          }
          resolve();
        };

        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, 100);
      };

      if (window.speechSynthesis.getVoices().length === 0) {
        let voiceLoaded = false;
        window.speechSynthesis.onvoiceschanged = () => {
          if (voiceLoaded) return;
          voiceLoaded = true;
          window.speechSynthesis.onvoiceschanged = null;
          speak();
        };
        
        setTimeout(() => {
          if (!voiceLoaded) {
            console.log("Browser TTS: Timeout - spreche ohne Voice-Event");
            window.speechSynthesis.onvoiceschanged = null;
            speak();
          }
        }, 500);
      } else {
        speak();
      }

    } catch (error) {
      console.error("Browser TTS Setup-Fehler:", error);
      resolve();
    }
  });
};

function getContextualPath(pathname) {
  const pathMap = {
    '/Map': 'map_view', '/Logbook': 'logbook', '/Weather': 'weather_forecast',
    '/Gear': 'gear_recommendation', '/Analysis': 'catch_analysis'
  };
  return pathMap[pathname] || 'general';
}

function TextAIMode() {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [useSpeech, setUseSpeech] = useState(true);
  const chatEndRef = useRef(null);

  useEffect(() => {
    User.me().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isLoading]);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = { role: 'user', content: message };
    setHistory(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      const chatContext = getContextualPath(window.location.pathname);
      const res = await catchgbtChat({
        messages: [...history, userMessage],
        context: chatContext,
        userName: user?.full_name || 'User'
      });
      
      const aiReply = res.data?.reply || "Entschuldigung, es gab ein Problem.";
      setHistory(prev => [...prev, { role: 'assistant', content: aiReply }]);

      if (useSpeech) {
        setIsSpeaking(true);
        const ttsResponse = await backendTextToSpeech({ text: aiReply });
        if (ttsResponse.data instanceof ArrayBuffer && ttsResponse.data.byteLength > 0) {
          await playAudio(ttsResponse.data, () => setIsSpeaking(false));
        } else {
          await playTextWithBrowserTTS(aiReply);
          setIsSpeaking(false);
        }
      }
    } catch (error) {
      console.error("Fehler bei der KI-Anfrage:", error);
      
      const errorMessage = "Antwort vom KI-Buddy fehlgeschlagen. Bitte versuche es spaeter erneut.";
      toast.error(errorMessage);
      setHistory(prev => [...prev, { role: 'assistant', content: "Entschuldigung, ich habe gerade technische Probleme." }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStopSpeech = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  return (
    <Card className="glass-morphism border-gray-800 rounded-2xl w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">
          <div className="flex items-center gap-3">
            <Bot className="w-6 h-6 text-emerald-400" />
            <span>KI-Fangberatung</span>
          </div>
          <div className="flex items-center gap-2">
            {isSpeaking ? (
              <Button size="icon" variant="destructive" onClick={handleStopSpeech}>
                <StopCircle className="w-5 h-5" />
              </Button>
            ) : (
              <Button size="icon" variant={useSpeech ? "secondary" : "outline"} onClick={() => setUseSpeech(!useSpeech)}>
                <Volume2 className={`w-5 h-5 ${useSpeech ? 'text-emerald-400' : 'text-gray-500'}`} />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="h-64 overflow-y-auto p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
            {history.length > 0 ? (
              history.map((msg, index) => (
                <BuddyOutput key={index} role={msg.role} content={msg.content} />
              ))
            ) : (
              <div className="text-center text-gray-400 h-full flex items-center justify-center">
                <p>Frag mich alles rund ums Angeln!</p>
              </div>
            )}
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>KI-Buddy denkt nach...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Deine Frage an den KI-Buddy..."
              className="flex-grow bg-gray-800/50 border-gray-700 rounded-xl"
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              <Sparkles className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AiSection() {
  return (
    <div className="w-full">
      <TextAIMode />
    </div>
  );
}