import { useState, useRef, useEffect } from "react";
import { catchgbtChat } from "@/functions/catchgbtChat";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

const ALLOWED_PAGES = ["Dashboard","Logbook","Map","Weather","Community","Gear","AIAssistant","TripPlanner","Profile","Settings","Rank","WaterAnalysis","AngelscheinPruefungSchonzeiten","Quiz","Licenses","Events","BaitMixer","CatchStats","ARKnotenAssistent","Shop","Premium","PremiumPlans","VoiceControl","Help","Tutorials","Devices","DeviceIntegration","StartFishing","Start","WeatherAlerts","UsedGear","BathymetricCrowdsourcing"];

const PAGE_ALIASES = {
  "fangbuch": "Logbook",
  "logbuch": "Logbook",
  "logbook": "Logbook",
  "karte": "Map",
  "map": "Map",
  "wetter": "Weather",
  "weather": "Weather",
  "community": "Community",
  "ki": "KiBuddyBeta",
  "kibuddy": "KiBuddyBeta",
  "buddy": "KiBuddyBeta",
  "wasser": "WaterAnalysis",
  "wasseranalyse": "WaterAnalysis",
  "trip": "TripPlanner",
  "tripplaner": "TripPlanner",
  "tripplanner": "TripPlanner",
  "profil": "Profile",
  "profile": "Profile",
  "einstellungen": "Settings",
  "settings": "Settings",
  "rang": "Rank",
  "ranking": "Rank",
  "rank": "Rank",
  "pruefung": "AngelscheinPruefungSchonzeiten",
  "prüfung": "AngelscheinPruefungSchonzeiten",
  "angelschein": "AngelscheinPruefungSchonzeiten",
  "schonzeiten": "AngelscheinPruefungSchonzeiten",
  "quiz": "Quiz",
  "lizenzen": "Licenses",
  "licenses": "Licenses",
  "events": "Events",
  "event": "Events",
  "köder": "BaitMixer",
  "koeder": "BaitMixer",
  "bait": "BaitMixer",
  "baitmixer": "BaitMixer",
  "statistik": "CatchStats",
  "stats": "CatchStats",
  "knoten": "ARKnotenAssistent",
  "ar": "ARKnotenAssistent",
  "shop": "Shop",
  "premium": "PremiumPlans",
  "voice": "VoiceControl",
  "hilfe": "Help",
  "help": "Help",
  "tutorial": "Tutorials",
  "tutorials": "Tutorials",
  "geräte": "Devices",
  "geraete": "Devices",
  "devices": "Devices",
  "sos": "WeatherAlerts",
  "warnung": "WeatherAlerts",
  "dashboard": "Dashboard",
  "home": "Dashboard"
};

function resolvePage(name) {
  if (!name) return null;
  const direct = ALLOWED_PAGES.find(p => p.toLowerCase() === String(name).toLowerCase());
  if (direct) return direct;
  const alias = PAGE_ALIASES[String(name).toLowerCase().trim()];
  if (alias) return alias;
  return null;
}

function parseAction(text) {
  if (!text) return { clean: text, action: null };
  const m = text.match(/<<ACTION>>([\s\S]*?)<<END>>/);
  if (!m) return { clean: text, action: null };
  let action = null;
  try { action = JSON.parse(m[1].trim()); } catch {}
  const clean = text.replace(m[0], "").trim();
  return { clean, action };
}

