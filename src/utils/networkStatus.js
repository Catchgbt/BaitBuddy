/**
 * Network Status Detection with Capacitor Support
 *
 * Provides reliable online/offline detection across all platforms via the
 * @capacitor/network plugin:
 * - Native Capacitor apps (iOS/Android): native connectivity APIs
 * - Web browsers: the plugin's web implementation wraps navigator.onLine
 *   plus the window 'online'/'offline' events
 *
 * navigator.onLine allein ist in nativen Capacitor-Containern unzuverlaessig
 * (bleibt haeufig auf true). Das Plugin kapselt die plattformspezifische
 * Erkennung korrekt, deshalb wird es hier ueberall genutzt.
 */

import { Network } from '@capacitor/network';

let currentStatus = null;
let listeners = [];
// Dedupliziert konkurrierende Initialisierungen: Auto-Init beim Modul-Load,
// initNetworkStatus() aus App.jsx und der erste onOnlineStatusChange-Aufruf
// koennen sonst parallel laufen und mehrfach Listener registrieren.
let initPromise = null;

function notifyListeners(status) {
  listeners.forEach((callback) => {
    try {
      callback(status);
    } catch (error) {
      console.error('[NetworkStatus] Listener error:', error);
    }
  });
}

function fallbackToNavigator() {
  currentStatus = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      if (currentStatus !== true) {
        currentStatus = true;
        notifyListeners(true);
      }
    });
    window.addEventListener('offline', () => {
      if (currentStatus !== false) {
        currentStatus = false;
        notifyListeners(false);
      }
    });
  }
}

async function doInitialize() {
  try {
    const status = await Network.getStatus();
    currentStatus = status.connected;

    Network.addListener('networkStatusChange', (status) => {
      const wasOnline = currentStatus;
      currentStatus = status.connected;
      if (wasOnline !== currentStatus) {
        notifyListeners(currentStatus);
      }
    });

    console.log('[NetworkStatus] Capacitor Network initialized');
  } catch (error) {
    // Sollte das Plugin (z. B. in einer Testumgebung) nicht verfuegbar sein,
    // auf die reine Browser-Erkennung zurueckfallen.
    console.warn('[NetworkStatus] Plugin unavailable, using navigator.onLine:', error);
    fallbackToNavigator();
  }
}

function initializeNetworkStatus() {
  if (!initPromise) {
    initPromise = doInitialize();
  }
  return initPromise;
}

/**
 * Get current online status (synchronous after initialization).
 * @returns {boolean} true if online, false if offline
 */
export function isOnline() {
  if (currentStatus !== null) {
    return currentStatus;
  }
  // Fallback falls die (asynchrone) Initialisierung noch nicht durch ist.
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Subscribe to online/offline status changes.
 * @param {(status: boolean) => void} callback
 * @returns {() => void} unsubscribe function
 */
export function onOnlineStatusChange(callback) {
  initializeNetworkStatus();
  listeners.push(callback);

  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

/**
 * Initialize network status on app startup.
 * Call this in App.jsx useEffect to ensure the plugin listener is registered.
 * @returns {Promise<void>}
 */
export async function initNetworkStatus() {
  return initializeNetworkStatus();
}

// Auto-initialize as soon as the module is loaded in a browser/native context.
if (typeof window !== 'undefined') {
  initializeNetworkStatus();
}
