// Audio-Autoplay-Entsperrung.
//
// Browser und der Capacitor-WebView blockieren Audio-/Sprachausgabe, solange der
// Nutzer die Seite noch nicht per Geste berührt hat (Autoplay-Policy). Die
// Start-Begrüßung des KI-Buddys läuft aber genau in diesem Moment — deshalb
// bliebe sie stumm. Dieser Helper merkt sich, ob es seit dem Laden schon eine
// echte Nutzer-Geste gab, und führt Audio-Aktionen entweder sofort (Geste war
// schon) oder beim allerersten Antippen aus.

let hasGesture = false;
const pending = [];
let listenersAttached = false;

// Ein Tap/Klick/Tastendruck genügt als Entsperr-Geste. `pointerdown` deckt Maus
// und Touch modern ab; `touchend`/`click`/`keydown` als Fallback für ältere
// WebViews. Einmalig registriert, self-removing nach der ersten Geste.
const GESTURE_EVENTS = ['pointerdown', 'touchend', 'click', 'keydown'];

function onFirstGesture() {
  if (hasGesture) return;
  hasGesture = true;
  detachListeners();
  // Kopie abarbeiten und Queue leeren, damit während des Abspielens neu
  // eingereihte Callbacks nicht verloren gehen.
  const queued = pending.splice(0, pending.length);
  for (const fn of queued) {
    try { fn(); } catch { /* einzelne Fehler dürfen die anderen nicht stoppen */ }
  }
}

function detachListeners() {
  if (!listenersAttached || typeof window === 'undefined') return;
  for (const ev of GESTURE_EVENTS) {
    window.removeEventListener(ev, onFirstGesture, true);
  }
  listenersAttached = false;
}

function attachListeners() {
  if (listenersAttached || hasGesture || typeof window === 'undefined') return;
  for (const ev of GESTURE_EVENTS) {
    // capture: true, damit die Geste auch dann zählt, wenn ein Kind-Handler
    // stopPropagation aufruft.
    window.addEventListener(ev, onFirstGesture, true);
  }
  listenersAttached = true;
}

// Bei Modul-Import direkt lauschen, damit die erste Geste garantiert erfasst
// wird — auch wenn noch niemand runWhenAudioReady aufgerufen hat.
attachListeners();

/**
 * Führt `fn` aus, sobald Audio abgespielt werden darf: sofort, wenn es seit dem
 * Laden schon eine Nutzer-Geste gab, sonst beim ersten Antippen.
 * @param {() => void} fn
 */
export function runWhenAudioReady(fn) {
  if (typeof fn !== 'function') return;
  if (hasGesture) {
    fn();
    return;
  }
  pending.push(fn);
  attachListeners();
}

/** True, wenn Audio bereits ohne weitere Geste abgespielt werden darf. */
export function isAudioReady() {
  return hasGesture;
}

// Nur für Tests: Zustand zurücksetzen.
export function __resetAudioUnlock() {
  hasGesture = false;
  pending.length = 0;
  detachListeners();
  attachListeners();
}
