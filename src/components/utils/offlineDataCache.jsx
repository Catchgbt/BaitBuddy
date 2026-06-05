/**
 * Offline Data Cache Utility
 * Speichert Faenge und Spots im localStorage fuer Offline-Zugriff.
 * Wird von den jeweiligen Seiten/Komponenten aufgerufen.
 */

const KEYS = {
  catches: 'catchgbt_offline_catches',
  spots: 'catchgbt_offline_spots',
  lastSync: 'catchgbt_offline_last_sync',
};

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 Tage

// --- Schreiben ---

export function cacheCatches(catches) {
  try {
    localStorage.setItem(KEYS.catches, JSON.stringify(catches));
    localStorage.setItem(KEYS.lastSync, new Date().toISOString());
  } catch (e) {
    console.warn('[OfflineCache] Konnte Faenge nicht cachen:', e);
  }
}

export function cacheSpots(spots) {
  try {
    localStorage.setItem(KEYS.spots, JSON.stringify(spots));
  } catch (e) {
    console.warn('[OfflineCache] Konnte Spots nicht cachen:', e);
  }
}

// --- Lesen ---

export function getCachedCatches() {
  try {
    const raw = localStorage.getItem(KEYS.catches);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getCachedSpots() {
  try {
    const raw = localStorage.getItem(KEYS.spots);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getLastSyncTime() {
  const ts = localStorage.getItem(KEYS.lastSync);
  return ts ? new Date(ts) : null;
}

export function isCacheStale() {
  const last = getLastSyncTime();
  if (!last) return true;
  return Date.now() - last.getTime() > MAX_AGE_MS;
}

// --- Queue fuer ausstehende Faenge ---

export function getPendingQueueCount() {
  try {
    const raw = localStorage.getItem('fishmaster_catch_queue');
    const queue = raw ? JSON.parse(raw) : [];
    return queue.length;
  } catch {
    return 0;
  }
}

export function getPendingQueue() {
  try {
    const raw = localStorage.getItem('fishmaster_catch_queue');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Laedt Faenge: zuerst vom Server, bei Fehler (offline) aus dem Cache.
 * Aktualisiert den Cache bei erfolgreicher Anfrage automatisch.
 */
export async function fetchCatchesWithFallback(fetchFn) {
  try {
    const data = await fetchFn();
    cacheCatches(data);
    return { data, fromCache: false };
  } catch (e) {
    const cached = getCachedCatches();
    if (cached.length > 0) {
      return { data: cached, fromCache: true };
    }
    throw e;
  }
}

/**
 * Laedt Spots: zuerst vom Server, bei Fehler aus dem Cache.
 */
export async function fetchSpotsWithFallback(fetchFn) {
  try {
    const data = await fetchFn();
    cacheSpots(data);
    return { data, fromCache: false };
  } catch (e) {
    const cached = getCachedSpots();
    if (cached.length > 0) {
      return { data: cached, fromCache: true };
    }
    throw e;
  }
}