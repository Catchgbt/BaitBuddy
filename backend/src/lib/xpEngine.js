// XP-Berechnung für das Angel-Level-System.
// =============================================================================
// Die XP werden NICHT als eigener Zähler geführt, sondern bei jedem Abruf aus
// den echten Nutzerdaten abgeleitet (Fänge, Arten, Spots, geplante Touren,
// Ausrüstung, Event-Punkte, Community-Beiträge). Vorteile gegenüber einem
// Ledger:
//   * kein Backfill für Bestandsnutzer — jeder startet sofort mit dem Level,
//     das seine bisherige Aktivität hergibt,
//   * keine doppelt gebuchten oder verlorenen XP bei Retries/Offline-Sync,
//   * Löscht ein Nutzer Daten, korrigiert sich der Stand automatisch.
// Der Preis ist eine Handvoll Count-Abfragen je Aufruf; die laufen parallel,
// als HEAD-Counts (keine Zeilenübertragung) und werden kurz gecacht.
//
// Bereits freigeschaltete Tools bleiben von einem sinkenden XP-Stand
// unberührt: Level-Freischaltungen werden in user_tool_unlocks festgehalten
// (siehe progression.js), Käufe sowieso.

import { supabase } from './supabase.js';
import { MemoryCache } from './memoryCache.js';
import { levelForXp, prestigeForXp, progressForXp } from '../../../shared/toolUnlocks.js';

// XP-Gewichte je Aktivität. Bewusst konservativ gewählt: Level 2 (250 XP)
// erreicht man mit ~10 Fängen oder einer Mischung aus Fängen und Spots,
// Level 10 (9600 XP) verlangt eine ganze Saison.
export const XP_WEIGHTS = {
  catch: 25,          // je erfasstem Fang
  species: 40,        // je unterschiedlicher Fischart (Vielfalt zählt extra)
  spot: 30,           // je angelegtem Spot
  trip: 20,           // je geplanter Tour
  gear_item: 10,      // je erfasstem Ausrüstungsteil
  event_point: 2,     // je Punkt aus Event-Teilnahmen
  community_post: 15, // je Community-Beitrag
};

export const XP_SOURCE_LABELS = {
  catch: 'Fänge',
  species: 'Verschiedene Fischarten',
  spot: 'Eigene Spots',
  trip: 'Geplante Touren',
  gear_item: 'Ausrüstung',
  event_point: 'Event-Punkte',
  community_post: 'Community-Beiträge',
};

// Kurzer Prozess-Cache: Dashboard, Sidebar und Profil fragen den Stand kurz
// hintereinander ab — ohne Cache wären das jedes Mal sieben DB-Abfragen.
const xpCache = new MemoryCache({ defaultTtlMs: 45000, maxEntries: 2000 });

export function invalidateXpCache(userKey) {
  if (userKey) xpCache.delete(userKey);
}

// Zählt Zeilen ohne sie zu übertragen. Ein Fehler (z. B. Tabelle in dieser
// Umgebung nicht vorhanden) darf den Gesamtstand nicht kippen — die Quelle
// zählt dann 0 und wird als fehlerhaft gemeldet, statt den Request zu
// verwerfen.
async function countRows(table, column, value, errors) {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq(column, value);
  if (error) {
    console.error(`[xpEngine] count ${table} fehlgeschlagen:`, error.message || error);
    errors.push(table);
    return 0;
  }
  return count || 0;
}

async function countDistinctSpecies(email, errors) {
  const { data, error } = await supabase
    .from('catches')
    .select('species')
    .eq('created_by', email);
  if (error) {
    console.error('[xpEngine] Artenabfrage fehlgeschlagen:', error.message || error);
    errors.push('catches.species');
    return 0;
  }
  const species = new Set();
  for (const row of data || []) {
    const name = typeof row.species === 'string' ? row.species.trim().toLowerCase() : '';
    if (name) species.add(name);
  }
  return species.size;
}

async function sumEventPoints(email, errors) {
  const { data, error } = await supabase
    .from('event_participants')
    .select('total_points')
    .eq('user_id', email);
  if (error) {
    console.error('[xpEngine] Event-Punkte fehlgeschlagen:', error.message || error);
    errors.push('event_participants');
    return 0;
  }
  return (data || []).reduce((sum, row) => {
    const points = Number(row.total_points);
    return Number.isFinite(points) && points > 0 ? sum + points : sum;
  }, 0);
}

/**
 * Rohzählungen je XP-Quelle für einen Nutzer.
 * @param {{ email: string }} user
 */
export async function collectXpCounts(user) {
  const email = user?.email;
  if (!email) return { counts: {}, errors: ['user.email'] };

  const errors = [];
  const [catchCount, speciesCount, spotCount, tripCount, gearCount, eventPoints, postCount] =
    await Promise.all([
      countRows('catches', 'created_by', email, errors),
      countDistinctSpecies(email, errors),
      countRows('spots', 'created_by', email, errors),
      countRows('fishing_plans', 'created_by', email, errors),
      countRows('gear_items', 'created_by', email, errors),
      sumEventPoints(email, errors),
      countRows('community_posts', 'created_by', email, errors),
    ]);

  return {
    counts: {
      catch: catchCount,
      species: speciesCount,
      spot: spotCount,
      trip: tripCount,
      gear_item: gearCount,
      // Event-Punkte sind numerisch (auch Nachkommastellen) — abrunden, damit
      // die XP eine ganze Zahl bleiben.
      event_point: Math.floor(eventPoints),
      community_post: postCount,
    },
    errors,
  };
}

/** Rechnet Rohzählungen in XP um und baut die Aufschlüsselung für die UI. */
export function xpFromCounts(counts = {}) {
  const breakdown = [];
  let total = 0;
  for (const [source, weight] of Object.entries(XP_WEIGHTS)) {
    const count = Number.isFinite(counts[source]) ? Math.max(0, Math.floor(counts[source])) : 0;
    const xp = count * weight;
    total += xp;
    breakdown.push({
      source,
      label: XP_SOURCE_LABELS[source],
      count,
      xp_per_unit: weight,
      xp,
    });
  }
  return { total_xp: total, breakdown };
}

/**
 * Kompletter XP-/Level-Stand eines Nutzers (gecacht).
 * @param {{ id: string, email: string }} user
 * @param {{ force?: boolean }} [options]
 */
export async function getUserXpState(user, { force = false } = {}) {
  const cacheKey = user?.id || user?.email;
  if (!force && cacheKey) {
    const hit = xpCache.get(cacheKey);
    if (hit) return hit;
  }

  const { counts, errors } = await collectXpCounts(user);
  const { total_xp: totalXp, breakdown } = xpFromCounts(counts);

  const state = {
    ...progressForXp(totalXp),
    level: levelForXp(totalXp),
    prestige: prestigeForXp(totalXp),
    breakdown,
    // Nicht-leer heißt: mindestens eine Quelle konnte nicht gelesen werden und
    // steuert 0 XP bei. Die UI blendet in dem Fall einen Hinweis ein statt
    // einen zu niedrigen Stand als Wahrheit zu verkaufen.
    incomplete_sources: errors,
  };

  if (cacheKey) xpCache.set(cacheKey, state);
  return state;
}
