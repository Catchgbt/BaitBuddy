import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import { sendDbError } from '../lib/errorResponse.js';

const router = Router();

const ALLOWED_CATCH_UPDATE_FIELDS = ['species', 'length_cm', 'weight_kg', 'bait_used', 'notes', 'photo_url', 'is_released', 'spot_id'];

const filterCatchUpdate = (body) => {
  const filtered = {};
  for (const field of ALLOWED_CATCH_UPDATE_FIELDS) {
    if (field in body) filtered[field] = body[field];
  }
  return filtered;
};

router.get('/catches', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    if (!req.user?.email) {
      return res.status(401).json({ error: 'Benutzer-E-Mail nicht verfügbar' });
    }

    const { data, error } = await supabase
      .from('catches').select('*')
      .eq('created_by', req.user.email)
      .order('catch_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return sendDbError(res, error);

    return res.json(data || []);
  } catch (e) {
    return sendDbError(res, e);
  }
});

router.get('/catches/stats/summary', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('catches').select('species, length_cm, weight_kg, catch_time')
    .eq('created_by', req.user.email);
  if (error) return sendDbError(res, error);
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
  if (error) return sendDbError(res, error);
  return res.json(data);
});

const updateCatch = async (req, res) => {
  const filtered = filterCatchUpdate(req.body);
  const { data, error } = await supabase.from('catches')
    .update(filtered)
    .eq('id', req.params.id)
    .eq('created_by', req.user.email)
    .select().single();
  if (error) return sendDbError(res, error);
  return res.json(data);
};

router.patch('/catches/:id', requireAuth, updateCatch);
router.put('/catches/:id', requireAuth, updateCatch);

router.delete('/catches/:id', requireAuth, async (req, res) => {
  const { error } = await supabase.from('catches')
    .delete()
    .eq('id', req.params.id)
    .eq('created_by', req.user.email);
  if (error) return sendDbError(res, error);
  return res.json({ ok: true });
});

export default router;
