import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import { invokeLLM } from '../lib/llm.js';
import { isInClosedSeason } from '../lib/closedSeason.js';

const router = Router();

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
    api_key_preview: key ? key.slice(0, 10) + '...' : 'nicht gesetzt',
    provider: 'Groq (Llama)',
    node_env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

router.get('/ai/test', async (req, res) => {
  try {
    if (!getGroqKey()) {
      // Diagnose: nur die NAMEN relevanter Env-Variablen zeigen (keine Werte)
      const envNames = Object.keys(process.env)
        .filter(k => /open|api|key|gemini|anthropic|gro/i.test(k))
        .sort();
      return res.json({ ok: false, error: 'GROQ_API_KEY ist nicht gesetzt', step: 'key_check', env_names: envNames });
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

    const lastMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const wantsCatches = /fang|fänge|gefangen|fangbuch|logbuch/i.test(lastMsg);
    const wantsRules = /schonzeit|mindestmaß|erlaubt|verboten/i.test(lastMsg);
    const wantsSpots = /spot|angelplatz|wo angel/i.test(lastMsg);
    const wantsWeather = /wetter|temperatur|wind/i.test(lastMsg);

    const contextParts = [];

    if (wantsCatches) {
      const { data: catches } = await supabase
        .from('catches').select('*')
        .eq('created_by', userEmail)
        .order('catch_time', { ascending: false }).limit(10);
      if (catches?.length) {
        contextParts.push('FANGBUCH:\n' + catches.map(c =>
          `- ${c.species || '?'}, ${c.length_cm || '?'}cm, ${c.weight_kg || '?'}kg, Köder: ${c.bait_used || '?'}`
        ).join('\n'));
      }
    }

    if (wantsRules) {
      const { data: rules } = await supabase.from('rule_entries').select('*').limit(30);
      if (rules?.length) {
        const active = rules.filter(r => isInClosedSeason(r.closed_from, r.closed_to));
        if (active.length) {
          contextParts.push('AKTIVE SCHONZEITEN:\n' + active.map(r =>
            `- ${r.fish} (${r.region}): bis ${r.closed_to}`
          ).join('\n'));
        }
      }
    }

    if (wantsSpots) {
      const { data: spots } = await supabase
        .from('spots').select('name,water_type')
        .eq('created_by', userEmail).limit(10);
      if (spots?.length) {
        contextParts.push('MEINE SPOTS:\n' + spots.map(s => `- ${s.name} (${s.water_type})`).join('\n'));
      }
    }

    if (wantsWeather && userLocation?.latitude) {
      const w = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&current=temperature_2m,wind_speed_10m,weather_code&timezone=auto`
      ).then(r => r.json()).catch(() => null);
      if (w?.current) {
        contextParts.push(`WETTER: ${w.current.temperature_2m}°C, Wind: ${w.current.wind_speed_10m}m/s`);
      }
    }

    const context = contextParts.length ? '\n\n--- App-Daten ---\n' + contextParts.join('\n\n') + '\n---\n' : '';

    const systemPrompt = `Du bist BaitBuddy, ein professioneller Angel-Experte und KI-Assistent für eine Angel-App. Antworte kurz und präzise auf Deutsch. Keine Emojis.

DU KANNST DIE APP STEUERN. Wenn der Nutzer dich darum bittet, etwas in der App zu tun, hänge ans ENDE deiner Antwort einen Aktions-Block an. Format exakt so (nur EIN Block pro Antwort):
<<ACTION>>{"type":"...","params":{...}}<<END>>

Verfügbare Aktionen:
1. Navigieren / Seite öffnen: {"type":"navigate","params":{"page":"<seite>"}}
   Erlaubte Seiten-Werte: dashboard, logbuch, karte, wetter, warnung, community, ausruestung, chat, ki, trip, profil, einstellungen, rang, wasser, angelschein, quiz, lizenzen, events, koeder, statistik, knoten, shop, premium, hilfe, tutorial, geraete, voice
2. Fang eintragen: {"type":"log_catch","params":{"species":"Hecht","length_cm":75,"weight_kg":4.2,"bait_used":"Gummifisch","notes":"..."}}
3. Spot speichern: {"type":"add_spot","params":{"name":"Mein Spot","water_type":"see|fluss|teich|kanal|bach","notes":"..."}}

Regeln: Aktions-Block nur wenn Nutzer wirklich eine Aktion will. Zuerst kurze Bestätigung, dann Block. Block wird dem Nutzer nicht angezeigt. Nutze fuer "page" exakt einen der erlaubten Werte.${context}`;

    const history = messages.slice(-6).map(m =>
      `${m.role === 'user' ? 'Nutzer' : 'BaitBuddy'}: ${m.content}`
    ).join('\n');

    const reply = await invokeLLM({ prompt: `${systemPrompt}\n\n${history}\n\nAntworte:` });

    let action = null;
    const actionMatch = reply.match(/<<ACTION>>(.*?)<<END>>/s);
    if (actionMatch) {
      try {
        action = JSON.parse(actionMatch[1]);
      } catch (error) {
        console.error('Fehler beim Parsen der KI-Action:', error);
        action = null;
      }
    }
    const cleanReply = reply.replace(/<<ACTION>>.*?<<END>>/s, '').trim();

    return res.json({ ok: true, reply: cleanReply, message: cleanReply, action });
  } catch (e) {
    console.error('[AI Chat Error]', e.message, e.stack);
    return res.status(500).json({
      error: e.message,
      details: e.message.includes('GROQ_API_KEY') ? 'API-Schlüssel nicht konfiguriert' : 'KI-Service Fehler'
    });
  }
});

router.post('/ai/analyze-catch', requireAuth, async (req, res) => {
  try {
    const { image_base64, file_url } = req.body;
    const imageBase64 = image_base64 || file_url;
    if (!imageBase64) return res.status(400).json({ error: 'image_base64 required' });
    const analysis = await invokeLLM({
      prompt: 'Analysiere dieses Foto. Erkenne die Fischart, schätze Länge und Gewicht. Gib Tipps. Antworte auf Deutsch.',
      imageBase64
    });
    return res.json({ ok: true, analysis });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/analyze-photo', requireAuth, async (req, res) => {
  try {
    let imageBase64 = req.body.imageBase64 || req.body.image;

    // Wenn image eine URL ist (Supabase), fetch die Daten
    if (imageBase64?.startsWith('http')) {
      const imgRes = await fetch(imageBase64);
      if (!imgRes.ok) return res.status(400).json({ error: 'Bild konnte nicht heruntergeladen werden' });
      const buffer = await imgRes.arrayBuffer();
      imageBase64 = Buffer.from(buffer).toString('base64');
    }

    if (!imageBase64) return res.status(400).json({ error: 'image required' });
    const raw = await invokeLLM({
      prompt: `Analysiere dieses Fisch-Foto. Antworte NUR mit einem JSON-Objekt in diesem Format, ohne Erklärungen:
{"species":"Fischart auf Deutsch","length_cm":Zahl_oder_null,"weight_kg":Zahl_oder_null}
Wenn du keinen Fisch erkennst, nutze null für alle Felder.`,
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
      weight_kg: typeof parsed.weight_kg === 'number' ? parsed.weight_kg : null
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/ai/evaluate-catch', requireAuth, async (req, res) => {
  try {
    const { catch_data, context } = req.body;
    const reply = await invokeLLM({ prompt: `Bewerte diesen Fang: ${JSON.stringify(catch_data)}. Kontext: ${context || ''}. Antworte auf Deutsch.` });
    return res.json({ ok: true, evaluation: reply });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/ai/generate-catch-report', requireAuth, async (req, res) => {
  try {
    const { period } = req.body;
    const { data: catches } = await supabase.from('catches').select('*').eq('created_by', req.user.email).order('catch_time', { ascending: false }).limit(50);
    const reply = await invokeLLM({ prompt: `Erstelle einen Fangbericht für den Zeitraum ${period || 'letzte 30 Tage'} basierend auf diesen Fängen: ${JSON.stringify(catches?.slice(0, 20))}. Antworte auf Deutsch.` });
    return res.json({ ok: true, report: reply });
  } catch (e) {
    return res.status(500).json({ error: e.message });
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

    // Wetter am Standort holen
    let weather = null;
    try {
      const w = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m,weather_code,surface_pressure,relative_humidity_2m&timezone=auto`
      ).then(r => r.json());
      if (w?.current) {
        weather = {
          temperature: w.current.temperature_2m,
          wind: w.current.wind_speed_10m,
          pressure: w.current.surface_pressure,
          humidity: w.current.relative_humidity_2m,
          condition: WMO[w.current.weather_code] ?? 'unbekannt'
        };
      }
    } catch { /* Wetter optional */ }

    // Fangbuch des Nutzers laden
    const { data: catches } = await supabase
      .from('catches').select('*')
      .eq('created_by', req.user.email)
      .order('catch_time', { ascending: false }).limit(30);
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
    return res.status(500).json({ error: e.message });
  }
});

router.post('/ai/tts', requireAuth, async (req, res) => {
  const { text } = req.body;
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(501).json({ error: 'ELEVENLABS_API_KEY not configured' });
  }

  // Deutsche Stimme — "Daniel" ist eine natürliche deutsche Stimme
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'onwK4e9ZLuTAKqWW03F9';

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: text.slice(0, 2000),
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      console.error('ElevenLabs error:', response.status, errText);
      return res.status(502).json({ error: 'TTS service error' });
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const base64Audio = audioBuffer.toString('base64');
    return res.json({ audioBase64: base64Audio, contentType: 'audio/mpeg' });
  } catch (e) {
    console.error('TTS error:', e);
    return res.status(500).json({ error: e.message });
  }
});

export default router;
