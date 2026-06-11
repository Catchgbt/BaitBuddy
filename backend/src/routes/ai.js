import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import { invokeLLM } from '../lib/llm.js';

const router = Router();

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
        const today = new Date().toISOString().slice(0, 10);
        const active = rules.filter(r => r.closed_from <= today && r.closed_to >= today);
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
1. Navigieren / Seite öffnen: {"type":"navigate","params":{"page":"home|log|map|community|premium|chat"}}
2. Fang eintragen: {"type":"log_catch","params":{"species":"Hecht","length_cm":75,"weight_kg":4.2,"bait_used":"Gummifisch","notes":"..."}}
3. Spot speichern: {"type":"add_spot","params":{"name":"Mein Spot","water_type":"see|fluss|teich|kanal|bach","notes":"..."}}

Regeln: Aktions-Block nur wenn Nutzer wirklich eine Aktion will. Zuerst kurze Bestätigung, dann Block. Block wird dem Nutzer nicht angezeigt.${context}`;

    const history = messages.slice(-6).map(m =>
      `${m.role === 'user' ? 'Nutzer' : 'BaitBuddy'}: ${m.content}`
    ).join('\n');

    const reply = await invokeLLM({ prompt: `${systemPrompt}\n\n${history}\n\nAntworte:` });

    let action = null;
    const actionMatch = reply.match(/<<ACTION>>(.*?)<<END>>/s);
    if (actionMatch) {
      try { action = JSON.parse(actionMatch[1]); } catch {}
    }
    const cleanReply = reply.replace(/<<ACTION>>.*?<<END>>/s, '').trim();

    return res.json({ ok: true, reply: cleanReply, message: cleanReply, action });
  } catch (e) {
    console.error('[AI Chat Error]', e.message, e.stack);
    return res.status(500).json({
      error: e.message,
      details: e.message.includes('ANTHROPIC_API_KEY') ? 'API-Schlüssel nicht konfiguriert' : 'KI-Service Fehler'
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
    const imageBase64 = req.body.imageBase64 || req.body.image;
    if (!imageBase64) return res.status(400).json({ error: 'image required' });
    const raw = await invokeLLM({
      prompt: `Analysiere dieses Fisch-Foto. Antworte NUR mit einem JSON-Objekt in diesem Format, ohne Erklärungen:
{"species":"Fischart auf Deutsch","length_cm":Zahl_oder_null,"weight_kg":Zahl_oder_null}
Wenn du keinen Fisch erkennst, nutze null für alle Felder.`,
      imageBase64
    });
    let parsed = {};
    try { parsed = JSON.parse(raw.match(/\{.*\}/s)?.[0] || '{}'); } catch {}
    return res.json({ ok: true, species: parsed.species || null, length_cm: parsed.length_cm || null, weight_kg: parsed.weight_kg || null });
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

router.post('/ai/tts', requireAuth, async (req, res) => {
  return res.status(501).json({ error: 'TTS not implemented' });
});

export default router;
