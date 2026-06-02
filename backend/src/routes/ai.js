import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import { invokeLLM } from '../lib/llm.js';

const router = Router();

// POST /api/chat - AI Angel-Assistent
router.post('/chat', requireAuth, async (req, res) => {
  try {
    const { messages = [], userLocation = null } = req.body;
    const userEmail = req.user.email;

    // Intent Detection
    const lastMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const wantsCatches = /fang|fänge|gefangen|fangbuch|logbuch/i.test(lastMsg);
    const wantsRules = /schonzeit|mindestmaß|erlaubt|verboten/i.test(lastMsg);
    const wantsSpots = /spot|angelplatz|wo angel/i.test(lastMsg);
    const wantsWeather = /wetter|temperatur|wind/i.test(lastMsg);

    const contextParts = [];

    // Fänge laden
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

    // Schonzeiten laden
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

    // Spots laden
    if (wantsSpots) {
      const { data: spots } = await supabase
        .from('spots').select('name,water_type')
        .eq('created_by', userEmail).limit(10);
      if (spots?.length) {
        contextParts.push('MEINE SPOTS:\n' + spots.map(s => `- ${s.name} (${s.water_type})`).join('\n'));
      }
    }

    // Wetter laden
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

Wenn der Nutzer eine Aktion möchte (Fang eintragen, Navigation etc.), antworte zusätzlich mit:
<<ACTION>>{"type":"log_catch","params":{"species":"Hecht","length_cm":75,"weight_kg":4.2,"bait_used":"Gummifisch"}}<<END>>

Verfügbare Aktionen: log_catch, navigate (page: Home/Log/Map/Community/Premium), save_spot${context}`;

    const history = messages.slice(-6).map(m =>
      `${m.role === 'user' ? 'Nutzer' : 'BaitBuddy'}: ${m.content}`
    ).join('\n');

    const reply = await invokeLLM({ prompt: `${systemPrompt}\n\n${history}\n\nAntworte:` });

    // Action parsen
    let action = null;
    const actionMatch = reply.match(/<<ACTION>>(.*?)<<END>>/s);
    if (actionMatch) {
      try { action = JSON.parse(actionMatch[1]); } catch {}
    }
    const cleanReply = reply.replace(/<<ACTION>>.*?<<END>>/s, '').trim();

    return res.json({ ok: true, reply: cleanReply, action });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/analyze-photo - Fischfoto analysieren
router.post('/analyze-photo', requireAuth, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

    const reply = await invokeLLM({
      prompt: 'Analysiere dieses Foto. Erkenne die Fischart, schätze Länge und Gewicht. Gib Tipps zum Fang. Antworte auf Deutsch.',
      imageBase64
    });

    return res.json({ ok: true, analysis: reply });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
