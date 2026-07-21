import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createSupabaseMock } from '../../test/mockSupabase.js';

const TEST_USER = { id: 'user-1', email: 'angler@baitbuddy.test', user_metadata: {} };

const { supabaseMock, purchaseVerificationMock } = vi.hoisted(() => ({
  supabaseMock: { current: null },
  purchaseVerificationMock: {
    verifyGooglePlayPurchase: vi.fn(),
    verifyStripePayment: vi.fn(),
    createStripeCheckoutSession: vi.fn(),
  },
}));
vi.mock('../lib/supabase.js', () => ({
  get supabase() { return supabaseMock.current; },
}));
vi.mock('../lib/purchaseVerification.js', () => purchaseVerificationMock);

let app;

beforeEach(async () => {
  vi.resetModules();
  delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  delete process.env.STRIPE_SECRET_KEY;
  purchaseVerificationMock.verifyGooglePlayPurchase.mockReset();
  purchaseVerificationMock.verifyStripePayment.mockReset();
  purchaseVerificationMock.createStripeCheckoutSession.mockReset();
  supabaseMock.current = createSupabaseMock({ authUser: TEST_USER });
  ({ default: app } = await import('../server.js'));
});

describe('POST /api/premium/activate', () => {
  it('lehnt Aktivierung ohne purchase_token/transaction_id ab (400)', async () => {
    const res = await request(app)
      .post('/api/premium/activate')
      .set('Authorization', 'Bearer test-token')
      .send({ plan_id: 'elite' });

    expect(res.status).toBe(400);
  });

  it('lehnt Google-Play-Aktivierung ohne konfigurierte Play-Verifikation ab (501)', async () => {
    const res = await request(app)
      .post('/api/premium/activate')
      .set('Authorization', 'Bearer test-token')
      .send({ plan_id: 'elite', purchase_token: 'irgendein-token' });

    expect(res.status).toBe(501);
  });

  it('lehnt Stripe/Sonstige-Aktivierung ohne konfigurierte Verifikation ab (501)', async () => {
    const res = await request(app)
      .post('/api/premium/activate')
      .set('Authorization', 'Bearer test-token')
      .send({ plan_id: 'elite', transaction_id: 'irgendeine-id' });

    expect(res.status).toBe(501);
  });

  it('aktiviert den Plan, wenn Play-Verifikation konfiguriert ist und der Kauf gueltig ist', async () => {
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = '{"type":"service_account"}';
    purchaseVerificationMock.verifyGooglePlayPurchase.mockResolvedValue({ valid: true });
    vi.resetModules();
    ({ default: app } = await import('../server.js'));

    supabaseMock.current.auth.admin = {
      updateUserById: vi.fn(async () => ({ data: {}, error: null })),
    };

    const res = await request(app)
      .post('/api/premium/activate')
      .set('Authorization', 'Bearer test-token')
      .send({ plan_id: 'elite', purchase_token: 'echter-play-token' });

    expect(res.status).toBe(200);
    expect(res.body.plan_id).toBe('elite');
    expect(supabaseMock.current.auth.admin.updateUserById).toHaveBeenCalled();
  });

  it('lehnt Aktivierung ab, wenn die Play-Verifikation den Kauf als ungueltig meldet', async () => {
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = '{"type":"service_account"}';
    purchaseVerificationMock.verifyGooglePlayPurchase.mockResolvedValue({ valid: false, reason: 'purchaseState=1' });
    vi.resetModules();
    ({ default: app } = await import('../server.js'));

    const res = await request(app)
      .post('/api/premium/activate')
      .set('Authorization', 'Bearer test-token')
      .send({ plan_id: 'elite', purchase_token: 'gefaelschter-token' });

    expect(res.status).toBe(402);
  });
});

