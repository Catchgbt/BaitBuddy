import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

// Generisches Gear-Subsystem (GearV1). Strukturierte Felder liegen in data
// (jsonb); hier wird beim Lesen auf Top-Level abgeflacht und beim Schreiben
// wieder eingepackt. Ownership über created_by (E-Mail).

const META_COLS = new Set(['id', 'created_by', 'created_at', 'updated_date']);
const RESERVED_QUERY = new Set(['order', 'limit', 'offset']);

// DB-Zeile -> flaches Objekt fürs Frontend.
function flatten(row) {
  if (!row) return row;
  const { data, ...meta } = row;
  return { ...(data || {}), ...meta };
}

// Eingehender Payload -> { data } (Meta-Felder entfernt).
function pack(body = {}) {
  const data = {};
  for (const [k, v] of Object.entries(body)) {
    if (!META_COLS.has(k)) data[k] = v;
  }
  return data;
}

// "-updated_date" -> { column, ascending }. data-Felder werden als data->>feld
// sortiert.
function parseOrder(order) {
  if (!order) return null;
  const ascending = !order.startsWith('-');
  const field = order.replace(/^-/, '');
  if (field === 'updated_date' || field === 'created_at') {
    return { column: field, ascending };
  }
  return { column: `data->>${field}`, ascending };
}

function registerCrud(table, segment) {
  // LIST (+ Filter über beliebige data-Felder, order, limit)
  router.get(`/gear/${segment}`, requireAuth, async (req, res) => {
    let query = supabase.from(table).select('*').eq('created_by', req.user.email);

    for (const [key, value] of Object.entries(req.query)) {
      if (RESERVED_QUERY.has(key)) continue;
      query = query.eq(`data->>${key}`, String(value));
    }

    const order = parseOrder(req.query.order);
    if (order) query = query.order(order.column, { ascending: order.ascending });
    else query = query.order('updated_date', { ascending: false });

    if (req.query.limit) query = query.limit(Number(req.query.limit));

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json((data || []).map(flatten));
  });

  // GET by id
  router.get(`/gear/${segment}/:id`, requireAuth, async (req, res) => {
    const { data, error } = await supabase.from(table).select('*')
      .eq('id', req.params.id).eq('created_by', req.user.email).single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(flatten(data));
  });

  // CREATE
  router.post(`/gear/${segment}`, requireAuth, async (req, res) => {
    const { data, error } = await supabase.from(table).insert({
      created_by: req.user.email, data: pack(req.body),
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(flatten(data));
  });

  // BULK CREATE
  router.post(`/gear/${segment}/bulk`, requireAuth, async (req, res) => {
    const rows = Array.isArray(req.body) ? req.body : (req.body?.items || []);
    if (!rows.length) return res.json([]);
    const payload = rows.map((r) => ({ created_by: req.user.email, data: pack(r) }));
    const { data, error } = await supabase.from(table).insert(payload).select();
    if (error) return res.status(500).json({ error: error.message });
    return res.json((data || []).map(flatten));
  });

  // UPDATE (data wird gemerged, damit Teil-Updates erhalten bleiben)
  router.patch(`/gear/${segment}/:id`, requireAuth, async (req, res) => {
    const { data: existing, error: readErr } = await supabase.from(table)
      .select('data').eq('id', req.params.id).eq('created_by', req.user.email).single();
    if (readErr) return res.status(500).json({ error: readErr.message });

    const merged = { ...(existing?.data || {}), ...pack(req.body) };
    const { data, error } = await supabase.from(table)
      .update({ data: merged, updated_date: new Date().toISOString() })
      .eq('id', req.params.id).eq('created_by', req.user.email)
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(flatten(data));
  });

  // DELETE
  router.delete(`/gear/${segment}/:id`, requireAuth, async (req, res) => {
    const { error } = await supabase.from(table).delete()
      .eq('id', req.params.id).eq('created_by', req.user.email);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  });
}

registerCrud('gear_categories', 'categories');
registerCrud('gear_items', 'items');
registerCrud('gear_rules', 'rules');
registerCrud('loadouts', 'loadouts');
registerCrud('pack_sessions', 'sessions');

export default router;
