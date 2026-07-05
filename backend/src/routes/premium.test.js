import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createSupabaseMock } from '../../test/mockSupabase.js';

const TEST_USER = { id: 'user-1', email: 'angler@baitbuddy.test', user_metadata: {} };

const { supabaseMock, purchaseVerificationMock } = vi.hoisted(() => ({
  supabaseMock: { current: null },
  purchaseVerificationMock: {
    verifyGooglePlayPurchase: vi.fn(),
    verifyStripePayment: vi.fn(),
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

describe('GET /api/premium/status', () => {
  it('liefert free ohne user_metadata', async () => {
    const res = await request(app)
      .get('/api/premium/status')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.plan.id).toBe('free');
  });
});
