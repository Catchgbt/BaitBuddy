/// <reference types="vite/client" />

// Capacitor injiziert `window.Capacitor` zur Laufzeit ausschließlich in nativen
// Builds (iOS/Android). Global deklariert, damit der Typecheck der Web-Sources
// (z. B. src/utils/networkStatus.js) den optionalen Zugriff kennt.
declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: boolean | (() => boolean);
      [key: string]: unknown;
    };
  }
}

export {};
