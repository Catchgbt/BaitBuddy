/**
 * OfflineTileCache - Intelligentes Tile-Caching für Offline-Maps
 * Lädt Tiles im Hintergrund und speichert sie lokal
 */

class OfflineTileCache {
  constructor(dbName = 'baitbuddy_tiles') {
    this.dbName = dbName;
    this.db = null;
    this.cache = new Map(); // In-Memory Cache
    this.pendingRequests = new Map();
    this.isOnline = navigator.onLine;

    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    this.init();
  }

  async init() {
    try {
      this.db = await this.openIndexedDB();
      await this.cleanOldTiles();
      console.log('✓ OfflineTileCache initialized');
    } catch (error) {
      console.warn('OfflineTileCache initialization failed:', error);
    }
  }

  openIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store tiles with metadata
        if (!db.objectStoreNames.contains('tiles')) {
          const store = db.createObjectStore('tiles', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('url', 'url', { unique: false });
        }

        // Store download queue
        if (!db.objectStoreNames.contains('queue')) {
          db.createObjectStore('queue', { keyPath: 'key' });
        }

        // Store settings
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Get tile - try cache first, then online fetch
   */
  async getTile(url) {
    // Check in-memory cache first
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }

    // Check IndexedDB
    try {
      const tile = await this.getFromDB(url);
      if (tile) {
        this.cache.set(url, tile.data);
        return tile.data;
      }
    } catch (error) {
      console.warn('DB read failed:', error);
    }

    // Fetch from network if online
    if (this.isOnline) {
      try {
        const response = await fetch(url, { timeout: 10000 });
        if (response.ok) {
          const blob = await response.blob();
          const data = URL.createObjectURL(blob);

          // Cache it
          this.cache.set(url, data);
          this.saveToDBAsync(url, blob);

          return data;
        }
      } catch (error) {
        console.warn(`Tile fetch failed for ${url}:`, error);
      }
    }

    // Return null if offline and not in cache
    return null;
  }

  /**
   * Prefetch tiles for a bounding box and zoom level
   * (runs in background, doesn't block UI)
   */
  async prefetchTiles(bounds, zoomLevels = [6, 7, 8, 9]) {
    if (!this.isOnline) return;

    const tiles = this.getTileCoordinates(bounds, zoomLevels);
    const existing = await this.getExistingTiles();

    for (const { z, x, y, url } of tiles) {
      if (!existing.has(url)) {
        this.queueTileDownload(url, { z, x, y });
      }
    }

    // Process queue in background
    this.processDownloadQueue();
  }

  /**
   * Convert bbox to tile coordinates
   */
  getTileCoordinates(bounds, zoomLevels) {
    const tiles = [];

    function deg2num(lat, lon, zoom) {
      const latRad = (lat * Math.PI) / 180;
      const n = Math.pow(2, zoom);
      const xtile = Math.floor(((lon + 180) / 360) * n);
      const ytile = Math.floor(
        ((1 -
          Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) /
          2) *
          n
      );
      return { x: xtile, y: ytile };
    }

    for (const z of zoomLevels) {
      const tl = deg2num(bounds.lat_max, bounds.lon_min, z);
      const br = deg2num(bounds.lat_min, bounds.lon_max, z);

      for (let x = tl.x; x <= br.x; x++) {
        for (let y = tl.y; y <= br.y; y++) {
          const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
          tiles.push({ z, x, y, url });
        }
      }
    }

    return tiles;
  }

  /**
   * Queue a tile for download
   */
  queueTileDownload(url, metadata) {
    this.saveToDBAsync(url, null, 'queue', { url, metadata, queued: Date.now() });
  }

  /**
   * Process download queue (max 3 concurrent)
   */
  async processDownloadQueue() {
    const queue = await this.getQueuedTiles();
    const concurrent = 3;
    const downloading = new Set();

    for (const item of queue) {
      // Limit concurrent downloads
      while (downloading.size >= concurrent) {
        await Promise.race(Array.from(downloading));
      }

      const promise = this.downloadQueuedTile(item).finally(() => {
        downloading.delete(promise);
      });

      downloading.add(promise);
    }

    await Promise.all(downloading);
  }

