/**
 * Storage Migration Utility
 * Migrates offline data from localStorage to IndexedDB
 * Runs on app startup, handles both old and new storage formats
 */

import { OfflineDataStore } from '@/lib/IndexedDBWrapper';

const MIGRATION_KEY = 'catchgbt_migration_v1_complete';

export async function migrateOfflineStorage() {
  try {
    // Check if migration already completed
    const migrated = localStorage.getItem(MIGRATION_KEY);
    if (migrated === 'true') {
      console.log('[Migration] Already migrated, skipping');
      return { status: 'already_migrated' };
    }

    console.log('[Migration] Starting offline data migration...');

    const results = {
      catches: 0,
      spots: 0,
      metadata: 0,
      errors: [],
    };

    // Migrate catches
    try {
      const catchesJson = localStorage.getItem('catchgbt_offline_catches');
      if (catchesJson) {
        const catches = JSON.parse(catchesJson);
        await OfflineDataStore.cacheCatches(catches);
        results.catches = catches.length;
      }
    } catch (e) {
      results.errors.push(`Catches migration failed: ${e.message}`);
    }

    // Migrate spots
    try {
      const spotsJson = localStorage.getItem('catchgbt_offline_spots');
      if (spotsJson) {
        const spots = JSON.parse(spotsJson);
        await OfflineDataStore.cacheSpots(spots);
        results.spots = spots.length;
      }
    } catch (e) {
      results.errors.push(`Spots migration failed: ${e.message}`);
    }

    // Migrate metadata
    try {
      const lastSync = localStorage.getItem('catchgbt_offline_last_sync');
      if (lastSync) {
        await OfflineDataStore.setMetadata('lastSync_catches', lastSync);
        results.metadata = 1;
      }
    } catch (e) {
      results.errors.push(`Metadata migration failed: ${e.message}`);
    }

    // Mark migration complete
    localStorage.setItem(MIGRATION_KEY, 'true');
    localStorage.setItem('catchgbt_migration_timestamp', new Date().toISOString());

    console.log('[Migration] Complete:', results);
    return { status: 'migrated', ...results };
  } catch (error) {
    console.error('[Migration] Fatal error:', error);
    return { status: 'failed', error: error.message };
  }
}

export async function clearLegacyStorage() {
  try {
    localStorage.removeItem('catchgbt_offline_catches');
    localStorage.removeItem('catchgbt_offline_spots');
    localStorage.removeItem('catchgbt_offline_last_sync');
    console.log('[Migration] Legacy localStorage cleared');
  } catch (e) {
    console.warn('[Migration] Failed to clear legacy storage:', e);
  }
}

// Safe wrapper for OfflineDataStore that falls back gracefully
export const SafeOfflineStore = {
  async cacheCatches(catches) {
    try {
      return await OfflineDataStore.cacheCatches(catches);
    } catch (e) {
      console.warn('[SafeStore] Cache catches failed, using fallback:', e);
      try {
        localStorage.setItem('catchgbt_offline_catches', JSON.stringify(catches));
      } catch (e2) {
        console.error('[SafeStore] All storage methods failed');
      }
    }
  },

  async getCachedCatches() {
    try {
      return await OfflineDataStore.getCachedCatches();
    } catch (e) {
      console.warn('[SafeStore] Get cached catches failed, trying localStorage:', e);
      try {
        const json = localStorage.getItem('catchgbt_offline_catches');
        return json ? JSON.parse(json) : [];
      } catch (e2) {
        return [];
      }
    }
  },

  async cacheSpots(spots) {
    try {
      return await OfflineDataStore.cacheSpots(spots);
    } catch (e) {
      console.warn('[SafeStore] Cache spots failed, using fallback:', e);
      try {
        localStorage.setItem('catchgbt_offline_spots', JSON.stringify(spots));
      } catch (e2) {
        console.error('[SafeStore] All storage methods failed');
      }
    }
  },

  async getCachedSpots() {
    try {
      return await OfflineDataStore.getCachedSpots();
    } catch (e) {
      console.warn('[SafeStore] Get cached spots failed, trying localStorage:', e);
      try {
        const json = localStorage.getItem('catchgbt_offline_spots');
        return json ? JSON.parse(json) : [];
      } catch (e2) {
        return [];
      }
    }
  },

  async fetchCatchesWithFallback(fetchFn) {
    try {
      return await OfflineDataStore.fetchCatchesWithFallback(fetchFn);
    } catch (e) {
      console.error('[SafeStore] Fetch catches failed:', e);
      throw e;
    }
  },

  async fetchSpotsWithFallback(fetchFn) {
    try {
      return await OfflineDataStore.fetchSpotsWithFallback(fetchFn);
    } catch (e) {
      console.error('[SafeStore] Fetch spots failed:', e);
      throw e;
    }
  },

  async clearAll() {
    try {
      await OfflineDataStore.clearAll();
      clearLegacyStorage();
    } catch (e) {
      console.warn('[SafeStore] Clear failed:', e);
    }
  },

  async isCacheStale(maxAgeMs) {
    try {
      return await OfflineDataStore.isCacheStale(maxAgeMs);
    } catch (e) {
      // If IndexedDB fails, check localStorage timestamp as fallback
      const ts = localStorage.getItem('catchgbt_offline_last_sync');
      if (!ts) return true;
      return Date.now() - new Date(ts).getTime() > (maxAgeMs || 7 * 24 * 60 * 60 * 1000);
    }
  },
};