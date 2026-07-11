import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import { sendDbError } from '../lib/errorResponse.js';

const router = Router();

const ALLOWED_NOTE_FIELDS = ['content', 'audio_data', 'mime_type', 'duration_ms', 'title'];

const filterNoteBody = (body) => {
  const filtered = {};
  for (const key of ALLOWED_NOTE_FIELDS) {
    if (key in body) {
      filtered[key] = body[key];
    }
  }
  return filtered;
};

// Get all notes for the current user
router.get('/dashboard-account-notes', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('dashboard_account_notes')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return sendDbError(res, error);
  return res.json(data || []);
});

// Create a new note
router.post('/dashboard-account-notes', requireAuth, async (req, res) => {
  const filteredBody = filterNoteBody(req.body);

  const { data, error } = await supabase
    .from('dashboard_account_notes')
    .insert({
      user_id: req.user.id,
      ...filteredBody,
    })
    .select()
    .single();

  if (error) return sendDbError(res, error);
  return res.json(data);
});

// Update a note
router.patch('/dashboard-account-notes/:id', requireAuth, async (req, res) => {
  const filteredBody = filterNoteBody(req.body);

  const { data, error } = await supabase
    .from('dashboard_account_notes')
    .update({
      ...filteredBody,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .maybeSingle();

  if (error) return sendDbError(res, error);
  if (!data) return res.status(404).json({ error: 'Notiz nicht gefunden' });
  return res.json(data);
});

// Delete a note
router.delete('/dashboard-account-notes/:id', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('dashboard_account_notes')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return sendDbError(res, error);
  return res.json({ ok: true });
});

export default router;
