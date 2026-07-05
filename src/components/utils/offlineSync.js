/**
 * Offline-Sync-System
 * Speichert Fänge offline wenn kein Empfang, synchronisiert später
 */

import { isOnline as checkIsOnline, onOnlineStatusChange } from '@/utils/networkStatus';
import { entities, api } from '@/api/frontendClient';

// Re-export for convenience
export const isOnline = checkIsOnline;

const QUEUE_KEYS = {
  catches: 'bb_offline_catch_queue',
  notes: 'bb_offline_notes_queue',
  pendingSync: 'bb_pending_sync',
};

// Deckelt die Offline-Queue, damit sie bei dauerhaft fehlschlagendem Sync
// (z.B. abgelaufenes Token) nicht unbegrenzt in localStorage waechst.
const MAX_QUEUE_SIZE = 200;

// ─── Catch Queue Management ───────────────────────────────────────────────────

export function addToOfflineCatchQueue(catchData) {
  try {
    const queue = getOfflineCatchQueue();
    if (queue.length >= MAX_QUEUE_SIZE) {
      throw new Error(`Offline-Queue ist voll (max. ${MAX_QUEUE_SIZE} Fänge) — bitte zuerst synchronisieren`);
    }
    const withMeta = {
      ...catchData,
      __id: `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      __created: new Date().toISOString(),
      __synced: false,
    };
    queue.push(withMeta);
    localStorage.setItem(QUEUE_KEYS.catches, JSON.stringify(queue));
    return withMeta;
  } catch (e) {
    console.error('Fehler beim Hinzufügen zur Offline-Queue:', e);
    throw e;
  }
}

export function getOfflineCatchQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEYS.catches);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearOfflineCatchQueue() {
  try {
    localStorage.removeItem(QUEUE_KEYS.catches);
  } catch (e) {
    console.error('Fehler beim Löschen der Queue:', e);
  }
}

export function removeFromOfflineCatchQueue(offlineId) {
  try {
    const queue = getOfflineCatchQueue();
    const filtered = queue.filter(c => c.__id !== offlineId);
    localStorage.setItem(QUEUE_KEYS.catches, JSON.stringify(filtered));
  } catch (e) {
    console.error('Fehler beim Entfernen aus Queue:', e);
  }
}

export async function syncOfflineCatches() {
  if (!checkIsOnline()) {
    console.log('Offline — Sync verpasst');
    return { synced: 0, failed: 0, errors: [] };
  }
  if (!api.getToken()) {
    // Kein Token (noch nicht eingeloggt / abgelaufen) — ein Sync-Versuch wuerde
    // nur mit 401s fehlschlagen. initAutoSync() lief bisher direkt beim
    // App-Start, unabhaengig davon, ob der Auth-Check schon abgeschlossen war.
    console.log('Kein Auth-Token — Sync verschoben');
    return { synced: 0, failed: 0, errors: [] };
  }

  const queue = getOfflineCatchQueue();
  if (queue.length === 0) return { synced: 0, failed: 0, errors: [] };

  console.log(`Synchronisiere ${queue.length} offline erfasste Fänge...`);

  let synced = 0;
  let failed = 0;
  const errors = [];

  for (const catchData of queue) {
    try {
      const { __id, __created, __synced, ...realData } = catchData;
      const result = await entities.Catch.create(realData);
      console.log(`Fang ${__id} synchronisiert:`, result.id);
      removeFromOfflineCatchQueue(__id);
      synced++;
    } catch (e) {
      console.error(`Fehler beim Sync von ${catchData.__id}:`, e);
      errors.push({ id: catchData.__id, error: e.message });
      failed++;
    }
  }

  if (synced > 0) {
    console.log(`Erfolgreich synchronisiert: ${synced} Fänge`);
  }
  if (failed > 0) {
    console.warn(`Sync fehlgeschlagen: ${failed} Fänge`);
  }

  return { synced, failed, errors };
}

// ─── Smart Create: Online POST, Offline Queue ──────────────────────────────

export async function createCatchWithOfflineSupport(catchData) {
  if (checkIsOnline()) {
    return entities.Catch.create(catchData);
  } else {
    console.log('Offline — Fang wird lokal gespeichert und später synchronisiert');
    return addToOfflineCatchQueue(catchData);
  }
}

// ─── Offline Notes (Audio Recordings) ──────────────────────────────────────────

export function addToOfflineNotesQueue(noteData) {
  try {
    const queue = getOfflineNotesQueue();
    const withMeta = {
      ...noteData,
      __id: `note_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      __created: new Date().toISOString(),
    };
    queue.push(withMeta);
    localStorage.setItem(QUEUE_KEYS.notes, JSON.stringify(queue));
    return withMeta;
  } catch (e) {
    console.error('Fehler beim Hinzufügen von Notiz:', e);
    throw e;
  }
}

export function getOfflineNotesQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEYS.notes);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function removeFromOfflineNotesQueue(noteId) {
  try {
    const queue = getOfflineNotesQueue();
    const filtered = queue.filter(n => n.__id !== noteId);
    localStorage.setItem(QUEUE_KEYS.notes, JSON.stringify(filtered));
  } catch (e) {
    console.error('Fehler beim Entfernen der Notiz:', e);
  }
}

// ─── Auto-Sync bei Online-Status-Änderung ─────────────────────────────────────

let syncUnsubscribe = null;
let planUpdatedListener = null;

export function initAutoSync() {
  if (syncUnsubscribe) return;

  syncUnsubscribe = onOnlineStatusChange(async (online) => {
    if (online) {
      console.log('Online — Starte Synchronisierung...');
      await new Promise(r => setTimeout(r, 1000)); // Kurz warten für stabile Verbindung
      await syncOfflineCatches();
    }
  });

  // initAutoSync() läuft beim App-Start, bevor der Auth-Check abgeschlossen
  // ist — zu diesem Zeitpunkt ist meist noch kein Token vorhanden (siehe
  // Token-Guard in syncOfflineCatches). Nach einem Login/Register feuert
  // frontendClient.js ein 'plan-updated'-Event — das ist der zuverlässige
  // Zeitpunkt, um die Queue nachzuholen.
  if (typeof window !== 'undefined') {
    planUpdatedListener = () => { syncOfflineCatches(); };
    window.addEventListener('plan-updated', planUpdatedListener);
  }

  if (checkIsOnline()) {
    syncOfflineCatches();
  }
}

export function stopAutoSync() {
  if (syncUnsubscribe) {
    syncUnsubscribe();
    syncUnsubscribe = null;
  }
  if (planUpdatedListener && typeof window !== 'undefined') {
    window.removeEventListener('plan-updated', planUpdatedListener);
    planUpdatedListener = null;
  }
}

// ─── Offline Queue Status ──────────────────────────────────────────────────────

export function getOfflineQueueStatus() {
  const catches = getOfflineCatchQueue();
  const notes = getOfflineNotesQueue();
  return {
    pendingCatches: catches.length,
    pendingNotes: notes.length,
    total: catches.length + notes.length,
    isOnline: isOnline(),
  };
}
