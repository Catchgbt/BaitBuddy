import { base44 } from "@/api/base44Client";

/**
 * Play Integrity Helper
 *
 * Verbindet das Web-Frontend mit der nativen Android-Bridge (window.AndroidIntegrity)
 * und verifiziert den erhaltenen Token serverseitig ueber die Backend-Funktion
 * verifyPlayIntegrity.
 *
 * Wenn die App nicht in der nativen Android-Huelle laeuft (z.B. im Browser),
 * gibt isNativeAndroid() false zurueck und checkIntegrity() liefert
 * { available: false }.
 */

// Eindeutige Callback-ID generieren
function generateCallbackId() {
  return `cb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Random Nonce generieren (Base64URL, mind. 16 Zeichen)
function generateNonce() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Prueft, ob die native Android-Bridge verfuegbar ist.
 */
export function isNativeAndroid() {
  return typeof window !== 'undefined' &&
    window.AndroidIntegrity &&
    typeof window.AndroidIntegrity.requestToken === 'function';
}

/**
 * Holt einen Integrity-Token von der nativen Android-Schicht.
 * @returns {Promise<string>} Der verschluesselte Integrity-Token
 */
function requestNativeToken(nonce) {
  return new Promise((resolve, reject) => {
    if (!isNativeAndroid()) {
      reject(new Error('Native Android Bridge nicht verfuegbar'));
      return;
    }

    const callbackId = generateCallbackId();

    if (!window.__integrityCallbacks) {
      window.__integrityCallbacks = {};
    }

    const timeout = setTimeout(() => {
      delete window.__integrityCallbacks[callbackId];
      reject(new Error('Integrity-Token Anfrage Timeout'));
    }, 30000);

    window.__integrityCallbacks[callbackId] = (token, error) => {
      clearTimeout(timeout);
      if (error) {
        reject(new Error(error));
      } else {
        resolve(token);
      }
    };

    try {
      window.AndroidIntegrity.requestToken(nonce, callbackId);
    } catch (e) {
      clearTimeout(timeout);
      delete window.__integrityCallbacks[callbackId];
      reject(e);
    }
  });
}

/**
 * Fuehrt den vollstaendigen Integrity-Check durch:
 * 1. Holt Token von der nativen Schicht
 * 2. Schickt ihn an das Backend zur Verifizierung
 *
 * @param {string} packageName - Der Package-Name der Android-App (z.B. "com.catchly.app")
 * @returns {Promise<{available: boolean, trusted?: boolean, verdict?: object, error?: string}>}
 */
export async function checkIntegrity(packageName) {
  if (!isNativeAndroid()) {
    return { available: false };
  }

  try {
    const nonce = generateNonce();
    const integrityToken = await requestNativeToken(nonce);

    const { data } = await base44.functions.invoke('verifyPlayIntegrity', {
      integrityToken,
      packageName,
    });

    return {
      available: true,
      trusted: data.trusted,
      verdict: data.verdict,
    };
  } catch (error) {
    return {
      available: true,
      trusted: false,
      error: error.message,
    };
  }
}