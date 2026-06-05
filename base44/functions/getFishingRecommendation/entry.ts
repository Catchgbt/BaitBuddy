import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { latitude, longitude } = await req.json();

    if (!latitude || !longitude) {
      return Response.json({ error: 'Koordinaten fehlen' }, { status: 400 });
    }

    // Wetterdaten + Fangbuch parallel laden
    const [weatherRes, catches] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,surface_pressure,wind_speed_10m,cloud_cover&hourly=temperature_2m,precipitation_probability&timezone=auto&forecast_days=1`).then(r => r.json()),
      base44.entities.Catch.list('-catch_time', 50)
    ]);

    const current = weatherRes.current;

    // Fangstatistiken aggregieren
    const speciesMap = {};
    const baitMap = {};
    for (const c of catches) {
      if (c.species) {
        speciesMap[c.species] = (speciesMap[c.species] || 0) + 1;
      }
      if (c.bait_used) {
        baitMap[c.bait_used] = (baitMap[c.bait_used] || 0) + 1;
      }
    }

    const topSpecies = Object.entries(speciesMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, n]) => `${s} (${n}x)`);
    const topBaits = Object.entries(baitMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([b, n]) => `${b} (${n}x)`);

    // Beste Zeiten aus historischen Faengen
    const hourCounts = {};
    for (const c of catches) {
      if (c.catch_time) {
        const h = new Date(c.catch_time).getHours();
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      }
    }
    const bestHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([h]) => `${h}:00 Uhr`);

    const prompt = `Du bist ein erfahrener Angel-Experte. Analysiere die folgenden Daten und gib konkrete, kurze Empfehlungen auf Deutsch.

AKTUELLE WETTERBEDINGUNGEN:
- Temperatur: ${current.temperature_2m}°C
- Luftdruck: ${current.surface_pressure} hPa
- Windgeschwindigkeit: ${current.wind_speed_10m} m/s
- Bewoelkung: ${current.cloud_cover}%
- Luftfeuchtigkeit: ${current.relative_humidity_2m}%
- Niederschlag: ${current.precipitation} mm

HISTORISCHE FANGERFOLGE DES ANGLERS (letzte 50 Faenge):
- Haeufigste Fischarten: ${topSpecies.length > 0 ? topSpecies.join(', ') : 'Keine Daten'}
- Erfolgreichste Koeder: ${topBaits.length > 0 ? topBaits.join(', ') : 'Keine Daten'}
- Beste Angelzeiten: ${bestHours.length > 0 ? bestHours.join(', ') : 'Keine Daten'}
- Gesamtfaenge analysiert: ${catches.length}

Gib Empfehlungen in exakt diesem JSON-Format zurueck:
{
  "optimal_times": ["Zeit 1", "Zeit 2", "Zeit 3"],
  "recommended_baits": ["Koeder 1", "Koeder 2", "Koeder 3"],
  "target_species": ["Fischart 1", "Fischart 2"],
  "weather_rating": "Gut | Mittel | Schlecht",
  "summary": "Ein Satz Zusammenfassung der Empfehlung",
  "tips": ["Tipp 1", "Tipp 2", "Tipp 3"]
}`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: "object",
        properties: {
          optimal_times: { type: "array", items: { type: "string" } },
          recommended_baits: { type: "array", items: { type: "string" } },
          target_species: { type: "array", items: { type: "string" } },
          weather_rating: { type: "string" },
          summary: { type: "string" },
          tips: { type: "array", items: { type: "string" } }
        }
      }
    });

    return Response.json({
      recommendation: aiResponse,
      weather: current,
      catchCount: catches.length
    });

  } catch (error) {
    console.error('Fehler in getFishingRecommendation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});