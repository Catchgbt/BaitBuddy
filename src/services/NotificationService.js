// Browser Push-Notifications Service
// Sendet Benachrichtigungen bei optimalen Angelbedingungen

import TideService from './TideService';
import SolunarService from './SolunarService';
import FishPredictionService from './FishPredictionService';
import { showSystemNotification } from '@/lib/systemNotification';

// Gültige Icon-/Badge-URLs (Notification-API ignoriert Emoji-Strings). Die
// echten PWA-Icons liegen unter public/icons/.
const NOTIFICATION_ICON = '/icons/icon-192.png';
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

class NotificationService {
  constructor() {
    this.enabled = false;
    this.checkInterval = null;
    this.monitorCoords = null;
    this._visibilityHandler = null;
    this.settings = {
      solunarThreshold: 70, // Nur Major Events ab diesem Score
      tideThreshold: 50, // Gezeitenhöhe-Schwelle
      predictionThreshold: 75, // KI-Score Schwelle
      notifySpecies: ['Hecht', 'Barsch', 'Forelle'], // Welche Arten notifications
      timeWindow: { start: 6, end: 22 }, // Nicht nachts notifizieren
      frequency: 'once-per-event', // 'once-per-event', 'hourly', 'daily'
    };
    this.lastNotifications = {};
  }

