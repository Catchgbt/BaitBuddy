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

import { base44 } from "@/api/base44Client";

export const GOOGLE_PLAY_PRODUCT_IDS = {
  basic: 'catchgbt_basic_monthly',
  pro: 'catchgbt_pro_monthly',
  ultimate: 'catchgbt_ultimate_monthly',
  elite: 'catchgbt_ultimate_monthly', // Alias
  friends: 'catchgbt_friends_yearly',
  friends_monthly: 'catchgbt_friends_monthly',
  trial_10_10: 'catchgbt_trial_10_10'
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
  const response = await base44.functions.invoke('activatePlan', {
    plan_id: planId,
    payment_method: 'google_play',
    transaction_id: orderId || purchaseToken,
    purchase_token: purchaseToken,
    product_id: productId
  });

  if (!response?.data?.ok) {
    throw new Error(response?.data?.error || 'Plan-Aktivierung fehlgeschlagen');
  }
  return response.data;
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
    const cleanup = () => {
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
      const planRank = { basic: 1, pro: 2, ultimate: 3, elite: 3, friends_monthly: 3, friends: 4 };
      let best = null;

      for (const p of purchases) {
        const planId = getPlanIdFromProductId(p.productId);
        if (!planId) continue;
        const rank = planRank[planId] || 0;
        if (!best || rank > best.rank) {
          best = { planId, rank, purchase: p };
        }
      }

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