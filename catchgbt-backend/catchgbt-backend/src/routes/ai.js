import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import { invokeLLM } from '../lib/llm.js';

const router = Router();

// ── POST /api/catchgbtChat ────────────────────────────────────────────────
router.post('/catchgbtChat', requireAuth, async (req, res) => {
  try {
    const { messages = [], userLocation = null } = req.body;
    const userEmail = req.user.email;

    function detectIntent(text) {
      return {
        wantsCatches:  /fang|fänge|gefangen|fangbuch|logbuch|mein.*fisch|letzter fang/i.test(text),
        wantsWeather:  /wetter|temperatur|wind|regen|luftdruck/i.test(text),
        wantsRules:    /schonzeit|mindestmaß|erlaubt|verboten|gesetz|regel/i.test(text),
        wantsSpots:    /spot|angelplatz|ort|stelle|wo angel|gewässer/i.test(text),
        wantsAnalysis: /analyse|wassertemperatur|chlorophyll|satelliten/i.test(text),
      };
    }

    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const intent = lastUserMsg ? detectIntent(lastUserMsg.content) : {};

    const contextParts = [];

    if (intent.wantsCatches) {
      const { data: catches } = await supabase.from('catches').select('*').eq('created_by', userEmail).order('catch_time', { ascending: false }).limit(10);
      if (catches?.length) {
        const summary = catches.map(c => `- ${c.species || 'Unbekannt'}, ${c.length_cm || '?'}cm, ${c.weight_kg || '?'}kg, Köder: ${c.bait_used || '?'}, am ${c.catch_time ? new Date(c.catch_time).toLocaleDateString('de-DE') : '?'}`).join('\n');
        contextParts.push(`FANGBUCH (letzte 10 Fänge):\n${summary}`);
      }
    }

    if (intent.wantsRules) {
      const { data: rules } = await supabase.from('rule_entries').select('*').limit(50);
      if (rules?.length) {
        const today = new Date().toISOString().slice(0, 10);
        const active = rules.filter(r => r.closed_from && r.closed_to && today >= r.closed_from && today <= r.closed_to);
        if (active.length) {
          contextParts.push(`AKTIVE SCHONZEITEN:\n${active.map(r => `- ${r.fish} (${r.region}): bis ${r.closed_to}${r.min_size_cm ? ', Mindestmaß ' + r.min_size_cm + 'cm' : ''}`).join('\n')}`);
        }
      }
    }

    if (intent.wantsSpots) {
      const { data: spots } = await supabase.from('spots').select('*').eq('created_by', userEmail).limit(20);
      if (spots?.length) {
        contextParts.push(`ANGELPLÄTZE:\n${spots.map(s => `- ${s.name} (${s.water_type || '?'})`).join('\n')}`);
      }
    }

    if ((intent.wantsWeather || intent.wantsAnalysis) && userLocation?.latitude && userLocation?.longitude) {
      try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&current=temperature_2m,wind_speed_10m,cloud_cover,precipitation,surface_pressure&timezone=auto&forecast_days=1`;
        const wr = await fetch(weatherUrl).then(r => r.json());
        const w = wr.current;
        contextParts.push(`AKTUELLES WETTER:\nTemperatur: ${w.temperature_2m}°C, Wind: ${w.wind_speed_10m} m/s, Bewölkung: ${w.cloud_cover}%, Luftdruck: ${w.surface_pressure} hPa, Niederschlag: ${w.precipitation}mm`);
      } catch {}
    }

    const contextSection = contextParts.length ? `\n\n--- DATEN AUS DER APP ---\n${contextParts.join('\n\n')}\n--- ENDE ---\n` : '';

    const systemPrompt = `Du bist BaitBuddy, ein professioneller Angel-Experte und Assistent für eine Angel-App. Gib kurze, hilfreiche Antworten auf Deutsch. Keine Emojis.

AKTIONEN – Wenn der Nutzer eine konkrete Aktion will, antworte ZUSÄTZLICH am Ende mit:
<<ACTION>>{"type":"...","params":{...}}<<END>>

Verfügbare Aktionen:
1. Fang eintragen: <<ACTION>>{"type":"log_catch","params":{"species":"Hecht","length_cm":75,"weight_kg":4.2,"bait_used":"Gummifisch","notes":"","is_released":false}}<<END>>
2. Community-Post: <<ACTION>>{"type":"post_community","params":{"text":"..."}}<<END>>
3. Navigation: <<ACTION>>{"type":"navigate","params":{"page":"Logbook"}}<<END>>
4. Spot speichern: <<ACTION>>{"type":"save_spot","params":{"name":"Mein Platz","latitude":52.5,"longitude":13.4,"water_type":"see"}}<<END>>

Erstelle nur eine Action bei eindeutiger Aufforderung.${contextSection}`;

    const conversationHistory = messages.slice(-6).map(m => `${m.role === 'user' ? 'Nutzer' : 'Du'}: ${m.content || ''}`).join('\n');
    const fullPrompt = `${conversationHistory}\n\nAntworte kurz und präzise:`;

    const reply = await invokeLLM({ prompt: fullPrompt, _system: systemPrompt });

    return res.json({ reply: typeof reply === 'string' ? reply : JSON.stringify(reply) });
  } catch (e) {
    console.error('[catchgbtChat]', e.message);
    return res.json({ reply: 'Entschuldigung, ich konnte deine Frage nicht verarbeiten. Versuche es nochmal.' });
  }
});

// ── POST /api/analyzeCatchPhoto ───────────────────────────────────────────
router.post('/analyzeCatchPhoto', requireAuth, async (req, res) => {
  try {
    const { file_url } = req.body;
    if (!file_url) return res.status(400).json({ error: 'file_url ist erforderlich' });

    const llmAnalysis = await invokeLLM({
      prompt: `Du bist ein erfahrener Ichthyologe. Analysiere das Bild eines Fisches SEHR PRÄZISE.

FISCHART-ERKENNUNG: Achte auf spezifische Merkmale (Bachforelle, Regenbogenforelle, Hecht, Karpfen, Zander, Barsch, Wels, etc.)

GEWICHTS-SCHÄTZUNG (REALISTISCH!):
Forelle: 30cm=0.4kg, 40cm=0.9kg, 50cm=1.8kg
Hecht: 50cm=1.2kg, 70cm=3.5kg, 90cm=7kg
Karpfen: 50cm=2.5kg, 70cm=7kg
Barsch: 30cm=0.5kg, 40cm=1.2kg
Zander: 50cm=1.3kg, 70cm=3.5kg

Antworte NUR mit validem JSON.`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          species: { type: 'string' },
          length_cm: { type: 'number' },
          weight_kg: { type: 'number' },
          confidence_species: { type: 'number' },
          image_quality: { type: 'string' },
          visual_details: { type: 'string' }
        },
        required: ['species', 'length_cm', 'weight_kg', 'confidence_species', 'image_quality']
      }
    });

    if (llmAnalysis.weight_kg > 100) llmAnalysis.weight_kg = 50;
    const confidence_percent = ((llmAnalysis.confidence_species || 0) * 100).toFixed(1);

    return res.json({
      tasks: [
        { name: 'Art bestimmen', status: llmAnalysis.species ? 'completed' : 'failed', result: llmAnalysis.species ? `${llmAnalysis.species} (${confidence_percent}% Konfidenz)` : 'Nicht erkannt' },
        { name: 'Bildqualität prüfen', status: 'completed', result: llmAnalysis.image_quality },
        { name: 'Länge schätzen', status: llmAnalysis.length_cm > 0 ? 'completed' : 'failed', result: llmAnalysis.length_cm > 0 ? `${Math.round(llmAnalysis.length_cm)} cm` : 'Nicht schätzbar' },
        { name: 'Gewicht schätzen', status: llmAnalysis.weight_kg > 0 ? 'completed' : 'failed', result: llmAnalysis.weight_kg > 0 ? `${llmAnalysis.weight_kg.toFixed(2)} kg` : 'Nicht schätzbar' }
      ],
      summary: `Ich habe einen ${llmAnalysis.species} von ca. ${Math.round(llmAnalysis.length_cm)} cm erkannt (${confidence_percent}% Konfidenz). Geschätztes Gewicht: ${llmAnalysis.weight_kg?.toFixed(2)} kg.${llmAnalysis.visual_details ? ' ' + llmAnalysis.visual_details : ''}`,
      result_data: {
        species_name: llmAnalysis.species,
        confidence: llmAnalysis.confidence_species,
        length_cm: Math.round(llmAnalysis.length_cm),
        weight_kg: llmAnalysis.weight_kg,
        quality_assessment: llmAnalysis.image_quality,
        visual_details: llmAnalysis.visual_details
      }
    });
  } catch (e) {
    return res.status(500).json({ error: e.message, tasks: [{ name: 'Art bestimmen', status: 'failed', result: 'Fehler bei der Analyse' }], summary: 'Analyse fehlgeschlagen.', result_data: null });
  }
});

// ── POST /api/aiEvaluateCatch ─────────────────────────────────────────────
router.post('/aiEvaluateCatch', requireAuth, async (req, res) => {
  try {
    const { photo_url, species, length_cm, submission_id } = req.body;
    if (!photo_url || !species || !length_cm || !submission_id) {
      return res.status(400).json({ error: 'Fehlende Parameter' });
    }

    const aiResult = await invokeLLM({
      prompt: `Du bist ein Fischexperte. Bewerte diesen Fang:\nFischart: ${species}\nAngegebene Länge: ${length_cm} cm\n\nBewerte auf einer Skala von 0-100: Plausibilität der Größe, Sichtbarkeit im Bild, Übereinstimmung Art/Größe.`,
      file_urls: [photo_url],
      response_json_schema: {
        type: 'object',
        properties: {
          plausibility: { type: 'number' },
          visibility: { type: 'number' },
          species_match: { type: 'number' },
          explanation: { type: 'string' },
          overall_score: { type: 'number' }
        },
        required: ['plausibility', 'visibility', 'species_match', 'overall_score']
      }
    });

    const ai_score = Math.round(aiResult.overall_score);

    const { data: submission } = await supabase.from('voting_submissions').select('*').eq('id', submission_id).single();
    if (submission) {
      const community_likes = submission.community_likes || 0;
      const total_score = (community_likes * 0.7) + (ai_score * 0.3);
      await supabase.from('voting_submissions').update({ ai_score, ai_analysis: { plausibility: aiResult.plausibility, visibility: aiResult.visibility, species_match: aiResult.species_match, explanation: aiResult.explanation }, total_score: Math.round(total_score) }).eq('id', submission_id);
    }

    return res.json({ success: true, ai_score, analysis: aiResult });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/getFishingRecommendation ────────────────────────────────────
router.post('/getFishingRecommendation', requireAuth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) return res.status(400).json({ error: 'Koordinaten fehlen' });

    const userEmail = req.user.email;

    const [weatherRes, catchesRes] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,surface_pressure,wind_speed_10m,cloud_cover&timezone=auto&forecast_days=1`).then(r => r.json()),
      supabase.from('catches').select('species, bait_used, catch_time').eq('created_by', userEmail).order('catch_time', { ascending: false }).limit(50)
    ]);

    const current = weatherRes.current;
    const catches = catchesRes.data || [];

    const speciesMap = {}, baitMap = {}, hourCounts = {};
    for (const c of catches) {
      if (c.species) speciesMap[c.species] = (speciesMap[c.species] || 0) + 1;
      if (c.bait_used) baitMap[c.bait_used] = (baitMap[c.bait_used] || 0) + 1;
      if (c.catch_time) { const h = new Date(c.catch_time).getHours(); hourCounts[h] = (hourCounts[h] || 0) + 1; }
    }

    const topSpecies = Object.entries(speciesMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, n]) => `${s} (${n}x)`);
    const topBaits = Object.entries(baitMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([b, n]) => `${b} (${n}x)`);
    const bestHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([h]) => `${h}:00 Uhr`);

    const recommendation = await invokeLLM({
      prompt: `Du bist ein erfahrener Angel-Experte. Analysiere folgende Daten und gib konkrete Empfehlungen auf Deutsch.

WETTER:
- Temperatur: ${current.temperature_2m}°C
- Luftdruck: ${current.surface_pressure} hPa
- Wind: ${current.wind_speed_10m} m/s
- Bewölkung: ${current.cloud_cover}%
- Niederschlag: ${current.precipitation} mm

HISTORISCHE DATEN (letzte 50 Fänge):
- Häufigste Fischarten: ${topSpecies.join(', ') || 'Keine Daten'}
- Erfolgreichste Köder: ${topBaits.join(', ') || 'Keine Daten'}
- Beste Zeiten: ${bestHours.join(', ') || 'Keine Daten'}`,
      response_json_schema: {
        type: 'object',
        properties: {
          optimal_times: { type: 'array', items: { type: 'string' } },
          recommended_baits: { type: 'array', items: { type: 'string' } },
          target_species: { type: 'array', items: { type: 'string' } },
          weather_rating: { type: 'string' },
          summary: { type: 'string' },
          tips: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return res.json({ recommendation, weather: current, catchCount: catches.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/generateCatchReport ─────────────────────────────────────────
router.post('/generateCatchReport', requireAuth, async (req, res) => {
  try {
    const { photo_url, exif_data } = req.body;
    if (!photo_url) return res.status(400).json({ error: 'photo_url required' });

    const result = await invokeLLM({
      prompt: `Du bist ein Experte für Fischerei. Analysiere dieses Fangfoto und generiere einen strukturierten Fangbericht.\n\nEXIF-Daten:\n- Datum: ${exif_data?.dateTimeOriginal || 'Unbekannt'}\n- GPS: ${exif_data?.gpsLat ? `${exif_data.gpsLat.toFixed(4)}, ${exif_data.gpsLon.toFixed(4)}` : 'Nicht verfügbar'}\n\nGeneriere einen detaillierten Fangbericht im JSON-Format.`,
      file_urls: [photo_url],
      response_json_schema: {
        type: 'object',
        properties: {
          species: { type: 'string' },
          length_cm: { type: 'number' },
          weight_kg: { type: 'number' },
          bait_used: { type: 'string' },
          catch_method: { type: 'string' },
          report_text: { type: 'string' }
        },
        required: ['species', 'report_text']
      }
    });

    return res.json({ success: true, analysis: result });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
