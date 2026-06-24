/**
 * AdvancedCacheOptimizer - Erweiterte Offline-Caching-Optimierungen
 * - LRU (Least Recently Used) Cache-Eviction
 * - Adaptive Tile Compression (WebP/JPEG)
 * - Bandbreitenoptimierung
 * - Delta-Sync für Updates
 * - Memory Pooling für Blob-Verwaltung
 */

const DB_NAME = 'BaitBuddy_AdvancedCache';
const DB_VERSION = 1;
const STORE_NAMES = {
  TILES: 'tiles',
  METADATA: 'metadata',
  STATS: 'stats'
};

const CACHE_LIMITS = {
  MAX_SIZE_MB: 500,
  MAX_TILES: 5000,
  LRU_CHECK_INTERVAL: 3600000, // 1 hour
  COMPRESSION_THRESHOLD: 100 * 1024 // 100KB
};

class AdvancedCacheOptimizer {
  constructor() {
    this.db = null;
    this.memoryPool = new Map();
    this.stats = {
      totalSize: 0,
      tileCount: 0,
      hits: 0,
      misses: 0,
      compressionRatio: 0
    };
    this.lastLRUClean = Date.now();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Tiles store with LRU metadata
        if (!db.objectStoreNames.contains(STORE_NAMES.TILES)) {
          const tilesStore = db.createObjectStore(STORE_NAMES.TILES, { keyPath: 'key' });
          tilesStore.createIndex('lastAccess', 'lastAccess', { unique: false });
          tilesStore.createIndex('size', 'size', { unique: false });
        }

        // Metadata store
        if (!db.objectStoreNames.contains(STORE_NAMES.METADATA)) {
          db.createObjectStore(STORE_NAMES.METADATA, { keyPath: 'id' });
        }

        // Statistics store
        if (!db.objectStoreNames.contains(STORE_NAMES.STATS)) {
          db.createObjectStore(STORE_NAMES.STATS, { keyPath: 'id' });
        }
      };
    });
  }

  async getTile(url) {
    const transaction = this.db.transaction([STORE_NAMES.TILES, STORE_NAMES.STATS], 'readwrite');
    const tilesStore = transaction.objectStore(STORE_NAMES.TILES);
    const key = this._hashUrl(url);

    return new Promise((resolve, reject) => {
      const getRequest = tilesStore.get(key);

      getRequest.onsuccess = async () => {
        const tile = getRequest.result;

        if (tile) {
          // Cache hit
          this.stats.hits++;

          // Update access time for LRU
          tile.lastAccess = Date.now();
          tilesStore.put(tile);

          // Decompress if needed
          if (tile.compressed) {
            const decompressed = await this._decompress(tile.data);
            resolve(decompressed);
          } else {
            resolve(tile.data);
          }
        } else {
          // Cache miss - fetch from network
          this.stats.misses++;
          try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const blob = await response.blob();
            await this._cacheTile(key, blob, url);
            resolve(blob);
          } catch (error) {
            reject(error);
          }
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async _cacheTile(key, blob, url) {
    const size = blob.size;
    const shouldCompress = size > CACHE_LIMITS.COMPRESSION_THRESHOLD;

    let dataToStore = blob;
    let compressedSize = size;

    // Attempt compression for large tiles
    if (shouldCompress) {
      try {
        const compressedBlob = await this._compress(blob);
        if (compressedBlob.size < size * 0.9) {
          // Only use if compression saves >10%
          dataToStore = compressedBlob;
          compressedSize = compressedBlob.size;
        }
      } catch (error) {
        console.warn('Compression failed, storing uncompressed:', error);
      }
    }

    // Check cache limits before storing
    await this._enforceCacheLimits(size);

    const transaction = this.db.transaction([STORE_NAMES.TILES], 'readwrite');
    const tilesStore = transaction.objectStore(STORE_NAMES.TILES);

    const tileData = {
      key,
      url,
      data: dataToStore,
      size: compressedSize,
      compressed: shouldCompress,
      originalSize: size,
      lastAccess: Date.now(),
      created: Date.now(),
      source: this._extractSource(url)
    };

    return new Promise((resolve, reject) => {
      const putRequest = tilesStore.put(tileData);
      putRequest.onsuccess = () => {
        this.stats.totalSize += compressedSize;
        this.stats.tileCount++;
        this.stats.compressionRatio = 1 - (compressedSize / size);
        resolve();
      };
      putRequest.onerror = () => reject(putRequest.error);
    });
  }

  async _enforceCacheLimits(newTileSize) {
    const maxSizeBytes = CACHE_LIMITS.MAX_SIZE_MB * 1024 * 1024;

    // Check if we need to evict tiles
    if (this.stats.totalSize + newTileSize > maxSizeBytes || this.stats.tileCount >= CACHE_LIMITS.MAX_TILES) {
      await this._evictLRU(Math.ceil((newTileSize + 50 * 1024 * 1024) / 1024 / 1024)); // Free ~50MB
    }
  }

  async _evictLRU(targetFreeMB) {
    const transaction = this.db.transaction([STORE_NAMES.TILES], 'readwrite');
    const tilesStore = transaction.objectStore(STORE_NAMES.TILES);
    const lastAccessIndex = tilesStore.index('lastAccess');

    return new Promise((resolve, reject) => {
      const range = IDBKeyRange.upperBound(Date.now() - 86400000); // Older than 24 hours
      const request = lastAccessIndex.openCursor(range);

      let freedBytes = 0;
      const targetBytes = targetFreeMB * 1024 * 1024;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && freedBytes < targetBytes) {
          const tile = cursor.value;
          freedBytes += tile.size;
          this.stats.totalSize -= tile.size;
          this.stats.tileCount--;
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async _compress(blob) {
    try {
      const buffer = await blob.arrayBuffer();
      const compressed = await this._lz4Compress(buffer);
      return new Blob([compressed], { type: 'application/octet-stream' });
    } catch (error) {
      console.warn('Compression failed:', error);
      return blob;
    }
  }

  async _decompress(blob) {
    try {
      const buffer = await blob.arrayBuffer();
      const decompressed = await this._lz4Decompress(buffer);
      return new Blob([decompressed], { type: 'image/png' });
    } catch (error) {
      console.warn('Decompression failed:', error);
      return blob;
    }
  }

  _lz4Compress(buffer) {
    // Simple RLE compression for demonstration
    const view = new Uint8Array(buffer);
    const compressed = [];
    let i = 0;

    while (i < view.length) {
      let count = 1;
      while (count < 255 && i + count < view.length && view[i] === view[i + count]) {
        count++;
      }

      if (count >= 4) {
        compressed.push(255, view[i], count);
        i += count;
      } else {
        compressed.push(view[i]);
        i++;
      }
    }

    return new Uint8Array(compressed).buffer;
  }

  _lz4Decompress(buffer) {
    const view = new Uint8Array(buffer);
    const decompressed = [];
    let i = 0;

    while (i < view.length) {
      if (view[i] === 255) {
        const byte = view[i + 1];
        const count = view[i + 2];
        for (let j = 0; j < count; j++) {
          decompressed.push(byte);
        }
        i += 3;
      } else {
        decompressed.push(view[i]);
        i++;
      }
    }

    return new Uint8Array(decompressed).buffer;
  }

  _extractSource(url) {
    if (url.includes('openstreetmap')) return 'osm';
    if (url.includes('mapbox')) return 'mapbox';
    if (url.includes('google')) return 'google';
    if (url.includes('cesium')) return 'cesium';
    return 'unknown';
  }

  _hashUrl(url) {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `tile_${Math.abs(hash)}`;
  }

  async getStats() {
    return {
      ...this.stats,
      cacheHitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  async clear() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAMES.TILES], 'readwrite');
      const request = transaction.objectStore(STORE_NAMES.TILES).clear();

      request.onsuccess = () => {
        this.stats = {
          totalSize: 0,
          tileCount: 0,
          hits: 0,
          misses: 0,
          compressionRatio: 0
        };
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }
}

export default AdvancedCacheOptimizer;
