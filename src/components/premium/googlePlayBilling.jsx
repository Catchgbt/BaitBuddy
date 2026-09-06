// Google Play Billing Bridge
// Erwartet eine native Android-WebView mit `window.AndroidBilling`,
// die folgende Methoden bereitstellt:
//   - purchase(productId: string): startet den Kauf-Flow
//   - restorePurchases(): liefert vorhandene aktive Käufe
//   - isAvailable(): optional, true wenn Billing initialisiert
//
// Die native Seite ruft Web-Callbacks via window-Events:
//   - 'play-billing-success'  detail: { productId, purchaseToken, orderId, planId }
//   - 'play-billing-cancel'   detail: { productId }
//   - 'play-billing-error'    detail: { productId, code, message }
//   - 'play-billing-restored' detail: { purchases: [{ productId, purchaseToken, orderId }] }

import { api, functions } from "@/api/frontendClient";
import { getPlanLevel } from "./planHierarchy";

export const GOOGLE_PLAY_PRODUCT_IDS = {
  basic: 'baitbuddy_basic_monthly',
  pro: 'baitbuddy_pro_monthly',
  ultimate: 'baitbuddy_ultimate_monthly',
  elite: 'baitbuddy_ultimate_monthly', // Alias
  friends: 'baitbuddy_friends_yearly',
  friends_monthly: 'baitbuddy_friends_monthly',
  trial_10_10: 'baitbuddy_trial_10_10'
};

// Reverse-Map: productId -> planId
const PRODUCT_TO_PLAN = Object.entries(GOOGLE_PLAY_PRODUCT_IDS).reduce((acc, [planId, productId]) => {
  if (!acc[productId]) acc[productId] = planId;
  return acc;
}, {});

export function getPlanIdFromProductId(productId) {
  return PRODUCT_TO_PLAN[productId] || null;
}

export function isGooglePlayBillingAvailable() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.AndroidBilling && typeof window.AndroidBilling.purchase === 'function');
}

// Aktiviert den Plan serverseitig nach erfolgreichem Google Play Kauf.
async function activatePlanOnServer({ planId, productId, purchaseToken, orderId }) {
  const response = await functions.invoke('activatePlan', {
    plan_id: planId,
    payment_method: 'google_play',
    transaction_id: orderId || purchaseToken,
    purchase_token: purchaseToken,
    product_id: productId
  });

  // Der API-Client liefert die JSON-Antwort flach zurück (kein .data-Wrapper).
  const data = response?.data ?? response;
  if (!data?.ok) {
    throw new Error(data?.error || 'Plan-Aktivierung fehlgeschlagen');
  }
  return data;
}

// Ermittelt aus einer Liste von Play-Käufen den höchstwertigen Plan. Die
// Rangfolge kommt aus der zentralen Plan-Hierarchie, damit sie nicht an zwei
// Stellen auseinanderlaufen kann.
export function pickBestPurchase(purchases) {
  let best = null;
  for (const p of purchases || []) {
    if (!p?.purchaseToken) continue;
    const planId = getPlanIdFromProductId(p.productId);
    if (!planId) continue;
    const rank = getPlanLevel(planId);
    if (!best || rank > best.rank) {
      best = { planId, rank, purchase: p };
    }
  }
  return best;
}

