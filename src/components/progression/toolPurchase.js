// Sofortfreischaltung eines Tools (0,99 €).
// =============================================================================
// Zwei Wege, abhängig von der Laufzeitumgebung:
//
//   * Android-App (Capacitor-WebView mit `window.AndroidBilling`): Google-Play-
//     Einmalprodukt. Google Play verlangt für digitale Güter die eigene
//     Abrechnung — ein Stripe-Checkout in der App wäre ein Richtlinienverstoß.
//   * Web/PWA: Stripe-Checkout-Session, Rücksprung auf /Tools.
//
// In beiden Fällen entscheidet der Server: erst nach verifizierter Zahlung
// trägt POST /api/progression/tools/purchase die Freischaltung ein.

import { progression as progressionApi } from '@/api/frontendClient';
import { isGooglePlayBillingAvailable } from '@/components/premium/googlePlayBilling';
import { googlePlayProductIdForTool } from '@shared/toolUnlocks';

// Google Play meldet sich per window-Event zurück; ohne Rückmeldung gilt der
// Kauf nach 5 Minuten als offen (gleiche Frist wie beim Plan-Kauf).
const PLAY_CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;

export { isGooglePlayBillingAvailable };

// In der gepackten Android-App (Capacitor-WebView) verlangt die Play-Richtlinie
// die Google-Play-Abrechnung für digitale Güter. Fehlt dort die Billing-Bridge,
// darf KEIN Stripe-Checkout angeboten werden — dann bleibt nur der kostenlose
// Level-Weg.
export function isCapacitorNative() {
  if (typeof window === 'undefined') return false;
  const cap = window.Capacitor;
  if (!cap) return false;
  if (typeof cap.isNativePlatform === 'function') return cap.isNativePlatform();
  if (typeof cap.isNativePlatform === 'boolean') return cap.isNativePlatform;
  return !!cap.platform && cap.platform !== 'web';
}

/** Ist die Sofortfreischaltung in dieser Umgebung überhaupt kaufbar? */
export function isToolPurchaseAvailable() {
  if (isGooglePlayBillingAvailable()) return true;
  return !isCapacitorNative();
}

/** Preis als deutscher Währungstext ("0,99 €"). */
export function formatPrice(cents) {
  const value = Number.isFinite(cents) ? cents : 0;
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value / 100);
}

function purchaseViaGooglePlay(toolId) {
  return new Promise((resolve) => {
    const productId = googlePlayProductIdForTool(toolId);
    if (!productId) {
      resolve({ success: false, error: 'Für dieses Tool ist kein Play-Produkt hinterlegt.' });
      return;
    }

    let settled = false;
    const cleanup = () => {
      window.removeEventListener('play-billing-success', onSuccess);
      window.removeEventListener('play-billing-cancel', onCancel);
      window.removeEventListener('play-billing-error', onError);
      clearTimeout(timeoutId);
    };
    const finish = (result) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const onSuccess = async (event) => {
      const detail = event.detail || {};
      // Nur auf das Produkt reagieren, das hier gekauft wurde — im WebView
      // können parallel andere Kauf-Flows laufen.
      if (detail.productId && detail.productId !== productId) return;
      try {
        const response = await progressionApi.purchase({
          tool_id: toolId,
          purchase_token: detail.purchaseToken,
          product_id: detail.productId || productId,
          payment_method: 'google_play',
        });
        if (!response?.ok) throw new Error(response?.error || 'Freischaltung fehlgeschlagen');
        finish({ success: true, toolId });
      } catch (err) {
        finish({ success: false, error: err?.message || 'Freischaltung fehlgeschlagen' });
      }
    };

    const onCancel = (event) => {
      const detail = event.detail || {};
      if (detail.productId && detail.productId !== productId) return;
      finish({ success: false, cancelled: true });
    };

    const onError = (event) => {
      const detail = event.detail || {};
      if (detail.productId && detail.productId !== productId) return;
      finish({ success: false, error: detail.message || 'Google Play Billing Fehler' });
    };

    window.addEventListener('play-billing-success', onSuccess);
    window.addEventListener('play-billing-cancel', onCancel);
    window.addEventListener('play-billing-error', onError);

    const timeoutId = setTimeout(() => {
      finish({
        success: false,
        pending: true,
        error: 'Keine Rückmeldung vom Play Store. Falls die Zahlung erfolgreich war, öffne die Tool-Übersicht erneut.',
      });
    }, PLAY_CALLBACK_TIMEOUT_MS);

    try {
      window.AndroidBilling.purchase(productId);
    } catch (e) {
      finish({ success: false, error: e?.message || 'Google Play Billing Fehler' });
    }
  });
}

async function purchaseViaStripe(toolId) {
  const response = await progressionApi.checkout(toolId);
  const url = response?.checkout_url;
  if (!url) {
    throw new Error(response?.error || 'Checkout konnte nicht gestartet werden.');
  }
  // Weiterleitung zu Stripe; die Freischaltung passiert nach dem Rücksprung
  // auf /Tools?unlock=success (siehe redeemToolCheckout).
  window.location.href = url;
  return { success: true, redirected: true, toolId };
}

/**
 * Startet den Kauf für ein Tool.
 * @param {string} toolId
 * @returns {Promise<{ success: boolean, toolId?: string, redirected?: boolean, cancelled?: boolean, pending?: boolean, error?: string }>}
 */
export async function startToolUnlockPurchase(toolId) {
  if (isGooglePlayBillingAvailable()) {
    return purchaseViaGooglePlay(toolId);
  }
  try {
    return await purchaseViaStripe(toolId);
  } catch (error) {
    return { success: false, error: error?.message || 'Kauf fehlgeschlagen' };
  }
}

/**
 * Löst den Rücksprung vom Stripe-Checkout ein
 * (/Tools?unlock=success&tool_id=...&session_id=cs_...).
 * @param {{ toolId: string, sessionId: string }} params
 */
export async function redeemToolCheckout({ toolId, sessionId }) {
  if (!toolId || !sessionId) {
    return { success: false, error: 'Unvollständige Checkout-Rückgabe' };
  }
  try {
    const response = await progressionApi.purchase({
      tool_id: toolId,
      transaction_id: sessionId,
      payment_method: 'stripe',
    });
    if (!response?.ok) throw new Error(response?.error || 'Freischaltung fehlgeschlagen');
    return { success: true, toolId, alreadyUnlocked: !!response.already_unlocked };
  } catch (error) {
    return { success: false, error: error?.message || 'Freischaltung fehlgeschlagen' };
  }
}
