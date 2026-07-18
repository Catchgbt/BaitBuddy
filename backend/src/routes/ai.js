import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import { invokeLLM } from '../lib/llm.js';
import {
  FISHING_KNOWLEDGE,
  PRACTICAL_GUIDE_RULES,
  PRACTICAL_GUIDE_RULES_VOICE,
  CONVERSATION_STYLE,
  APP_FEATURE_KNOWLEDGE,
} from '../lib/buddyKnowledge.js';
import { isInClosedSeason } from '../lib/closedSeason.js';
import { isAllowedFetchUrl } from '../lib/urlSafety.js';
import { resolvePlan, planRank, PLAN_RANK } from '../lib/planResolver.js';
import { sendDbError } from '../lib/errorResponse.js';
import { fetchWithTimeout } from '../lib/fetchWithTimeout.js';
import { getTTSAudio } from '../lib/multiProviderTTS.js';

// open-meteo ist optional/schnell — kurzes Timeout, damit ein hängender
// Wetterdienst nie die KI-Antwort blockiert.
const WEATHER_TIMEOUT_MS = 8000;

// Obergrenzen gegen überlange Eingaben: schützt vor Token-Kosten-Explosion und
// Prompt-Injection über riesige Freitext-Felder. Werte großzügig, damit echte
// Nutzung nie abgeschnitten wird.
const MAX_CHAT_CONTENT_CHARS = 4000;   // pro Chat-Nachricht
const MAX_CHAT_MESSAGES = 50;          // Anzahl Chat-Nachrichten
const MAX_CATCH_DATA_CHARS = 4000;     // serialisierte catch_data
const MAX_CONTEXT_CHARS = 1000;        // freie Kontext-/Perioden-Strings

const router = Router();

// Extrahiert einen Aktions-Block aus der LLM-Antwort und liefert die für den
// Nutzer sichtbare Antwort ohne den Block zurück.
//
// Der Idealfall ist der markierte Block <<ACTION>>{...}<<END>>. Das LLM hält
// sich aber nicht immer daran und hängt die rohe Action-JSON ohne Marker ans
// Antwort-Ende (z. B. `... {"type":"navigate","params":{"page":"karte"}}`).
// Diese nackte JSON darf dem Nutzer NIEMALS als Text angezeigt werden, deshalb
// erkennen wir sie als Fallback über Brace-Matching und entfernen sie ebenfalls.
function extractAction(reply) {
  const markerMatch = reply.match(/<<ACTION>>(.*?)<<END>>/s);
  if (markerMatch) {
    let action = null;
    try {
      action = JSON.parse(markerMatch[1]);
    } catch (error) {
      console.error('Fehler beim Parsen der KI-Action:', error);
    }
    return { action, cleanReply: reply.replace(/<<ACTION>>.*?<<END>>/s, '').trim() };
  }

  // Fallback: nackte Action-JSON am Antwort-Ende. Wir suchen das letzte
  // `{"type"` und lesen das balancierte JSON-Objekt (unter Beachtung von
  // Strings/Escapes) bis zur passenden schließenden Klammer.
  const typeIdx = reply.lastIndexOf('{"type"');
  const looseIdx = typeIdx === -1 ? reply.search(/\{\s*"type"\s*:/) : typeIdx;
  if (looseIdx !== -1) {
    const end = matchBalancedBrace(reply, looseIdx);
    if (end !== -1) {
      const candidate = reply.slice(looseIdx, end + 1);
      try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed.type === 'string') {
          return { action: parsed, cleanReply: reply.slice(0, looseIdx).trim() };
        }
      } catch {
        // Kein gültiges JSON — dann nichts entfernen, Antwort unverändert lassen.
      }
    }
  }

  return { action: null, cleanReply: reply.trim() };
}