describe('POST /api/premium/checkout', () => {
  async function stripeApp() {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    vi.resetModules();
    return (await import('../server.js')).default;
  }

  it('lehnt Checkout ohne konfiguriertes Stripe-Secret ab (501)', async () => {
    const res = await request(app)
      .post('/api/premium/checkout')
      .set('Authorization', 'Bearer test-token')
      .send({ plan_id: 'pro' });

    expect(res.status).toBe(501);
  });

  it('lehnt eine unbekannte plan_id ab (400)', async () => {
    const configuredApp = await stripeApp();
    const res = await request(configuredApp)
      .post('/api/premium/checkout')
      .set('Authorization', 'Bearer test-token')
      .send({ plan_id: 'mega_deluxe' });

    expect(res.status).toBe(400);
    expect(purchaseVerificationMock.createStripeCheckoutSession).not.toHaveBeenCalled();
  });

  it('erstellt eine Checkout-Session mit serverseitigem Preis und liefert die URL', async () => {
    const configuredApp = await stripeApp();
    purchaseVerificationMock.createStripeCheckoutSession.mockResolvedValue({
      ok: true, id: 'cs_test_1', url: 'https://checkout.stripe.com/pay/cs_test_1',
    });

    const res = await request(configuredApp)
      .post('/api/premium/checkout')
      .set('Authorization', 'Bearer test-token')
      .set('Origin', 'https://baitbuddy.test')
      .send({ plan_id: 'pro' });

    expect(res.status).toBe(200);
    expect(res.body.checkout_url).toBe('https://checkout.stripe.com/pay/cs_test_1');
    expect(purchaseVerificationMock.createStripeCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: 'pro',
        amountCents: 1999,
        userId: 'user-1',
        successUrl: expect.stringContaining('https://baitbuddy.test/PremiumPlans?checkout=success&plan_id=pro'),
        cancelUrl: 'https://baitbuddy.test/PremiumPlans?checkout=cancelled',
      })
    );
  });

  it('liefert 502, wenn Stripe die Session nicht erstellen kann', async () => {
    const configuredApp = await stripeApp();
    purchaseVerificationMock.createStripeCheckoutSession.mockResolvedValue({
      ok: false, reason: 'Stripe API Fehler: key invalid',
    });

    const res = await request(configuredApp)
      .post('/api/premium/checkout')
      .set('Authorization', 'Bearer test-token')
      .send({ plan_id: 'basic' });

    expect(res.status).toBe(502);
  });
});

