import { describe, it, expect, vi, beforeEach } from 'vitest';

const { googleAuthMock, androidPublisherMock, stripeInstanceMock } = vi.hoisted(() => ({
  googleAuthMock: vi.fn(),
  androidPublisherMock: {
    purchases: {
      products: { get: vi.fn() },
      subscriptions: { get: vi.fn() },
    },
  },
  stripeInstanceMock: {
    checkout: { sessions: { retrieve: vi.fn(), create: vi.fn() } },
  },
}));

vi.mock('googleapis', () => ({
  google: {
    // Ebenfalls ein Konstruktor (`new google.auth.GoogleAuth(...)`).
    auth: { GoogleAuth: class GoogleAuthMock {
      constructor(...args) { googleAuthMock(...args); }
    } },
    androidpublisher: vi.fn(() => androidPublisherMock),
  },
}));

vi.mock('stripe', () => ({
  // Konstruktor-Mock als class: eine Pfeilfunktion hat kein [[Construct]],
  // `new Stripe(key)` in purchaseVerification.js wirft damit
  // "is not a constructor".
  default: class StripeMock {
    constructor() {
      return stripeInstanceMock;
    }
  },
}));

let verifyGooglePlayPurchase;
let verifyStripePayment;
let createStripeCheckoutSession;

beforeEach(async () => {
  vi.resetModules();
  androidPublisherMock.purchases.products.get.mockReset();
  androidPublisherMock.purchases.subscriptions.get.mockReset();
  stripeInstanceMock.checkout.sessions.retrieve.mockReset();
  stripeInstanceMock.checkout.sessions.create.mockReset();
  ({ verifyGooglePlayPurchase, verifyStripePayment, createStripeCheckoutSession } = await import('./purchaseVerification.js'));
});

describe('verifyGooglePlayPurchase', () => {
  const SUB_PRODUCT = 'baitbuddy_ultimate_monthly';
  const TRIAL_PRODUCT = 'baitbuddy_trial_10_10';
  const FUTURE = String(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const PAST = String(Date.now() - 1000);

  it('liefert valid:false, wenn keine Service-Account-Credentials konfiguriert sind', async () => {
    delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
    const result = await verifyGooglePlayPurchase({ productId: SUB_PRODUCT, purchaseToken: 'tok' });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/nicht konfiguriert/);
  });

  it('akzeptiert ein aktives, bezahltes Abo (paymentState=1, Ablauf in der Zukunft)', async () => {
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = '{"type":"service_account"}';
    androidPublisherMock.purchases.subscriptions.get.mockResolvedValue({
      data: { paymentState: 1, expiryTimeMillis: FUTURE },
    });

    const result = await verifyGooglePlayPurchase({ productId: SUB_PRODUCT, purchaseToken: 'tok' });

    expect(result.valid).toBe(true);
    expect(androidPublisherMock.purchases.subscriptions.get).toHaveBeenCalledWith({
      packageName: 'app.baitbuddy.mobile',
      subscriptionId: SUB_PRODUCT,
      token: 'tok',
    });
  });

  it('akzeptiert ein Abo im Testzeitraum (paymentState=2)', async () => {
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = '{"type":"service_account"}';
    androidPublisherMock.purchases.subscriptions.get.mockResolvedValue({
      data: { paymentState: 2, expiryTimeMillis: FUTURE },
    });

    const result = await verifyGooglePlayPurchase({ productId: SUB_PRODUCT, purchaseToken: 'tok' });
    expect(result.valid).toBe(true);
  });

  it('lehnt ein abgelaufenes Abo ab', async () => {
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = '{"type":"service_account"}';
    androidPublisherMock.purchases.subscriptions.get.mockResolvedValue({
      data: { paymentState: 1, expiryTimeMillis: PAST },
    });

    const result = await verifyGooglePlayPurchase({ productId: SUB_PRODUCT, purchaseToken: 'tok' });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/abgelaufen/);
  });

  it('lehnt ein Abo ohne aktive Zahlung ab (paymentState=0)', async () => {
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = '{"type":"service_account"}';
    androidPublisherMock.purchases.subscriptions.get.mockResolvedValue({
      data: { paymentState: 0, expiryTimeMillis: FUTURE },
    });

    const result = await verifyGooglePlayPurchase({ productId: SUB_PRODUCT, purchaseToken: 'tok' });
    expect(result.valid).toBe(false);
  });

  it('faengt API-Fehler ab, statt zu werfen', async () => {
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = '{"type":"service_account"}';
    androidPublisherMock.purchases.subscriptions.get.mockRejectedValue(new Error('invalid token'));

    const result = await verifyGooglePlayPurchase({ productId: SUB_PRODUCT, purchaseToken: 'tok' });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/invalid token/);
  });

  it('verifiziert das Trial-Einmalprodukt über die products-API (purchaseState=0)', async () => {
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = '{"type":"service_account"}';
    androidPublisherMock.purchases.products.get.mockResolvedValue({
      data: { purchaseState: 0, consumptionState: 0 },
    });

    const result = await verifyGooglePlayPurchase({ productId: TRIAL_PRODUCT, purchaseToken: 'tok' });

    expect(result.valid).toBe(true);
    expect(androidPublisherMock.purchases.products.get).toHaveBeenCalledWith({
      packageName: 'app.baitbuddy.mobile',
      productId: TRIAL_PRODUCT,
      token: 'tok',
    });
    expect(androidPublisherMock.purchases.subscriptions.get).not.toHaveBeenCalled();
  });

  it('lehnt ein bereits konsumiertes Trial-Produkt ab', async () => {
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = '{"type":"service_account"}';
    androidPublisherMock.purchases.products.get.mockResolvedValue({
      data: { purchaseState: 0, consumptionState: 1 },
    });

    const result = await verifyGooglePlayPurchase({ productId: TRIAL_PRODUCT, purchaseToken: 'tok' });
    expect(result.valid).toBe(false);
  });
});

