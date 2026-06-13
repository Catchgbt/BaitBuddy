import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import { Buffer } from 'buffer';

const router = Router();

router.get('/fishing/rules', optionalAuth, async (req, res) => {
  const { data, error } = await supabase.from('rule_entries').select('*').limit(200);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

router.get('/fishing/rules/active', optionalAuth, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from('rule_entries').select('*')
    .lte('closed_from', today).gte('closed_to', today);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

router.get('/fishing/clubs', optionalAuth, async (req, res) => {
  return res.json([]);
});

router.post('/fishing/clubs/nearby', optionalAuth, async (req, res) => {
  return res.json([]);
});

router.get('/fishing/licenses', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('licenses').select('*').eq('created_by', req.user.email);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

router.post('/fishing/licenses', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('licenses').insert({
    ...req.body, created_by: req.user.email
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.get('/fishing/plans', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('fishing_plans').select('*').eq('created_by', req.user.email);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

router.post('/fishing/plans', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('fishing_plans').insert({
    ...req.body, created_by: req.user.email
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.delete('/fishing/plans/:id', requireAuth, async (req, res) => {
  const { error } = await supabase.from('fishing_plans').delete()
    .eq('id', req.params.id).eq('created_by', req.user.email);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

router.get('/fishing/hotspots', optionalAuth, async (req, res) => {
  const { data, error } = await supabase.from('spots').select('id,name,latitude,longitude,water_type').limit(100);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ hotspots: data || [] });
});

router.get('/gear', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('gear').select('*').eq('created_by', req.user.email);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

router.post('/gear', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('gear').insert({
    ...req.body, created_by: req.user.email
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.patch('/gear/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('gear')
    .update(req.body).eq('id', req.params.id).eq('created_by', req.user.email)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.delete('/gear/:id', requireAuth, async (req, res) => {
  const { error } = await supabase.from('gear').delete()
    .eq('id', req.params.id).eq('created_by', req.user.email);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

router.get('/water', requireAuth, async (req, res) => {
  return res.json({ analysis: 'Wasseranalyse nicht verfügbar' });
});

router.post('/water', optionalAuth, async (req, res) => {
  return res.json({ analysis: 'Wasseranalyse wird verarbeitet', ok: true });
});

router.get('/water/history', requireAuth, async (req, res) => {
  return res.json([]);
});

router.post('/weather', optionalAuth, async (req, res) => {
  const { latitude, longitude } = req.body;
  try {
    const w = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m,weather_code,relative_humidity_2m&hourly=temperature_2m,precipitation_probability&timezone=auto`
    ).then(r => r.json());
    return res.json(w);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.del = router.delete;
router.delete('/user/account', requireAuth, async (req, res) => {
  return res.json({ ok: true, message: 'Account-Löschung eingeleitet' });
});

router.post('/user/sessions/start', requireAuth, async (req, res) => {
  return res.json({ ok: true, session_id: Date.now().toString() });
});

router.post('/user/sessions/:id/end', requireAuth, async (req, res) => {
  return res.json({ ok: true });
});

router.get('/admin/users', requireAuth, async (req, res) => {
  return res.json([]);
});

router.get('/exams', optionalAuth, async (req, res) => {
  const { data, error } = await supabase.from('exam_questions').select('*').limit(200);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

router.post('/files/upload', requireAuth, async (req, res) => {
  try {
    const { file_base64, file_name, file_type } = req.body;

    if (!file_base64 || !file_name) {
      return res.status(400).json({ error: 'file_base64 und file_name erforderlich' });
    }

    const buffer = Buffer.from(file_base64, 'base64');
    const bucket = 'catches';
    const filePath = `${req.user.email}/${Date.now()}-${file_name}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file_type || 'application/octet-stream',
        upsert: false,
      });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return res.json({ file_url: publicUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
