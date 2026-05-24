import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import { invokeLLM } from '../lib/llm.js';

const router = Router();

// ── GET /api/angelspotsGeojson ─────────────────────────────────────────────
router.get('/angelspotsGeojson', async (req, res) => {
  try {
    const { data: clubs } = await supabase.from('fishing_clubs').select('*');
    const features = (clubs || [])
      .filter(c => c.coordinates?.lat && c.coordinates?.lng)
      .map(club => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [club.coordinates.lng, club.coordinates.lat] },
        properties: {
          id: club.id, name: club.name, category: club.category || 'club',
          address: club.address || {}, website: club.website || null,
          phone: club.phone || null, email: club.email || null,
          source: club.source || 'database', is_validated: club.is_validated || false,
          updated_at: club.updated_date || club.created_date
        }
      }));

    return res.set('Cache-Control', 'public, max-age=3600').json({
      type: 'FeatureCollection', features,
      metadata: { generated_at: new Date().toISOString(), total_features: features.length, clubs: features.filter(f => f.properties.category === 'club').length, spots: features.filter(f => f.properties.category === 'spot').length }
    });
  } catch (e) {
    return res.json({ type: 'FeatureCollection', features: [], metadata: { error: e.message } });
  }
});

// ── POST /api/loadWaterBodies ──────────────────────────────────────────────
router.post('/loadWaterBodies', requireAuth, async (req, res) => {
  try {
    const { bounds } = req.body;
    if (!bounds?.north || !bounds?.south || !bounds?.east || !bounds?.west) {
      return res.status(400).json({ error: 'Bounds required' });
    }

    const overpassQuery = `[out:json][timeout:60];
(
  way["waterway"~"river|canal"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  relation["waterway"~"river|canal"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  way["natural"="water"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  relation["natural"="water"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  way["landuse"="reservoir"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  relation["landuse"="reservoir"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
);
out geom;`;

    let data = { elements: [] };
    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST', body: overpassQuery,
        headers: { 'Content-Type': 'text/plain' },
        signal: AbortSignal.timeout(30000)
      });
      if (response.ok) data = await response.json();
    } catch (err) {
      console.warn('[loadWaterBodies] Overpass unavailable:', err.message);
    }

    const features = [];
    for (const el of data.elements || []) {
      const tags = el.tags || {};
      const name = tags.name;
      if (!name) continue;
      let typ = 'lake';
      if (tags.waterway) typ = tags.waterway === 'river' ? 'river' : 'canal';
      else if (tags.landuse === 'reservoir') typ = 'reservoir';

      const geom = el.geometry;
      if (!geom || geom.length < 2) continue;
      const coords = geom.map(p => [p.lon, p.lat]);
      const xs = geom.map(p => p.lon);
      const ys = geom.map(p => p.lat);
      const centerLon = xs.reduce((a, b) => a + b, 0) / xs.length;
      const centerLat = ys.reduce((a, b) => a + b, 0) / ys.length;

      features.push({
        type: 'Feature',
        properties: { id: `osm_${el.id}`, name, typ, osm_id: el.id },
        geometry: typ === 'river' || typ === 'canal' ? { type: 'LineString', coordinates: coords } : { type: 'Polygon', coordinates: [coords] },
        center: { lat: centerLat, lng: centerLon }
      });
    }

    return res.json({ type: 'FeatureCollection', features });
  } catch (e) {
    return res.json({ type: 'FeatureCollection', features: [] });
  }
});

