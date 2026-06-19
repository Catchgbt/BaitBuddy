import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

// Generische CRUD-Anbindung für user-eigene Entities (user_id = Supabase-Auth-UUID).
// Diese Tabellen existierten bereits, hatten aber keine Backend-Routen — die
// zugehörigen Frontend-Features (Gebrauchtmarkt, Funktions-Bewertungen,
// Köder-Rezepte) liefen daher ins Leere. Schreiboperationen sind immer auf den
// Eigentümer beschränkt; `publicRead` öffnet nur das Lesen (z. B. Marktplatz).

const RESERVED = new Set(['order', 'limit', 'offset']);

const coerce = (v) => {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
};

function registerEntity(path, table, allowedFields, { publicRead = false } = {}) {
  const allow = new Set(allowedFields);

  const pack = (body = {}) => {
    const out = {};
    for (const [k, v] of Object.entries(body)) {
      if (allow.has(k)) out[k] = v;
    }
    return out;
  };

  // LIST / FILTER
  router.get(path, requireAuth, async (req, res) => {
    try {
      let q = supabase.from(table).select('*');
      if (!publicRead) q = q.eq('user_id', req.user.id);

      for (const [k, v] of Object.entries(req.query)) {
        if (RESERVED.has(k)) continue;
        if (allow.has(k)) q = q.eq(k, coerce(v));
      }

      const order = req.query.order ? String(req.query.order) : null;
      if (order) {
        q = q.order(order.replace(/^-/, ''), { ascending: !order.startsWith('-') });
      } else {
        q = q.order('created_date', { ascending: false });
      }
      if (req.query.limit) q = q.limit(Number(req.query.limit));

      const { data, error } = await q;
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data || []);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });

  // GET by id (private Entities: nur eigene)
  router.get(`${path}/:id`, requireAuth, async (req, res) => {
    let q = supabase.from(table).select('*').eq('id', req.params.id);
    if (!publicRead) q = q.eq('user_id', req.user.id);
    const { data, error } = await q.single();
    if (error) return res.status(404).json({ error: 'Nicht gefunden' });
    return res.json(data);
  });

  // CREATE
  router.post(path, requireAuth, async (req, res) => {
    const row = { ...pack(req.body), user_id: req.user.id, user_email: req.user.email };
    const { data, error } = await supabase.from(table).insert(row).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  });

  // UPDATE (nur eigene)
  router.patch(`${path}/:id`, requireAuth, async (req, res) => {
    const { data, error } = await supabase.from(table)
      .update(pack(req.body))
      .eq('id', req.params.id).eq('user_id', req.user.id)
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  });

  // DELETE (nur eigene)
  router.delete(`${path}/:id`, requireAuth, async (req, res) => {
    const { error } = await supabase.from(table).delete()
      .eq('id', req.params.id).eq('user_id', req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  });
}

// Gebrauchtmarkt (UsedGear) — öffentlich lesbar, eigene Anzeigen verwaltbar.
registerEntity('/gear/listings', 'gear_listings', [
  'title', 'category', 'condition', 'price_cents', 'currency', 'negotiable',
  'location', 'shipping_available', 'description', 'image_urls', 'is_active', 'seller_email',
], { publicRead: true });

// Funktions-Bewertungen (FunctionRatings) — öffentlich lesbar.
registerEntity('/ratings', 'function_ratings', [
  'function_name', 'rating', 'comment',
], { publicRead: true });

// Köder-Rezepte (BaitMixerPro) — privat pro Nutzer.
registerEntity('/bait-recipes', 'bait_recipes', [
  'name', 'category', 'target_fish', 'ingredients', 'instructions',
  'total_percentage', 'attractiveness_score', 'estimated_cost', 'ai_generated', 'ai_analysis', 'is_public',
], { publicRead: false });

export default router;
