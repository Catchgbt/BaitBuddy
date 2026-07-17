import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import { sendDbError } from '../lib/errorResponse.js';

const router = Router();

// Generische CRUD-Anbindung für user-eigene Entities (user_id = Supabase-Auth-UUID).
// Diese Tabellen existierten bereits, hatten aber keine Backend-Routen — die
// zugehörigen Frontend-Features (Gebrauchtmarkt, Funktions-Bewertungen,
// Köder-Rezepte) liefen daher ins Leere. Schreiboperationen sind immer auf den
// Eigentümer beschränkt; `publicRead` öffnet nur das Lesen (z. B. Marktplatz).

const RESERVED = new Set(['order', 'limit', 'offset']);
// Sortier-Whitelist: das Frontend sendet teils base44-Legacy-Order-Felder
// (z. B. -analyzed_at, -reviewed_at, -created_date), die es als Spalte nicht in
// jeder Tabelle gibt. created_at existiert überall und ist die zuverlässige
// Erstellungszeit; unbekannte Order-Spalten fallen darauf zurück (statt 500er).
const SAFE_SORT = new Set(['created_at', 'valid_until']);

const coerce = (v) => {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
};

function registerEntity(path, table, allowedFields, { publicRead = false, readOnly = false, ownerEmailCols = ['user_email'] } = {}) {
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
      const col = order ? order.replace(/^-/, '') : null;
      if (col && (allow.has(col) || SAFE_SORT.has(col))) {
        q = q.order(col, { ascending: !order.startsWith('-') });
      } else {
        q = q.order('created_at', { ascending: false });
      }
      if (req.query.limit) q = q.limit(Number(req.query.limit));

      const { data, error } = await q;
      if (error) return sendDbError(res, error);
      return res.json(data || []);
    } catch (e) {
      return sendDbError(res, e);
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

  if (readOnly) return;

  // CREATE
  router.post(path, requireAuth, async (req, res) => {
    const row = { ...pack(req.body), user_id: req.user.id };
    for (const c of ownerEmailCols) row[c] = req.user.email;
    const { data, error } = await supabase.from(table).insert(row).select().single();
    if (error) return sendDbError(res, error);
    return res.json(data);
  });

  // UPDATE (nur eigene). maybeSingle statt single: ein Update auf eine fremde
  // oder geloeschte ID trifft 0 Zeilen — mit single() wurde daraus ein 500er
  // ("Cannot coerce the result to a single JSON object") statt eines 404.
  router.patch(`${path}/:id`, requireAuth, async (req, res) => {
    const { data, error } = await supabase.from(table)
      .update(pack(req.body))
      .eq('id', req.params.id).eq('user_id', req.user.id)
      .select().maybeSingle();
    if (error) return sendDbError(res, error);
    if (!data) return res.status(404).json({ error: 'Nicht gefunden' });
    return res.json(data);
  });

  // DELETE (nur eigene)
  router.delete(`${path}/:id`, requireAuth, async (req, res) => {
    const { error } = await supabase.from(table).delete()
      .eq('id', req.params.id).eq('user_id', req.user.id);
    if (error) return sendDbError(res, error);
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

// Gewässer-Bewertungen (ReviewsList, MapView) — öffentlich lesbar.
registerEntity('/water-reviews', 'water_reviews', [
  'spot_id', 'rating', 'review',
], { publicRead: true });

// Wasseranalyse-Verlauf (MiniWaterAnalysis, WaterAnalysisMapLayer) — privat.
registerEntity('/water-analysis-history', 'water_analysis_history', [
  'spot_id', 'latitude', 'longitude', 'spot_name', 'analysis_data',
], { publicRead: false });

// Voting-Likes (VotingEventCard) — öffentlich lesbar (Anzahl/Status).
registerEntity('/voting-likes', 'voting_likes', [
  'submission_id',
], { publicRead: true });

// Bathymetrie-Karten (BathymetricCrowdsourcing) — öffentlich lesbar (Crowdsourcing).
registerEntity('/bathymetric-maps', 'bathymetric_maps', [
  'spot_id', 'name', 'map_data',
], { publicRead: true });

// Tiefendaten-Punkte (MyDepthDataList) — privat pro Nutzer.
registerEntity('/depth-data-points', 'depth_data_points', [
  'map_id', 'latitude', 'longitude', 'depth_m',
], { publicRead: false });

// Angelschein-Verwaltung (LicensesSection) — privat pro Nutzer.
registerEntity('/licenses', 'licenses', [
  'type', 'number', 'valid_from', 'valid_until', 'issuer', 'notes', 'photo_url',
], { publicRead: false });

// Community-Chat-Nachrichten (ChatWidget) — öffentlich im jeweiligen Topic.
// created_by trägt die E-Mail (vom UI als Absender gerendert).
registerEntity('/ai/messages', 'chat_messages', [
  'role', 'content', 'context',
], { publicRead: true, ownerEmailCols: ['created_by', 'user_email'] });

// Chat-Sessions / Online-Status (ChatWidget) — öffentlich lesbar (wer ist online).
registerEntity('/community/sessions', 'chat_sessions', [
  'user_email', 'user_name', 'last_activity', 'is_active',
], { publicRead: true, ownerEmailCols: ['user_email', 'created_by'] });

// Nutzungs-Sessions (Layout-Tracking) — privat pro Nutzer. user_id wird aus der
// Auth gesetzt; ein vom Frontend als user_id übergebener E-Mail-Wert wird
// ignoriert (nicht in der Whitelist) und die Ownership greift über die Auth-UUID.
registerEntity('/user/sessions', 'usage_sessions', [
  'session_id', 'feature_id', 'started_at', 'status', 'last_heartbeat', 'stopped_at',
], { publicRead: false });

// Premium-Wallet (Credits-Anzeige) — privat, nur lesen.
registerEntity('/premium/wallet', 'premium_wallets', [
  'credits',
], { publicRead: false, readOnly: true });

export default router;
