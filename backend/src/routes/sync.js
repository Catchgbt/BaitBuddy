import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

const CATCH_FIELDS = ['species', 'length_cm', 'weight_kg', 'bait_used', 'notes', 'photo_url', 'is_released', 'spot_id', 'catch_time'];
const SPOT_FIELDS = ['name', 'latitude', 'longitude', 'water_type', 'notes', 'photo_url', 'is_favorite', 'depth_meters'];

const ENTITIES = {
  catches: { table: 'catches', fields: CATCH_FIELDS },
  spots: { table: 'spots', fields: SPOT_FIELDS },
};

const OPS = new Set(['insert', 'update', 'delete']);

function pick(obj, keys) {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const k of keys) {
    if (k in obj) out[k] = obj[k];
  }
  return out;
}

router.get('/sync/status', requireAuth, async (req, res) => {
  return res.json({
    ok: true,
    serverTime: new Date().toISOString(),
    user: req.user.email,
  });
});

router.get('/sync/pending', requireAuth, async (req, res) => {
  return res.json({
    items: [],
    serverTime: new Date().toISOString(),
  });
});

async function applyItem(req, item) {
  const entity = ENTITIES[item.entity];
  if (!entity) {
    return { ok: false, clientId: item.clientId, error: `Unbekannte Entität: ${item.entity}` };
  }
  if (!OPS.has(item.op)) {
    return { ok: false, clientId: item.clientId, error: `Ungültige Operation: ${item.op}` };
  }
  const email = req.user.email;
  try {
    if (item.op === 'insert') {
      const payload = pick(item.payload, entity.fields);
      const row = { ...payload, created_by: email };
      if (entity.table === 'catches' && !row.catch_time) {
        row.catch_time = item.createdAt || new Date().toISOString();
      }
      const { data, error } = await supabase.from(entity.table).insert(row).select().single();
      if (error) return { ok: false, clientId: item.clientId, error: error.message };
      return { ok: true, clientId: item.clientId, entity: item.entity, op: item.op, record: data };
    }
    if (item.op === 'update') {
      if (!item.targetId) return { ok: false, clientId: item.clientId, error: 'targetId fehlt' };
      const payload = pick(item.payload, entity.fields);
      const { data, error } = await supabase.from(entity.table)
        .update(payload)
        .eq('id', item.targetId)
        .eq('created_by', email)
        .select().single();
      if (error) return { ok: false, clientId: item.clientId, error: error.message };
      return { ok: true, clientId: item.clientId, entity: item.entity, op: item.op, record: data };
    }
    if (item.op === 'delete') {
      if (!item.targetId) return { ok: false, clientId: item.clientId, error: 'targetId fehlt' };
      const { error } = await supabase.from(entity.table)
        .delete()
        .eq('id', item.targetId)
        .eq('created_by', email);
      if (error) return { ok: false, clientId: item.clientId, error: error.message };
      return { ok: true, clientId: item.clientId, entity: item.entity, op: item.op };
    }
  } catch (e) {
    return { ok: false, clientId: item.clientId, error: e.message };
  }
  return { ok: false, clientId: item.clientId, error: 'Unbekannter Pfad' };
}

router.post('/sync/upload', requireAuth, async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (items.length === 0) {
    return res.status(400).json({ error: 'Keine Items zum Hochladen' });
  }
  const results = [];
  for (const item of items) {
    results.push(await applyItem(req, item));
  }
  const ok = results.filter(r => r.ok).length;
  const failed = results.length - ok;
  return res.json({
    syncedAt: new Date().toISOString(),
    total: results.length,
    ok,
    failed,
    results,
  });
});

export default router;
