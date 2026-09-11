import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';

// Node 26 kann JSDOM ohne konfigurierten localStorage-Dateipfad starten.
// Die Tests benötigen nur die Web-Storage-Oberfläche; stelle sie in diesem
// Fall lokal bereit, damit jeder Test isoliert zurückgesetzt werden kann.
function installStorage(name) {
  if (globalThis[name] && typeof globalThis[name].clear === 'function') return;
  const values = new Map();
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: {
      getItem: key => values.has(String(key)) ? values.get(String(key)) : null,
      setItem: (key, value) => values.set(String(key), String(value)),
      removeItem: key => values.delete(String(key)),
      clear: () => values.clear(),
      key: index => Array.from(values.keys())[index] ?? null,
      get length() { return values.size; },
    },
  });
}

installStorage('localStorage');
installStorage('sessionStorage');

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});
