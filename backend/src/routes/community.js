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
  if (error?.code === '23505') return res.json({ ok: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
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

router.post('/community/competitions/start', requireAuth, async (req, res) => {
  const { template_id } = req.body;
  if (!template_id) return res.status(400).json({ error: 'template_id erforderlich' });

  const TEMPLATES = {
    biggest_pike_week: { name: 'Größter Hecht der Woche', desc: 'Wer fängt diese Woche den längsten Hecht?', duration: 7, species: 'Hecht' },
    biggest_carp_month: { name: 'Größter Karpfen des Monats', desc: 'Wer hat den dicksten Karpfen?', duration: 30, species: 'Karpfen' },
    most_catches_week: { name: 'Fängigster Angler der Woche', desc: 'Wer fängt die meisten Fische?', duration: 7, species: 'Alle' },
    biggest_catch_week: { name: 'Größter Fang der Woche', desc: 'Der längste Fisch dieser Woche gewinnt.', duration: 7, species: 'Alle' },
    photo_contest_week: { name: 'Foto-Wettbewerb der Woche', desc: 'Reiche dein bestes Fangfoto ein.', duration: 7, species: 'Alle' },
    zander_night_week: { name: 'Zander-Nights', desc: 'Wer fängt den größten Zander?', duration: 7, species: 'Zander' }
  };

  const tpl = TEMPLATES[template_id];
  if (!tpl) return res.status(400).json({ error: 'Ungültige Vorlage' });

  const now = new Date();
  const endDate = new Date(now.getTime() + tpl.duration * 24 * 60 * 60 * 1000);

  const { data: existing, error: existError } = await supabase.from('competitions')
    .select('id').eq('name', tpl.name).eq('is_active', true).single();

  if (!existError && existing) {
    const { data: userExists } = await supabase.from('voting_submissions')
      .select('id').eq('competition_id', existing.id).eq('user_id', req.user.email).single();
    if (!userExists) {
      await supabase.from('voting_submissions').insert({
        competition_id: existing.id,
        user_id: req.user.email,
        created_by: req.user.email,
        total_score: 0
      });
    }
    return res.json({ joined: true, competition_id: existing.id });
  }

  const { data: newComp, error } = await supabase.from('competitions').insert({
    name: tpl.name,
    description: tpl.desc,
    start_date: now.toISOString(),
    end_date: endDate.toISOString(),
    is_active: true,
    created_by: req.user.email,
    prize: `Gewinner: ${tpl.name}`
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });

  const { data: entry } = await supabase.from('voting_submissions').insert({
    competition_id: newComp.id,
    user_id: req.user.email,
    created_by: req.user.email,
    total_score: 0
  }).select().single();

  return res.json({ created: true, competition_id: newComp.id, entry });
});

router.get('/events/leaderboard/monthly', optionalAuth, async (req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data, error } = await supabase.from('voting_submissions')
    .select('user_id, created_by, total_score')
    .gte('created_at', monthStart)
    .lte('created_at', monthEnd)
    .order('total_score', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });

  const aggregated = {};
  (data || []).forEach(entry => {
    const userId = entry.user_id || entry.created_by;
    if (!aggregated[userId]) {
      aggregated[userId] = { user_id: userId, created_by: entry.created_by || userId, total_score: 0 };
    }
    aggregated[userId].total_score += entry.total_score || 0;
  });

  const leaderboard = Object.values(aggregated)
    .sort((a, b) => b.total_score - a.total_score)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

  return res.json({
    leaderboard,
    month: now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
    rewards: {
      1000: '1 Woche Premium',
      4000: '1 Monat Premium'
    }
  });
});

export default router;
