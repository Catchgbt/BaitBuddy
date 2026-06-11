import { useState, useRef, useEffect } from "react";
import { catchgbtChat } from "@/functions/catchgbtChat";
import { useFeatureTracking } from "@/hooks/useFeatureTracking";

import PremiumGuard from "@/components/premium/PremiumGuard";

export default function KiBuddyBeta() {
  return (
    <PremiumGuard requiredPlan="basic" feature="KI-Buddy Chat">
      <KiBuddyBetaInner />
    </PremiumGuard>
  );
}

function KiBuddyBetaInner() {
  useFeatureTracking("ai_buddy");
  const [messages, setMessages] = useState([{ role: "system", text: "Hallo! Ich bin Marina, deine KI-Angelexpertin. Stelle mir eine Frage!" }]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("");
  const [tonAn, setTonAn] = useState(true);
  const [recording, setRecording] = useState(false);
  const [waveBars, setWaveBars] = useState([4, 4, 4, 4, 4]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const chatRef = useRef();
  const recRef = useRef(null);
  const waveRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const timeoutRef = useRef(null);

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

  function getFemaleVoice() {
    const vs = synthRef.current.getVoices();
    return vs.find(v => /Helena|Marlene|Katja|Anna/i.test(v.name))
      || vs.find(v => v.lang === "de-DE" || v.lang === "de-AT")
      || vs[0];
  }

  function speak(text) {
    synthRef.current.cancel();
    setStatus("speaking");
    startWave();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE"; u.pitch = 1.1; u.rate = 1.0;
    const v = getFemaleVoice();
    if (v) u.voice = v;
    u.onend = () => { setStatus(""); stopWave(); };
    u.onerror = () => { setStatus(""); stopWave(); };
    synthRef.current.speak(u);
  }

  function stopSpeaking() {
    synthRef.current.cancel();
    stopWave();
    setStatus("");
  }

  async function ask(q, isRetry = false) {
    if (!isRetry) setStatus("thinking");
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
      setMessages(m => [...m, { role: "assistant", text: ans }]);
      setRetryCount(0);
      if (tonAn) speak(ans);
      else setStatus("");
    } catch (err) {
      if (isRetry && retryCount < 2) {
        setRetryCount(c => c + 1);
        await new Promise(r => setTimeout(r, 800));
        ask(q, true);
      } else {
        setStatus("");
        setRetryCount(0);
        setMessages(m => [...m, { role: "system", text: "Verbindungsfehler – bitte erneut versuchen." }]);
      }
    }
  }

  function sendText() {
    const q = input.trim();
    if (!q) return;
    setInput("");
    setMessages(m => [...m, { role: "user", text: q }]);
    ask(q);
  }

  function clearTimeout() {
    if (timeoutRef.current) {
      clearInterval(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function toggleMic() {
    if (recording) { stopMic(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMessages(m => [...m, { role: "system", text: "Spracherkennung nicht unterstuetzt." }]);
      return;
    }
    const rec = new SR();
    rec.lang = "de-DE";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    let finalTranscript = "";

    rec.onstart = () => {
      setInterimTranscript("");
      setConfidence(0);
      clearTimeout();
      timeoutRef.current = setTimeout(() => {
        rec.abort();
        setMessages(m => [...m, { role: "system", text: "Timeout – keine Sprache erkannt. Bitte erneut versuchen." }]);
        stopMic();
      }, 8000);
    };

    rec.onresult = e => {
      let interim = "";
      let highestConfidence = 0;

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        const conf = e.results[i][0].confidence || 0;

        if (e.results[i].isFinal) {
          finalTranscript += transcript + " ";
          highestConfidence = Math.max(highestConfidence, conf);
        } else {
          interim += transcript;
        }
      }

      if (interim || finalTranscript) {
        setInterimTranscript(interim);
        setConfidence(highestConfidence);
      }

      if (finalTranscript.trim()) {
        clearTimeout();
        stopMic();
        const q = finalTranscript.trim();
        setMessages(m => [...m, { role: "user", text: q }]);
        ask(q, true);
      }
    };

    rec.onerror = (event) => {
      clearTimeout();
      const errorMessages = {
        'no-speech': 'Keine Sprache erkannt – Mikrofon aktivieren und erneut versuchen.',
        'audio-capture': 'Mikrofon nicht verfügbar – bitte Berechtigungen prüfen.',
        'network': 'Netzwerkfehler – versuche Spracherkennung erneut.',
        'service-not-available': 'Spracherkennung momentan nicht verfügbar.',
      };
      const msg = errorMessages[event.error] || `Fehler bei Spracherkennung: ${event.error}`;
      setMessages(m => [...m, { role: "system", text: msg }]);
      stopMic();
    };

    rec.onend = () => {
      clearTimeout();
      if (recRef.current) stopMic();
    };

    rec.start();
    recRef.current = rec;
    setRecording(true);
    setStatus("listening");
  }

  function stopMic() {
    clearTimeout();
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    setRecording(false);
    setInterimTranscript("");
    setConfidence(0);
    if (status === "listening") setStatus("");
  }

  const avatarGlow = status === "speaking"
    ? "0 0 0 3px rgba(34,211,200,0.45)"
    : status === "listening"
    ? "0 0 0 3px rgba(124,58,237,0.5)"
    : "none";

  const statusLabels = {
    listening: "Ich hoere zu...",
    speaking: "Marina spricht...",
    thinking: "Denke nach...",
    "": "Tippe oder aktiviere das Mikrofon"
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div style={{ background: "#060d1a", borderRadius: 16, overflow: "hidden", fontFamily: "'Inter',sans-serif", border: "1px solid #1a2a3a", display: "flex", flexDirection: "column" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", borderBottom: "1px solid #111e2e" }}>
            <div>
              <span style={{ fontSize: 16, fontWeight: 600, color: "#22d3c8", letterSpacing: 0.3 }}>KI Voice-Buddy</span>
              <span style={{ marginLeft: 8, fontSize: 11, color: "#4455aa", fontWeight: 500, background: "#0d1a33", border: "1px solid #1e2f55", borderRadius: 8, padding: "2px 7px" }}>BETA</span>
            </div>
            <button
              onClick={() => { setTonAn(t => !t); if (tonAn) synthRef.current.cancel(); }}
              style={{ display: "flex", alignItems: "center", gap: 6, background: tonAn ? "#22d3c8" : "#0d2020", border: "1px solid #22d3c8", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: tonAn ? "#060d1a" : "#22d3c8", fontWeight: 500, cursor: "pointer" }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: tonAn ? "#060d1a" : "#22d3c8", display: "inline-block" }} />
              {tonAn ? "Ton an" : "Ton aus"}
            </button>
          </div>

          {/* Voice control row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "#08111f" }}>
            <div style={{ fontSize: 12, color: "#8899aa", maxWidth: 140, lineHeight: 1.4 }}>
              <div>Mikrofon aktivieren</div>
              {confidence > 0 && (
                <div style={{ fontSize: 10, color: "#22d3c8", marginTop: 2 }}>
                  Qualität: {Math.round(confidence * 100)}%
                </div>
              )}
            </div>
            <button
              onClick={toggleMic}
              style={{ display: "flex", alignItems: "center", gap: 7, background: recording ? "#22d3c8" : "#0d2a28", border: "1px solid #22d3c8", borderRadius: 10, padding: "8px 14px", color: recording ? "#060d1a" : "#22d3c8", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
            >
              <span>{recording ? "Aktiv" : "Mikrofon"}</span>
            </button>
          </div>

          {/* Status hint */}
          <div style={{ padding: "6px 16px 10px", fontSize: 11, color: "#445566", fontStyle: "italic" }}>
            {statusLabels[status] || statusLabels[""]}
          </div>

          {/* Avatar row */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#0a1624", borderTop: "1px solid #111e2e", borderBottom: "1px solid #111e2e" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0, boxShadow: avatarGlow, transition: "box-shadow 0.3s" }}>
              M
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#e0f0ff" }}>Marina</div>
              <div style={{ fontSize: 12, color: "#556677", marginTop: 2 }}>Deine KI-Angelexpertin</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 3, height: 24, opacity: status === "speaking" ? 1 : 0, transition: "opacity 0.3s" }}>
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
              <div style={{ alignSelf: "flex-end", background: "#1a2a3a", border: "1px dashed #1e2f44", borderRadius: 12, borderBottomRightRadius: 4, padding: "9px 12px", color: "#8899aa", fontSize: 12, fontStyle: "italic", maxWidth: "88%" }}>
                {interimTranscript}
              </div>
            )}
            {status === "thinking" && (
              <div style={{ alignSelf: "flex-start", background: "#0d1e14", border: "1px solid #163025", borderRadius: 12, borderBottomLeftRadius: 4, padding: "9px 12px", color: "#7adba0", fontSize: 13 }}>
                ...
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

          <div style={{ textAlign: "center", fontSize: 11, color: "#223344", padding: "0 14px 10px", background: "#08111f", letterSpacing: 0.5, textTransform: "uppercase" }}>
            {status || "Bereit"}
          </div>
        </div>
      </div>
    </div>
  );
}