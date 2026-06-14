import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

const ALLOWED_SPOT_FIELDS = ['name', 'latitude', 'longitude', 'water_type', 'notes', 'photo_url', 'is_favorite', 'depth_meters'];

const filterSpotBody = (body) => {
  const filtered = {};
  for (const key of ALLOWED_SPOT_FIELDS) {
    if (key in body) {
      filtered[key] = body[key];
    }
  }
  return filtered;
};

router.get('/spots', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('spots').select('*').eq('created_by', req.user.email);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

router.get('/spots/public', async (req, res) => {
  const { data, error } = await supabase.from('spots').select('id,name,latitude,longitude,water_type').limit(100);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.post('/spots', requireAuth, async (req, res) => {
  const { name, latitude, longitude, water_type, notes, photo_url, is_favorite, depth_meters } = req.body;
  const { data, error } = await supabase.from('spots').insert({
    created_by: req.user.email, name, latitude, longitude, water_type, notes, photo_url,
    is_favorite: is_favorite ?? false,
    depth_meters: depth_meters ?? null,
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.patch('/spots/:id', requireAuth, async (req, res) => {
  const filteredBody = filterSpotBody(req.body);
  const { data, error } = await supabase.from('spots')
    .update(filteredBody)
    .eq('id', req.params.id)
    .eq('created_by', req.user.email)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.delete('/spots/:id', requireAuth, async (req, res) => {
  const { error } = await supabase.from('spots').delete()
    .eq('id', req.params.id).eq('created_by', req.user.email);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

export default router;
