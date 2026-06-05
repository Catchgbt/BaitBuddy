import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

router.get('/catches', requireAuth, async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  const { data, error } = await supabase
    .from('catches').select('*')
    .eq('created_by', req.user.email)
    .order('catch_time', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.get('/catches/stats/summary', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('catches').select('species, length_cm, weight_kg, catch_time')
    .eq('created_by', req.user.email);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({
    total: data.length,
    species: [...new Set(data.map(c => c.species).filter(Boolean))],
    biggest: data.reduce((max, c) => c.length_cm > (max?.length_cm || 0) ? c : max, null),
  });
});

router.get('/catches/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('catches').select('*')
    .eq('id', req.params.id).eq('created_by', req.user.email).single();
  if (error) return res.status(404).json({ error: 'Nicht gefunden' });
  return res.json(data);
});

router.post('/catches', requireAuth, async (req, res) => {
  const { species, length_cm, weight_kg, bait_used, notes, catch_time, spot_id, photo_url, is_released } = req.body;
  const { data, error } = await supabase.from('catches').insert({
    created_by: req.user.email,
    species, length_cm, weight_kg, bait_used, notes,
    catch_time: catch_time || new Date().toISOString(),
    spot_id, photo_url,
    is_released: is_released || false
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.patch('/catches/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('catches')
    .update(req.body)
    .eq('id', req.params.id)
    .eq('created_by', req.user.email)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.put('/catches/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('catches')
    .update(req.body)
    .eq('id', req.params.id)
    .eq('created_by', req.user.email)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.delete('/catches/:id', requireAuth, async (req, res) => {
  const { error } = await supabase.from('catches')
    .delete()
    .eq('id', req.params.id)
    .eq('created_by', req.user.email);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

export default router;
