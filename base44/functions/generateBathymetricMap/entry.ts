import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Berechnet statistische Kennzahlen fuer ein Array von Tiefenpunkten
function calcStats(points) {
  if (!points.length) return { max: 0, avg: 0, min: 0 };
  const depths = points.map(p => p.depth_meters);
  const max = Math.max(...depths);
  const min = Math.min(...depths);
  const avg = depths.reduce((a, b) => a + b, 0) / depths.length;
  return { max: parseFloat(max.toFixed(1)), min: parseFloat(min.toFixed(1)), avg: parseFloat(avg.toFixed(1)) };
}

// Ermittelt KI-Hotspots: Tiefste Stellen und markante Steilabfaelle
function detectHotspots(points) {
  if (points.length < 3) return [];
  
  // Sortiere nach Tiefe
  const sorted = [...points].sort((a, b) => b.depth_meters - a.depth_meters);
  
  const hotspots = [];
  const used = new Set();

  for (const p of sorted) {
    if (hotspots.length >= 5) break;
    // Mindestabstand 200m zwischen Hotspots (grobe Gitterabschaetzung)
    const key = `${Math.round(p.latitude * 100)}_${Math.round(p.longitude * 100)}`;
    if (used.has(key)) continue;
    used.add(key);
    hotspots.push({
      lat: p.latitude,
      lng: p.longitude,
      depth: p.depth_meters,
      label: p.depth_meters > 10 ? 'Tiefrinne' : p.depth_meters > 5 ? 'Mulde' : 'Senke'
    });
  }
  return hotspots;
}

// Berechnet geografische Grenzen
function calcBounds(points) {
  const lats = points.map(p => p.latitude);
  const lngs = points.map(p => p.longitude);
  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs)
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { water_body_name, map_id } = body;

    if (!water_body_name) return Response.json({ error: 'water_body_name erforderlich' }, { status: 400 });

    // Status auf processing setzen falls map_id vorhanden
    if (map_id) {
      await base44.asServiceRole.entities.BathymetricMap.update(map_id, { status: 'processing' });
    }

    // Alle oeffentlichen Datenpunkte fuer dieses Gewaesser laden
    const allPoints = await base44.asServiceRole.entities.DepthDataPoint.filter({
      water_body_name,
      is_public: true
    });

    if (allPoints.length < 3) {
      return Response.json({ error: 'Zu wenige Datenpunkte (mindestens 3 benoetigt)', count: allPoints.length }, { status: 400 });
    }

    const stats = calcStats(allPoints);
    const hotspots = detectHotspots(allPoints);
    const bounds = calcBounds(allPoints);
    const center_lat = (bounds.north + bounds.south) / 2;
    const center_lng = (bounds.east + bounds.west) / 2;

    // Einzigartige Beitragszaehlung
    const contributors = new Set(allPoints.map(p => p.created_by)).size;

    // KI-Analyse generieren
    const aiPrompt = `Du bist ein Angelexperte. Analysiere diese Tiefendaten eines Gewaessers namens "${water_body_name}":
- Messpunkte: ${allPoints.length}
- Maximaltiefe: ${stats.max}m
- Durchschnittstiefe: ${stats.avg}m
- Minimaltiefe: ${stats.min}m
- Erkannte Hotspots: ${hotspots.length} (${hotspots.map(h => `${h.label} bei ${h.depth}m`).join(', ')})

Gib eine praxisnahe Analyse in 3-4 Saetzen: Welche Fischarten sind wo in welcher Tiefe zu erwarten? Welche Zonen sind besonders vielversprechend und warum? Schreibe direkt und konkret fuer erfahrene Angler.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: aiPrompt });

    const mapData = {
      name: `Tiefenkarte ${water_body_name}`,
      water_body_name,
      bounds,
      center_lat,
      center_lng,
      data_points_count: allPoints.length,
      contributors_count: contributors,
      max_depth: stats.max,
      avg_depth: stats.avg,
      hotspots,
      ai_analysis: typeof aiResponse === 'string' ? aiResponse : JSON.stringify(aiResponse),
      status: 'ready',
      generated_at: new Date().toISOString()
    };

    let result;
    if (map_id) {
      result = await base44.asServiceRole.entities.BathymetricMap.update(map_id, mapData);
    } else {
      result = await base44.asServiceRole.entities.BathymetricMap.create(mapData);
    }

    return Response.json({ ok: true, map: result });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});