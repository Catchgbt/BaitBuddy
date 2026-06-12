import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

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

    if (error) {
      console.error('[Catches Error]', error);
      return res.status(500).json({ error: error.message, details: 'Datenbankfehler beim Laden der Fänge' });
    }

    return res.json(data || []);
  } catch (e) {
    console.error('[Catches Exception]', e);
    return res.status(500).json({ error: e.message });
  }
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

  // Auto-update active competition scores (points = length_cm)
  if (length_cm && data?.id) {
    const now = new Date();
    const { data: activeComps } = await supabase.from('competitions')
      .select('id').eq('is_active', true)
      .lte('start_date', now.toISOString())
      .gte('end_date', now.toISOString())
      .limit(10);

    if (activeComps?.length) {
      for (const comp of activeComps) {
        const { data: existing } = await supabase.from('voting_submissions')
          .select('id, total_score').eq('competition_id', comp.id).eq('user_id', req.user.email).single();

        if (existing) {
          await supabase.from('voting_submissions')
            .update({ total_score: (existing.total_score || 0) + length_cm, catch_id: data.id })
            .eq('id', existing.id);
        } else {
          await supabase.from('voting_submissions').insert({
            competition_id: comp.id,
            user_id: req.user.email,
            created_by: req.user.email,
            catch_id: data.id,
            total_score: length_cm,
            species, catch_time: data.catch_time
          });
        }
      }
    }
  }

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