  /**
   * Download a single queued tile
   */
  async downloadQueuedTile(item) {
    try {
      const response = await fetch(item.url, { timeout: 15000 });
      if (response.ok) {
        const blob = await response.blob();
        this.cache.set(item.url, URL.createObjectURL(blob));
        await this.saveTileData(item.url, blob);
        await this.removeFromQueue(item.url);
        console.log(`✓ Cached tile: ${item.url}`);
      }
    } catch (error) {
      console.warn(`Failed to cache tile ${item.url}:`, error);
    }
  }

  /**
   * Get existing tile URLs from DB
   */
  async getExistingTiles() {
    const tiles = await this.getAllFromDB('tiles');
    return new Set(tiles.map((t) => t.url));
  }

  /**
   * Get queued tiles
   */
  async getQueuedTiles() {
    return this.getAllFromDB('queue');
  }

  /**
   * Remove from queue
   */
  async removeFromQueue(url) {
    return this.deleteFromDB(url, 'queue');
  }

  /**
   * Save tile data to IndexedDB
   */
  async saveTileData(url, blob) {
    const arrayBuffer = await blob.arrayBuffer();
    return this.saveToDBAsync(url, arrayBuffer, 'tiles', {
      url,
      timestamp: Date.now(),
      size: arrayBuffer.byteLength,
    });
  }

  /**
   * DB Operations (sync wrapper)
   */
  async getFromDB(url, store = 'tiles') {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }

      const tx = this.db.transaction([store], 'readonly');
      const req = tx.objectStore(store).get(url);

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllFromDB(store) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const tx = this.db.transaction([store], 'readonly');
      const req = tx.objectStore(store).getAll();

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async saveToDBAsync(key, data, store = 'tiles', metadata = {}) {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([store], 'readwrite');
      const req = tx.objectStore(store).put({
        key,
        data,
        ...metadata,
      });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteFromDB(key, store = 'tiles') {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([store], 'readwrite');
      const req = tx.objectStore(store).delete(key);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Clean old tiles (older than 7 days)
   */
  async cleanOldTiles() {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const tiles = await this.getAllFromDB('tiles');

    for (const tile of tiles) {
      if (tile.timestamp && tile.timestamp < sevenDaysAgo) {
        await this.deleteFromDB(tile.key, 'tiles');
      }
    }
  }

  /**
   * Get cache stats
   */
  async getStats() {
    const tiles = await this.getAllFromDB('tiles');
    const queue = await this.getAllFromDB('queue');

    const totalSize = tiles.reduce((sum, t) => sum + (t.size || 0), 0);

    return {
      cachedTiles: tiles.length,
      queuedTiles: queue.length,
      totalSizeMb: (totalSize / (1024 * 1024)).toFixed(2),
      memCacheSize: this.cache.size,
      isOnline: this.isOnline,
    };
  }

  /**
   * Clear cache (manual cleanup)
   */
  async clearCache() {
    this.cache.clear();

    if (this.db) {
      const tx = this.db.transaction(['tiles'], 'readwrite');
      tx.objectStore('tiles').clear();
    }
  }

  /**
   * Event handlers
   */
  handleOnline() {
    this.isOnline = true;
    console.log('📡 Online detected - starting tile prefetch');
    // Resume queued downloads
    this.processDownloadQueue();
  }

  handleOffline() {
    this.isOnline = false;
    console.log('🔌 Offline detected - using cached tiles');
  }
}

// Singleton instance
let offlineTileCache = null;

export function getOfflineTileCache() {
  if (!offlineTileCache) {
    offlineTileCache = new OfflineTileCache();
  }
  return offlineTileCache;
}

export default OfflineTileCache;
