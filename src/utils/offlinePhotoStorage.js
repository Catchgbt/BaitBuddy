/**
 * Offline Photo Storage System
 * Speichert Fotos in IndexedDB wenn offline, für späteren Upload
 */

const DB_NAME = 'baitbuddy_offline_photos';
const STORE_NAME = 'photos';
const DB_VERSION = 1;

let db = null;

/**
 * Initialisiert die IndexedDB für Foto-Speicherung
 */
async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB öffnen fehlgeschlagen:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = /** @type {IDBOpenDBRequest} */ (event.target).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('catchId', 'catchId', { unique: false });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Speichert ein Foto offline
 * @param {File} file - Die Bilddatei
 * @param {string} catchId - Die ID des zugehörigen Fangs (optional)
 * @returns {Promise<number>} Die ID des gespeicherten Fotos
 */
export async function saveOfflinePhoto(file, catchId = null) {
  try {
    await initDB();

    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async (e) => {
        try {
          const photoData = {
            fileName: file.name,
            mimeType: file.type,
            fileData: /** @type {FileReader} */ (e.target).result,
            catchId,
            synced: false,
            createdAt: new Date().toISOString(),
            lastSyncAttempt: null,
            syncError: null,
          };

          const transaction = db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.add(photoData);

          request.onsuccess = () => {
            console.log('Foto offline gespeichert:', request.result);
            resolve(request.result);
          };

          request.onerror = () => {
            reject(request.error);
          };
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => {
        reject(new Error('Fehler beim Lesen der Datei'));
      };

      reader.readAsArrayBuffer(file);
    });
  } catch (e) {
    console.error('Fehler beim Speichern des Offline-Fotos:', e);
    throw e;
  }
}

/**
 * Gibt alle ungesyncten Fotos zurück
 */
export async function getUnsyncdOfflinePhotos() {
  try {
    await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      // Nicht über den 'synced'-Index abfragen: `synced` wird als Boolean
      // gespeichert, und Booleans sind keine gültigen IndexedDB-Schlüssel — solche
      // Datensätze landen gar nicht im Index, `index.getAll(false)` lieferte daher
      // immer []. Alle laden und in JS filtern (wie getOfflinePhotoStats).
      const request = store.getAll();

      request.onsuccess = () => {
        resolve((request.result || []).filter((p) => !p.synced));
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (e) {
    console.error('Fehler beim Abrufen ungesyncter Fotos:', e);
    return [];
  }
}

/**
 * Gibt ein spezifisches Foto zurück
 */
export async function getOfflinePhoto(photoId) {
  try {
    await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(photoId);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (e) {
    console.error('Fehler beim Abrufen des Fotos:', e);
    return null;
  }
}

/**
 * Markiert ein Foto als synchronisiert
 */
export async function markPhotoAsSynced(photoId) {
  try {
    await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(photoId);

      getRequest.onsuccess = () => {
        const photo = getRequest.result;
        if (photo) {
          photo.synced = true;
          photo.lastSyncAttempt = new Date().toISOString();
          photo.syncError = null;

          const updateRequest = store.put(photo);
          updateRequest.onsuccess = () => {
            resolve(photo);
          };
          updateRequest.onerror = () => {
            reject(updateRequest.error);
          };
        } else {
          reject(new Error('Foto nicht gefunden'));
        }
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  } catch (e) {
    console.error('Fehler beim Markieren als synchronisiert:', e);
    throw e;
  }
}

/**
 * Speichert einen Sync-Fehler für ein Foto
 */
export async function markPhotoSyncError(photoId, error) {
  try {
    await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(photoId);

      getRequest.onsuccess = () => {
        const photo = getRequest.result;
        if (photo) {
          photo.lastSyncAttempt = new Date().toISOString();
          photo.syncError = error;

          const updateRequest = store.put(photo);
          updateRequest.onsuccess = () => {
            resolve(photo);
          };
          updateRequest.onerror = () => {
            reject(updateRequest.error);
          };
        } else {
          reject(new Error('Foto nicht gefunden'));
        }
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  } catch (e) {
    console.error('Fehler beim Speichern des Sync-Fehlers:', e);
    throw e;
  }
}

/**
 * Löscht ein Foto aus der lokalen Speicherung
 */
export async function deleteOfflinePhoto(photoId) {
  try {
    await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(photoId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (e) {
    console.error('Fehler beim Löschen des Fotos:', e);
    throw e;
  }
}

/**
 * Gibt Statistik über offline Fotos zurück
 */
export async function getOfflinePhotoStats() {
  try {
    await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const all = request.result;
        const synced = all.filter(p => p.synced).length;
        const unsynced = all.filter(p => !p.synced).length;
        const withErrors = all.filter(p => p.syncError).length;

        resolve({
          total: all.length,
          synced,
          unsynced,
          withErrors,
          totalSize: all.reduce((sum, p) => sum + (p.fileData?.byteLength || 0), 0),
        });
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (e) {
    console.error('Fehler beim Abrufen der Statistiken:', e);
    return {
      total: 0,
      synced: 0,
      unsynced: 0,
      withErrors: 0,
      totalSize: 0,
    };
  }
}

/**
 * Löscht alle gelöschten Fotos aus der DB (Cleanup)
 */
export async function cleanupSyncedPhotos() {
  try {
    await initDB();

    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    // Boolean-Werte stehen nicht im 'synced'-Index (siehe getUnsyncdOfflinePhotos);
    // daher alle Datensätze laden und die bereits gesyncten in JS herausfiltern.
    const request = store.getAll();

    request.onsuccess = () => {
      const synced = (request.result || []).filter((p) => p.synced);
      for (const photo of synced) {
        store.delete(photo.id);
      }
    };

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  } catch (e) {
    console.error('Fehler beim Cleanup:', e);
  }
}
