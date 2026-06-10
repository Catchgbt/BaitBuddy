// src/lib/native.js
// Native-Integrations-Schicht für die Capacitor-App (Android/iOS).
// Im Web-Browser sind alle Funktionen no-ops bzw. liefern sinnvolle Fallbacks,
// sodass derselbe Code in Web + App läuft.

import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'

// ── App-Start: Splash, Status-Bar, Back-Button ──────────────────────────────
export async function initNative() {
  if (!isNative) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0b1220' });
  } catch (e) { /* StatusBar optional */ }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch (e) { /* SplashScreen optional */ }

  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else App.exitApp();
    });
  } catch (e) { /* App-Plugin optional */ }
}

// ── Kamera / Fotos (Fang-Fotos) ──────────────────────────────────────────────
// Liefert ein Data-URL-Bild zurück. Im Web öffnet der Aufrufer weiterhin <input type=file>.
export async function takePhoto({ source = 'prompt' } = {}) {
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
  const sourceMap = {
    camera: CameraSource.Camera,
    photos: CameraSource.Photos,
    prompt: CameraSource.Prompt,
  };
  const photo = await Camera.getPhoto({
    quality: 80,
    allowEditing: false,
    resultType: CameraResultType.DataUrl,
    source: sourceMap[source] ?? CameraSource.Prompt,
  });
  return photo.dataUrl; // "data:image/jpeg;base64,..."
}

// ── Standort (Spots & Karte) ─────────────────────────────────────────────────
export async function getCurrentPosition() {
  if (!isNative && 'geolocation' in navigator) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
        reject,
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }
  const { Geolocation } = await import('@capacitor/geolocation');
  const perm = await Geolocation.checkPermissions();
  if (perm.location !== 'granted') await Geolocation.requestPermissions();
  const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
}

// ── Offline-Speicher (Key/Value) ─────────────────────────────────────────────
// Fällt im Web auf localStorage zurück.
export const storage = {
  async set(key, value) {
    const val = typeof value === 'string' ? value : JSON.stringify(value);
    if (!isNative) { localStorage.setItem(key, val); return; }
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key, value: val });
  },
  async get(key) {
    if (!isNative) return localStorage.getItem(key);
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key });
    return value;
  },
  async getJSON(key) {
    const raw = await this.get(key);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  async remove(key) {
    if (!isNative) { localStorage.removeItem(key); return; }
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.remove({ key });
  },
};

// ── Netzwerk-Status (Offline-Erkennung) ──────────────────────────────────────
export async function onNetworkChange(cb) {
  if (!isNative) {
    const handler = () => cb({ connected: navigator.onLine });
    window.addEventListener('online', handler);
    window.addEventListener('offline', handler);
    handler();
    return () => {
      window.removeEventListener('online', handler);
      window.removeEventListener('offline', handler);
    };
  }
  const { Network } = await import('@capacitor/network');
  const status = await Network.getStatus();
  cb({ connected: status.connected });
  const sub = await Network.addListener('networkStatusChange', (s) => cb({ connected: s.connected }));
  return () => sub.remove();
}

// ── Push-Notifications (FCM) ─────────────────────────────────────────────────
// Benötigt eine konfigurierte google-services.json (Firebase) im Android-Projekt.
// Ohne diese Datei schlägt die Registrierung zur Laufzeit fehl — die App läuft trotzdem.
export async function initPushNotifications({ onToken, onNotification } = {}) {
  if (!isNative) return;
  const { PushNotifications } = await import('@capacitor/push-notifications');

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt') perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') return;

  await PushNotifications.register();
  PushNotifications.addListener('registration', (token) => onToken?.(token.value));
  PushNotifications.addListener('registrationError', (err) =>
    console.warn('[push] registrationError (google-services.json fehlt?)', err));
  PushNotifications.addListener('pushNotificationReceived', (n) => onNotification?.(n));
  PushNotifications.addListener('pushNotificationActionPerformed', (n) => onNotification?.(n.notification));
}

// ── Haptisches Feedback ───────────────────────────────────────────────────────
export async function haptic(style = 'medium') {
  if (!isNative) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: map[style] ?? ImpactStyle.Medium });
  } catch (e) { /* optional */ }
}

// ── Teilen ────────────────────────────────────────────────────────────────────
export async function share({ title, text, url } = {}) {
  if (!isNative) {
    if (navigator.share) return navigator.share({ title, text, url });
    return;
  }
  const { Share } = await import('@capacitor/share');
  await Share.share({ title, text, url, dialogTitle: title });
}
