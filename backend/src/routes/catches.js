import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

// GET /api/catches
router.get('/catches', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('catches').select('*')
    .eq('created_by', req.user.email)
    .order('catch_time', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true, catches: data });
});

// POST /api/catches
router.post('/catches', requireAuth, async (req, res) => {
  const { species, length_cm, weight_kg, bait_used, notes, catch_time, spot_id, photo_url, is_released } = req.body;
  const { data, error } = await supabase.from('catches').insert({
    created_by: req.user.email,
    species, length_cm, weight_kg, bait_used, notes,
    catch_time: catch_time || new Date().toISOString(),
    spot_id, photo_url,
    is_released: is_released || false
  }).select();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true, catch: data[0] });
});

// PUT /api/catches/:id
router.put('/catches/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('catches')
    .update(req.body)
    .eq('id', req.params.id)
    .eq('created_by', req.user.email)
    .select();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true, catch: data[0] });
});

// DELETE /api/catches/:id
router.delete('/catches/:id', requireAuth, async (req, res) => {
  const { error } = await supabase.from('catches')
    .delete()
    .eq('id', req.params.id)
    .eq('created_by', req.user.email);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

export default router;
