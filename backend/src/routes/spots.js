import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

router.get('/spots', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('spots').select('*').eq('created_by', req.user.email);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true, spots: data });
});

router.post('/spots', requireAuth, async (req, res) => {
  const { name, latitude, longitude, water_type, notes, photo_url } = req.body;
  const { data, error } = await supabase.from('spots').insert({
    created_by: req.user.email, name, latitude, longitude, water_type, notes, photo_url
  }).select();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true, spot: data[0] });
});

router.delete('/spots/:id', requireAuth, async (req, res) => {
  const { error } = await supabase.from('spots').delete()
    .eq('id', req.params.id).eq('created_by', req.user.email);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

export default router;