// Startet den Kauf-Flow und wartet auf Native-Callbacks via window-Events.
// Resolved mit { success, planId, activated } oder { success: false, error, cancelled }.
export function startGooglePlayPurchase(planId) {
  return new Promise((resolve) => {
    const productId = GOOGLE_PLAY_PRODUCT_IDS[planId];

    if (!productId) {
      resolve({ success: false, error: 'Kein Google Play Produkt für diesen Plan hinterlegt.' });
      return;
    }

    if (!isGooglePlayBillingAvailable()) {
      resolve({
        success: false,
        error: 'Käufe sind nur in der Android-App über den Google Play Store möglich. Bitte lade die App aus dem Play Store.'
      });
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
      // Nur reagieren, wenn das gekaufte Produkt zu diesem Plan passt
      if (detail.productId && detail.productId !== productId) return;

      try {
        const resolvedPlanId = detail.planId || getPlanIdFromProductId(detail.productId) || planId;
        await activatePlanOnServer({
          planId: resolvedPlanId,
          productId: detail.productId || productId,
          purchaseToken: detail.purchaseToken,
          orderId: detail.orderId
        });
        finish({ success: true, planId: resolvedPlanId, activated: true });
      } catch (err) {
        finish({ success: false, error: err?.message || 'Plan-Aktivierung fehlgeschlagen' });
      }
    };

    const onCancel = (event) => {
      const detail = event.detail || {};
      if (detail.productId && detail.productId !== productId) return;
      finish({ success: false, cancelled: true, error: 'Kauf abgebrochen' });
    };

    const onError = (event) => {
      const detail = event.detail || {};
      if (detail.productId && detail.productId !== productId) return;
      finish({
        success: false,
        error: detail.message || 'Google Play Billing Fehler',
        code: detail.code
      });
    };

    window.addEventListener('play-billing-success', onSuccess);
    window.addEventListener('play-billing-cancel', onCancel);
    window.addEventListener('play-billing-error', onError);

    // Sicherheit: nach 5 Min ohne Rückmeldung als Pending markieren
    const timeoutId = setTimeout(() => {
      finish({
        success: false,
        pending: true,
        error: 'Keine Rückmeldung vom Play Store. Falls der Kauf erfolgreich war, nutze "Käufe wiederherstellen".'
      });
    }, 5 * 60 * 1000);

    try {
      window.AndroidBilling.purchase(productId);
    } catch (e) {
      finish({ success: false, error: e?.message || 'Google Play Billing Fehler' });
    }
  });
}

// Läuft gerade eine vom Nutzer angestoßene Wiederherstellung? Dann hält sich
// der stille Abgleich heraus, damit derselbe Kauf nicht doppelt aktiviert wird.
let manualRestoreInFlight = false;

// Stellt vorhandene aktive Google Play Käufe wieder her und aktiviert den passenden Plan.
export function restoreGooglePlayPurchases() {
  return new Promise((resolve) => {
    if (!isGooglePlayBillingAvailable()) {
      resolve({
        success: false,
        error: 'Käufe können nur in der Android-App wiederhergestellt werden.'
      });
      return;
    }

    if (typeof window.AndroidBilling.restorePurchases !== 'function') {
      resolve({
        success: false,
        error: 'Diese App-Version unterstützt das Wiederherstellen noch nicht.'
      });
      return;
    }

    let settled = false;
    manualRestoreInFlight = true;
    const cleanup = () => {
      manualRestoreInFlight = false;
      window.removeEventListener('play-billing-restored', onRestored);
      window.removeEventListener('play-billing-error', onError);
      clearTimeout(timeoutId);
    };

    const finish = (result) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const onRestored = async (event) => {
      const purchases = event.detail?.purchases || [];

      if (purchases.length === 0) {
        finish({ success: true, restored: 0, message: 'Keine aktiven Käufe gefunden.' });
        return;
      }

      // Höchsten Plan ermitteln und aktivieren
      const best = pickBestPurchase(purchases);

      if (!best) {
        finish({ success: true, restored: 0, message: 'Keine passenden Pläne gefunden.' });
        return;
      }

      try {
        await activatePlanOnServer({
          planId: best.planId,
          productId: best.purchase.productId,
          purchaseToken: best.purchase.purchaseToken,
          orderId: best.purchase.orderId
        });
        finish({
          success: true,
          restored: purchases.length,
          planId: best.planId,
          message: `Plan ${best.planId} wiederhergestellt.`
        });
      } catch (err) {
        finish({ success: false, error: err?.message || 'Wiederherstellung fehlgeschlagen' });
      }
    };

    const onError = (event) => {
      const detail = event.detail || {};
      finish({
        success: false,
        error: detail.message || 'Google Play Billing Fehler',
        code: detail.code
      });
    };

    window.addEventListener('play-billing-restored', onRestored);
    window.addEventListener('play-billing-error', onError);

    const timeoutId = setTimeout(() => {
      finish({ success: false, error: 'Zeitüberschreitung beim Wiederherstellen.' });
    }, 60 * 1000);

    try {
      window.AndroidBilling.restorePurchases();
    } catch (e) {
      finish({ success: false, error: e?.message || 'Google Play Billing Fehler' });
    }
  });
}

