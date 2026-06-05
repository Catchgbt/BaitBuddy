import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Parst CSV-Format: lat,lng,depth oder lat,lng,depth,timestamp
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const points = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.toLowerCase().startsWith('lat')) continue;
    const parts = trimmed.split(/[,;\t]/);
    if (parts.length < 3) continue;
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    const depth = parseFloat(parts[2]);
    if (isNaN(lat) || isNaN(lng) || isNaN(depth)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    if (depth < 0 || depth > 1000) continue;
    points.push({
      latitude: lat,
      longitude: lng,
      depth_meters: depth,
      measured_at: parts[3] ? new Date(parts[3]).toISOString() : new Date().toISOString()
    });
  }
  return points;
}

// Parst GPX-Format
function parseGPX(text) {
  const points = [];
  const trkptRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;
  let match;
  while ((match = trkptRegex.exec(text)) !== null) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    const inner = match[3];
    const depthMatch = inner.match(/<extensions>[\s\S]*?depth[^>]*>([^<]+)<|<depth>([^<]+)<\/depth>/i);
    const timeMatch = inner.match(/<time>([^<]+)<\/time>/);
    if (!depthMatch) continue;
    const depth = parseFloat(depthMatch[1] || depthMatch[2]);
    if (isNaN(lat) || isNaN(lng) || isNaN(depth)) continue;
    points.push({
      latitude: lat,
      longitude: lng,
      depth_meters: depth,
      measured_at: timeMatch ? new Date(timeMatch[1]).toISOString() : new Date().toISOString()
    });
  }
  return points;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { file_url, device_type = 'echolot', water_body_name = '', is_public = true } = body;

    if (!file_url) return Response.json({ error: 'file_url erforderlich' }, { status: 400 });

    // Datei herunterladen
    const fileRes = await fetch(file_url);
    if (!fileRes.ok) return Response.json({ error: 'Datei konnte nicht geladen werden' }, { status: 400 });
    const text = await fileRes.text();

    // Format erkennen und parsen
    let points = [];
    if (text.trim().startsWith('<?xml') || text.includes('<gpx')) {
      points = parseGPX(text);
    } else {
      points = parseCSV(text);
    }

    if (points.length === 0) {
      return Response.json({ error: 'Keine gueltigen Messpunkte gefunden. Format: CSV (lat,lng,tiefe) oder GPX' }, { status: 400 });
    }

    // Max. 5000 Punkte pro Upload
    const limited = points.slice(0, 5000);

    // Bulk-Insert
    const records = limited.map(p => ({
      ...p,
      device_type,
      water_body_name,
      is_public,
      quality_score: 7
    }));

    await base44.entities.DepthDataPoint.bulkCreate(records);

    return Response.json({
      ok: true,
      imported: records.length,
      total_parsed: points.length,
      message: `${records.length} Messpunkte erfolgreich importiert`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});