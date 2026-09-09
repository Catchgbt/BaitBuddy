// Robust error recovery for Stripe checkout activations
// Tracks retry attempts, logs failures, and enforces max-retry limits
// to prevent stuck pending checkouts from silently accumulating

const PENDING_CHECKOUT_KEY = 'bb_pending_checkout';
const CHECKOUT_RETRY_HISTORY_KEY = 'bb_checkout_retry_history';
const MAX_RETRIES_PER_CHECKOUT = 5;
const MAX_RETRY_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 Tage
const RETRY_DELAY_MS = 1000; // Basis-Verzögerung für exponential backoff

export class PendingCheckoutManager {
  static read() {
    try {
      const raw = localStorage.getItem(PENDING_CHECKOUT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.planId || !parsed?.sessionId) return null;
      if (Date.now() - (parsed.createdAt || 0) > MAX_RETRY_AGE_MS) {
        this.clear();
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  static write(planId, sessionId) {
    try {
      localStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify({
        planId,
        sessionId,
        createdAt: Date.now(),
        firstAttemptAt: Date.now(),
      }));
      // Reset retry history when creating a new pending checkout
      this._clearRetryHistory();
    } catch {
      // Ohne localStorage bleibt nur der direkte Versuch
    }
  }

  static clear() {
    try {
      localStorage.removeItem(PENDING_CHECKOUT_KEY);
      this._clearRetryHistory();
    } catch {
      // ignore
    }
  }

  static recordRetryAttempt(error) {
    try {
      const history = this._getRetryHistory();
      history.push({
        timestamp: Date.now(),
        errorStatus: error?.status,
        errorMessage: error?.message || String(error),
      });

      // Keep last 10 retry attempts max
      if (history.length > 10) {
        history.shift();
      }

      localStorage.setItem(CHECKOUT_RETRY_HISTORY_KEY, JSON.stringify(history));
      return history.length;
    } catch {
      return 0;
    }
  }

  static getRetryCount() {
    return this._getRetryHistory().length;
  }

  static isMaxRetriesExceeded() {
    return this.getRetryCount() >= MAX_RETRIES_PER_CHECKOUT;
  }

  static getRetryHistory() {
    return this._getRetryHistory();
  }

  static _getRetryHistory() {
    try {
      const raw = localStorage.getItem(CHECKOUT_RETRY_HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static _clearRetryHistory() {
    try {
      localStorage.removeItem(CHECKOUT_RETRY_HISTORY_KEY);
    } catch {
      // ignore
    }
  }

  static getLastRetryError() {
    const history = this._getRetryHistory();
    return history.length > 0 ? history[history.length - 1] : null;
  }

  static getBackoffDelayMs() {
    const retryCount = this.getRetryCount();
    if (retryCount === 0) return 0;
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s (capped)
    const exponential = RETRY_DELAY_MS * Math.pow(2, retryCount - 1);
    const capped = Math.min(exponential, 30000); // Max 30s
    // Add jitter (±10%)
    const jitter = capped * (0.9 + Math.random() * 0.2);
    return Math.round(jitter);
  }
}

/**
 * Ermittelt, ob ein Aktivierungsfehler permanent ist (Fehler sollte nicht erneut
 * versucht werden: Zahlung gehört zu anderem Plan/Konto) oder temporär
 * (Netzwerk, Server kurz weg).
 */
export function isPermanentActivationError(error) {
  // 400/403 = Validation/Permission Error (permanent)
  // 402 = Payment not verified (can be retried if payment eventually succeeds)
  // 5xx = Server error (temporary, retry later)
  // Network errors = temporary (retry)
  return error?.status === 400 || error?.status === 403;
}

/**
 * Protokolliert einen fehlgeschlagenen Checkout-Aktivierungsversuch für
 * Debugging und Monitoring.
 */
export function logCheckoutError(error, context = {}) {
  const checkout = PendingCheckoutManager.read();
  const retryCount = PendingCheckoutManager.getRetryCount();
  const isPermanent = isPermanentActivationError(error);

  const logEntry = {
    timestamp: new Date().toISOString(),
    checkout: {
      planId: checkout?.planId,
      sessionId: checkout?.sessionId,
      createdAt: checkout?.createdAt ? new Date(checkout.createdAt).toISOString() : null,
    },
    error: {
      status: error?.status,
      message: error?.message,
      isPermanent,
    },
    retryCount,
    context,
  };

  console.error('[PendingCheckout] Activation failed:', logEntry);

  // In production, could send to error tracking service
  if (window.sentryClient) {
    window.sentryClient.captureException(error, {
      contexts: { checkout_recovery: logEntry },
    });
  }
}
