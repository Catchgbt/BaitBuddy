/**
 * Network Status Detection with Capacitor Support
 *
 * Provides reliable online/offline detection for:
 * - Native Capacitor apps (iOS/Android) via @capacitor/network
 * - Web browsers (fallback to navigator.onLine)
 *
 * This fixes unreliable navigator.onLine behavior in Capacitor apps.
 */

import { Network } from '@capacitor/network';

let currentStatus = null;
let listeners = [];
let isInitialized = false;
let isMobileApp = false;

async function initializeNetworkStatus() {
  if (isInitialized) return;

  try {
    // Check if running in Capacitor context
    isMobileApp = !!(window.Capacitor && window.Capacitor.isNativePlatform);

    if (isMobileApp) {
      // Use Capacitor Network API for native apps
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
    } else {
      // Fallback: Browser-based detection
      currentStatus = navigator.onLine;

      const handleOnline = () => {
        if (currentStatus !== true) {
          currentStatus = true;
          notifyListeners(true);
        }
      };

      const handleOffline = () => {
        if (currentStatus !== false) {
          currentStatus = false;
          notifyListeners(false);
        }
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      console.log('[NetworkStatus] Browser navigator.onLine initialized');
    }

    isInitialized = true;
  } catch (error) {
    console.warn('[NetworkStatus] Initialization failed, using fallback:', error);
    currentStatus = navigator.onLine;
    isInitialized = true;
  }
}

function notifyListeners(status) {
  listeners.forEach(callback => {
    try {
      callback(status);
    } catch (error) {
      console.error('[NetworkStatus] Listener error:', error);
    }
  });
}

/**
 * Get current online status (synchronous after initialization)
 * After initNetworkStatus() is called, this returns immediately
 * @returns {boolean} true if online, false if offline
 */
export function isOnline() {
  if (currentStatus !== null) {
    return currentStatus;
  }
  // Fallback if not yet initialized
  return navigator.onLine;
}

/**
 * Get current online status synchronously (alias for isOnline for clarity)
 * @returns {boolean} true if online, false if offline
 */
export function isOnlineSync() {
  return isOnline();
}

/**
 * Subscribe to online/offline status changes
 * @param {(status: boolean) => void} callback
 * @returns {() => void} unsubscribe function
 */
export function onOnlineStatusChange(callback) {
  if (!isInitialized) {
    initializeNetworkStatus().catch(error => {
      console.error('[NetworkStatus] Failed to initialize:', error);
    });
  }

  listeners.push(callback);

  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

/**
 * Initialize network status on app startup
 * Call this in App.jsx useEffect to ensure proper initialization
 */
export async function initNetworkStatus() {
  return initializeNetworkStatus();
}

// Auto-initialize when module is loaded in browser
if (typeof window !== 'undefined' && !isMobileApp) {
  initializeNetworkStatus().catch(error => {
    console.warn('[NetworkStatus] Auto-init failed:', error);
  });
}
