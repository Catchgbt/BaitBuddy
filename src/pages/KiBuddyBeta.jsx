import { useState, useRef, useEffect } from "react";
import { catchgbtChat } from "@/functions/catchgbtChat";
import { useFeatureTracking } from "@/hooks/useFeatureTracking";
import { useElevenLabsVoice } from "@/hooks/useElevenLabsVoice";
import { useEventActivityTracking } from "@/hooks/useEventActivityTracking";
import { events } from "@/api/frontendClient";

import PremiumGuard from "@/components/premium/PremiumGuard";
import SabrinaAvatar from "@/components/ai/SabrinaAvatar";

export default function KiBuddyBeta() {
  return (
    <PremiumGuard requiredPlan="basic" feature="KI-Buddy Chat">
      <KiBuddyBetaInner />
    </PremiumGuard>
  );
}

function KiBuddyBetaInner() {
  useFeatureTracking("ai_buddy");
  const { trackAIChat } = useEventActivityTracking();
  const [messages, setMessages] = useState([{ role: "system", text: "Hallo! Ich bin Sabrina, deine KI-Angelexpertin. Stelle mir eine Frage!" }]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("");
  const [tonAn, setTonAn] = useState(true);
  const [recording, setRecording] = useState(false);
  const [waveBars, setWaveBars] = useState([4, 4, 4, 4, 4]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [confidence, setConfidence] = useState(null);
  const [activeEventId, setActiveEventId] = useState(null);
  const [conversationActive, setConversationActive] = useState(false);
  const chatRef = useRef();
  const recRef = useRef(null);
  const waveRef = useRef(null);
  const timeoutRef = useRef(null);
  const retryRef = useRef(0);
  // Läuft ein fortlaufendes Gespräch? Als Ref, damit die TTS-Callbacks (die in
  // einer alten Closure hängen) immer den aktuellen Wert sehen.
  const conversationActiveRef = useRef(false);
  const { speak, stop: stopVoice, isSpeaking } = useElevenLabsVoice();

  useEffect(() => {
    const loadActiveEvent = async () => {
      try {
        const event = await events.getActiveEvent();
        if (event?.active_event?.id) {
          setActiveEventId(event.active_event.id);
        }
      } catch {
        // Event loading non-critical
      }
    };
    loadActiveEvent();
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  function startWave() {
    waveRef.current = setInterval(() => {
      setWaveBars([...Array(5)].map(() => Math.random() * 18 + 4));
    }, 120);
  }

  function stopWave() {
    clearInterval(waveRef.current);
    setWaveBars([4, 4, 4, 4, 4]);
  }

  async function speakWithElevenLabs(text) {
    setStatus("speaking");
    startWave();
    const success = await speak(text, {
      onEnd: () => {
        setStatus("");
        stopWave();
        maybeContinueConversation();
      },
      onError: () => {
        setStatus("");
        stopWave();
        maybeContinueConversation();
      },
    });
    if (!success) {
      setStatus("");
      stopWave();
      maybeContinueConversation();
    }
  }

  function stopSpeaking() {
    stopVoice();
    stopWave();
    setStatus("");
  }

  // Nach jeder Antwort im laufenden Gespräch das Mikrofon automatisch wieder
  // öffnen — so entsteht ein flüssiges Hin und Her, ohne erneut zu tippen.
  function maybeContinueConversation() {
    if (conversationActiveRef.current && !recRef.current) {
      startListening();
    }
  }

  function startConversation() {
    setConversationActive(true);
    conversationActiveRef.current = true;
    setMessages(m => [...m, { role: "system", text: "Gespräch gestartet. Stell mir deine Frage." }]);
    startListening();
  }

  function endConversation() {
    setConversationActive(false);
    conversationActiveRef.current = false;
    stopMic();
    stopSpeaking();
    setMessages(m => [...m, { role: "system", text: "Gespräch beendet." }]);
  }

  async function ask(q, isRetry = false) {
    setStatus("thinking");
    try {
      const chatMessages = messages
        .filter(m => m.role !== "system")
        .map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));
      chatMessages.push({ role: "user", content: q });

      const res = await catchgbtChat({
        messages: chatMessages,
        context: "ki_buddy_beta"
      });

      const ans = res?.reply || res?.message || "Keine Antwort erhalten.";
      retryRef.current = 0;
      setMessages(m => [...m, { role: "assistant", text: ans }]);
      if (activeEventId) {
        trackAIChat(activeEventId);
      }
      if (tonAn) {
        speakWithElevenLabs(ans);
      } else {
        setStatus("");
        // Ohne Sprachausgabe gibt es kein onEnd — Gespräch hier fortsetzen.
        maybeContinueConversation();
      }
    } catch {
      // Auto-Retry (bis zu 2x) bei Verbindungsfehlern
      if (retryRef.current < 2) {
        retryRef.current += 1;
        setStatus("thinking");
        await new Promise(r => setTimeout(r, 800));
        return ask(q, true);
      }
      retryRef.current = 0;
      setStatus("");
      setMessages(m => [...m, { role: "system", text: "Verbindungsfehler – bitte erneut versuchen." }]);
      maybeContinueConversation();
    }
  }

  function sendText() {
    const q = input.trim();
    if (!q) return;
    setInput("");
    setMessages(m => [...m, { role: "user", text: q }]);
    ask(q);
  }

  const ERROR_LABELS = {
    "no-speech": "Keine Sprache erkannt – bitte erneut versuchen.",
    "audio-capture": "Mikrofon nicht verfügbar. Prüfe die Berechtigung.",
    "not-allowed": "Mikrofon-Zugriff verweigert. Bitte erlauben.",
    network: "Netzwerkfehler bei der Spracherkennung.",
    "service-not-allowed": "Spracherkennungs-Dienst nicht verfügbar.",
  };

  function toggleMic() {
    if (recording) { stopMic(); return; }
    startListening();
  }

  function startListening() {
    if (recRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMessages(m => [...m, { role: "system", text: "Spracherkennung nicht unterstuetzt." }]);
      return;
    }
    const rec = new SR();
    rec.lang = "de-DE";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = e => {
      let interim = "";
      let finalText = "";
      let finalConfidence = null;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
          finalConfidence = result[0].confidence;
        } else {
          interim += result[0].transcript;
        }
      }
      if (interim) setInterimTranscript(interim);
      if (finalText.trim()) {
        const q = finalText.trim();
        if (typeof finalConfidence === "number" && finalConfidence > 0) {
          setConfidence(Math.round(finalConfidence * 100));
        }
        stopMic();
        setMessages(m => [...m, { role: "user", text: q }]);
        ask(q);
      }
    };

    rec.onerror = ev => {
      const label = ERROR_LABELS[ev?.error];
      if (label) setMessages(m => [...m, { role: "system", text: label }]);
      stopMic();
    };
    rec.onend = () => { if (recRef.current) stopMic(); };

    rec.start();
    recRef.current = rec;
    setRecording(true);
    setStatus("listening");
    setInterimTranscript("");
    setConfidence(null);

    // Timeout: 8s ohne erkannte Sprache
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (recRef.current) {
        stopMic();
        // Im laufenden Gespräch weiter zuhören statt abzubrechen.
        if (conversationActiveRef.current) {
          startListening();
        } else {
          setMessages(m => [...m, { role: "system", text: "Keine Sprache erkannt (Timeout). Bitte erneut versuchen." }]);
        }
      }
    }, 8000);
  }

  function stopMic() {
    clearTimeout(timeoutRef.current);
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    setRecording(false);
    setInterimTranscript("");
    if (status === "listening") setStatus("");
  }

  useEffect(() => () => {
    clearTimeout(timeoutRef.current);
    conversationActiveRef.current = false;
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
  }, []);

  const avatarGlow = isSpeaking
    ? "0 0 0 3px rgba(34,211,200,0.45)"
    : status === "listening"
    ? "0 0 0 3px rgba(124,58,237,0.5)"
    : "none";

  const statusLabels = {
    listening: "Ich höre zu...",
    speaking: "Sabrina spricht...",
    thinking: "Denke nach...",
    "": "Tippe oder aktiviere das Mikrofon"
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <style>{`@keyframes bbDot { 0%,80%,100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }`}</style>
      <div className="w-full max-w-md">
        <div style={{ background: "#060d1a", borderRadius: 16, overflow: "hidden", fontFamily: "'Inter',sans-serif", border: "1px solid #1a2a3a", display: "flex", flexDirection: "column" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", borderBottom: "1px solid #111e2e" }}>
            <div>
              <span style={{ fontSize: 16, fontWeight: 600, color: "#22d3c8", letterSpacing: 0.3 }}>KI Voice-Buddy</span>
              <span style={{ marginLeft: 8, fontSize: 11, color: "#4455aa", fontWeight: 500, background: "#0d1a33", border: "1px solid #1e2f55", borderRadius: 8, padding: "2px 7px" }}>BETA</span>
            </div>
            <button
              onClick={() => { setTonAn(t => !t); if (tonAn) stopSpeaking(); }}
              style={{ display: "flex", alignItems: "center", gap: 6, background: tonAn ? "#22d3c8" : "#0d2020", border: "1px solid #22d3c8", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: tonAn ? "#060d1a" : "#22d3c8", fontWeight: 500, cursor: "pointer" }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: tonAn ? "#060d1a" : "#22d3c8", display: "inline-block" }} />
              {tonAn ? "Ton an" : "Ton aus"}
            </button>
          </div>

          {/* Gesprächssteuerung: starten / beenden */}
          <div style={{ padding: "12px 16px 8px", background: "#08111f" }}>
            {!conversationActive ? (
              <button
                onClick={startConversation}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "none", borderRadius: 12, padding: "12px 16px", color: "#ffffff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Gespräch starten
              </button>
            ) : (
              <button
                onClick={endConversation}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#3a0d14", border: "1px solid #ef4444", borderRadius: 12, padding: "12px 16px", color: "#fca5a5", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Gespräch beenden
              </button>
            )}
          </div>

          {/* Voice control row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px 10px", background: "#08111f" }}>
            <span style={{ fontSize: 12, color: "#8899aa", maxWidth: 180, lineHeight: 1.4 }}>Einzelne Frage per Mikrofon stellen</span>
            <button
              onClick={toggleMic}
              disabled={conversationActive}
              style={{ display: "flex", alignItems: "center", gap: 7, background: recording ? "#22d3c8" : "#0d2a28", border: "1px solid #22d3c8", borderRadius: 10, padding: "8px 14px", color: recording ? "#060d1a" : "#22d3c8", fontSize: 13, fontWeight: 500, cursor: conversationActive ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: conversationActive ? 0.45 : 1 }}
            >
              <span>{recording ? "Aktiv" : "Mikrofon"}</span>
            </button>
          </div>

          {/* Status hint */}
          <div style={{ padding: "6px 16px 10px", fontSize: 11, color: "#445566", fontStyle: "italic", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span>{statusLabels[status] || statusLabels[""]}</span>
            {confidence !== null && (
              <span style={{ color: "#22d3c8", fontStyle: "normal", fontWeight: 500 }}>Erkennung: {confidence}%</span>
            )}
          </div>

          {/* Avatar row */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#0a1624", borderTop: "1px solid #111e2e", borderBottom: "1px solid #111e2e" }}>
            <SabrinaAvatar speaking={isSpeaking} size={52} style={{ borderRadius: 14, overflow: "hidden", flexShrink: 0, boxShadow: avatarGlow, transition: "box-shadow 0.3s" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#e0f0ff" }}>Sabrina</div>
              <div style={{ fontSize: 12, color: "#556677", marginTop: 2 }}>Deine KI-Angelexpertin</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 3, height: 24, opacity: isSpeaking ? 1 : 0, transition: "opacity 0.3s" }}>
              {waveBars.map((h, i) => (
                <div key={i} style={{ width: 3, height: h, background: "#22d3c8", borderRadius: 2, transition: "height 0.1s" }} />
              ))}
            </div>
          </div>

          {/* Chat */}
          <div ref={chatRef} style={{ flex: 1, padding: "12px 14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, minHeight: 160, background: "#060d1a" }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                fontSize: m.role === "system" ? 11 : 13,
                lineHeight: 1.5,
                padding: "9px 12px",
                borderRadius: 12,
                maxWidth: "88%",
                alignSelf: m.role === "user" ? "flex-end" : m.role === "system" ? "center" : "flex-start",
                background: m.role === "user" ? "#131f33" : m.role === "system" ? "transparent" : "#0d1e14",
                color: m.role === "user" ? "#aabbd0" : m.role === "system" ? "#445566" : "#7adba0",
                border: m.role === "system" ? "none" : m.role === "user" ? "1px solid #1e2f44" : "1px solid #163025",
                borderBottomRightRadius: m.role === "user" ? 4 : 12,
                borderBottomLeftRadius: m.role === "assistant" ? 4 : 12,
                fontStyle: m.role === "system" ? "italic" : "normal",
                textAlign: m.role === "system" ? "center" : "left"
              }}>
                {m.text}
              </div>
            ))}
            {interimTranscript && (
              <div style={{ alignSelf: "flex-end", background: "#0e1828", border: "1px dashed #1e2f44", borderRadius: 12, borderBottomRightRadius: 4, padding: "9px 12px", color: "#7788aa", fontSize: 13, fontStyle: "italic", maxWidth: "88%" }}>
                {interimTranscript}
              </div>
            )}
            {status === "thinking" && (
              <div style={{ alignSelf: "flex-start", background: "#0d1e14", border: "1px solid #163025", borderRadius: 12, borderBottomLeftRadius: 4, padding: "9px 12px", color: "#7adba0", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-flex", gap: 3 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7adba0", animation: "bbDot 1s infinite", animationDelay: "0s" }} />
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7adba0", animation: "bbDot 1s infinite", animationDelay: "0.2s" }} />
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7adba0", animation: "bbDot 1s infinite", animationDelay: "0.4s" }} />
                </span>
                <span>Sabrina denkt nach – das kann einen Moment dauern…</span>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ display: "flex", gap: 8, padding: "12px 14px 14px", background: "#08111f", borderTop: "1px solid #111e2e" }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendText()}
              placeholder="Frage stellen..."
              style={{ flex: 1, background: "#0d1a2a", border: "1px solid #1e2f44", borderRadius: 10, padding: "10px 14px", color: "#ccdde8", fontSize: 13, fontFamily: "inherit", outline: "none" }}
            />
            <button
              onClick={sendText}
              disabled={!input.trim() || status === "thinking"}
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "none", borderRadius: 10, padding: "10px 16px", color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", opacity: !input.trim() || status === "thinking" ? 0.5 : 1 }}
            >
              Senden
            </button>
            <button
              onClick={stopSpeaking}
              style={{ background: "#0d1a2a", border: "1px solid #1e2f44", borderRadius: 10, padding: "10px 12px", color: "#556677", cursor: "pointer", fontSize: 13 }}
              title="Stopp"
            >
              Stop
            </button>
          </div>

          <div style={{ textAlign: "center", fontSize: 10, color: "#4a5a6a", padding: "0 14px 6px", background: "#08111f", lineHeight: 1.4 }}>
            Hinweis: Nach dem Senden kann es ein paar Sekunden dauern, bis die Antwort kommt.
          </div>

          <div style={{ textAlign: "center", fontSize: 11, color: "#223344", padding: "0 14px 10px", background: "#08111f", letterSpacing: 0.5, textTransform: "uppercase" }}>
            {status || "Bereit"}
          </div>
        </div>
      </div>
    </div>
  );
}