describe('POST /api/premium/activate (Stripe-Härtung)', () => {
  async function stripeApp(userMetadata = {}) {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    supabaseMock.current = createSupabaseMock({
      authUser: { ...TEST_USER, user_metadata: userMetadata },
    });
    supabaseMock.current.auth.admin = {
      updateUserById: vi.fn(async () => ({ data: {}, error: null })),
    };
    vi.resetModules();
    return (await import('../server.js')).default;
  }

  it('aktiviert einen Plan mit passender, bezahlter Stripe-Session', async () => {
    const configuredApp = await stripeApp();
    purchaseVerificationMock.verifyStripePayment.mockResolvedValue({
      valid: true,
      raw: { client_reference_id: 'user-1', metadata: { plan_id: 'pro' } },
    });

    const res = await request(configuredApp)
      .post('/api/premium/activate')
      .set('Authorization', 'Bearer test-token')
      .send({ plan_id: 'pro', transaction_id: 'cs_test_1', payment_method: 'stripe' });

    expect(res.status).toBe(200);
    expect(res.body.plan_id).toBe('pro');
    expect(supabaseMock.current.auth.admin.updateUserById).toHaveBeenCalled();
  });

  it('lehnt eine Session ab, die zu einem anderen Konto gehört (403)', async () => {
    const configuredApp = await stripeApp();
    purchaseVerificationMock.verifyStripePayment.mockResolvedValue({
      valid: true,
      raw: { client_reference_id: 'anderer-user', metadata: { plan_id: 'pro' } },
    });

    const res = await request(configuredApp)
      .post('/api/premium/activate')
      .set('Authorization', 'Bearer test-token')
      .send({ plan_id: 'pro', transaction_id: 'cs_test_1' });

    expect(res.status).toBe(403);
    expect(supabaseMock.current.auth.admin.updateUserById).not.toHaveBeenCalled();
  });

  it('lehnt eine Session ab, die für einen anderen Plan bezahlt wurde (400)', async () => {
    const configuredApp = await stripeApp();
    purchaseVerificationMock.verifyStripePayment.mockResolvedValue({
      valid: true,
      raw: { client_reference_id: 'user-1', metadata: { plan_id: 'basic' } },
    });

    const res = await request(configuredApp)
      .post('/api/premium/activate')
      .set('Authorization', 'Bearer test-token')
      .send({ plan_id: 'elite', transaction_id: 'cs_test_1' });

    expect(res.status).toBe(400);
    expect(supabaseMock.current.auth.admin.updateUserById).not.toHaveBeenCalled();
  });

  it('verlängert die Laufzeit bei bereits verarbeiteter Transaktion NICHT (Replay)', async () => {
    const expiresAt = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString();
    const configuredApp = await stripeApp({
      premium_plan_id: 'pro',
      premium_expires_at: expiresAt,
      premium_transaction_id: 'cs_test_1',
    });
    purchaseVerificationMock.verifyStripePayment.mockResolvedValue({
      valid: true,
      raw: { client_reference_id: 'user-1', metadata: { plan_id: 'pro' } },
    });

    const res = await request(configuredApp)
      .post('/api/premium/activate')
      .set('Authorization', 'Bearer test-token')
      .send({ plan_id: 'pro', transaction_id: 'cs_test_1' });

    expect(res.status).toBe(200);
    expect(res.body.expires_at).toBe(expiresAt);
    expect(supabaseMock.current.auth.admin.updateUserById).not.toHaveBeenCalled();
  });
});

describe('Referral: 10-EUR-Ultimate-Rabatt', () => {
  it('zieht den Referral-Rabatt beim Ultimate-Checkout ab (elite)', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    supabaseMock.current = createSupabaseMock({
      authUser: { ...TEST_USER, user_metadata: { ultimate_discount_cents: 1000 } },
    });
    vi.resetModules();
    const configuredApp = (await import('../server.js')).default;
    purchaseVerificationMock.createStripeCheckoutSession.mockResolvedValue({
      ok: true, id: 'cs_test_2', url: 'https://checkout.stripe.com/pay/cs_test_2',
    });

    const res = await request(configuredApp)
      .post('/api/premium/checkout')
      .set('Authorization', 'Bearer test-token')
      .send({ plan_id: 'elite' });

    expect(res.status).toBe(200);
    // Ultimate 2999 - 1000 Rabatt = 1999
    expect(purchaseVerificationMock.createStripeCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ planId: 'elite', amountCents: 1999 })
    );
  });

  it('begrenzt den rabattierten Ultimate-Preis auf den Mindestbetrag (999)', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    supabaseMock.current = createSupabaseMock({
      authUser: { ...TEST_USER, user_metadata: { ultimate_discount_cents: 3000 } },
    });
    vi.resetModules();
    const configuredApp = (await import('../server.js')).default;
    purchaseVerificationMock.createStripeCheckoutSession.mockResolvedValue({
      ok: true, id: 'cs_test_3', url: 'https://checkout.stripe.com/pay/cs_test_3',
    });

    const res = await request(configuredApp)
      .post('/api/premium/checkout')
      .set('Authorization', 'Bearer test-token')
      .send({ plan_id: 'elite' });

    expect(res.status).toBe(200);
    // 2999 - 3000 = -1 -> auf Mindestbetrag 999 begrenzt
    expect(purchaseVerificationMock.createStripeCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ planId: 'elite', amountCents: 999 })
    );
  });

  it('schreibt dem Referrer 10 EUR gut, wenn ein eingeladener Freund Basic aktiviert', async () => {
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = '{"type":"service_account"}';
    purchaseVerificationMock.verifyGooglePlayPurchase.mockResolvedValue({ valid: true });
    supabaseMock.current = createSupabaseMock({
      authUser: { ...TEST_USER, user_metadata: { referred_by: 'ABC12345' } },
      fromResults: {
        referrals: { data: { id: 'ref-1', referrer_user_id: 'user-2', basic_reward_granted: false }, error: null },
      },
    });
    supabaseMock.current.auth.admin = {
      updateUserById: vi.fn(async () => ({ data: {}, error: null })),
      getUserById: vi.fn(async () => ({ data: { user: { id: 'user-2', user_metadata: {} } }, error: null })),
    };
    vi.resetModules();
    const configuredApp = (await import('../server.js')).default;

    const res = await request(configuredApp)
      .post('/api/premium/activate')
      .set('Authorization', 'Bearer test-token')
      .send({ plan_id: 'basic', purchase_token: 'echter-play-token' });

    expect(res.status).toBe(200);
    expect(res.body.plan_id).toBe('basic');
    expect(supabaseMock.current.auth.admin.getUserById).toHaveBeenCalledWith('user-2');
    // Referrer (user-2) bekommt 1000 Cent Rabatt gutgeschrieben.
    expect(supabaseMock.current.auth.admin.updateUserById).toHaveBeenCalledWith(
      'user-2',
      expect.objectContaining({
        user_metadata: expect.objectContaining({ ultimate_discount_cents: 1000 }),
      })
    );
    // Einladung als belohnt markiert (Idempotenz).
    expect(supabaseMock.current.__builders.referrals.update).toHaveBeenCalledWith({ basic_reward_granted: true });
  });
});

