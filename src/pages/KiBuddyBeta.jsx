import { useState, useRef, useEffect } from "react";
import { functions } from "@/api/frontendClient";
import { useFeatureTracking } from "@/hooks/useFeatureTracking";

// Extended buddy knowledge base for intelligent responses
const BUDDY_KNOWLEDGE = {
  wetter: [
    "Das Wetter ist heute perfekt zum Angeln! Die Bedingungen sind ideal für einen erfolgreichen Tag am Wasser.",
    "Bei wolkigem Himmel sind Fische besonders aktiv. Das ist eine großartige Zeit zum Angeln!",
    "Wind kann vorteilhaft sein - Fische folgen dem Futter, das vom Wind ins Wasser geblasen wird.",
    "Regen verbessert oft die Fangchancen. Die Fische werden aktiver und gehen leichter an den Köder."
  ],
  fang: [
    "Das klingt nach einem großartigen Fang! Glückwunsch zu deinem erfolgreichen Angelausflug.",
    "Wow, das ist beeindruckend! Du scheinst ein natürliches Talent zum Angeln zu haben.",
    "Fantastisch! Solche Fänge sind der Traum jedes Anglers. Wie hast du das geschafft?"
  ],
  spot: [
    "Das ist ein wunderschöner Angelplatz! Dort solltest du gute Chancen auf große Fische haben.",
    "Seespots sind oft produktiv. Achte auf tiefe Stellen und Uferzonen.",
    "Bachforellen lieben kaltes, sauberes Wasser. Ein idealer Spot für diese Art!",
    "Flussplätze mit langsamen Strömungen sind perfekt - dort sammeln sich Fische zum Fressen."
  ],
  koeder: [
    "Das ist ein ausgezeichneter Köder für diese Fischart. Du hast gute Chancen auf einen Biss!",
    "Gummifische sind vielseitig und funktionieren bei vielen Arten. Gute Wahl!",
    "Mit Wurm zu fischen ist eine klassische und zuverlässige Methode - funktioniert immer!",
    "Kunstköder ermöglichen aktiveres Angeln und sind perfekt für gezieltes Fischen."
  ],
  technik: [
    "Das ist eine bewährte Angeltechnik. Mit etwas Geduld und Geschick wirst du sicherlich erfolgreich sein.",
    "Dein Ansatz klingt durchdacht. Das Wichtigste ist Geduld und die richtige Technik.",
    "Das Spinnfischen ist eine effektive Methode für aktive Fische. Probier verschiedene Geschwindigkeiten!",
    "Beim Fliegenfischen ist es wichtig, die richtige Fliege für die Jahreszeit zu wählen."
  ],
  default: [
    "Das ist eine interessante Frage! Als dein Angel-Experte kann ich dir viele Tipps geben. Frag mich nach Wetter, Fängen, Spots oder Ködern!",
    "Guter Gedanke! Beim Angeln ist es wichtig, flexibel zu sein und sich an die Bedingungen anzupassen.",
    "Das ist eine wichtige Überlegung. Erfolgreiche Angler achten auf solche Details!",
    "Ich verstehe deine Frage. Lass mich dir mit meinem Angelwissen helfen!"
  ]
};

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
  const [messages, setMessages] = useState([{ role: "system", text: "Hallo! Ich bin Buddy, deine KI-Angelexpertin. Stelle mir eine Frage!" }]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("");
  const [tonAn, setTonAn] = useState(true);
  const [recording, setRecording] = useState(false);
  const [waveBars, setWaveBars] = useState([4, 4, 4, 4, 4]);
  const chatRef = useRef();
  const recRef = useRef(null);
  const waveRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

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

  async function ask(q) {
    setStatus("thinking");

    try {
      const chatMessages = messages
        .filter(m => m.role !== "system")
        .map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));
      chatMessages.push({ role: "user", content: q });

      // Get user location for weather context
      let userLocation = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
        } catch {
          // Location not available, continue without it
        }
      }

      // Try to call the API
      try {
        const res = await functions.invoke('catchgbtChat', {
          messages: chatMessages,
          context: "ki_buddy_beta",
          userLocation
        });

        const ans = res?.reply || res?.message || getFallbackResponse(q);
        setMessages(m => [...m, { role: "assistant", text: ans }]);
        if (tonAn) speak(ans);
        else setStatus("");
        return;
      } catch (apiErr) {
        console.warn('API failed, using fallback response:', apiErr);
        // Fall through to fallback logic below
      }

      // Fallback: Generate response without API
      const ans = getFallbackResponse(q);
      setMessages(m => [...m, { role: "assistant", text: ans }]);
      if (tonAn) speak(ans);
      else setStatus("");
    } catch (err) {
      setStatus("");
      const ans = "Entschuldigung, mir ist gerade etwas dazwischengekommen. Versuche es bitte erneut!";
      setMessages(m => [...m, { role: "assistant", text: ans }]);
    }
  }

  function getFallbackResponse(question) {
    const q = question.toLowerCase();
    let category = "default";

    if (/wetter|temperatur|wind|regen|sonne|wolke|bewölkung/.test(q)) category = "wetter";
    else if (/fang|gefangen|beute|fische|fische/.test(q)) category = "fang";
    else if (/spot|angelplatz|wo|location|stelle|wasser|see|fluss|bach/.test(q)) category = "spot";
    else if (/köder|köder|ködern|aas|wurm|fliege|spinner|kunstköder|gummi/.test(q)) category = "koeder";
    else if (/technik|angeln|werfen|methode|spinnen|fliegen|spinnfischen|fliegenfischen/.test(q)) category = "technik";

    // Get random response from category
    const responses = BUDDY_KNOWLEDGE[category];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  function sendText() {
    const q = input.trim();
    if (!q) return;
    setInput("");
    setMessages(m => [...m, { role: "user", text: q }]);
    ask(q);
  }

  function toggleMic() {
    if (recording) { stopMic(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMessages(m => [...m, { role: "system", text: "Spracherkennung nicht unterstuetzt." }]);
      return;
    }
    const rec = new SR();
    rec.lang = "de-DE"; rec.interimResults = false;
    rec.onresult = e => {
      const q = e.results[0][0].transcript;
      stopMic();
      setMessages(m => [...m, { role: "user", text: q }]);
      ask(q);
    };
    rec.onerror = () => stopMic();
    rec.onend = () => { if (recRef.current) stopMic(); };
    rec.start();
    recRef.current = rec;
    setRecording(true);
    setStatus("listening");
  }

  function stopMic() {
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    setRecording(false);
    if (status === "listening") setStatus("");
  }

  const avatarGlow = status === "speaking"
    ? "0 0 0 3px rgba(34,211,200,0.45)"
    : status === "listening"
    ? "0 0 0 3px rgba(124,58,237,0.5)"
    : "none";

  const statusLabels = {
    listening: "Ich hoere zu...",
    speaking: "Buddy spricht...",
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
              onClick={() => { setTonAn(t => !t); if (tonAn) synthRef.current.cancel(); }}
              style={{ display: "flex", alignItems: "center", gap: 6, background: tonAn ? "#22d3c8" : "#0d2020", border: "1px solid #22d3c8", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: tonAn ? "#060d1a" : "#22d3c8", fontWeight: 500, cursor: "pointer" }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: tonAn ? "#060d1a" : "#22d3c8", display: "inline-block" }} />
              {tonAn ? "Ton an" : "Ton aus"}
            </button>
          </div>

          {/* Voice control row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "#08111f" }}>
            <span style={{ fontSize: 12, color: "#8899aa", maxWidth: 180, lineHeight: 1.4 }}>Mikrofon aktivieren und Frage stellen</span>
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
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#22d3c8,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0, boxShadow: avatarGlow, transition: "box-shadow 0.3s" }}>
              B
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#e0f0ff" }}>Buddy</div>
              <div style={{ fontSize: 12, color: "#556677", marginTop: 2 }}>Dein KI-Angel-Assistent</div>
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
            {status === "thinking" && (
              <div style={{ alignSelf: "flex-start", background: "#0d1e14", border: "1px solid #163025", borderRadius: 12, borderBottomLeftRadius: 4, padding: "9px 12px", color: "#7adba0", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-flex", gap: 3 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7adba0", animation: "bbDot 1s infinite", animationDelay: "0s" }} />
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7adba0", animation: "bbDot 1s infinite", animationDelay: "0.2s" }} />
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7adba0", animation: "bbDot 1s infinite", animationDelay: "0.4s" }} />
                </span>
                <span>Buddy denkt nach – das kann einen Moment dauern…</span>
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