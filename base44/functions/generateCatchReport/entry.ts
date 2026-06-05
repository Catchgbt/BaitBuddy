import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { photo_url, exif_data } = await req.json();

    if (!photo_url) {
      return Response.json({ error: 'photo_url required' }, { status: 400 });
    }

    const prompt = `Du bist ein Experte für Fischerei und Ichthyologie. Analysiere dieses Fangfoto und generiere einen strukturierten Fangbericht.

Verfügbare EXIF-Daten:
- Aufnahmedatum: ${exif_data?.dateTimeOriginal || 'Unbekannt'}
- GPS-Position: ${exif_data?.gpsLat ? `${exif_data.gpsLat.toFixed(4)}, ${exif_data.gpsLon.toFixed(4)}` : 'Nicht verfügbar'}

Generiere einen detaillierten, naturalistischen Fangbericht mit folgenden Informationen:
1. Fischart (oder beste Vermutung)
2. Geschätzte Länge in cm
3. Geschätzte Gewicht in kg
4. Möglicher Köder basierend auf Bildanalyse
5. Fangmethode (Vermutung)
6. Gesamteindruck und Besonderheiten

Antworte im JSON-Format.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [photo_url],
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          species: { type: 'string', description: 'Fischart' },
          length_cm: { type: 'number', description: 'Länge in cm' },
          weight_kg: { type: 'number', description: 'Gewicht in kg' },
          bait_used: { type: 'string', description: 'Köder' },
          catch_method: { type: 'string', description: 'Fangmethode' },
          report_text: { type: 'string', description: 'Ausführlicher Fangbericht' }
        },
        required: ['species', 'report_text']
      }
    });

    return Response.json({
      success: true,
      analysis: result
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});