describe('POST /api/premium/check-feature', () => {
  async function appWithPlan(planId) {
    const futureDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const user = {
      id: 'user-1',
      email: 'angler@baitbuddy.test',
      user_metadata: planId === 'free' ? {} : { premium_plan_id: planId, premium_expires_at: futureDate },
    };
    supabaseMock.current = createSupabaseMock({ authUser: user });
    vi.resetModules();
    return (await import('../server.js')).default;
  }

  it('erlaubt ein Basic-Feature fuer einen Free-Nutzer NICHT', async () => {
    const freeApp = await appWithPlan('free');
    const res = await request(freeApp)
      .post('/api/premium/check-feature')
      .set('Authorization', 'Bearer test-token')
      .send({ feature: 'fangbuch' });

    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(false);
  });

  it('erlaubt ein Basic-Feature fuer einen Basic-Nutzer', async () => {
    const basicApp = await appWithPlan('basic');
    const res = await request(basicApp)
      .post('/api/premium/check-feature')
      .set('Authorization', 'Bearer test-token')
      .send({ feature: 'fangbuch' });

    expect(res.body.allowed).toBe(true);
  });

  it('erlaubt ein Elite-Feature fuer einen Basic-Nutzer NICHT', async () => {
    const basicApp = await appWithPlan('basic');
    const res = await request(basicApp)
      .post('/api/premium/check-feature')
      .set('Authorization', 'Bearer test-token')
      .send({ feature: 'offline' });

    expect(res.body.allowed).toBe(false);
    expect(res.body.required_plan).toBe('elite');
  });

  it('erlaubt unbekannte Feature-Keys standardmaessig (fail-open)', async () => {
    const freeApp = await appWithPlan('free');
    const res = await request(freeApp)
      .post('/api/premium/check-feature')
      .set('Authorization', 'Bearer test-token')
      .send({ feature: 'ein_zukuenftiges_feature' });

    expect(res.body.allowed).toBe(true);
  });
});

describe('GET /api/premium/status', () => {
  it('liefert free ohne user_metadata', async () => {
    const res = await request(app)
      .get('/api/premium/status')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.plan.id).toBe('free');
  });
});
