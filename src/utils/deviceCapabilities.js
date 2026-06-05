/**
 * Device Capabilities Detection
 * 
 * Detects mobile device capabilities and optimizes experience accordingly.
 */

export const DeviceCapabilities = {
  // Touch detection
  isTouchDevice: () => {
    return (
      (typeof window !== 'undefined') &&
      (window.matchMedia('(pointer:coarse)').matches ||
       window.matchMedia('(hover:none)').matches ||
       'ontouchstart' in window)
    );
  },

  // Screen size detection
  isSmallScreen: () => window.innerWidth < 768,
  isMediumScreen: () => window.innerWidth >= 768 && window.innerWidth < 1024,
  isLargeScreen: () => window.innerWidth >= 1024,

  // Device type detection
  getDeviceType: () => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
    if (/windows phone/i.test(ua)) return 'windows-phone';
    return 'unknown';
  },

  // OS detection
  getOS: () => {
    const ua = navigator.userAgent;
    if (ua.indexOf('Win') > -1) return 'Windows';
    if (ua.indexOf('Mac') > -1) return 'MacOS';
    if (ua.indexOf('Linux') > -1) return 'Linux';
    if (ua.indexOf('Android') > -1) return 'Android';
    if (ua.indexOf('like Mac') > -1) return 'iOS';
    return 'Unknown';
  },

  // Browser detection
  getBrowser: () => {
    const ua = navigator.userAgent;
    if (ua.indexOf('Chrome') > -1) return 'Chrome';
    if (ua.indexOf('Safari') > -1) return 'Safari';
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('Edge') > -1) return 'Edge';
    return 'Unknown';
  },

  // Connection detection
  getConnectionType: () => {
    if (!navigator.connection) return 'unknown';
    return navigator.connection.effectiveType; // 4g, 3g, 2g, slow-2g
  },

  isOnline: () => navigator.onLine,

  // Memory detection
  getMemoryStatus: () => {
    if (!navigator.deviceMemory) return 'unknown';
    return `${navigator.deviceMemory}GB`;
  },

  // CPU cores detection
  getCPUCount: () => {
    return navigator.hardwareConcurrency || 'unknown';
  },

  // Screen info
  getScreenInfo: () => ({
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: window.devicePixelRatio,
    orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
  }),

  // Battery status
  async getBatteryStatus() {
    if (!navigator.getBattery) return null;
    try {
      return await navigator.getBattery();
    } catch (e) {
      return null;
    }
  },

  // Vibration support
  supportsVibration: () => !!navigator.vibrate,

  // Haptic feedback support
  supportsHaptics: () => {
    return 'vibrate' in navigator || 'webkitVibrate' in navigator;
  },

  // Geolocation support
  supportsGeolocation: () => !!navigator.geolocation,

  // Service Worker support
  supportsServiceWorker: () => 'serviceWorker' in navigator,

  // Local Storage support
  supportsLocalStorage: () => {
    try {
      const test = '__localStorage_test__';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  },

  // IndexedDB support
  supportsIndexedDB: () => !!window.indexedDB,

  // Web Workers support
  supportsWebWorkers: () => typeof Worker !== 'undefined',

  // Get full device info
  getFullInfo: () => ({
    touch: DeviceCapabilities.isTouchDevice(),
    deviceType: DeviceCapabilities.getDeviceType(),
    os: DeviceCapabilities.getOS(),
    browser: DeviceCapabilities.getBrowser(),
    screen: DeviceCapabilities.getScreenInfo(),
    connection: DeviceCapabilities.getConnectionType(),
    isOnline: DeviceCapabilities.isOnline(),
    memory: DeviceCapabilities.getMemoryStatus(),
    cpuCores: DeviceCapabilities.getCPUCount(),
    vibration: DeviceCapabilities.supportsVibration(),
    haptics: DeviceCapabilities.supportsHaptics(),
    geolocation: DeviceCapabilities.supportsGeolocation(),
    serviceWorker: DeviceCapabilities.supportsServiceWorker(),
    localStorage: DeviceCapabilities.supportsLocalStorage(),
    indexedDB: DeviceCapabilities.supportsIndexedDB(),
    webWorkers: DeviceCapabilities.supportsWebWorkers(),
  }),

  // Log to console
  logInfo: () => {
    console.group('Device Capabilities');
    console.table(DeviceCapabilities.getFullInfo());
    console.groupEnd();
  },
};

// Auto-log in development
if (import.meta.env.DEV) {
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      // Available in console
      window.deviceCapabilities = DeviceCapabilities;
    });
  }
}