  // Frage um Notifications-Permission
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Browser unterstützt keine Notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.enabled = true;
      return true;
    }

    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        this.enabled = permission === 'granted';
        return this.enabled;
      } catch (error) {
        console.error('Fehler beim Anfordern von Notifications-Permission:', error);
        return false;
      }
    }

    return false;
  }

  // Laden von lokalen Einstellungen
  async loadSettings() {
    try {
      const saved = localStorage.getItem('notificationSettings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Fehler beim Laden der Benachrichtigungs-Einstellungen:', error);
    }
  }

  // Speichere Einstellungen
  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
  }

  // Starte kontinuierliche Überwachung
  startMonitoring(latitude, longitude) {
    if (!this.enabled) {
      console.warn('Notifications nicht aktiviert');
      return;
    }

    this.monitorCoords = { latitude, longitude };
    this._stopInterval();

    // Polling nur bei sichtbarer App: Im Hintergrund feuert der WebView-Timer
    // ohnehin nicht zuverlässig und die 5-Minuten-Prüfung (Tide/Solunar/
    // Prediction) würde nur Akku kosten. Bei Rückkehr in den Vordergrund
    // sofort wieder aufnehmen.
    if (typeof document !== 'undefined' && !this._visibilityHandler) {
      this._visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          this._startInterval();
        } else {
          this._stopInterval();
        }
      };
      document.addEventListener('visibilitychange', this._visibilityHandler);
    }

    this._startInterval();
  }

  _startInterval() {
    if (this.checkInterval || !this.monitorCoords) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const { latitude, longitude } = this.monitorCoords;
    this.checkInterval = setInterval(() => {
      this.checkConditions(latitude, longitude);
    }, CHECK_INTERVAL_MS);
    // Erste Prüfung sofort
    this.checkConditions(latitude, longitude);
  }

  _stopInterval() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Stoppe Überwachung
  stopMonitoring() {
    this._stopInterval();
    this.monitorCoords = null;
    if (this._visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
    }
    this._visibilityHandler = null;
  }

  // Überprüfe aktuelle Bedingungen
  async checkConditions(latitude, longitude) {
    try {
      const now = new Date();
      const hour = now.getHours();

      // Prüfe Zeitfenster
      if (hour < this.settings.timeWindow.start || hour >= this.settings.timeWindow.end) {
        return;
      }

      // Hole Daten
      const tideData = await TideService.getCurrentAndForecastTides(latitude, longitude);
      const solunarData = SolunarService.getDayForecast(latitude, longitude, now);
      const predictions = await FishPredictionService.predictFishActivity(latitude, longitude, now);

      // Prüfe Solunar-Trigger
      await this.checkSolunarTrigger(solunarData, now);

      // Prüfe Gezeitenänderung
      await this.checkTideTrigger(tideData, now);

      // Prüfe Top-Spezies
      await this.checkSpeciesTrigger(predictions, now);
    } catch (error) {
      console.error('Fehler bei Bedingungs-Prüfung:', error);
    }
  }

  // Prüfe Solunar-Bedingungen
  async checkSolunarTrigger(solunarData, date) {
    if (!solunarData) return;

    const { major } = solunarData;
    const notificationKey = `solunar_${date.toDateString()}_${major.hour}`;

    // Prüfe ob Major Period bald ansteht
    if (major.quality >= this.settings.solunarThreshold && major.quality >= 70) {
      const timeToEvent = major.quality >= 80 ? 30 : 60; // Minuten
      const nextEvent = SolunarService.getNextEvent(major, date.getHours() + date.getMinutes() / 60);

      if (nextEvent.totalMinutes <= timeToEvent && !this.lastNotifications[notificationKey]) {
        await this.sendNotification(
          'Optimale Solunar-Zeit!',
          `${major.description}\nIn ${nextEvent.hours}h ${String(nextEvent.minutes).padStart(2, '0')}m\nQualität: ${major.quality}%`,
          { tag: notificationKey }
        );

        this.lastNotifications[notificationKey] = date;
        this.cleanupOldNotifications();
      }
    }
  }

  // Prüfe Gezeitenbedingungen
  async checkTideTrigger(tideData, date) {
    if (!tideData || !tideData.current) return;

    const current = tideData.current;
    const notificationKey = `tide_${date.toDateString()}_${current.nextEvent}`;

    // Benachrichtige wenn Gezeitenwechsel ansteht
    if (current.timeToNext.totalMinutes <= 60 && current.timeToNext.totalMinutes > 0) {
      if (!this.lastNotifications[notificationKey]) {
        const recommendation = TideService.getTideRecommendation(current);

        await this.sendNotification(
          `${current.nextEvent} nähert sich!`,
          `${recommendation}\nIn ${current.timeToNext.hours}h ${String(current.timeToNext.minutes).padStart(2, '0')}m`,
          { tag: notificationKey }
        );

        this.lastNotifications[notificationKey] = date;
        this.cleanupOldNotifications();
      }
    }
  }

  // Prüfe Top-Spezies
  async checkSpeciesTrigger(predictions, date) {
    if (!predictions || !predictions.predictions) return;

    const topSpecies = Object.entries(predictions.predictions).slice(0, 3);

    for (const [species, data] of topSpecies) {
      // Nur für konfigurierte Arten
      if (!this.settings.notifySpecies.includes(species)) continue;

      // Nur bei sehr hohem Score
      if (data.score < this.settings.predictionThreshold) continue;

      const notificationKey = `prediction_${date.toDateString()}_${species}`;

      if (!this.lastNotifications[notificationKey]) {
        await this.sendNotification(
          `Beste Fangzeit für ${species}!`,
          `Vorhersage: ${data.score}% - ${data.recommendation}\nJetzt ist eine großartige Zeit!`,
          { tag: notificationKey }
        );

        this.lastNotifications[notificationKey] = date;
        this.cleanupOldNotifications();
      }
    }
  }

  // Sende System-Notification (Service Worker, wo verfügbar — Pflicht auf
  // Android und iOS, siehe src/lib/systemNotification.js)
  async sendNotification(title, body, options = {}) {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      const permission = Notification.permission;
      if (permission !== 'granted') {
        console.warn('Notifications nicht genehmigt');
        return;
      }

      return await showSystemNotification(title, {
        body,
        icon: NOTIFICATION_ICON,
        badge: NOTIFICATION_ICON,
        tag: options.tag || 'baitbuddy',
        requireInteraction: false,
        ...options,
        url: options.url || '/LiveTrip',
      });
    } catch (error) {
      console.error('Fehler beim Senden von Notification:', error);
    }
  }

  // Räume alte Notifications auf
  cleanupOldNotifications() {
    const dayAgo = new Date();
    dayAgo.setDate(dayAgo.getDate() - 1);

    for (const [key, date] of Object.entries(this.lastNotifications)) {
      if (date < dayAgo) {
        delete this.lastNotifications[key];
      }
    }
  }

  // Debug: Sende Test-Notification
  async sendTestNotification() {
    return this.sendNotification(
      'Test-Notification',
      'Dies ist eine Test-Benachrichtigung von BaitBuddy!',
      { tag: 'test_notification' }
    );
  }

  // Gebe Status
  getStatus() {
    return {
      enabled: this.enabled,
      permission: Notification.permission,
      monitoring: !!this.checkInterval,
      settings: this.settings,
    };
  }
}

export default new NotificationService();
