import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

router.get('/community/posts', optionalAuth, async (req, res) => {
  const { data, error } = await supabase.from('community_posts')
    .select('*').order('created_at', { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

router.post('/community/posts', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('community_posts').insert({
    ...req.body,
    created_by: req.user.email
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.delete('/community/posts/:id', requireAuth, async (req, res) => {
  const { error } = await supabase.from('community_posts').delete()
    .eq('id', req.params.id).eq('created_by', req.user.email);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

router.post('/community/posts/:id/like', requireAuth, async (req, res) => {
  const { error } = await supabase.from('post_likes').insert({
    post_id: req.params.id, user_id: req.user.email
  });
  // 23505 = bereits geliked (Unique-Constraint); nicht erneut hochzählen.
  if (error?.code === '23505') return res.json({ ok: true });
  if (error) return res.status(500).json({ error: error.message });

  // Like-Anzahl aus post_likes aggregieren und auf dem Post persistieren,
  // damit der Zähler nach einem Reload korrekt bleibt.
  const { count } = await supabase.from('post_likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', req.params.id);
  if (typeof count === 'number') {
    await supabase.from('community_posts').update({ likes: count }).eq('id', req.params.id);
  }
  return res.json({ ok: true, likes: count });
});

// Kommentare zu Community-Posts. community_posts nutzt created_by (E-Mail) als
// Autor-Kennung; community_comments folgt demselben Schema.
router.get('/community/comments', optionalAuth, async (req, res) => {
  let query = supabase.from('community_comments')
    .select('*').order('created_at', { ascending: true }).limit(1000);
  if (req.query.post_id) query = query.eq('post_id', req.query.post_id);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

router.post('/community/comments', requireAuth, async (req, res) => {
  const { post_id, text } = req.body || {};
  if (!post_id || !text) return res.status(400).json({ error: 'post_id und text erforderlich' });
  const { data, error } = await supabase.from('community_comments').insert({
    post_id, text, created_by: req.user.email
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.get('/community/voting/leaderboard', optionalAuth, async (req, res) => {
  const { data, error } = await supabase.from('voting_submissions')
    .select('*').order('total_score', { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

router.post('/community/voting/submit', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('voting_submissions').insert({
    ...req.body, created_by: req.user.email
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.post('/community/voting/:id/like', requireAuth, async (req, res) => {
  const { error } = await supabase.from('voting_likes').insert({
    submission_id: req.params.id, user_id: req.user.email
  });
  if (error?.code === '23505') return res.json({ ok: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

router.post('/community/clans', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('clans').insert({
    ...req.body, created_by: req.user.email
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.post('/community/clans/:id/join', requireAuth, async (req, res) => {
  const { error } = await supabase.from('clan_members').insert({
    clan_id: req.params.id, user_id: req.user.email
  });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

router.get('/community/clans/:id/leaderboard', optionalAuth, async (req, res) => {
  const { data: members } = await supabase.from('clan_members')
    .select('user_id').eq('clan_id', req.params.id);
  if (!members?.length) return res.json([]);
  const memberIds = members.map(m => m.user_id);
  const { data, error } = await supabase.from('catches')
    .select('created_by, species, length_cm')
    .in('created_by', memberIds)
    .order('length_cm', { ascending: false }).limit(20);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

router.get('/events', optionalAuth, async (req, res) => {
  const { data, error } = await supabase.from('competitions')
    .select('*').eq('is_active', true).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

router.post('/events', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('competitions').insert({
    ...req.body, created_by: req.user.email
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.get('/events/:id/leaderboard', optionalAuth, async (req, res) => {
  const { data, error } = await supabase.from('voting_submissions')
    .select('*').eq('competition_id', req.params.id)
    .order('total_score', { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

router.post('/events/:id/submit', requireAuth, async (req, res) => {
  const { species, length_cm, photo_url } = req.body;
  const { data, error } = await supabase.from('voting_submissions').insert({
    competition_id: req.params.id,
    user_id: req.user.email,
    created_by: req.user.email,
    species, length_cm, photo_url,
    catch_time: new Date().toISOString(),
    total_score: length_cm || 0
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.post('/events/:id/join', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('voting_submissions').insert({
    competition_id: req.params.id,
    user_id: req.user.email,
    created_by: req.user.email,
    total_score: 0
  }).select().single();
  if (error?.code === '23505') return res.json({ ok: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

export default router;