// ── Automatischer Kauf-Abgleich ─────────────────────────────────────────────
// Zwischen "in Play bezahlt" und "serverseitig freigeschaltet" liegt ein
// Netzwerk-Aufruf. Bricht der ab (App geschlossen, Funkloch, abgelaufene
// Sitzung), hat der Nutzer bezahlt und trotzdem keinen Plan — bisher half nur
// der manuelle Knopf "Käufe wiederherstellen" auf der Premium-Seite.
// Zusätzlich verlängert Play Abos automatisch weiter, ohne dass die App etwas
// davon mitbekommt. Beides löst dieser stille Abgleich: Bei jedem Start und
// jedem Wiedereinstieg in den Vordergrund werden die aktiven Play-Käufe
// abgefragt und an den Server gemeldet. Der Server ist idempotent und schreibt
// die Laufzeit nur fort, wenn Play ein späteres Ablaufdatum bestätigt.
const RECONCILE_THROTTLE_MS = 60 * 1000;
let reconcileListenersAttached = false;
let lastReconcileAt = 0;

async function handleReconcileEvent(event) {
  if (manualRestoreInFlight) return;
  const best = pickBestPurchase(event.detail?.purchases);
  if (!best) return;

  try {
    const data = await activatePlanOnServer({
      planId: best.planId,
      productId: best.purchase.productId,
      purchaseToken: best.purchase.purchaseToken,
      orderId: best.purchase.orderId
    });
    // Nur bei echter Änderung neu laden — sonst würde jeder Wiedereinstieg
    // einen überflüssigen Plan-Reload auslösen.
    if (data?.updated) {
      window.dispatchEvent(new CustomEvent('plan-updated'));
    }
  } catch (error) {
    // Stiller Abgleich: kein Toast, der Nutzer hat nichts angestoßen. Beim
    // nächsten Wiedereinstieg wird es erneut versucht.
    console.warn('[Billing] Kauf-Abgleich fehlgeschlagen:', error?.message || error);
  }
}

function triggerReconcile() {
  if (manualRestoreInFlight) return;
  if (!isGooglePlayBillingAvailable()) return;
  // Ohne Sitzung würde die Aktivierung nur mit 401 abgewiesen.
  if (!api.getToken()) return;
  if (typeof window.AndroidBilling.restorePurchases !== 'function') return;

  const now = Date.now();
  if (now - lastReconcileAt < RECONCILE_THROTTLE_MS) return;
  lastReconcileAt = now;

  try {
    window.AndroidBilling.restorePurchases();
  } catch (e) {
    console.warn('[Billing] Kauf-Abfrage fehlgeschlagen:', e?.message || e);
  }
}

// Startet den Abgleich. Mehrfachaufrufe sind unschädlich (die Listener werden
// nur einmal registriert). Gibt eine Aufräumfunktion zurück.
export function startGooglePlayReconciliation() {
  if (!isGooglePlayBillingAvailable()) return () => {};
  if (reconcileListenersAttached) {
    triggerReconcile();
    return () => {};
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') triggerReconcile();
  };

  // Die native Seite meldet aktive Käufe auch von sich aus (onResume,
  // Verbindungsaufbau) — der Listener bleibt deshalb dauerhaft aktiv.
  window.addEventListener('play-billing-restored', handleReconcileEvent);
  document.addEventListener('visibilitychange', onVisibility);
  reconcileListenersAttached = true;

  triggerReconcile();

  return () => {
    window.removeEventListener('play-billing-restored', handleReconcileEvent);
    document.removeEventListener('visibilitychange', onVisibility);
    reconcileListenersAttached = false;
  };
}