// Findet zur öffnenden Klammer bei startIdx die passende schließende Klammer,
// String-Literale (inkl. Escapes) werden übersprungen. Liefert -1, wenn kein
// balanciertes Objekt gefunden wird.
function matchBalancedBrace(str, startIdx) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = startIdx; i < str.length; i++) {
    const ch = str[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// Liest den Groq-Key aus mehreren möglichen Variablennamen.
function getGroqKey() {
  const key = process.env.GROQ_API_KEY || process.env.GROG_API_KEY || process.env.GROK_API_KEY || null;
  if (!key && process.env.NODE_ENV === 'development') {
    console.warn('[AI] WARNUNG: GROQ_API_KEY ist nicht gesetzt. Bitte setze die Umgebungsvariable für KI-Funktionen.');
  }
  return key;
}

router.get('/health', (req, res) => {
  const key = getGroqKey();
  res.json({
    ok: true,
    api_key_set: !!key,
    provider: 'Groq (Llama)',
    node_env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// requireAuth: /ai/test ruft echtes invokeLLM auf und würde ohne Auth
// unauthentifizierte Groq-Kosten erlauben. Für einen kostenlosen Health-Ping
// ohne LLM-Call gibt es /health bzw. /api/health.
router.get('/ai/test', requireAuth, async (req, res) => {
  try {
    if (!getGroqKey()) {
      // Nur serverseitig loggen, welche Env-Variablen-NAMEN in Frage kaemen —
      // im Response landen weder Namen noch Werte (Aufzaehlung provisionierter
      // Secrets ist selbst Info-Disclosure).
      console.warn('[AI] /ai/test: GROQ_API_KEY nicht gesetzt. Relevante Env-Variablen:',
        Object.keys(process.env).filter(k => /open|api|key|gemini|anthropic|gro/i.test(k)).sort());
      return res.json({ ok: false, error: 'GROQ_API_KEY ist nicht gesetzt', step: 'key_check' });
    }
    const reply = await invokeLLM({ prompt: 'Sage nur: Hallo, ich funktioniere!' });
    return res.json({ ok: true, reply, provider: 'Groq (Llama)' });
  } catch (e) {
    console.error('Error in /ai/test:', e);
    return res.status(500).json({ ok: false, error: 'KI-Test fehlgeschlagen', step: 'llm_call' });
  }
});

router.post('/ai/chat', requireAuth, async (req, res) => {
  try {
    const { messages = [], userLocation = null } = req.body;
    const userEmail = req.user.email;

    // Eingabe hart validieren: Ein Nicht-Array führte zuvor beim Spread
    // [...messages] zu einem 500er statt einer sauberen 400. Zusätzlich pro
    // Nachricht Länge kappen und Anzahl begrenzen (Kosten-/Injection-Schutz).
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages muss ein Array sein' });
    }
    const safeMessages = messages
      .filter(m => m && typeof m.content === 'string')
      .slice(-MAX_CHAT_MESSAGES)
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content.slice(0, MAX_CHAT_CONTENT_CHARS).trim(),
      }))
      .filter(m => m.content.length > 0);

    const lastMsg = [...safeMessages].reverse().find(m => m.role === 'user')?.content || '';
    const wantsCatches = /fang|fänge|gefangen|fangbuch|logbuch/i.test(lastMsg);
    const wantsRules = /schonzeit|mindestmaß|erlaubt|verboten/i.test(lastMsg);
    const wantsSpots = /spot|angelplatz|wo angel/i.test(lastMsg);
    const wantsWeather = /wetter|temperatur|wind/i.test(lastMsg);

    // Kontext-Quellen laufen parallel statt sequenziell — spart Latenz vor dem
    // LLM-Call (Ziel < 2 s). Jede Quelle liefert einen fertigen Kontext-String
    // oder null; die Reihenfolge (Fänge, Schonzeiten, Spots, Wetter) bleibt fix.
    const [catchesPart, rulesPart, spotsPart, weatherPart] = await Promise.all([
      (async () => {
        if (!wantsCatches) return null;
        const { data: catches } = await supabase
          .from('catches').select('*')
          .eq('created_by', userEmail)
          .order('catch_time', { ascending: false }).limit(10);
        if (!catches?.length) return null;
        return 'FANGBUCH:\n' + catches.map(c =>
          `- ${c.species || '?'}, ${c.length_cm || '?'}cm, ${c.weight_kg || '?'}kg, Köder: ${c.bait_used || '?'}`
        ).join('\n');
      })(),
      (async () => {
        if (!wantsRules) return null;
        const { data: rules } = await supabase.from('rule_entries').select('*').limit(30);
        if (!rules?.length) return null;
        const active = rules.filter(r => isInClosedSeason(r.closed_from, r.closed_to));
        if (!active.length) return null;
        return 'AKTIVE SCHONZEITEN:\n' + active.map(r =>
          `- ${r.fish} (${r.region}): bis ${r.closed_to}`
        ).join('\n');
      })(),
      (async () => {
        if (!wantsSpots) return null;
        const { data: spots } = await supabase
          .from('spots').select('name,water_type')
          .eq('created_by', userEmail).limit(10);
        if (!spots?.length) return null;
        return 'MEINE SPOTS:\n' + spots.map(s => `- ${s.name} (${s.water_type})`).join('\n');
      })(),
      (async () => {
        if (!(wantsWeather && userLocation?.latitude)) return null;
        // Koordinaten hart als Zahlen validieren, bevor sie in die Upstream-URL
        // interpoliert werden — sonst könnte ein String wie "52.5&extra=1" fremde
        // Query-Parameter einschleusen.
        const lat = Number(userLocation.latitude);
        const lon = Number(userLocation.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon) ||
            lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
        const w = await fetchWithTimeout(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,weather_code&timezone=auto`,
          {}, WEATHER_TIMEOUT_MS
        ).then(r => r.json()).catch(() => null);
        if (!w?.current) return null;
        return `WETTER: ${w.current.temperature_2m}°C, Wind: ${w.current.wind_speed_10m}m/s`;
      })(),
    ]);

    const contextParts = [catchesPart, rulesPart, spotsPart, weatherPart].filter(Boolean);
    const context = contextParts.length ? '\n\n--- App-Daten ---\n' + contextParts.join('\n\n') + '\n---\n' : '';

    const systemPrompt = `Du bist BaitBuddy, ein erfahrener und sympathischer Angel-Kumpel und Experte. Du sprichst locker und natürlich wie in einem echten Gespräch am Wasser — nicht steif oder formell. Bei Smalltalk und einfachen Fragen antwortest du kurz und gesprächig (1–3 Sätze). Keine Emojis, keine Sternchen-Aufzählungen — flüssige Sätze; nummerierte Schritte (1., 2., 3.) sind nur in Anleitungs-Antworten erlaubt.

${PRACTICAL_GUIDE_RULES}

DEINE PERSÖNLICHKEIT:
- Stelle zwischendurch Fragen: "Wie war's denn zuletzt am Wasser?" oder "Was hast du denn heute für ein Gefühl?"
- Merke dir, was der Nutzer erzählt: letzte Fänge, Lieblings-Köder, bevorzugte Spots, erfolgreiche Zeiten.
- Erinnere an Schonzeiten, wenn relevant: "Achtung, die Hechte sind gerade in Schonzeit — aber Forellen gehen noch!"
- Erwähne Events in der Nähe, wenn der Nutzer angeln gehen will: "Übrigens: nächsten Samstag ist wieder ein Community-Event!"
- Nur Smalltalk kurz halten — Wissens- und Technikfragen beantwortest du dagegen vollständig nach den Anleitungs-Regeln oben.

${CONVERSATION_STYLE}

${APP_FEATURE_KNOWLEDGE}

${FISHING_KNOWLEDGE}

DU KANNST DIE APP STEUERN. Wenn der Nutzer dich darum bittet, etwas in der App zu tun, hänge ans ENDE deiner Antwort einen Aktions-Block an. Format exakt so (nur EIN Block pro Antwort):
<<ACTION>>{"type":"...","params":{...}}<<END>>

Verfügbare Aktionen:
1. Navigieren / Seite öffnen: {"type":"navigate","params":{"page":"<seite>"}}
   Erlaubte Seiten-Werte: dashboard, logbuch, karte, wetter, warnung, community, ausruestung, chat, ki, trip, profil, einstellungen, rang, wasser, angelschein, quiz, lizenzen, events, koeder, statistik, knoten, shop, premium, hilfe, tutorial, geraete, voice
2. Fang eintragen: {"type":"log_catch","params":{"species":"Hecht","length_cm":75,"weight_kg":4.2,"bait_used":"Gummifisch","notes":"..."}}
3. Spot speichern: {"type":"add_spot","params":{"name":"Mein Spot","water_type":"see|fluss|teich|kanal|bach","notes":"..."}}

Regeln: Aktions-Block nur wenn Nutzer wirklich eine Aktion will. Zuerst kurze Bestätigung, dann Block. Block wird dem Nutzer nicht angezeigt. Nutze fuer "page" exakt einen der erlaubten Werte.${context}`;

    const history = safeMessages.slice(-6).map(m =>
      `${m.role === 'user' ? 'Nutzer' : 'BaitBuddy'}: ${m.content}`
    ).join('\n');

    const reply = await invokeLLM({ prompt: `${systemPrompt}\n\n${history}\n\nAntworte:` });

    const { action, cleanReply } = extractAction(reply);

    return res.json({ ok: true, reply: cleanReply, message: cleanReply, action });
  } catch (e) {
    // Gegen Nicht-Error-Throws absichern: e.message könnte undefined sein und
    // .includes() würde dann selbst werfen (verschluckter Fehler → 500 ohne Log).
    const msg = e && typeof e.message === 'string' ? e.message : String(e);
    console.error('[AI Chat Error]', msg, e?.stack);
    const details = msg.includes('GROQ_API_KEY') ? 'API-Schlüssel nicht konfiguriert' : 'KI-Service Fehler';
    return res.status(500).json({ error: details, details });
  }
});

router.post('/ai/analyze-catch', requireAuth, async (req, res) => {
  try {
    const { image_base64, file_url } = req.body;
    let imageBase64 = image_base64 || file_url;
    if (!imageBase64) return res.status(400).json({ error: 'image_base64 required' });

    // Wenn eine URL übergeben wird (Supabase-Storage), gegen SSRF absichern und
    // serverseitig zu Base64 laden — analog zu /analyze-photo. Ohne diese Prüfung
    // würde der Server jede vom Client genannte URL abrufen.
    if (typeof imageBase64 === 'string' && imageBase64.startsWith('http')) {
      if (!isAllowedFetchUrl(imageBase64)) {
        return res.status(400).json({ error: 'Bild-URL muss aus dem eigenen Supabase-Storage stammen' });
      }
      const imgRes = await fetchWithTimeout(imageBase64, {}, WEATHER_TIMEOUT_MS);
      if (!imgRes.ok) return res.status(400).json({ error: 'Bild konnte nicht heruntergeladen werden' });
      const buffer = await imgRes.arrayBuffer();
      imageBase64 = Buffer.from(buffer).toString('base64');
    }

    const analysis = await invokeLLM({
      prompt: 'Analysiere dieses Foto. Erkenne die Fischart, schätze Länge und Gewicht. Gib Tipps. Antworte auf Deutsch.',
      imageBase64
    });
    return res.json({ ok: true, analysis });
  } catch (e) {
    return sendDbError(res, e);
  }
});

router.post('/analyze-photo', requireAuth, async (req, res) => {
  try {
    let imageBase64 = req.body.imageBase64 || req.body.image;

    // Wenn image eine URL ist (Supabase), fetch die Daten
    if (imageBase64?.startsWith('http')) {
      if (!isAllowedFetchUrl(imageBase64)) {
        return res.status(400).json({ error: 'Bild-URL muss aus dem eigenen Supabase-Storage stammen' });
      }
      const imgRes = await fetchWithTimeout(imageBase64, {}, WEATHER_TIMEOUT_MS);
      if (!imgRes.ok) return res.status(400).json({ error: 'Bild konnte nicht heruntergeladen werden' });
      const buffer = await imgRes.arrayBuffer();
      imageBase64 = Buffer.from(buffer).toString('base64');
    }

    if (!imageBase64) return res.status(400).json({ error: 'image required' });
    const raw = await invokeLLM({
      prompt: `Analysiere dieses Fisch-Foto so genau wie möglich. Antworte NUR mit einem JSON-Objekt in diesem Format, ohne Erklärungen:
{"species":"Fischart auf Deutsch","length_cm":Zahl_oder_null,"weight_kg":Zahl_oder_null,"bait_used":"erkannter Köder oder null","confidence":0.0_bis_1.0}

Regeln:
- Schätze die Länge anhand von sichtbaren Referenzobjekten (Hände, Rute, Kescher, Maßband).
- Berechne das Gewicht basierend auf Art und geschätzter Länge mit typischen Gewichtstabellen.
- Wenn ein Köder im Maul oder auf dem Bild sichtbar ist, gib ihn an (z.B. "Gummifisch", "Wobbler", "Spinner", "Wurm", "Mais").
- confidence: Wie sicher bist du bei der Arterkennung? (0.0 = unsicher, 1.0 = sehr sicher)
- Wenn du keinen Fisch erkennst, nutze null für alle Felder und confidence 0.`,
      imageBase64
    });
    let parsed = {};
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Fehler beim Parsen der KI-Analyse:', error);
      parsed = {};
    }
    return res.json({
      ok: true,
      species: typeof parsed.species === 'string' ? parsed.species : null,
      length_cm: typeof parsed.length_cm === 'number' ? parsed.length_cm : null,
      weight_kg: typeof parsed.weight_kg === 'number' ? parsed.weight_kg : null,
      bait_used: typeof parsed.bait_used === 'string' ? parsed.bait_used : null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : null
    });
  } catch (e) {
    return sendDbError(res, e);
  }
});

router.post('/ai/evaluate-catch', requireAuth, async (req, res) => {
  try {
    const { catch_data, context } = req.body;
    if (catch_data == null) {
      return res.status(400).json({ error: 'catch_data erforderlich' });
    }
    // Serialisierung und Kontext vor der Prompt-Interpolation begrenzen
    // (Token-Kosten- und Prompt-Injection-Schutz).
    const catchStr = JSON.stringify(catch_data).slice(0, MAX_CATCH_DATA_CHARS);
    const contextStr = (typeof context === 'string' ? context : '').slice(0, MAX_CONTEXT_CHARS);
    const reply = await invokeLLM({ prompt: `Bewerte diesen Fang: ${catchStr}. Kontext: ${contextStr}. Antworte auf Deutsch.` });
    return res.json({ ok: true, evaluation: reply });
  } catch (e) {
    return sendDbError(res, e);
  }
});

router.post('/ai/generate-catch-report', requireAuth, async (req, res) => {
  try {
    const { period } = req.body;
    // Freitext-Periode validieren und begrenzen, bevor sie in den Prompt fließt.
    const safePeriod = (typeof period === 'string' ? period : '').slice(0, MAX_CONTEXT_CHARS).trim() || 'letzte 30 Tage';
    const { data: catches } = await supabase.from('catches').select('*').eq('created_by', req.user.email).order('catch_time', { ascending: false }).limit(50);
    const reply = await invokeLLM({ prompt: `Erstelle einen Fangbericht für den Zeitraum ${safePeriod} basierend auf diesen Fängen: ${JSON.stringify(catches?.slice(0, 20))}. Antworte auf Deutsch.` });
    return res.json({ ok: true, report: reply });
  } catch (e) {
    return sendDbError(res, e);
  }
});

// KI-Standort-Analyse fürs Dashboard ("KI Angelempfehlung"): kombiniert das
// aktuelle Wetter am Standort mit dem Fangbuch des Nutzers und lässt die KI
// eine strukturierte Empfehlung erzeugen.
const WMO = {
  0: 'klar', 1: 'überwiegend klar', 2: 'teils bewölkt', 3: 'bewölkt',
  45: 'Nebel', 48: 'Reifnebel', 51: 'leichter Niesel', 53: 'Niesel', 55: 'starker Niesel',
  61: 'leichter Regen', 63: 'Regen', 65: 'starker Regen',
  71: 'leichter Schnee', 73: 'Schnee', 75: 'starker Schnee',
  80: 'Regenschauer', 81: 'Regenschauer', 82: 'heftige Schauer',
  95: 'Gewitter', 96: 'Gewitter mit Hagel', 99: 'schweres Gewitter'
};

router.post('/ai/fishing-recommendation', requireAuth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body || {};
    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: 'latitude und longitude erforderlich' });
    }

    // Wetter und Fangbuch parallel laden — spart Latenz vor dem LLM-Call.
    const [weather, catches] = await Promise.all([
      (async () => {
        try {
          const w = await fetchWithTimeout(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m,weather_code,surface_pressure,relative_humidity_2m&timezone=auto`,
            {}, WEATHER_TIMEOUT_MS
          ).then(r => r.json());
          if (w?.current) {
            return {
              temperature: w.current.temperature_2m,
              wind: w.current.wind_speed_10m,
              pressure: w.current.surface_pressure,
              humidity: w.current.relative_humidity_2m,
              condition: WMO[w.current.weather_code] ?? 'unbekannt'
            };
          }
        } catch { /* Wetter optional */ }
        return null;
      })(),
      (async () => {
        const { data } = await supabase
          .from('catches').select('*')
          .eq('created_by', req.user.email)
          .order('catch_time', { ascending: false }).limit(30);
        return data;
      })(),
    ]);
    const catchCount = catches?.length || 0;

    const catchSummary = catchCount
      ? catches.slice(0, 20).map(c =>
          `- ${c.species || '?'}, ${c.length_cm || '?'}cm, Köder: ${c.bait_used || '?'}, ${c.catch_time ? new Date(c.catch_time).toLocaleDateString('de-DE') : '?'}`
        ).join('\n')
      : 'Noch keine Fänge im Fangbuch.';

    const weatherSummary = weather
      ? `Temperatur: ${weather.temperature}°C, Wind: ${weather.wind} km/h, Luftdruck: ${weather.pressure} hPa, Luftfeuchte: ${weather.humidity}%, Wetter: ${weather.condition}`
      : 'Keine Wetterdaten verfügbar.';

    const prompt = `Du bist ein erfahrener Angel-Experte. Erstelle eine Angelempfehlung basierend auf den folgenden Daten.

AKTUELLES WETTER AM STANDORT:
${weatherSummary}

FANGBUCH DES ANGLERS (${catchCount} Fänge):
${catchSummary}

Antworte AUSSCHLIESSLICH mit einem gültigen JSON-Objekt in exakt diesem Format, ohne Markdown, ohne Erklärungen:
{
  "weather_rating": "Gut" | "Mittel" | "Schlecht",
  "summary": "2-3 Sätze Einschätzung der aktuellen Angelbedingungen auf Deutsch",
  "optimal_times": ["z.B. Früh morgens 5-8 Uhr", "Abends 19-21 Uhr"],
  "recommended_baits": ["Köder 1", "Köder 2", "Köder 3"],
  "target_species": ["Fischart 1", "Fischart 2"],
  "tips": ["konkreter Tipp 1", "konkreter Tipp 2", "konkreter Tipp 3"]
}`;

    const raw = await invokeLLM({ prompt });

    let recommendation;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recommendation = JSON.parse(jsonMatch[0]);
      } else {
        recommendation = null;
      }
    } catch (error) {
      console.error('Fehler beim Parsen der KI-Empfehlung:', error);
      recommendation = null;
    }

    if (!recommendation || typeof recommendation.summary !== 'string' || !recommendation.summary.trim()) {
      return res.status(502).json({ error: 'KI lieferte keine gültige Empfehlung' });
    }

    return res.json({ ok: true, data: { recommendation, catchCount, weather } });
  } catch (e) {
    console.error('[Fishing Recommendation Error]', e.message);
    return sendDbError(res, e);
  }
});

