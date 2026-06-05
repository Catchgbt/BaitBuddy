import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import PremiumGuard from "@/components/premium/PremiumGuard";
import { useLocation } from "@/components/location/LocationManager";
import { toast } from "sonner";
import { Mic, Waves, Zap, AlertCircle, MapPin, Cloud, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const ALLOWED_PAGES = ["Dashboard","Logbook","Map","Weather","Community","Gear","AIAssistant","TripPlanner","Profile","Settings","Ranking","WaterAnalysis","AngelscheinPruefungSchonzeiten","Quiz","Licenses","Events","BaitMixer","CatchStats","ARKnotenAssistent","Shop","Premium","PremiumPlans","Help","Tutorials","Devices","DeviceIntegration","StartFishing","Start"];

function parseActionFromReply(text) {
  if (!text) return { clean: text, action: null };
  const m = text.match(/<<ACTION>>([\s\S]*?)<<END>>/);
  if (!m) return { clean: text, action: null };
  let action = null;
  try { action = JSON.parse(m[1].trim()); } catch {}
  const clean = text.replace(m[0], "").trim();
  return { clean, action };
}

async function executeVoiceAction(action, navigate) {
  if (!action || !action.type) return null;
  try {
    if (action.type === "log_catch") {
      const p = action.params || {};
      if (!p.species) return "Bitte sage mir welche Fischart.";
      await base44.entities.Catch.create({
        species: p.species,
        catch_time: new Date().toISOString(),
        ...(p.length_cm != null && { length_cm: Number(p.length_cm) }),
        ...(p.weight_kg != null && { weight_kg: Number(p.weight_kg) }),
        ...(p.bait_used && { bait_used: p.bait_used }),
        ...(p.notes && { notes: p.notes }),
        ...(p.is_released != null && { is_released: !!p.is_released })
      });
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
      if (!p.page || !ALLOWED_PAGES.includes(p.page)) return "Diese Seite kenne ich nicht.";
      navigate(createPageUrl(p.page));
      return `Oeffne ${p.page}.`;
    }
  } catch (e) {
    console.error("Voice action error:", e);
    toast.error("Aktion fehlgeschlagen");
    return "Die Aktion konnte nicht ausgefuehrt werden.";
  }
  return null;
}

// Config
const WAKE_WORD = 'hey buddy';
const WAKE_WORD_VARIANTS = ['hey buddy', 'hei buddy', 'hey budy', 'hey baddy', 'heybuddy', 'hey body', 'hallo buddy'];
const LANGUAGE = 'de-DE';

// Konversations-Session ID (pro App-Sitzung)
const SESSION_ID = `voice_${Date.now()}`;

// TTS Helper - mit Browser und Gemini Fallback
async function speakWithBrowserFirst(text, { rate = 1, pitch = 1 } = {}) {
  if (!text || text.trim().length === 0) return Promise.resolve();
  
  try {
    console.log('[TTS] Browser Speech Synthesis: Starting...');
    return await speakBrowser(text, rate, pitch);
  } catch (error) {
    console.error('[TTS] Browser TTS failed:', error);
    // Kein Gemini Fallback - Browser ist zuverlässiger
    return Promise.resolve();
  }
}

function speakBrowser(text, rate = 1, pitch = 1) {
  if (!('speechSynthesis' in window)) {
    console.warn('[TTS] Browser Speech Synthesis not available');
    return Promise.resolve();
  }
  if (!text || text.trim().length === 0) return Promise.resolve();
  
  return new Promise((resolve) => {
    try {
      // Nutze deutsche Stimme wenn verfügbar
      const voices = window.speechSynthesis.getVoices();
      const germanVoice = voices.find(v => v.lang.startsWith('de'));
      
      // Cancel pending speech
      window.speechSynthesis.cancel();
      
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = LANGUAGE;
      if (germanVoice) utter.voice = germanVoice;
      utter.rate = Math.max(0.5, Math.min(2, rate));
      utter.pitch = Math.max(0.5, Math.min(2, pitch));
      utter.volume = 1;
      
      let hasEnded = false;
      const timeout = setTimeout(() => {
        if (!hasEnded) {
          console.warn('[TTS] Speech did not end after 30s, forcing resolve');
          hasEnded = true;
          resolve();
        }
      }, 30000);
      
      utter.onend = () => {
        if (!hasEnded) {
          hasEnded = true;
          clearTimeout(timeout);
          console.log('[TTS] Speech ended normally');
          resolve();
        }
      };
      
      utter.onerror = (event) => {
        if (!hasEnded) {
          hasEnded = true;
          clearTimeout(timeout);
          console.error('[TTS] Speech error:', event.error);
          resolve();
        }
      };
      
      console.log('[TTS] Speaking:', text.substring(0, 60) + '...');
      window.speechSynthesis.speak(utter);
    } catch (error) {
      console.error('[TTS] Exception:', error);
      resolve();
    }
  });
}

async function speak(text, options = {}) {
  return speakWithBrowserFirst(text, options);
}

// Wetterdaten von Open-Meteo abrufen
async function fetchWeatherData(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,pressure_msl,weather_code,relative_humidity_2m&hourly=precipitation_probability&daily=sunrise,sunset&timezone=auto`;
    const response = await fetch(url);
    const data = await response.json();
    
    return {
      temp: Math.round(data.current.temperature_2m),
      wind: Math.round(data.current.wind_speed_10m * 3.6),
      pressure: Math.round(data.current.pressure_msl),
      humidity: data.current.relative_humidity_2m,
      weatherCode: data.current.weather_code,
      rainProbability: data.hourly.precipitation_probability[0] || 0,
      sunrise: data.daily.sunrise[0],
      sunset: data.daily.sunset[0]
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    return null;
  }
}

// Wetter-Code zu Beschreibung
function getWeatherDescription(code) {
  if ([0, 1].includes(code)) return "sonnig";
  if ([2, 3].includes(code)) return "bewölkt";
  if ([45, 48].includes(code)) return "neblig";
  if ([51, 53, 55].includes(code)) return "leichter Regen";
  if ([61, 63, 65].includes(code)) return "Regen";
  if ([71, 73, 75].includes(code)) return "Schnee";
  if ([95, 96, 99].includes(code)) return "Gewitter";
  return "wechselhaft";
}

// Angel-Bedingungen bewerten
function evaluateFishingConditions(weather) {
  if (!weather) return { rating: "unbekannt", reason: "Wetterdaten nicht verfügbar", score: 0 };
  
  let score = 0;
  const reasons = [];
  
  if (weather.pressure > 1020) {
    score += 2;
    reasons.push("stabiler Luftdruck");
  } else if (weather.pressure < 1000) {
    score += 3;
    reasons.push("fallender Luftdruck - Fische sind aktiver");
  } else {
    score += 1;
  }
  
  if (weather.wind < 15) {
    score += 1;
    reasons.push("angenehmer Wind");
  } else if (weather.wind > 30) {
    score -= 1;
    reasons.push("starker Wind");
  }
  
  if (weather.temp >= 12 && weather.temp <= 22) {
    score += 1;
    reasons.push("gute Temperatur");
  }
  
  if (weather.rainProbability > 60) {
    score += 1;
    reasons.push("Regen aktiviert Fische");
  }
  
  if (score >= 4) return { rating: "Ausgezeichnet", reason: reasons.join(", "), score };
  if (score >= 2) return { rating: "Gut", reason: reasons.join(", "), score };
  if (score >= 0) return { rating: "Mittel", reason: reasons.join(", "), score };
  return { rating: "Schwierig", reason: reasons.join(", "), score };
}

// Erweiterten Parser mit mehr Intents
function parseCommand(text) {
  if (!text) return { intent: 'unknown' };
  const t = text.toLowerCase();
  const clean = t.replace(WAKE_WORD, '').trim();

  // Wo werfen
  // Note: WAKE_WORD removed via .replace(WAKE_WORD,'') above
  if (/wo (soll|kann).*werfen|wo soll ich werfen|wo (werfe|werfen)|beste stelle|bester spot/.test(clean)) {
    const entities = {};
    if (/morgen|dämmer|abends|nachts/.test(clean)) entities.timeOfDay = 'dämmerung';
    if (/windig|wind/.test(clean)) entities.wind = 'starker Wind';
    return { intent: 'where_to_cast', entities };
  }

  // Köder
  if (/köder|bait|welchen köder|welcher köder|farbe|welche farbe/.test(clean)) {
    const entities = {};
    if (/klar|durchsichtig/.test(clean)) entities.waterClarity = 'klar';
    if (/trüb|dreckig/.test(clean)) entities.waterClarity = 'trüb';
    return { intent: 'bait_recommendation', entities };
  }

  // Strategie
  if (/strategie|taktik|wie soll ich vorgehen|was soll ich tun|wie fange ich/.test(clean)) {
    return { intent: 'strategy', entities: {} };
  }

  // Wetter
  if (/wetter|wie ist das wetter|wetterbedingungen|wie wird das wetter|temperatur/.test(clean)) {
    return { intent: 'weather', entities: {} };
  }

  // Standort/Spot
  if (/spot|wo bin ich|standort|position|nähe|in der nähe/.test(clean)) {
    return { intent: 'location', entities: {} };
  }

  // Beste Zeit zum Angeln
  if (/beste zeit|wann angeln|wann soll ich angeln|wann beißen/.test(clean)) {
    return { intent: 'best_time', entities: {} };
  }

  // Fischarten-Info
  if (/welche fische|welcher fisch|fischarten|was beißt|was kann ich fangen/.test(clean)) {
    return { intent: 'fish_species', entities: {} };
  }

  // Tipps für Anfänger
  if (/anfänger|wie fange ich an|grundlagen|basics|lernen/.test(clean)) {
    return { intent: 'beginner_tips', entities: {} };
  }

  // NEU: Schonzeiten und Mindestmaße
  if (/schonzeit|mindestmaß|mindestmass|regel|gesetz|erlaubt|verboten|darf ich|größe/.test(clean)) {
    const entities = {};
    
    // Extrahiere Fischart aus der Frage
    const fishPatterns = [
      'hecht', 'zander', 'barsch', 'karpfen', 'forelle', 'aal', 
      'wels', 'brassen', 'rotauge', 'schleie', 'dorsch', 'lachs'
    ];
    
    for (const fish of fishPatterns) {
      if (clean.includes(fish)) {
        entities.fish = fish.charAt(0).toUpperCase() + fish.slice(1);
        break;
      }
    }
    
    return { intent: 'rules', entities };
  }

  // Wiederholen
  if (/wiederhol|nochmal|repeat/.test(clean)) {
    return { intent: 'repeat', entities: {} };
  }

  // Stop
  if (/stopp|stop|aus|pause|beenden/.test(clean)) {
    return { intent: 'stop', entities: {} };
  }

  // Fallback: Nutze KI für komplexere Fragen
  return { intent: 'ai_fallback', entities: { question: clean } };
}

// Konversation in DB speichern
async function saveConversationMessage(role, content) {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    // Alte Nachrichten (älter als 1 Tag) löschen
    const old = await base44.entities.ChatMessage.filter({ context: 'voice_control' });
    for (const msg of old) {
      if (msg.timestamp && msg.timestamp < oneDayAgo) {
        await base44.entities.ChatMessage.delete(msg.id);
      }
    }
    await base44.entities.ChatMessage.create({
      conversation_id: SESSION_ID,
      role,
      content,
      context: 'voice_control',
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.warn('Could not save message:', e);
  }
}

// Main Component
function VoiceBuddy() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastTip, setLastTip] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [weather, setWeather] = useState(null);
  const [fishingConditions, setFishingConditions] = useState(null);
  const [nearestSpot, setNearestSpot] = useState(null);
  const [processingAI, setProcessingAI] = useState(false);
  const [rules, setRules] = useState([]);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  const { currentLocation } = useLocation();
  const navigate = useNavigate();
  const recognitionRef = useRef(null);
  const isWaitingForCommandRef = useRef(false);
  const isListeningRef = useRef(false);
  const conversationEndRef = useRef(null);

  // Lade gespeicherte Konversationshistorie (letzte 24h)
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const msgs = await base44.entities.ChatMessage.filter({ context: 'voice_control' });
      const recent = msgs
        .filter(m => m.timestamp && m.timestamp >= oneDayAgo)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      setConversationHistory(recent);
    } catch (e) {
      console.warn('Could not load history:', e);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Disabled auto-scroll on conversation history
  // useEffect(() => {
  //   if (conversationEndRef.current) {
  //     conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
  //   }
  // }, [conversationHistory]);

  // Lade Wetter, Spot- und Regel-Daten parallel - UI wird sofort interaktiv
  useEffect(() => {
    // UI sofort freigeben - Daten laden im Hintergrund
    setLoadingInitialData(false);
    setError(null);

    const hasLocation = currentLocation?.lat && currentLocation?.lon;

    // Alle Requests parallel ohne aufeinander zu warten
    if (hasLocation) {
      fetchWeatherData(currentLocation.lat, currentLocation.lon)
        .then(weatherData => {
          if (weatherData) {
            setWeather(weatherData);
            setFishingConditions(evaluateFishingConditions(weatherData));
          }
        })
        .catch(err => console.warn('Wetter laden fehlgeschlagen:', err));

      base44.entities.Spot.list()
        .then(spots => {
          if (!spots || spots.length === 0) return;
          let nearest = null;
          let minDistance = Infinity;
          spots.forEach(spot => {
            const distance = Math.sqrt(
              Math.pow(spot.latitude - currentLocation.lat, 2) +
              Math.pow(spot.longitude - currentLocation.lon, 2)
            );
            if (distance < minDistance) {
              minDistance = distance;
              nearest = spot;
            }
          });
          setNearestSpot(nearest);
        })
        .catch(err => console.warn('Spots laden fehlgeschlagen:', err));
    }

    // Regeln immer laden (unabhängig von Location)
    base44.entities.RuleEntry.list()
      .then(rulesData => setRules(rulesData || []))
      .catch(err => console.warn('Regeln laden fehlgeschlagen:', err));
  }, [currentLocation]);

  // Ist gerade Schonzeit?
  const isInClosedSeason = (rule) => {
    if (!rule.closed_from || !rule.closed_to) return false;
    const today = new Date();
    const currentMonthDay = `${today.getMonth() + 1}-${today.getDate()}`; // "MM-DD" format

    const [fromMonth, fromDay] = rule.closed_from.split('-').slice(1).map(Number); // Get month-day from "YYYY-MM-DD"
    const [toMonth, toDay] = rule.closed_to.split('-').slice(1).map(Number);

    // This handles closed seasons that cross year boundaries (e.g., Dec 1 - Jan 31)
    if (fromMonth > toMonth) { // Season crosses year end
        return (today.getMonth() + 1 > fromMonth || (today.getMonth() + 1 === fromMonth && today.getDate() >= fromDay)) ||
               (today.getMonth() + 1 < toMonth || (today.getMonth() + 1 === toMonth && today.getDate() <= toDay));
    } else if (fromMonth < toMonth) { // Season within the same year
        return (today.getMonth() + 1 > fromMonth || (today.getMonth() + 1 === fromMonth && today.getDate() >= fromDay)) &&
               (today.getMonth() + 1 < toMonth || (today.getMonth() + 1 === toMonth && today.getDate() <= toDay));
    } else { // Season within the same month
        return today.getDate() >= fromDay && today.getDate() <= toDay;
    }
  };

  // Formatiere Datum
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const [, month, day] = parts;
      return `${parseInt(day, 10)}.${parseInt(month, 10)}.`;
    }
    return dateStr;
  };

  // Generiere Tipp mit echten Daten oder nutze KI
  const generateTip = async (parsed) => {
    if (!parsed || parsed.intent === 'unknown') {
      return "Sag 'Hey Buddy, wo soll ich werfen' oder 'Hey Buddy, welchen Köder?'";
    }

    // KI-Fallback für komplexere Fragen (inkl. Aktionen)
    if (parsed.intent === 'ai_fallback') {
      setProcessingAI(true);
      try {
        const response = await base44.functions.invoke('catchgbtChat', {
          messages: [{ role: 'user', content: parsed.entities.question }],
          context: 'voice_control',
          userLocation: currentLocation ? { latitude: currentLocation.lat, longitude: currentLocation.lon } : null
        });
        setProcessingAI(false);
        const raw = response?.data?.reply || response?.reply || "Tut mir leid, ich konnte keine Antwort generieren.";
        const { clean, action } = parseActionFromReply(raw);
        let finalText = clean || "Erledigt.";
        if (action) {
          const actionMsg = await executeVoiceAction(action, navigate);
          if (actionMsg) finalText = (finalText ? finalText + " " : "") + actionMsg;
        }
        return finalText;
      } catch (error) {
        console.error('AI fallback error:', error);
        setProcessingAI(false);
        return "Entschuldigung, ich konnte deine Frage nicht verarbeiten. Versuch es nochmal.";
      }
    }

    // Wetterabfrage
    if (parsed.intent === 'weather') {
      if (!weather) {
        return "Wetterdaten sind leider nicht verfügbar. Stelle sicher, dass GPS aktiviert ist.";
      }
      const weatherDesc = getWeatherDescription(weather.weatherCode);
      return `Das Wetter ist ${weatherDesc}, ${weather.temp} Grad. Wind ${weather.wind} km/h. Die Angelbedingungen sind ${fishingConditions.rating}.`;
    }

    // Standort-Abfrage
    if (parsed.intent === 'location') {
      if (!nearestSpot) {
        return "Kein Spot in der Nähe gefunden. Füge erst einen Spot auf der Karte hinzu.";
      }
      return `Du bist in der Nähe von ${nearestSpot.name}, ein ${nearestSpot.water_type}.`;
    }

    // Beste Zeit
    if (parsed.intent === 'best_time') {
      let tip = '';
      if (weather) {
        const now = new Date();
        const hour = now.getHours();
        
        if (hour >= 5 && hour <= 8) {
          tip = "Jetzt ist eine ausgezeichnete Zeit! Die Morgendämmerung ist perfekt. ";
        } else if (hour >= 18 && hour <= 21) {
          tip = "Die Abenddämmerung steht bevor - eine der besten Zeiten! ";
        } else if (hour >= 22 || hour <= 4) {
          tip = "Nachtangeln kann erfolgreich sein, besonders bei stabilem Wetter. ";
        } else {
          tip = "Tagsüber sind Übergänge zwischen Hell und Dunkel am besten. ";
        }
        
        tip += `Bei ${fishingConditions.rating.toLowerCase()}en Bedingungen empfehle ich aktives Angeln.`;
        return tip;
      }
      return "Generell sind Morgen- und Abenddämmerung die besten Zeiten zum Angeln.";
    }

    // Fischarten-Info
    if (parsed.intent === 'fish_species') {
      let tip = "An deinem Spot ";
      if (nearestSpot) {
        const waterType = nearestSpot.water_type || "Gewässer";
        if (waterType.includes("fluss")) {
          tip += "kannst du Barsch, Zander, Hecht und eventuell Wels fangen. ";
        } else if (waterType.includes("see")) {
          tip += "sind Hecht, Zander, Barsch, Karpfen und Forelle typisch. ";
        } else {
          tip += "sind die typischen heimischen Arten zu erwarten. ";
        }
      } else {
        tip = "Häufige Arten in Deutschland sind Hecht, Zander, Barsch, Karpfen und Forelle. ";
      }
      
      if (weather && weather.temp < 10) {
        tip += "Bei kühlem Wetter sind Raubfische oft träge.";
      }
      return tip;
    }

    // Regeln (KOMPAKT)
    if (parsed.intent === 'rules') {
      const fishQuery = parsed.entities?.fish || (nearestSpot ? "Hecht" : null);
      
      if (!fishQuery) {
        return "Für welchen Fisch möchtest du die Regeln wissen? Sag zum Beispiel 'Hey Buddy, Regeln für Zander'";
      }

      const relevantRules = rules.filter(r => 
        r.fish && r.fish.toLowerCase().includes(fishQuery.toLowerCase())
      );

      if (relevantRules.length === 0) {
        return `Ich habe keine Regeln für ${fishQuery} gefunden. Frag nach einer anderen Fischart.`;
      }

      // Gruppiere nach Region und nimm nur die wichtigsten Infos
      const rulesSummary = relevantRules.map(r => {
        let summary = `${r.region || 'Allgemein'}: `;
        if (r.min_size_cm) summary += `${r.min_size_cm} Zentimeter Mindestmaß`;
        
        const todayISO = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const inClosedSeason = r.closed_from && r.closed_to && 
          todayISO >= r.closed_from && 
          todayISO <= r.closed_to;
        
        if (inClosedSeason) {
          summary += `, aktuell Schonzeit`;
        } else if (r.closed_from && r.closed_to) {
          const fromParts = r.closed_from.split('-');
          const toParts = r.closed_to.split('-');
          const month1 = parseInt(fromParts[1], 10);
          const month2 = parseInt(toParts[1], 10);
          summary += `, Schonzeit von ${month1}. bis ${month2}. Monat`;
        }
        
        return summary;
      });

      // Limitiere auf max. 3 Regionen für die Sprachausgabe
      const topRules = rulesSummary.slice(0, 3);
      let response = `Regeln für ${fishQuery}: ${topRules.join('. ')}`;
      
      if (rulesSummary.length > 3) {
        response += `. Es gibt ${rulesSummary.length - 3} weitere Regionen. Schau in die App für alle Details.`;
      }
      
      return response;
    }

    // Anfänger-Tipps
    if (parsed.intent === 'beginner_tips') {
      return "Grundlagen fürs Angeln: Wähle einen ruhigen Spot, achte auf Schonzeiten und Mindestmaße. Starte mit einfachen Ködern wie Wurm oder kleinen Gummifischen. Sei geduldig und beobachte das Wasser. Frag mich gerne nach spezifischen Tipps!";
    }

    // Wo werfen
    if (parsed.intent === 'where_to_cast') {
      let tip = "Wirf ";
      if (weather && weather.wind > 20) {
        tip += "windgeschützt, nahe am Ufer. ";
      } else {
        tip += "7 bis 12 Meter entlang der Kante. ";
      }
      
      if (nearestSpot) {
        const waterType = nearestSpot.water_type || "";
        if (waterType.includes("fluss")) {
          tip += "Such nach Strömungskanten und ruhigen Buchten. ";
        } else if (waterType.includes("see")) {
          tip += "Such nach Strukturen wie versunkenen Bäumen oder Schilfkanten. ";
        }
      }
      
      if (weather) {
        if (fishingConditions.score >= 3) {
          tip += `Bei ${fishingConditions.rating.toLowerCase()}en Bedingungen sind Fische aktiv.`;
        } else {
          tip += "Die Bedingungen sind okay. Probier verschiedene Tiefen aus.";
        }
      }
      
      return tip;
    }

    // Köder
    if (parsed.intent === 'bait_recommendation') {
      let tip = "Ich empfehle ";
      
      if (weather) {
        if (weather.weatherCode >= 61) {
          tip += "dunkle Köder bei Regen. ";
        } else if (weather.weatherCode <= 1) {
          tip += "natürliche helle Köder bei Sonnenschein. ";
        } else {
          tip += "mittlere Kontraste bei bewölktem Wetter. ";
        }
        
        if (weather.temp < 10) {
          tip += "Langsame Köderführung bei Kälte.";
        } else if (weather.temp > 20) {
          tip += "Aktive Köderführung bei Wärme.";
        }
      } else {
        tip += "Gummifische zwischen 5 und 8 Zentimetern. Probier verschiedene Farben aus.";
      }
      
      return tip;
    }

    // Strategie
    if (parsed.intent === 'strategy') {
      let tip = "Meine Empfehlung: ";
      if (fishingConditions) {
        if (fishingConditions.score >= 4) {
          tip += "Aktiv angeln! Fische sind hungrig. Wechsle Spots nach 15 Minuten wenn nichts geht. ";
        } else {
          tip += "Geduldig sein. Probier verschiedene Tiefen und Köder. Wechsle nach 30 Minuten. ";
        }
      } else {
        tip += "Start langsam. Test verschiedene Köder. Beobachte das Wasser auf Aktivitäten. ";
      }
      
      if (nearestSpot && nearestSpot.notes) {
        tip += `Tipp für ${nearestSpot.name}: ${nearestSpot.notes.slice(0, 100)}`;
      }
      
      return tip;
    }

    // Wiederholen
    if (parsed.intent === 'repeat') {
      return lastTip || "Ich habe noch keinen Tipp gegeben. Frag mich etwas!";
    }

    // Stop
    if (parsed.intent === 'stop') {
      return "Voice Control wird beendet. Petri Heil!";
    }

    return "Sorry, das habe ich nicht verstanden. Frag mich nach Köder, Spot oder Wetter.";
  };

  // Setup speech recognition once on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Dein Browser unterstützt keine Spracherkennung. Probiere Chrome oder Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = LANGUAGE;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece + ' ';
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      const fullText = (finalTranscript + interimTranscript).trim().toLowerCase();
      setTranscript(fullText);
      // Broadcast transcript to other components
      window.dispatchEvent(new CustomEvent('voice-transcript', { detail: fullText }));

      const wakeWordDetected = WAKE_WORD_VARIANTS.some(variant => fullText.includes(variant));
      if (!isWaitingForCommandRef.current && wakeWordDetected) {
        isWaitingForCommandRef.current = true;
        setStatus('listening');
        await speak('Ja, bitte?', { rate: 1.1 });
        setTranscript('');
        return;
      }

      if (isWaitingForCommandRef.current && event.results[event.results.length - 1].isFinal) {
        const parsed = parseCommand(fullText);
        const userQuestion = fullText.replace(/hey\s*bu?d?d?y?/gi, '').trim();
        
        if (parsed.intent === 'stop') {
          stopListening();
          return;
        }

        setStatus('responding');
        setIsSpeaking(true);
        isWaitingForCommandRef.current = false;
        
        if (userQuestion) {
          await saveConversationMessage('user', userQuestion);
          setConversationHistory(prev => [...prev, {
            id: Date.now() + '_u',
            role: 'user',
            content: userQuestion,
            timestamp: new Date().toISOString(),
            context: 'voice_control'
          }]);
        }

        const tip = await generateTip(parsed);
        if (!tip) {
          setIsSpeaking(false);
          setStatus('waiting');
          return;
        }
        
        setLastTip(tip);
        
        await saveConversationMessage('assistant', tip);
        setConversationHistory(prev => [...prev, {
          id: Date.now() + '_a',
          role: 'assistant',
          content: tip,
          timestamp: new Date().toISOString(),
          context: 'voice_control'
        }]);
        // Header über neue Buddy-Nachricht informieren
        window.dispatchEvent(new CustomEvent('buddy-message-added'));

        console.log('[VoiceControl] About to speak:', tip.substring(0, 60) + '...');
        // Pausiere Recognition damit TTS nicht abgeschnitten wird
        try { recognitionRef.current?.stop(); } catch {}
        try {
          await speak(tip, { rate: 0.95 });
        } catch (speechError) {
          console.error('[VoiceControl] Speech playback error:', speechError);
          toast.warning('Audio konnte nicht abgespielt werden. Antwort ist sichtbar.');
        }
        console.log('[VoiceControl] Speech finished');
        // Recognition wieder starten
        if (isListeningRef.current) {
          try { recognitionRef.current?.start(); } catch {}
        }
        
        setIsSpeaking(false);
        setStatus('waiting');
        setTranscript('');
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Mikrofon-Zugriff verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.');
        setIsListening(false);
        isListeningRef.current = false;
      } else if (event.error === 'no-speech') {
        // normal, keep going
      } else if (event.error === 'audio-capture') {
        setError('Kein Mikrofon gefunden. Bitte verbinde ein Mikrofon.');
        setIsListening(false);
        isListeningRef.current = false;
      } else if (event.error === 'network') {
        console.warn('Network error in speech recognition');
      } else {
        console.warn(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.warn('Could not restart recognition:', e.message);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (e) {}
    };
  }, []); // Only run once on mount

  const startListening = async () => {
    setError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (permError) {
      setError('Mikrofon-Zugriff verweigert. Bitte erlaube den Zugriff.');
      return;
    }

    if (!recognitionRef.current) {
      setError('Spracherkennung nicht verfuegbar. Lade die Seite neu.');
      return;
    }

    try {
      isListeningRef.current = true;
      recognitionRef.current.start();
      setIsListening(true);
      setStatus('waiting');
      toast.success('Voice Control gestartet', { description: 'Sage "Hey Buddy" um zu beginnen' });
    } catch (err) {
      console.error('Error starting recognition:', err);
      if (err.name === 'InvalidStateError') {
        // already running - treat as success
        isListeningRef.current = true;
        setIsListening(true);
        setStatus('waiting');
      } else {
        isListeningRef.current = false;
        setError('Konnte Spracherkennung nicht starten: ' + err.message);
      }
    }
  };

  const stopListening = () => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    setStatus('idle');
    isWaitingForCommandRef.current = false;
    setTranscript('');
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    toast.info('Voice Control beendet');
  };

  const getStatusColor = () => {
    if (loadingInitialData) return 'text-orange-400';
    switch (status) {
      case 'waiting': return 'text-gray-400';
      case 'listening': return 'text-cyan-400';
      case 'responding': return 'text-emerald-400';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    if (loadingInitialData) return 'Lade Daten...';
    if (processingAI) return 'KI denkt nach...';
    switch (status) {
      case 'waiting': return 'Warte auf "Hey Buddy"...';
      case 'listening': return 'Höre zu...';
      case 'responding': return 'Antworte...';
      default: return 'Bereit';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4 pb-32">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)] mb-2"
          >
            KI Voice Control
          </motion.h1>
          <p className="text-gray-400">Sprachgesteuerte Angel-Tipps mit Echtzeit-Daten</p>
        </div>



        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="bg-red-900/20 border-red-500/50">
                <CardContent className="flex items-center gap-3 p-4">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-red-300 text-sm">{error}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Context Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Weather Card */}
          <Card className="glass-morphism border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Cloud className="w-8 h-8 text-cyan-400" />
                <div>
                  <p className="text-xs text-gray-400">Wetter</p>
                  {loadingInitialData ? (
                    <p className="text-gray-500 text-sm flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" />Lade...</p>
                  ) : weather ? (
                    <>
                      <p className="text-white font-semibold">{weather.temp}°C, {getWeatherDescription(weather.weatherCode)}</p>
                      <p className="text-xs text-emerald-400">Bedingungen: {fishingConditions?.rating}</p>
                    </>
                  ) : (
                    <p className="text-gray-500 text-sm">Nicht verfügbar</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Card */}
          <Card className="glass-morphism border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-8 h-8 text-emerald-400" />
                <div>
                  <p className="text-xs text-gray-400">Nächster Spot</p>
                  {loadingInitialData ? (
                     <p className="text-gray-500 text-sm flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" />Lade...</p>
                  ) : nearestSpot ? (
                    <>
                      <p className="text-white font-semibold truncate">{nearestSpot.name}</p>
                      <p className="text-xs text-cyan-400">{nearestSpot.water_type}</p>
                    </>
                  ) : (
                    <p className="text-gray-500 text-sm">Kein Spot in Nähe</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Control Card */}
        <Card className="glass-morphism border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-cyan-400">Sprachsteuerung</span>
              <Badge className={getStatusColor()}>
                {(processingAI || loadingInitialData) && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                {getStatusText()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Voice Animation */}
            <div className="flex justify-center">
              <motion.div
                animate={{
                  scale: isListening ? [1, 1.1, 1] : 1,
                  rotate: isListening ? [0, 360] : 0,
                }}
                transition={{
                  scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                  rotate: { duration: 20, repeat: Infinity, ease: "linear" }
                }}
                className="relative"
              >
                <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
                  isListening 
                    ? 'bg-gradient-to-br from-cyan-600 to-emerald-600 shadow-[0_0_40px_rgba(34,211,238,0.6)]' 
                    : 'bg-gradient-to-br from-gray-700 to-gray-800'
                }`}>
                  {isListening ? (
                    <Waves className="w-16 h-16 text-white" />
                  ) : (
                    <Mic className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                
                {isListening && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-cyan-400"
                    animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.div>
            </div>

            {/* Transcript */}
            <AnimatePresence>
              {transcript && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
                >
                  <p className="text-gray-300 text-sm">
                    <span className="text-gray-500 mr-2">Du:</span>
                    {transcript}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Last Tip */}
            <AnimatePresence>
              {lastTip && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-emerald-900/20 rounded-lg p-4 border border-emerald-500/30"
                >
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-emerald-400 text-xs font-semibold mb-1">CATCH-TIPP</p>
                      <p className="text-gray-200 text-sm leading-relaxed">{lastTip}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Controls */}
            <div className="flex gap-3 justify-center">
              {!isListening ? (
                <Button
                  onClick={startListening}
                  size="lg"
                  className="bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 shadow-lg"
                  disabled={!!error || loadingInitialData}
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Voice Control starten
                </Button>
              ) : (
                <Button
                  onClick={stopListening}
                  size="lg"
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Beenden
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Konversationshistorie */}
        <Card className="glass-morphism border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-cyan-400 text-lg">
              <span>Konversationsprotokoll</span>
              <span className="text-xs text-gray-500 font-normal">letzte 24 Stunden</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Lade Verlauf...
              </div>
            ) : conversationHistory.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Noch keine Konversationen. Starte Voice Control und sage "Hey Buddy".</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {conversationHistory.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-cyan-900/40 border border-cyan-500/30 text-cyan-100'
                        : 'bg-gray-800/60 border border-gray-700 text-gray-200'
                    }`}>
                      <p className="text-xs text-gray-500 mb-1">
                        {msg.role === 'user' ? 'Du' : 'CatchGBT'} - {msg.timestamp ? format(new Date(msg.timestamp), 'HH:mm') : ''}
                      </p>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={conversationEndRef} />
              </div>
            )}
            {conversationHistory.length > 0 && (
              <button
                onClick={async () => {
                  const all = await base44.entities.ChatMessage.filter({ context: 'voice_control' });
                  for (const m of all) await base44.entities.ChatMessage.delete(m.id);
                  setConversationHistory([]);
                  toast.success('Verlauf gelöscht');
                }}
                className="mt-4 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Verlauf löschen
              </button>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="glass-morphism border-gray-800">
          <CardHeader>
            <CardTitle className="text-cyan-400 text-lg">Anleitung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-white font-semibold">Wie funktioniert's?</h4>
              <ol className="text-gray-300 text-sm space-y-2 list-decimal list-inside">
                <li>Klicke auf "Voice Control starten"</li>
                <li>Sage <span className="text-cyan-400 font-semibold">"Hey Buddy"</span> um die KI zu aktivieren</li>
                <li>Stelle deine Frage</li>
                <li>Die KI antwortet mit echten Wetter- und Spot-Daten</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h4 className="text-white font-semibold">Beispiel-Befehle:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <p className="text-cyan-400 text-xs font-semibold mb-1">Wo werfen?</p>
                  <p className="text-gray-300 text-sm">"Hey Buddy, wo soll ich werfen?"</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <p className="text-cyan-400 text-xs font-semibold mb-1">Köder?</p>
                  <p className="text-gray-300 text-sm">"Hey Buddy, welchen Köder?"</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <p className="text-cyan-400 text-xs font-semibold mb-1">Strategie?</p>
                  <p className="text-gray-300 text-sm">"Hey Buddy, welche Strategie?"</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <p className="text-cyan-400 text-xs font-semibold mb-1">Wetter?</p>
                  <p className="text-gray-300 text-sm">"Hey Buddy, wie ist das Wetter?"</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <p className="text-cyan-400 text-xs font-semibold mb-1">Standort?</p>
                  <p className="text-gray-300 text-sm">"Hey Buddy, wo bin ich?"</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <p className="text-cyan-400 text-xs font-semibold mb-1">Beste Zeit?</p>
                  <p className="text-gray-300 text-sm">"Hey Buddy, wann soll ich angeln?"</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <p className="text-cyan-400 text-xs font-semibold mb-1">Fischarten?</p>
                  <p className="text-gray-300 text-sm">"Hey Buddy, welche Fische kann ich fangen?"</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <p className="text-cyan-400 text-xs font-semibold mb-1">Anfänger?</p>
                  <p className="text-gray-300 text-sm">"Hey Buddy, Tipps für Anfänger?"</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <p className="text-cyan-400 text-xs font-semibold mb-1">Regeln?</p>
                  <p className="text-gray-300 text-sm">"Hey Buddy, Schonzeit für Hecht?"</p>
                  <p className="text-gray-300 text-sm">"Hey Buddy, Mindestmaß Zander?"</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <p className="text-cyan-400 text-xs font-semibold mb-1">Freie Frage</p>
                  <p className="text-gray-300 text-sm">"Hey Buddy, [beliebige Frage]"</p>
                </div>
              </div>
            </div>

            <div className="bg-emerald-900/20 rounded-lg p-3 border border-emerald-500/30">
              <p className="text-emerald-400 text-xs font-semibold mb-1">✨ NEU: Erweiterte KI</p>
              <p className="text-gray-300 text-xs">
                Die Voice Control nutzt jetzt echte Wetterdaten, Spot-Informationen, Angelregeln und KI für präzise, kontextbezogene Antworten auf alle deine Angel-Fragen!
              </p>
            </div>

            <div className="bg-amber-900/20 rounded-lg p-3 border border-amber-500/30">
              <p className="text-amber-400 text-xs font-semibold mb-1">⚠️ Hinweis</p>
              <p className="text-gray-300 text-xs">
                Funktioniert am besten in ruhiger Umgebung mit aktiviertem Mikrofon und GPS.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VoiceControlPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <PremiumGuard 
      user={user} 
      requiredPlan="ultimate"
      feature="Die KI-Sprachsteuerung mit Echtzeit-Daten ist ein Ultimate-Feature"
    >
      <VoiceBuddy />
    </PremiumGuard>
  );
}