describe('verifyStripePayment', () => {
  it('liefert valid:false, wenn kein Stripe-Secret konfiguriert ist', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const result = await verifyStripePayment({ sessionId: 'cs_test_1' });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/nicht konfiguriert/);
  });

  it('akzeptiert eine bezahlte Checkout-Session', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    stripeInstanceMock.checkout.sessions.retrieve.mockResolvedValue({ payment_status: 'paid' });

    const result = await verifyStripePayment({ sessionId: 'cs_test_1' });
    expect(result.valid).toBe(true);
  });

  it('lehnt eine unbezahlte Session ab', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    stripeInstanceMock.checkout.sessions.retrieve.mockResolvedValue({ payment_status: 'unpaid' });

    const result = await verifyStripePayment({ sessionId: 'cs_test_1' });
    expect(result.valid).toBe(false);
  });
});

describe('createStripeCheckoutSession', () => {
  const sessionInput = {
    planId: 'pro',
    planName: 'Pro',
    amountCents: 999,
    userId: 'user-1',
    userEmail: 'angler@baitbuddy.test',
    successUrl: 'https://baitbuddy.test/PremiumPlans?checkout=success&plan_id=pro&session_id={CHECKOUT_SESSION_ID}',
    cancelUrl: 'https://baitbuddy.test/PremiumPlans?checkout=cancelled',
  };

  it('liefert ok:false, wenn kein Stripe-Secret konfiguriert ist', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const result = await createStripeCheckoutSession(sessionInput);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/nicht konfiguriert/);
  });

  it('erstellt eine Einmalzahlungs-Session mit Nutzer- und Plan-Metadata', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    stripeInstanceMock.checkout.sessions.create.mockResolvedValue({
      id: 'cs_test_1',
      url: 'https://checkout.stripe.com/pay/cs_test_1',
    });

    const result = await createStripeCheckoutSession(sessionInput);

    expect(result.ok).toBe(true);
    expect(result.id).toBe('cs_test_1');
    expect(result.url).toBe('https://checkout.stripe.com/pay/cs_test_1');
    expect(stripeInstanceMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        client_reference_id: 'user-1',
        customer_email: 'angler@baitbuddy.test',
        metadata: { plan_id: 'pro', user_id: 'user-1' },
        success_url: sessionInput.successUrl,
        cancel_url: sessionInput.cancelUrl,
        line_items: [
          expect.objectContaining({
            quantity: 1,
            price_data: expect.objectContaining({
              currency: 'eur',
              unit_amount: 999,
            }),
          }),
        ],
      })
    );
  });

  it('faengt Stripe-API-Fehler ab, statt zu werfen', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    stripeInstanceMock.checkout.sessions.create.mockRejectedValue(new Error('rate limited'));

    const result = await createStripeCheckoutSession(sessionInput);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/rate limited/);
  });
});