// Männliche Standardstimme — "Daniel" ist eine natürliche deutsche
// Premade-Voice, die auch im ElevenLabs-Free-Plan per API nutzbar ist.
const DEFAULT_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9';
// Weibliche Stimme (nur Ultimate) — "Matilda" ist eine warme, natürliche
// Premade-Voice; über eleven_multilingual_v2 spricht sie sauberes Deutsch und
// ist wie Daniel im Free-Plan per API nutzbar.
const FEMALE_VOICE_ID = 'XrExE9yKIg1WjnnlVkGX';

router.post('/ai/tts', requireAuth, async (req, res) => {
  const { text, voice } = req.body;
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Text is required' });
  }

  // Stimmen-Wahl: 'female' ist ein Ultimate-Feature (Plan-ID 'elite' bzw.
  // Friends-Level). Das Gate MUSS serverseitig sitzen — die Auswahl in den
  // Einstellungen ist nur Komfort; ohne ausreichenden Plan wird still auf die
  // Standardstimme zurückgefallen statt die Sprachausgabe zu blockieren.
  let voiceUsed = voice === 'female' ? 'female' : 'male';
  if (voiceUsed === 'female') {
    const { effectiveId } = resolvePlan(req.user);
    if (planRank(effectiveId) < PLAN_RANK.elite) voiceUsed = 'male';
  }

  const voiceId = voiceUsed === 'female'
    ? (process.env.ELEVENLABS_VOICE_ID_FEMALE || FEMALE_VOICE_ID)
    : (process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID);

  try {
    const result = await getTTSAudio(text, voiceId);
    return res.json({ ...result, voice_used: voiceUsed });
  } catch (e) {
    console.error('TTS error (all providers failed):', e.message);
    return res.status(502).json({ error: 'TTS service error - keine Provider verfügbar' });
  }
});