async function executeAction(action, navigate) {
  if (!action || !action.type) return null;
  try {
    if (action.type === "log_catch") {
      const p = action.params || {};
      if (!p.species) return "Bitte sage mir welche Fischart - dann trage ich es ein.";
      const data = {
        species: p.species,
        catch_time: new Date().toISOString(),
        ...(p.length_cm != null && { length_cm: Number(p.length_cm) }),
        ...(p.weight_kg != null && { weight_kg: Number(p.weight_kg) }),
        ...(p.bait_used && { bait_used: p.bait_used }),
        ...(p.notes && { notes: p.notes }),
        ...(p.is_released != null && { is_released: !!p.is_released })
      };
      await base44.entities.Catch.create(data);
      toast.success(`Fang eingetragen: ${p.species}`);
      return `Fang ${p.species} wurde im Fangbuch eingetragen.`;
    }
    if (action.type === "post_community") {
      const p = action.params || {};
      if (!p.text) return "Was soll ich posten?";
      const me = await base44.auth.me().catch(() => null);
      await base44.entities.Post.create({
        text: p.text,
        author_name: me?.nickname || me?.full_name || "Angler"
      });
      toast.success("Community-Post erstellt");
      return "Dein Beitrag wurde in der Community gepostet.";
    }
    if (action.type === "navigate") {
      const p = action.params || {};
      const target = resolvePage(p.page);
      if (!target) return "Diese Seite kenne ich nicht.";
      navigate(createPageUrl(target));
      return `Oeffne ${target}.`;
    }
    if (action.type === "save_spot") {
      const p = action.params || {};
      if (!p.name || p.latitude == null || p.longitude == null) {
        return "Ich brauche Name und Koordinaten fuer den Spot.";
      }
      await base44.entities.Spot.create({
        name: p.name,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        water_type: p.water_type || "see",
        notes: p.notes || "",
        is_favorite: !!p.is_favorite
      });
      toast.success(`Spot gespeichert: ${p.name}`);
      return `Spot ${p.name} gespeichert.`;
    }
    if (action.type === "create_trip") {
      const p = action.params || {};
      if (!p.title || !p.target_fish) return "Ich brauche Titel und Zielfisch fuer den Trip.";
      await base44.entities.FishingPlan.create({
        title: p.title,
        target_fish: p.target_fish,
        spot_info: p.spot_info || "",
        weather_summary: p.weather_summary || "",
        gear_summary: p.gear_summary || "",
        steps: Array.isArray(p.steps) ? p.steps : [],
        is_active: !!p.is_active
      });
      toast.success(`Trip angelegt: ${p.title}`);
      return `Trip ${p.title} wurde im Tripplaner angelegt.`;
    }
    if (action.type === "support_ticket") {
      const p = action.params || {};
      if (!p.subject || !p.message) return "Ich brauche Betreff und Beschreibung.";
      const me = await base44.auth.me().catch(() => null);
      await base44.entities.SupportTicket.create({
        subject: p.subject,
        message: p.message,
        category: p.category || "frage",
        user_email: me?.email,
        user_name: me?.full_name
      });
      toast.success("Support-Ticket erstellt");
      return "Dein Support-Ticket wurde erstellt.";
    }
    if (action.type === "open_url") {
      const p = action.params || {};
      if (!p.url) return null;
      window.open(p.url, "_blank");
      return `Oeffne ${p.url}.`;
    }
  } catch (e) {
    console.error("Action error:", e);
    toast.error("Aktion fehlgeschlagen");
    return "Die Aktion konnte nicht ausgefuehrt werden.";
  }
  return null;
}

