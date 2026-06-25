import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

function bboxValid(b) {
  if (!b || typeof b !== 'object') return false;
  const { north, south, east, west } = b;
  return [north, south, east, west].every(v => typeof v === 'number' && Number.isFinite(v))
    && north > south && east > west
    && north <= 90 && south >= -90 && east <= 180 && west >= -180;
}

router.get('/bathymetry/regions', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('bathymetric_maps')
    .select('*')
    .eq('user_email', req.user.email)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

router.post('/bathymetry/regions', requireAuth, async (req, res) => {
  const { name, bbox, spot_id = null } = req.body || {};
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Name erforderlich' });
  if (!bboxValid(bbox)) return res.status(400).json({ error: 'Ungueltige Bounding Box' });
  const map_data = { bbox, point_count: 0, downloaded_at: null, compressed: false };
  const insertRow = { user_email: req.user.email, name, map_data, spot_id };
  const { data, error } = await supabase
    .from('bathymetric_maps')
    .insert(insertRow)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.post('/bathymetry/regions/:id/download', requireAuth, async (req, res) => {
  const { compress = true } = req.body || {};
  const { data: region, error: getErr } = await supabase
    .from('bathymetric_maps')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_email', req.user.email)
    .single();
  if (getErr) return res.status(404).json({ error: 'Region nicht gefunden' });
  const bbox = region.map_data?.bbox;
  if (!bboxValid(bbox)) return res.status(400).json({ error: 'Region hat keine gueltige BBox' });

  const { data: depthPoints, error: depthErr } = await supabase
    .from('depth_data_points')
    .select('latitude,longitude,depth_m')
    .eq('user_email', req.user.email)
    .gte('latitude', bbox.south).lte('latitude', bbox.north)
    .gte('longitude', bbox.west).lte('longitude', bbox.east);
  if (depthErr) return res.status(500).json({ error: depthErr.message });

  const { data: spots, error: spotErr } = await supabase
    .from('spots')
    .select('latitude,longitude,depth_meters')
    .eq('created_by', req.user.email)
    .not('depth_meters', 'is', null)
    .gte('latitude', bbox.south).lte('latitude', bbox.north)
    .gte('longitude', bbox.west).lte('longitude', bbox.east);
  if (spotErr) return res.status(500).json({ error: spotErr.message });

  const points = [
    ...(depthPoints || []).map(p => ({ lat: p.latitude, lng: p.longitude, depth: Number(p.depth_m) })),
    ...(spots || []).map(s => ({ lat: s.latitude, lng: s.longitude, depth: Number(s.depth_meters) })),
  ].filter(p => Number.isFinite(p.depth) && Number.isFinite(p.lat) && Number.isFinite(p.lng));

  const compactPoints = compress
    ? points.map(p => [Math.round(p.lat * 1e5) / 1e5, Math.round(p.lng * 1e5) / 1e5, Math.round(p.depth * 10) / 10])
    : points;

  const new_map_data = {
    ...region.map_data,
    bbox,
    point_count: points.length,
    downloaded_at: new Date().toISOString(),
    compressed: !!compress,
    points: compactPoints,
  };
  const size_bytes = Buffer.byteLength(JSON.stringify(new_map_data), 'utf8');
  new_map_data.size_bytes = size_bytes;

  const { data: updated, error: updateErr } = await supabase
    .from('bathymetric_maps')
    .update({ map_data: new_map_data })
    .eq('id', region.id)
    .eq('user_email', req.user.email)
    .select().single();
  if (updateErr) return res.status(500).json({ error: updateErr.message });
  return res.json(updated);
});

router.delete('/bathymetry/regions/:id', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('bathymetric_maps')
    .delete()
    .eq('id', req.params.id)
    .eq('user_email', req.user.email);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

export default router;