router.post('/ai/fish-behavior-analysis', requireAuth, async (req, res) => {
  try {
    const { species, water_data = {}, air_pressure, latitude = null, longitude = null } = req.body;

    if (!species || !species.trim()) {
      return res.status(400).json({ error: 'Fischart (species) erforderlich' });
    }

    let currentWeather = null;
    if (latitude != null && longitude != null) {
      try {
        const w = await fetchWithTimeout(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m,weather_code,surface_pressure,relative_humidity_2m&timezone=auto`,
          {}, WEATHER_TIMEOUT_MS
        ).then(r => r.json());
        if (w?.current) {
          currentWeather = {
            temperature: w.current.temperature_2m,
            wind: w.current.wind_speed_10m,
            pressure: w.current.surface_pressure || air_pressure,
            humidity: w.current.relative_humidity_2m
          };
        }
      } catch { /* Wetter optional */ }
    }

    const weatherData = currentWeather || { pressure: air_pressure };
    const pressure = weatherData.pressure || 1013;

    const waterDataSummary = Object.entries(water_data)
      .filter(([_, v]) => v != null)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ') || 'Keine Gewässerdaten angegeben';

    const prompt = `Du bist ein Experte für Fischverhalten und Limnologie. Erstelle eine detaillierte Verhaltensanalyse für einen Fisch.

FISCHART: ${species}
LUFTDRUCK: ${pressure} hPa
GEWÄSSERDATEN: ${waterDataSummary}
${currentWeather ? `AKTUELLES WETTER: ${currentWeather.temperature}°C, Wind: ${currentWeather.wind}m/s, Luftfeuchte: ${currentWeather.humidity}%` : ''}

Antworte AUSSCHLIESSLICH mit einem gültigen JSON-Objekt in exakt diesem Format, ohne Markdown oder Erklärungen:
{
  "species_name": "Fischart auf Deutsch",
  "activity_level": "Sehr aktiv" | "Aktiv" | "Moderat" | "Träge",
  "pressure_impact": "positive" | "negative" | "neutral",
  "behavior_summary": "2-3 Sätze über das aktuelle Verhalten und die Umweltbedingungen auf Deutsch",
  "best_times": ["z.B. 5-8 Uhr", "18-21 Uhr"],
  "feeding_zones": ["z.B. Krautzone 1-2m", "Uferbereich"],
  "recommended_depth": "z.B. 2-4m",
  "bait_recommendations": ["Köder 1", "Köder 2"],
  "techniques": ["Technik 1", "Technik 2"],
  "pressure_pressure_tips": ["Tipp bei aktuellem Luftdruck 1", "Tipp 2"],
  "water_conditions_notes": "Besonderheiten der Gewässerbedingungen auf Deutsch"
}`;

    const raw = await invokeLLM({ prompt });

    let analysis;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = null;
      }
    } catch (error) {
      console.error('Fehler beim Parsen der Verhaltensanalyse:', error);
      analysis = null;
    }

    if (!analysis || !analysis.behavior_summary) {
      return res.status(502).json({ error: 'KI konnte keine gültige Verhaltensanalyse erstellen' });
    }

    return res.json({ ok: true, data: analysis });
  } catch (e) {
    console.error('[Fish Behavior Analysis Error]', e.message);
    return sendDbError(res, e);
  }
});

// ── OpenAI Realtime (Echtzeit-Sprachgespräch, Speech-to-Speech) ──────────────
// Mintet ein kurzlebiges Ephemeral-Token. Der echte OPENAI_API_KEY bleibt
// ausschließlich serverseitig; der Browser baut damit direkt die WebRTC-
// Verbindung zu OpenAI auf. Der Key wird tolerant auch unter abweichenden
// Variablennamen gefunden (OPENAI_API_KEY, Openai_key, …).
function getOpenAIKey() {
  return process.env.OPENAI_API_KEY
    || Object.entries(process.env).find(([k, v]) => /open.?_?ai/i.test(k) && /key|token|secret/i.test(k) && v)?.[1]
    || null;
}

router.post('/ai/realtime-session', requireAuth, async (req, res) => {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    console.warn('[AI] /ai/realtime-session: kein OpenAI-Key gefunden. Relevante Env-Variablen:',
      Object.keys(process.env).filter(k => /open|realtime|voice/i.test(k)).sort());
    return res.status(503).json({
      error: 'Voice nicht konfiguriert. Bitte OPENAI_API_KEY als Vercel-Umgebungsvariable setzen.',
    });
  }

  const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime';
  const voice = process.env.OPENAI_REALTIME_VOICE || 'verse';

  try {
    // Persönlichen Kontext laden (Fänge + Schonzeiten parallel), damit sich das
    // Gespräch echt anfühlt — ohne die Session-Erstellung unnötig zu verzögern.
    const [catchesPart, rulesPart] = await Promise.all([
      (async () => {
        const { data: catches } = await supabase
          .from('catches').select('species,length_cm,bait_used,catch_time')
          .eq('created_by', req.user.email)
          .order('catch_time', { ascending: false }).limit(8);
        if (!catches?.length) return null;
        return 'Letzte Fänge: ' + catches.map(c =>
          `${c.species || '?'} (${c.length_cm || '?'}cm${c.bait_used ? ', Köder ' + c.bait_used : ''})`
        ).join(', ');
      })(),
      (async () => {
        try {
          const { data: rules } = await supabase.from('rule_entries').select('fish,region,closed_from,closed_to').limit(40);
          const active = (rules || []).filter(r => isInClosedSeason(r.closed_from, r.closed_to));
          if (!active.length) return null;
          return 'Aktive Schonzeiten gerade: ' + active.map(r => `${r.fish} (${r.region}) bis ${r.closed_to}`).join(', ');
        } catch { /* Schonzeiten optional */ return null; }
      })(),
    ]);
    const parts = [catchesPart, rulesPart].filter(Boolean);
    const ctx = parts.length ? `\n\nWas du über diesen Angler weißt:\n- ${parts.join('\n- ')}` : '';

    const instructions = `Du bist BaitBuddy – ein erfahrener, sympathischer Angel-Kumpel und Experte. `
      + `Du sprichst Deutsch und redest locker und natürlich wie in einem echten Gespräch am Wasser, `
      + `nicht wie ein steifer Assistent. Halte deine Antworten kurz und gesprächig (meist 1 bis 3 Sätze), `
      + `nutze Alltagssprache, stell auch mal eine kurze Rückfrage und zeig echtes Interesse. `
      + `Du hilfst bei Ködern, Montagen, Techniken, Wetter, Schonzeiten, Spots und allem rund ums Angeln. `
      + `Wenn du etwas nicht sicher weißt, sag es ehrlich statt zu raten. `
      + PRACTICAL_GUIDE_RULES_VOICE + ' '
      + `Sprich keine Sonderzeichen, Sternchen oder Aufzählungspunkte aus – formuliere alles als flüssige Sätze. `
      + `Merke dir, was der Nutzer erzählt – seine Lieblings-Köder, bevorzugte Spots, letzte Fänge – und beziehe dich später drauf. `
      + `Stelle gerne Zwischenfragen wie „Wie war es denn zuletzt?" oder „Was hast du schon probiert?" – zeige echtes Interesse. `
      + `Erinnere an Schonzeiten und Events, falls relevant. `
      + `Sei motivierend und positiv – Angeln soll Spaß machen!`
      + `\n\n${CONVERSATION_STYLE}`
      + `\n\n${APP_FEATURE_KNOWLEDGE}`
      // Im Sprachmodus gibt es den Aktions-Mechanismus des Text-Chats nicht —
      // ohne diesen Hinweis würde der Voice-Buddy fälschlich behaupten, er habe
      // Einträge angelegt oder Seiten geöffnet.
      + `\nWichtig für dich im Sprachmodus: Du kannst hier selbst KEINE App-Aktionen ausführen (kein Eintragen, kein Seiten-Öffnen). Erkläre stattdessen, wo der Nutzer die Funktion findet oder dass er sie dem Text-Chat-Buddy per Zuruf sagen kann.`
      + `\n\n${FISHING_KNOWLEDGE}` + ctx;

    // GA-API: der Beta-Endpunkt /v1/realtime/sessions wurde von OpenAI entfernt
    // (Antwort war "Invalid URL"). Ephemeral-Tokens kommen jetzt von
    // /v1/realtime/client_secrets mit Session-Konfiguration im neuen Format.
    const r = await fetchWithTimeout('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        expires_after: { anchor: 'created_at', seconds: 600 },
        session: {
          type: 'realtime',
          model,
          instructions,
          audio: {
            input: {
              transcription: { model: 'whisper-1' },
              turn_detection: { type: 'server_vad', threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 600, create_response: true }
            },
            output: { voice }
          }
        }
      })
    });
    const data = await r.json();
    if (!r.ok || !data?.value) {
      console.error('[Realtime Session Error]', data?.error || data);
      return res.status(502).json({ error: data?.error?.message || 'OpenAI Realtime Fehler' });
    }
    // Antwortform fuer den Client stabil halten: { client_secret: { value } }
    return res.json({ ok: true, client_secret: { value: data.value, expires_at: data.expires_at }, model, voice });
  } catch (e) {
    console.error('[Realtime Session Error]', e.message);
    return sendDbError(res, e);
  }
});

export default router;
