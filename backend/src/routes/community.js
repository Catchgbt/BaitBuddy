import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

// Wettbewerbe
router.get('/competitions', optionalAuth, async (req, res) => {
  const { data, error } = await supabase.from('competitions')
    .select('*').eq('is_active', true).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true, competitions: data });
});

// Leaderboard für Wettbewerb
router.get('/competitions/:id/leaderboard', optionalAuth, async (req, res) => {
  const { data, error } = await supabase.from('voting_submissions')
    .select('*').eq('competition_id', req.params.id)
    .order('total_score', { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true, leaderboard: data });
});

// Fang einreichen
router.post('/competitions/:id/submit', requireAuth, async (req, res) => {
  const { species, length_cm, photo_url } = req.body;
  const { data, error } = await supabase.from('voting_submissions').insert({
    competition_id: req.params.id,
    user_id: req.user.email,
    created_by: req.user.email,
    species, length_cm, photo_url,
    catch_time: new Date().toISOString(),
    total_score: length_cm || 0
  }).select();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true, submission: data[0] });
});

// Liken
router.post('/submissions/:id/like', requireAuth, async (req, res) => {
  const { error } = await supabase.from('voting_likes').insert({
    submission_id: req.params.id, user_id: req.user.email
  });
  if (error?.code === '23505') return res.json({ ok: true, message: 'Bereits geliked' });
  if (error) return res.status(500).json({ error: error.message });
  await supabase.rpc('increment_likes', { sub_id: req.params.id }).catch(() => {});
  return res.json({ ok: true });
});

export default router;
