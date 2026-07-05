import { supabase } from './supabase.js';

// Tabellen mit ausschliesslich EIGENEN Daten des Nutzers (kein Fremdbezug
// anderer Nutzer). Spalten je Tabelle wie im Live-Schema vorgefunden — einige
// Tabellen fuehren user_id UND user_email/created_by parallel (siehe
// misc.js-Fund zu bathymetric_maps/depth_data_points), daher wird bei
// mehreren vorhandenen Spalten JEDE einzeln geloescht, statt nur eine.
//
// BEWUSST AUSGESCHLOSSEN: clans, competitions, events (created_by = Ersteller
// einer GETEILTEN Ressource, an der andere Nutzer haengen — z.B. Event-
// Teilnehmer/-Submissions anderer Nutzer via events.created_by). Ein
// Loeschen wuerde fremde Daten mitreissen. Der Ersteller-Bezug bleibt
// bestehen; die Ressource selbst gehoert nicht exklusiv dem geloeschten
// Nutzer.
const OWNED_TABLES = [
  ['catches', ['user_id', 'created_by']],
  ['spots', ['user_id', 'created_by']],
  ['fishing_plans', ['user_id', 'created_by']],
  ['licenses', ['user_id', 'user_email']],
  ['bait_recipes', ['user_id', 'user_email']],
  ['bathymetric_maps', ['user_id', 'user_email']],
  ['depth_data_points', ['user_id', 'user_email']],
  ['water_analysis_history', ['user_id', 'user_email']],
  ['water_reviews', ['user_id', 'user_email']],
  ['chat_messages', ['user_id', 'user_email', 'created_by']],
  ['chat_sessions', ['user_id', 'user_email', 'created_by']],
  ['usage_sessions', ['user_id', 'user_email']],
  ['premium_wallets', ['user_id']],
  ['premium_events', ['user_id']],
  ['reward_activations', ['user_id']],
  ['voting_likes', ['user_id', 'user_email']],
  ['voting_submissions', ['user_id', 'created_by']],
  ['gear_listings', ['user_id', 'user_email']],
  ['function_ratings', ['user_id', 'user_email']],
  ['support_tickets', ['user_email']],
  ['live_trips', ['user_id', 'user_email']],
  ['monthly_leaderboards', ['user_id']],
  ['clan_catches', ['user_id']],
  ['clan_members', ['user_id']],
  ['comments', ['user_id']],
  ['posts', ['user_id']],
  ['post_likes', ['user_id']],
  ['event_entries', ['user_id']],
  ['event_participants', ['user_id']],
  ['event_submissions', ['user_id']],
  ['spot_groups', ['user_id']],
  ['user_backups', ['created_by']],
  ['gear_categories', ['created_by']],
  ['gear_items', ['created_by']],
  ['gear_rules', ['created_by']],
  ['loadouts', ['created_by']],
  ['pack_sessions', ['created_by']],
  ['water_scenes', ['created_by']],
  ['community_posts', ['created_by']],
  ['community_comments', ['created_by']],
];

function valueForColumn(column, { userId, email }) {
  return column === 'user_id' ? userId : email;
}

// Löscht alle eigenen Daten des Nutzers (über alle bekannten Tabellen) und
// anschliessend den Auth-User selbst. Einzelne Tabellenfehler brechen den
// Vorgang NICHT ab (z.B. Tabelle ohne Zeilen fuer diesen Nutzer ist kein
// Fehler) — sie werden gesammelt und zurückgegeben, damit der Aufrufer
// entscheiden kann, ob trotzdem der Auth-User gelöscht werden soll.
export async function deleteUserAccount({ userId, email }) {
  const results = {};
  const errors = [];

  for (const [table, columns] of OWNED_TABLES) {
    for (const column of columns) {
      const value = valueForColumn(column, { userId, email });
      if (!value) continue;
      const { error, count } = await supabase
        .from(table)
        .delete({ count: 'exact' })
        .eq(column, value);
      const key = `${table}.${column}`;
      if (error) {
        results[key] = { ok: false, error: error.message };
        errors.push(`${key}: ${error.message}`);
      } else {
        results[key] = { ok: true, deleted: count ?? null };
      }
    }
  }

  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) errors.push(`auth.deleteUser: ${authError.message}`);

  return {
    success: errors.length === 0,
    authUserDeleted: !authError,
    tableResults: results,
    errors,
  };
}