export default function MiniKiVoiceBuddy() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { role: "system", text: "Hallo! Ich bin Buddy. Ich kann Faenge eintragen, Community-Posts erstellen, Seiten oeffnen und Daten vorlesen." }
  ]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("");
  const [tonAn, setTonAn] = useState(true);
  const [recording, setRecording] = useState(false);
  const [waveBars, setWaveBars] = useState([4, 4, 4, 4, 4]);
  const chatRef = useRef();
  const recRef = useRef(null);
  const waveRef = useRef(null);
  const synthRef = useRef(typeof window !== "undefined" ? window.speechSynthesis : null);
  const voicesLoadedRef = useRef(false);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  // Stimmen vorab laden (Browser-Quirk: getVoices() ist initial leer)
  useEffect(() => {
    if (!synthRef.current) return;
    const loadVoices = () => {
      const vs = synthRef.current.getVoices();
      if (vs && vs.length > 0) voicesLoadedRef.current = true;
    };
    loadVoices();
    if (synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = loadVoices;
    }
    return () => {
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

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
    if (!synthRef.current) return null;
    const vs = synthRef.current.getVoices();
    return vs.find(v => /Helena|Marlene|Katja|Anna/i.test(v.name))
      || vs.find(v => v.lang === "de-DE" || v.lang === "de-AT")
      || vs[0];
  }

  function speak(text) {
    if (!synthRef.current || !text) return;
    try {
      synthRef.current.cancel();
      // kleiner Delay damit cancel() sauber durchläuft (Chrome-Bug)
      setTimeout(() => {
        if (!synthRef.current) return;
        setStatus("speaking");
        startWave();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "de-DE";
        u.pitch = 1.1;
        u.rate = 1.0;
        u.volume = 1.0;
        const v = getFemaleVoice();
        if (v) u.voice = v;
        u.onend = () => { setStatus(""); stopWave(); };
        u.onerror = (e) => {
          console.warn("TTS error:", e.error);
          setStatus("");
          stopWave();
        };
        try {
          synthRef.current.speak(u);
        } catch (err) {
          console.warn("speak failed:", err);
          setStatus("");
          stopWave();
        }
      }, 80);
    } catch (err) {
      console.warn("speak outer error:", err);
      setStatus("");
      stopWave();
    }
  }

  function stopSpeaking() {
    synthRef.current?.cancel();
    stopWave();
    setStatus("");
  }

  function tryDirectCommand(q) {
    const t = q.toLowerCase().trim();
    // "öffne X" / "zeige X" / "geh zu X" / "navigiere zu X"
    const navMatch = t.match(/^(?:oeffne|öffne|offne|zeige|zeig|geh(?:e)? zu|navigiere zu|gehe nach|wechsle zu)\s+(.+)$/i);
    if (navMatch) {
      const target = resolvePage(navMatch[1].trim());
      if (target) {
        navigate(createPageUrl(target));
        return `Oeffne ${target}.`;
      }
    }
    return null;
  }

  async function ask(q) {
    // Direktbefehl-Erkennung (sofortige Reaktion ohne LLM)
    const direct = tryDirectCommand(q);
    if (direct) {
      setMessages(m => [...m, { role: "assistant", text: direct }]);
      if (tonAn) speak(direct);
      return;
    }

    setStatus("thinking");
    try {
      const chatMessages = messages
        .filter(m => m.role !== "system")
        .map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));
      chatMessages.push({ role: "user", content: q });

      const res = await catchgbtChat({
        messages: chatMessages,
        context: "ki_voice_buddy_dashboard"
      });

      const raw = res?.data?.reply || "Keine Antwort erhalten.";
      const { clean, action } = parseAction(raw);
      let finalText = clean || "Erledigt.";

      if (action) {
        const actionMsg = await executeAction(action, navigate);
        if (actionMsg) finalText = (finalText ? finalText + " " : "") + actionMsg;
      }

      setMessages(m => [...m, { role: "assistant", text: finalText }]);
      if (tonAn) speak(finalText);
      else setStatus("");
    } catch {
      setStatus("");
      setMessages(m => [...m, { role: "system", text: "Verbindungsfehler - bitte erneut versuchen." }]);
    }
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
    <div style={{ background: "#060d1a", borderRadius: 16, overflow: "hidden", fontFamily: "'Inter',sans-serif", border: "1px solid #1a2a3a", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", borderBottom: "1px solid #111e2e" }}>
        <div>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#22d3c8", letterSpacing: 0.3 }}>KI Voice-Buddy</span>
          <span style={{ marginLeft: 8, fontSize: 11, color: "#4455aa", fontWeight: 500, background: "#0d1a33", border: "1px solid #1e2f55", borderRadius: 8, padding: "2px 7px" }}>BETA</span>
        </div>
        <button
          onClick={() => { setTonAn(t => !t); if (tonAn) synthRef.current?.cancel(); }}
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
          disabled={status === "speaking" || status === "thinking"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: recording ? "#22d3c8" : "#0d2a28",
            border: "1px solid #22d3c8",
            borderRadius: 10,
            padding: "8px 14px",
            color: recording ? "#060d1a" : "#22d3c8",
            fontSize: 13,
            fontWeight: 500,
            cursor: (status === "speaking" || status === "thinking") ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: (status === "speaking" || status === "thinking") ? 0.45 : 1,
            transition: "opacity 0.2s"
          }}
        >
          <span>
            {status === "speaking" ? "Gesperrt" : status === "thinking" ? "Warte..." : recording ? "Aktiv" : "Mikrofon"}
          </span>
        </button>
      </div>

      {/* Status hint */}
      <div style={{ padding: "6px 16px 10px", fontSize: 11, color: "#445566", fontStyle: "italic" }}>
        {statusLabels[status] || statusLabels[""]}
      </div>

      {/* Avatar row */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#0a1624", borderTop: "1px solid #111e2e", borderBottom: "1px solid #111e2e" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, overflow: "hidden", flexShrink: 0, boxShadow: avatarGlow, transition: "box-shadow 0.3s" }}>
          <img
            src="https://media.base44.com/images/public/68bb3d3b9f83dc1f55ef532b/5dfd72037_1778092195086.png"
            alt="BaitBuddy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#e0f0ff" }}>Buddy</div>
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
          style={{ flex: 1, minWidth: 0, background: "#0d1a2a", border: "1px solid #1e2f44", borderRadius: 10, padding: "10px 14px", color: "#ccdde8", fontSize: 13, fontFamily: "inherit", outline: "none" }}
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
  );
}