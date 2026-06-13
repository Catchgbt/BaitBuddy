// Trip Synchronisation Service - Synct Offline-Daten mit Supabase
// Ermöglicht Offline-First Angeltour-Tracking mit Cloud-Backup

import { entities } from '../api/frontendClient';

class TripSyncService {
  constructor() {
    this.syncInProgress = false;
    this.lastSyncTime = null;
    this.syncQueue = [];
  }

  // Lade alle Offline-Touren
  async getOfflineTrips() {
    try {
      const db = await this.openIndexedDB();
      const tx = db.transaction('trips', 'readonly');
      const store = tx.objectStore('trips');

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Fehler beim Laden offline Touren:', error);
      return [];
    }
  }

  // Speichere Tour offline
  async saveTripOffline(trip) {
    try {
      // In localStorage für schnelle Zugriffle
      const trips = JSON.parse(localStorage.getItem('liveTrips') || '[]');
      trips.push({ ...trip, syncStatus: 'pending' });
      localStorage.setItem('liveTrips', JSON.stringify(trips));

      // Auch in IndexedDB für größere Daten
      const db = await this.openIndexedDB();
      const tx = db.transaction('trips', 'readwrite');
      tx.objectStore('trips').add({
        ...trip,
        syncStatus: 'pending',
        createdAt: new Date().toISOString(),
      });

      console.log(`Tour gespeichert (offline): ${trip.id}`);
      return trip;
    } catch (error) {
      console.error('Fehler beim Speichern der Tour:', error);
      throw error;
    }
  }

  // Synce Touren mit Cloud
  async syncTripsToCloud(authToken) {
    if (!navigator.onLine) {
      console.warn('Offline - Sync später versucht');
      return { synced: 0, failed: 0, queued: true };
    }

    if (this.syncInProgress) {
      console.warn('Sync läuft bereits');
      return { synced: 0, failed: 0, inProgress: true };
    }

    this.syncInProgress = true;

    try {
      const trips = await this.getOfflineTrips();
      const pendingTrips = trips.filter(t => t.syncStatus === 'pending');

      let synced = 0;
      let failed = 0;

      for (const trip of pendingTrips) {
        try {
          const result = await this.uploadTripToCloud(trip, authToken);
          if (result) {
            synced++;
            await this.markTripAsSynced(trip.id);
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`Fehler beim Syncing von Tour ${trip.id}:`, error);
          failed++;
        }
      }

      this.lastSyncTime = new Date();

      console.log(`Sync abgeschlossen: ${synced} erfolgreich, ${failed} fehlgeschlagen`);
      return { synced, failed, total: pendingTrips.length };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Lade einzelne Tour zu Cloud
  async uploadTripToCloud(trip, authToken) {
    try {
      // Nutze die entities API um Trip zu speichern
      if (entities && entities.LiveTrip) {
        const result = await entities.LiveTrip.create({
          id: trip.id,
          userId: trip.userId,
          startTime: trip.startTime,
          endTime: trip.endTime,
          route: JSON.stringify(trip.route),
          catches: JSON.stringify(trip.catches),
          stats: JSON.stringify(trip.stats),
          duration: trip.stats.durationSeconds,
          distance: parseFloat(trip.stats.distance),
          catchCount: trip.catches.length,
        });

        return result;
      } else {
        console.warn('LiveTrip Entity nicht verfügbar - fallback zu REST');
        const response = await fetch('/api/trips', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify(trip),
        });

        return response.ok;
      }
    } catch (error) {
      console.error('Fehler beim Upload zur Cloud:', error);
      return false;
    }
  }

  // Markiere Tour als synchronisiert
  async markTripAsSynced(tripId) {
    try {
      // LocalStorage Update
      const trips = JSON.parse(localStorage.getItem('liveTrips') || '[]');
      const trip = trips.find(t => t.id === tripId);
      if (trip) {
        trip.syncStatus = 'synced';
        trip.syncedAt = new Date().toISOString();
        localStorage.setItem('liveTrips', JSON.stringify(trips));
      }

      // IndexedDB Update
      const db = await this.openIndexedDB();
      const tx = db.transaction('trips', 'readwrite');
      const store = tx.objectStore('trips');
      const getRequest = store.get(tripId);

      getRequest.onsuccess = () => {
        const trip = getRequest.result;
        if (trip) {
          trip.syncStatus = 'synced';
          trip.syncedAt = new Date().toISOString();
          store.put(trip);
        }
      };

      return true;
    } catch (error) {
      console.error('Fehler beim Markieren der Tour:', error);
      return false;
    }
  }

  // Lösche lokale Tour (nach erfolgreicher Sync optional)
  async deleteLocalTrip(tripId) {
    try {
      // LocalStorage
      const trips = JSON.parse(localStorage.getItem('liveTrips') || '[]');
      const filtered = trips.filter(t => t.id !== tripId);
      localStorage.setItem('liveTrips', JSON.stringify(filtered));

      // IndexedDB
      const db = await this.openIndexedDB();
      const tx = db.transaction('trips', 'readwrite');
      tx.objectStore('trips').delete(tripId);

      return true;
    } catch (error) {
      console.error('Fehler beim Löschen der Tour:', error);
      return false;
    }
  }

  // Lade Touren von Cloud
  async loadTripsFromCloud(authToken) {
    try {
      if (entities && entities.LiveTrip) {
        const trips = await entities.LiveTrip.list();
        return trips;
      } else {
        const response = await fetch('/api/trips', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      }
    } catch (error) {
      console.error('Fehler beim Laden von Cloud-Touren:', error);
      return [];
    }
  }

  // Exportiere Trip-Daten (CSV/JSON)
  exportTripAsJSON(trip) {
    const dataStr = JSON.stringify(trip, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tour_${trip.id}.json`;
    link.click();
  }

  // Exportiere als CSV (einfache Fang-Daten)
  exportTripAsCSV(trip) {
    let csv = 'Zeit,Art,Gewicht(g),Länge(cm),Position Lat,Position Lon,Notizen\n';

    for (const catch_ of trip.catches) {
      const timestamp = new Date(catch_.timestamp).toLocaleString('de-DE');
      csv += `"${timestamp}","${catch_.species}","${catch_.weight || ''}","${catch_.length || ''}","${catch_.location.lat}","${catch_.location.lng}","${(catch_.notes || '').replace(/"/g, '""')}"\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tour_${trip.id}.csv`;
    link.click();
  }

  // Open IndexedDB
  openIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('BaitBuddy_LiveTrips', 1);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('trips')) {
          db.createObjectStore('trips', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Speicher-Statistiken
  async getStorageStats() {
    try {
      const trips = await this.getOfflineTrips();
      const totalTrips = trips.length;
      const pendingTrips = trips.filter(t => t.syncStatus === 'pending').length;
      const syncedTrips = trips.filter(t => t.syncStatus === 'synced').length;

      // Grobe Speicherschätzung
      const estimatedSize = JSON.stringify(trips).length / (1024 * 1024); // MB

      return {
        totalTrips,
        pendingTrips,
        syncedTrips,
        estimatedSizeMB: estimatedSize.toFixed(2),
      };
    } catch (error) {
      return {
        totalTrips: 0,
        pendingTrips: 0,
        syncedTrips: 0,
        estimatedSizeMB: '0',
      };
    }
  }

  // Nutzer-Info
  getSyncStatus() {
    return {
      syncing: this.syncInProgress,
      lastSync: this.lastSyncTime,
      online: navigator.onLine,
    };
  }
}

export default new TripSyncService();