// ── GET /api/bathymetryProxy ───────────────────────────────────────────────
router.get('/bathymetryProxy', async (req, res) => {
  try {
    const { provider = 'gebco', z, x, y } = req.query;
    if (!z || !x || !y) return res.status(400).json({ error: 'z, x, y erforderlich' });

    const providers = {
      gebco: `https://tiles.arcgis.com/tiles/C8EMgrsFcRFL6LrL/arcgis/rest/services/GEBCO_basemap_NCEI/MapServer/tile/${z}/${y}/${x}`,
      openseamap: `https://tiles.openseamap.org/seamark/${z}/${x}/${y}.png`,
      noaa: `https://gis.ngdc.noaa.gov/arcgis/rest/services/web_mercator/etopo1_hillshade/MapServer/tile/${z}/${y}/${x}`
    };

    const tileUrl = providers[provider];
    if (!tileUrl) return res.status(400).json({ error: 'Unknown provider' });

    const tileResponse = await fetch(tileUrl, { headers: { 'User-Agent': 'CatchGbt-AR-App/1.0', Accept: 'image/*' } });
    if (!tileResponse.ok) return res.status(404).json({ error: 'Tile not available' });

    const imageData = await tileResponse.arrayBuffer();
    res.set({
      'Content-Type': tileResponse.headers.get('content-type') || 'image/png',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400'
    });
    return res.send(Buffer.from(imageData));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/geocodeFishingClubs ─────────────────────────────────────────
router.post('/geocodeFishingClubs', requireAuth, async (req, res) => {
  try {
    const batchSize = Math.min(Math.max(parseInt(req.body.batchSize) || 40, 1), 100);

    const { data: allClubs } = await supabase.from('fishing_clubs').select('*').order('created_at', { ascending: false }).limit(5000);
    const missing = (allClubs || []).filter(c => (!c.coordinates?.lat || !c.coordinates?.lng) && !c.geocoded_at);
    const batch = missing.slice(0, batchSize);

    let updated = 0, failed = 0;
    const failures = [];

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    async function nominatimQuery(query) {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'CatchGBT/1.0', Accept: 'application/json' } });
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) return null;
      const lat = parseFloat(data[0].lat), lng = parseFloat(data[0].lon);
      return (isNaN(lat) || isNaN(lng)) ? null : { lat, lng };
    }

    for (const club of batch) {
      try {
        const address = club.address || {};
        const addrParts = [address.street, address.postal_code, address.city, address.country].filter(Boolean);
        let coords = addrParts.length ? await nominatimQuery(addrParts.join(', ')) : null;
        await sleep(1100);
        if (!coords && club.name) {
          const cityParts = [address.city, address.country].filter(Boolean);
          coords = await nominatimQuery(`${club.name}, ${cityParts.join(', ') || 'Deutschland'}`);
          await sleep(1100);
        }
        if (coords) {
          await supabase.from('fishing_clubs').update({ coordinates: coords, geocoded_at: new Date().toISOString() }).eq('id', club.id);
          updated++;
        } else {
          await supabase.from('fishing_clubs').update({ geocoded_at: new Date().toISOString() }).eq('id', club.id);
          failed++;
          failures.push({ id: club.id, name: club.name, reason: 'no_result' });
        }
      } catch (err) {
        failed++;
        failures.push({ id: club.id, name: club.name, reason: err.message });
      }
    }

    return res.json({ total_clubs: (allClubs || []).length, missing_before: missing.length, processed: batch.length, updated, failed, remaining: missing.length - updated, failures: failures.slice(0, 20) });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/detectHotspots ──────────────────────────────────────────────
router.post('/detectHotspots', requireAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const [{ data: catches }, { data: waterAnalyses }, { data: spots }] = await Promise.all([
      supabase.from('catches').select('*').eq('created_by', userEmail),
      supabase.from('water_analysis_history').select('*').eq('created_by', userEmail),
      supabase.from('spots').select('*').eq('created_by', userEmail)
    ]);

    const now = new Date();
    const spotAnalysis = [];

    for (const spot of spots || []) {
      const spotCatches = (catches || []).filter(c => c.spot_id === spot.id);
      const spotAnalyses = (waterAnalyses || []).filter(a => Math.abs(a.latitude - spot.latitude) < 0.01 && Math.abs(a.longitude - spot.longitude) < 0.01);
      if (!spotCatches.length) continue;

      const weightScore = spotCatches.reduce((sum, c) => sum + Math.min((c.weight_kg || 0) * 10, 50), 0) / spotCatches.length;
      const countScore = Math.min(spotCatches.length * 5, 50);
      const catchScore = weightScore + countScore;

      const waterScore = spotAnalyses.length ? spotAnalyses.reduce((sum, a) => sum + a.quality_score, 0) / spotAnalyses.length : 50;

      const recencyScores = spotCatches.map(c => {
        const days = (now - new Date(c.catch_time)) / (1000 * 60 * 60 * 24);
        return days < 7 ? 100 : days < 30 ? 80 : days < 90 ? 60 : days < 180 ? 40 : 20;
      });
      const recencyScore = recencyScores.reduce((a, b) => a + b, 0) / recencyScores.length;

      const overallScore = Math.round(catchScore * 0.5 + waterScore * 0.3 + recencyScore * 0.2);
      const reasons = [];
      if (catchScore > 70) reasons.push('Viele erfolgreiche Fänge');
      if (waterScore > 75) reasons.push('Ausgezeichnete Wasserqualität');
      if (recencyScore > 70) reasons.push('Kürzlich aktiv');

      spotAnalysis.push({ spot_id: spot.id, name: spot.name, latitude: spot.latitude, longitude: spot.longitude, score: overallScore, catches_count: spotCatches.length, avg_quality: waterScore, recent_activity: recencyScore, reason: reasons.join(' • ') || 'Gute Gesamtbedingungen' });
    }

    const hotspots = spotAnalysis.sort((a, b) => b.score - a.score).slice(0, 5).filter(s => s.score > 60);
    return res.json({ ok: true, hotspots, total_spots_analyzed: (spots || []).length, generated_at: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// ── POST /api/processDepthData ────────────────────────────────────────────
router.post('/processDepthData', requireAuth, async (req, res) => {
  try {
    const { file_url, device_type = 'echolot', water_body_name = '', is_public = true } = req.body;
    if (!file_url) return res.status(400).json({ error: 'file_url erforderlich' });

    const fileRes = await fetch(file_url);
    if (!fileRes.ok) return res.status(400).json({ error: 'Datei konnte nicht geladen werden' });
    const text = await fileRes.text();

    function parseCSV(text) {
      return text.trim().split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.toLowerCase().startsWith('lat')).map(line => {
        const parts = line.trim().split(/[,;\t]/);
        if (parts.length < 3) return null;
        const [lat, lng, depth] = parts.map(parseFloat);
        if ([lat, lng, depth].some(isNaN) || lat < -90 || lat > 90 || lng < -180 || lng > 180 || depth < 0 || depth > 1000) return null;
        return { latitude: lat, longitude: lng, depth_meters: depth, measured_at: parts[3] ? new Date(parts[3]).toISOString() : new Date().toISOString() };
      }).filter(Boolean);
    }

    function parseGPX(text) {
      const points = [];
      const trkptRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;
      let match;
      while ((match = trkptRegex.exec(text)) !== null) {
        const [lat, lng] = [parseFloat(match[1]), parseFloat(match[2])];
        const depthMatch = match[3].match(/<depth>([^<]+)<\/depth>/i);
        const timeMatch = match[3].match(/<time>([^<]+)<\/time>/);
        if (!depthMatch) continue;
        const depth = parseFloat(depthMatch[1]);
        if (isNaN(lat) || isNaN(lng) || isNaN(depth)) continue;
        points.push({ latitude: lat, longitude: lng, depth_meters: depth, measured_at: timeMatch ? new Date(timeMatch[1]).toISOString() : new Date().toISOString() });
      }
      return points;
    }

    const points = (text.trim().startsWith('<?xml') || text.includes('<gpx')) ? parseGPX(text) : parseCSV(text);
    if (!points.length) return res.status(400).json({ error: 'Keine gültigen Messpunkte gefunden. Format: CSV (lat,lng,tiefe) oder GPX' });

    const records = points.slice(0, 5000).map(p => ({ ...p, device_type, water_body_name, is_public, quality_score: 7, created_by: req.user.email }));
    await supabase.from('depth_data_points').insert(records);

    return res.json({ ok: true, imported: records.length, total_parsed: points.length, message: `${records.length} Messpunkte erfolgreich importiert` });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/generateBathymetricMap ──────────────────────────────────────
router.post('/generateBathymetricMap', requireAuth, async (req, res) => {
  try {
    const { water_body_name, map_id } = req.body;
    if (!water_body_name) return res.status(400).json({ error: 'water_body_name erforderlich' });

    if (map_id) await supabase.from('bathymetric_maps').update({ status: 'processing' }).eq('id', map_id);

    const { data: allPoints } = await supabase.from('depth_data_points').select('*').eq('water_body_name', water_body_name).eq('is_public', true);
    if (!allPoints?.length || allPoints.length < 3) return res.status(400).json({ error: 'Zu wenige Datenpunkte (mindestens 3 benötigt)', count: allPoints?.length || 0 });

    const depths = allPoints.map(p => p.depth_meters);
    const stats = { max: Math.max(...depths), min: Math.min(...depths), avg: depths.reduce((a, b) => a + b, 0) / depths.length };
    const sorted = [...allPoints].sort((a, b) => b.depth_meters - a.depth_meters);
    const hotspots = [];
    const used = new Set();
    for (const p of sorted) {
      if (hotspots.length >= 5) break;
      const key = `${Math.round(p.latitude * 100)}_${Math.round(p.longitude * 100)}`;
      if (used.has(key)) continue;
      used.add(key);
      hotspots.push({ lat: p.latitude, lng: p.longitude, depth: p.depth_meters, label: p.depth_meters > 10 ? 'Tiefrinne' : p.depth_meters > 5 ? 'Mulde' : 'Senke' });
    }

    const lats = allPoints.map(p => p.latitude), lngs = allPoints.map(p => p.longitude);
    const bounds = { north: Math.max(...lats), south: Math.min(...lats), east: Math.max(...lngs), west: Math.min(...lngs) };
    const contributors = new Set(allPoints.map(p => p.created_by)).size;

    const ai_analysis = await invokeLLM({ prompt: `Du bist ein Angelexperte. Analysiere diese Tiefendaten von "${water_body_name}": ${allPoints.length} Messpunkte, Maximaltiefe ${stats.max.toFixed(1)}m, Durchschnitt ${stats.avg.toFixed(1)}m, ${hotspots.length} Hotspots. Gib eine praxisnahe Analyse in 3-4 Sätzen für erfahrene Angler.` });

    const mapData = { name: `Tiefenkarte ${water_body_name}`, water_body_name, bounds, center_lat: (bounds.north + bounds.south) / 2, center_lng: (bounds.east + bounds.west) / 2, data_points_count: allPoints.length, contributors_count: contributors, max_depth: parseFloat(stats.max.toFixed(1)), avg_depth: parseFloat(stats.avg.toFixed(1)), hotspots, ai_analysis: typeof ai_analysis === 'string' ? ai_analysis : JSON.stringify(ai_analysis), status: 'ready', generated_at: new Date().toISOString(), created_by: req.user.email };

    const { data: result } = map_id
      ? await supabase.from('bathymetric_maps').update(mapData).eq('id', map_id).select().single()
      : await supabase.from('bathymetric_maps').insert(mapData).select().single();

    return res.json({ ok: true, map: result });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/calculateTravelTime ─────────────────────────────────────────
router.post('/calculateTravelTime', requireAuth, async (req, res) => {
  try {
    const { fromLat, fromLon, toLat, toLon } = req.body;
    if (!fromLat || !fromLon || !toLat || !toLon) return res.status(400).json({ error: 'Missing coordinates' });

    const apiKey = process.env.OPEN_ROUTE_SERVICE_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ORS API Key nicht konfiguriert' });

    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${fromLon},${fromLat}&end=${toLon},${toLat}`;
    const response = await fetch(url);
    if (!response.ok) return res.status(500).json({ error: 'Route konnte nicht berechnet werden' });

    const data = await response.json();
    const route = data.features?.[0];
    if (!route) return res.status(404).json({ error: 'Keine Route gefunden' });

    const durationSeconds = route.properties.segments[0].duration;
    const distanceMeters = route.properties.segments[0].distance;

    return res.json({ duration_seconds: durationSeconds, duration_minutes: Math.round(durationSeconds / 60), distance_km: (distanceMeters / 1000).toFixed(1), distance_meters: distanceMeters });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
