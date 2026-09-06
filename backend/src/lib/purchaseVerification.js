import { google } from 'googleapis';
import Stripe from 'stripe';
import { GOOGLE_PLAY_TOOL_SKU_PREFIX } from '../../../shared/toolUnlocks.js';

// ACHTUNG — UNGETESTET GEGEN ECHTE APIS: Dieses Modul wurde nach offizieller
// Google-Play- und Stripe-API-Dokumentation implementiert, aber in dieser
// Umgebung stehen keine echten Service-Account-/Secret-Credentials zur
// Verfügung. Es gibt daher keine Möglichkeit, den Code gegen die echten APIs
// zu verifizieren (nur Unit-Tests mit gemockten SDK-Aufrufen, siehe
// purchaseVerification.test.js). Vor dem ersten Produktiv-Einsatz MUSS ein
// echter Testkauf (Google Play Test-Track bzw. Stripe Test-Mode) den
// kompletten Ablauf einmal real durchlaufen.

const ANDROID_PACKAGE_NAME = 'app.baitbuddy.mobile';

let androidPublisherClient = null;
function getAndroidPublisherClient() {
  if (androidPublisherClient) return androidPublisherClient;
  const credsJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!credsJson) return null;
  const credentials = JSON.parse(credsJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  androidPublisherClient = google.androidpublisher({ version: 'v3', auth });
  return androidPublisherClient;
}

// Einmal-Produkte (kein Abo). Alle Premium-Pläne sind Google-Play-Abos (SUBS);
// nur das Trial-Produkt ist ein einmaliges In-App-Produkt (INAPP) und wird
// deshalb über die products-API statt der subscriptions-API verifiziert.
const ONE_TIME_PRODUCT_IDS = new Set(['baitbuddy_trial_10_10']);

// Die Tool-Sofortfreischaltungen (0,99 €) sind ebenfalls Einmalprodukte
// (INAPP, nicht konsumierbar — die Freischaltung gilt dauerhaft). Sie teilen
// sich das SKU-Präfix aus shared/toolUnlocks.js, damit für jedes neue Tool
// keine Liste nachgepflegt werden muss.
function isOneTimeProduct(productId) {
  if (ONE_TIME_PRODUCT_IDS.has(productId)) return true;
  return typeof productId === 'string' && productId.startsWith(GOOGLE_PLAY_TOOL_SKU_PREFIX);
}

// Verifiziert einen Google-Play-Kauf. Abos gehen über die subscriptions-API,
// das Trial-Einmalprodukt über die products-API. BaitBuddy berechnet die
// Laufzeit anschließend selbst (siehe premium.js).
export async function verifyGooglePlayPurchase({ productId, purchaseToken }) {
  const client = getAndroidPublisherClient();
  if (!client) return { valid: false, reason: 'Google Play Verifikation nicht konfiguriert' };
  if (!productId || !purchaseToken) return { valid: false, reason: 'productId und purchaseToken erforderlich' };

  return isOneTimeProduct(productId)
    ? verifyGooglePlayOneTimeProduct(client, productId, purchaseToken)
    : verifyGooglePlaySubscription(client, productId, purchaseToken);
}

// Abo-Verifikation. paymentState 1 = bezahlt, 2 = Testzeitraum; zusätzlich muss
// das Ablaufdatum in der Zukunft liegen.
// https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptions/get
async function verifyGooglePlaySubscription(client, productId, purchaseToken) {
  try {
    const { data } = await client.purchases.subscriptions.get({
      packageName: ANDROID_PACKAGE_NAME,
      subscriptionId: productId,
      token: purchaseToken,
    });
    if (data.paymentState !== 1 && data.paymentState !== 2) {
      return { valid: false, reason: `Abo nicht aktiv (paymentState=${data.paymentState})` };
    }
    const expiryMs = Number(data.expiryTimeMillis);
    if (!Number.isFinite(expiryMs) || expiryMs <= Date.now()) {
      return { valid: false, reason: 'Abo abgelaufen' };
    }
    return { valid: true, raw: data };
  } catch (e) {
    return { valid: false, reason: `Google Play API Fehler: ${e.message}` };
  }
}

// Einmal-Produkt-Verifikation (Trial). purchaseState 0 = gekauft.
// https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products/get
async function verifyGooglePlayOneTimeProduct(client, productId, purchaseToken) {
  try {
    const { data } = await client.purchases.products.get({
      packageName: ANDROID_PACKAGE_NAME,
      productId,
      token: purchaseToken,
    });
    if (data.purchaseState !== 0) {
      return { valid: false, reason: `Kauf nicht abgeschlossen (purchaseState=${data.purchaseState})` };
    }
    if (data.consumptionState === 1) {
      return { valid: false, reason: 'Kauf wurde bereits konsumiert' };
    }
    return { valid: true, raw: data };
  } catch (e) {
    return { valid: false, reason: `Google Play API Fehler: ${e.message}` };
  }
}

let stripeClient = null;
function getStripeClient() {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  stripeClient = new Stripe(key);
  return stripeClient;
}

// Erstellt eine Stripe-Checkout-Session für einen Plan-Kauf. mode 'payment'
// (Einmalzahlung, kein Abo) — BaitBuddy berechnet die Laufzeit selbst, siehe
// premium.js. Die Session trägt user_id/plan_id als Metadata, damit
// /premium/activate die Zahlung dem richtigen Konto und Plan zuordnen kann.
// https://docs.stripe.com/api/checkout/sessions/create
export async function createStripeCheckoutSession({ planId, planName, amountCents, userId, userEmail, successUrl, cancelUrl, metadata = {} }) {
  const client = getStripeClient();
  if (!client) return { ok: false, reason: 'Stripe ist serverseitig nicht konfiguriert' };

  try {
    const session = await client.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: amountCents,
          product_data: { name: `BaitBuddy ${planName}` },
        },
      }],
      client_reference_id: userId,
      customer_email: userEmail || undefined,
      // Stripe akzeptiert nur String-Werte in Metadata. plan_id entfällt bei
      // Käufen, die keinen Plan betreffen (z. B. Tool-Sofortfreischaltung);
      // die zusätzlichen Felder kommen über `metadata` vom Aufrufer.
      metadata: {
        ...(planId ? { plan_id: String(planId) } : {}),
        user_id: String(userId),
        ...metadata,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    return { ok: true, id: session.id, url: session.url };
  } catch (e) {
    return { ok: false, reason: `Stripe API Fehler: ${e.message}` };
  }
}

// Verifiziert eine Stripe-Checkout-Session (transaction_id = Session-ID,
// cs_...). https://docs.stripe.com/api/checkout/sessions/retrieve
export async function verifyStripePayment({ sessionId }) {
  const client = getStripeClient();
  if (!client) return { valid: false, reason: 'Stripe Verifikation nicht konfiguriert' };
  if (!sessionId) return { valid: false, reason: 'transaction_id (Stripe Session-ID) erforderlich' };

  try {
    const session = await client.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return { valid: false, reason: `Zahlung nicht abgeschlossen (payment_status=${session.payment_status})` };
    }
    return { valid: true, raw: session };
  } catch (e) {
    return { valid: false, reason: `Stripe API Fehler: ${e.message}` };
  }
}
