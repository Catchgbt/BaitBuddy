import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

const ALLOWED_SHARE_FIELDS = ['catch_id', 'platform', 'message', 'include_photo'];
const SUPPORTED_PLATFORMS = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok'];

const filterBody = (body, allowedFields) => {
  const filtered = {};
  for (const key of allowedFields) {
    if (key in body) {
      filtered[key] = body[key];
    }
  }
  return filtered;
};

// Pfad ist Plural, konsistent mit den GET/DELETE-Routen unten und mit
// ENTITY_MAP['SocialMediaShare'] in frontendClient.js ('/api/social-media/shares').
// War zuvor Singular ('/social-media/share') — entities.SocialMediaShare.create()
// traf dadurch nie diese Route (404), das Teilen eines Fangs schlug immer fehl.
router.post('/social-media/shares', requireAuth, async (req, res) => {
  const filteredBody = filterBody(req.body, ALLOWED_SHARE_FIELDS);
  const { catch_id, platform, message, include_photo } = filteredBody;

  if (!catch_id || !platform) {
    return res.status(400).json({ error: 'catch_id und platform erforderlich' });
  }

  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Plattform nicht unterstützt. Erlaubt: ${SUPPORTED_PLATFORMS.join(', ')}` });
  }

  const { data: catchData, error: catchError } = await supabase
    .from('catches')
    .select('*')
    .eq('id', catch_id)
    .eq('created_by', req.user.email)
    .single();

  if (catchError || !catchData) {
    return res.status(404).json({ error: 'Fang nicht gefunden' });
  }

  const { data, error } = await supabase
    .from('social_media_shares')
    .insert({
      catch_id,
      platform,
      message: message || '',
      include_photo: include_photo || false,
      created_by: req.user.email,
      photo_url: include_photo ? catchData.photo_url : null,
      share_link: generateShareLink(platform, catch_id),
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data);
});

router.get('/social-media/shares', requireAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);

  const { data, error } = await supabase
    .from('social_media_shares')
    .select('*')
    .eq('created_by', req.user.email)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data || []);
});

router.get('/social-media/shares/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('social_media_shares')
    .select('*')
    .eq('id', req.params.id)
    .eq('created_by', req.user.email)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Share nicht gefunden' });
  }

  return res.json(data);
});

router.delete('/social-media/shares/:id', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('social_media_shares')
    .delete()
    .eq('id', req.params.id)
    .eq('created_by', req.user.email);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ ok: true });
});

function generateShareLink(platform, catchId) {
  const baseUrl = process.env.APP_URL || 'https://bait-buddy.vercel.app';
  const platforms = {
    instagram: `instagram://share?url=${encodeURIComponent(`${baseUrl}/share/${catchId}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${baseUrl}/share/${catchId}`)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(`${baseUrl}/share/${catchId}`)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${baseUrl}/share/${catchId}`)}`,
    tiktok: `https://www.tiktok.com/`,
  };
  return platforms[platform] || '';
}

export default router;
