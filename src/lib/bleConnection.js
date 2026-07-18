// Robuste Verbindungs-Helfer für Web-Bluetooth-Geräte im Device Hub.
//
// Ziel: Geräteverbindungen stabil und zuverlässig machen. BLE-Verbindungen
// brechen im Feld regelmäßig ab (Reichweite, Funkstörung, Energiesparmodus des
// Sensors). Diese reinen Helfer kapseln Zeitlimit- und Wiederverbindungs-Logik,
// damit sie ohne WebGL/GATT unit-testbar bleibt (vgl. lureAnimator.js-Muster).

// Standard-Zeitlimit für einen einzelnen Verbindungsaufbau (gatt.connect +
// Service-Discovery). Ohne Limit kann gatt.connect() im WebView unendlich hängen.
export const CONNECT_TIMEOUT_MS = 15000;

// Wiederverbindungs-Parameter (Exponential-Backoff mit Deckelung + Jitter).
export const RECONNECT_MAX_ATTEMPTS = 5;
export const RECONNECT_BASE_DELAY_MS = 1000;
export const RECONNECT_MAX_DELAY_MS = 30000;

/**
 * Berechnet die Wartezeit vor dem nächsten Wiederverbindungsversuch.
 * Exponentielles Backoff (base * 2^(attempt-1)), gedeckelt auf max, mit
 * "Full Jitter", um Verbindungs-Sturm bei mehreren Geräten zu vermeiden.
 *
 * @param {number} attempt 1-basierter Versuchszähler.
 * @param {object} [opts]
 * @param {number} [opts.base]   Basis-Delay in ms.
 * @param {number} [opts.max]    Obergrenze in ms.
 * @param {boolean} [opts.jitter] Jitter an/aus (für deterministische Tests aus).
 * @param {() => number} [opts.random] Zufallsquelle (injizierbar für Tests).
 * @returns {number} Delay in ms (ganzzahlig).
 */
export function computeBackoffDelay(
  attempt,
  { base = RECONNECT_BASE_DELAY_MS, max = RECONNECT_MAX_DELAY_MS, jitter = true, random = Math.random } = {}
) {
  const safeAttempt = Math.max(1, Math.floor(attempt));
  const exponential = Math.min(max, base * 2 ** (safeAttempt - 1));
  if (!jitter) return exponential;
  // Full Jitter: zufällig zwischen base und dem exponentiellen Wert.
  const span = Math.max(0, exponential - base);
  return Math.round(base + random() * span);
}

/**
 * Umhüllt ein Promise mit einem Zeitlimit. Läuft das Original nicht rechtzeitig
 * durch, wird mit einem sprechenden Fehler abgelehnt. Der Timer wird in jedem
 * Fall aufgeräumt.
 *
 * @template T
 * @param {Promise<T>} promise Das zu überwachende Promise.
 * @param {number} ms Zeitlimit in Millisekunden.
 * @param {string} [label] Beschriftung für die Fehlermeldung.
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms, label = 'Vorgang') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} hat das Zeitlimit (${ms} ms) überschritten`));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Führt `fn` aus und wiederholt bei Fehler mit Backoff. Bricht sauber ab, wenn
 * `shouldCancel()` true liefert (z. B. manuelles Trennen oder Unmount).
 *
 * @template T
 * @param {(attempt: number) => Promise<T>} fn Auszuführende, evtl. scheiternde Aktion.
 * @param {object} [opts]
 * @param {number} [opts.maxAttempts]
 * @param {number} [opts.base]
 * @param {number} [opts.max]
 * @param {() => boolean} [opts.shouldCancel] Abbruchbedingung (vor jedem Versuch/Delay geprüft).
 * @param {(attempt: number, delay: number, error: Error) => void} [opts.onRetry] Hook vor dem Warten.
 * @param {(ms: number) => Promise<void>} [opts.sleep] Wartefunktion (injizierbar für Tests).
 * @param {() => number} [opts.random] Zufallsquelle für Jitter.
 * @returns {Promise<T>}
 */
export async function retryWithBackoff(
  fn,
  {
    maxAttempts = RECONNECT_MAX_ATTEMPTS,
    base = RECONNECT_BASE_DELAY_MS,
    max = RECONNECT_MAX_DELAY_MS,
    shouldCancel = () => false,
    onRetry = () => {},
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    random = Math.random,
  } = {}
) {
  let lastError = new Error('retryWithBackoff: keine Versuche ausgeführt');
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (shouldCancel()) {
      throw new Error('cancelled');
    }
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || shouldCancel()) {
        break;
      }
      const delay = computeBackoffDelay(attempt, { base, max, random });
      onRetry(attempt, delay, error);
      await sleep(delay);
    }
  }
  throw lastError;
}
