import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createSupabaseMock, createQueryBuilderMock } from '../../test/mockSupabase.js';

const REFERRER = {
  id: 'ref-user-1',
  email: 'referrer@baitbuddy.test',
  user_metadata: { referral_code: 'FRIENDS1' },
};
const NEW_USER = {
  id: 'new-user-2',
  email: 'invitee@baitbuddy.test',
  user_metadata: {},
};

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: { current: null },
}));
vi.mock('../lib/supabase.js', () => ({
  get supabase() { return supabaseMock.current; },
}));

let app;

async function bootApp({ authUser } = {}) {
  vi.resetModules();
  supabaseMock.current = createSupabaseMock({ authUser });
  // Admin-Helfer werden pro Test überschrieben.
  supabaseMock.current.auth.admin = {
    updateUserById: vi.fn(async () => ({ data: {}, error: null })),
    getUserById: vi.fn(async () => ({ data: { user: REFERRER }, error: null })),
  };
  ({ default: app } = await import('../server.js'));
  return app;
}

beforeEach(() => {
  supabaseMock.current = null;
});

describe('GET /api/referrals/me', () => {
  it('liefert den bestehenden Code, ohne einen neuen zu erzeugen', async () => {
    await bootApp({ authUser: REFERRER });

    // Upsert des vorhandenen Codes soll durchlaufen (idempotent).
    const upsertBuilder = createQueryBuilderMock({ data: null, error: null });
    // count-Query: liefert count via head:true
    const countBuilder = createQueryBuilderMock({ count: 3, error: null });

    let fromCallCount = 0;
    supabaseMock.current.from = vi.fn((table) => {
      fromCallCount += 1;
      if (table === 'user_referral_codes') return upsertBuilder;
      if (table === 'referrals') return countBuilder;
      return createQueryBuilderMock();
    });

    const res = await request(app)
      .get('/api/referrals/me')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.code).toBe('FRIENDS1');
    expect(res.body.reward_days).toBe(7);
    expect(res.body.reward_plan_id).toBe('elite');
    expect(upsertBuilder.upsert).toHaveBeenCalled();
    expect(supabaseMock.current.auth.admin.updateUserById).not.toHaveBeenCalled();
    expect(fromCallCount).toBeGreaterThanOrEqual(2);
  });

  // Regression: Steht der Code zwar in user_referral_codes, aber (noch) nicht in
  // den user_metadata, lief jeder der 5 Generierungs-Versuche in die
  // UNIQUE-Kollision auf user_id (23505) — /referrals/me antwortete dem Nutzer
  // danach dauerhaft mit 500. Jetzt wird die vorhandene Zeile wiederverwendet.
  it('uebernimmt einen bereits vergebenen Code aus der Tabelle statt 500 zu werfen', async () => {
    await bootApp({ authUser: { ...REFERRER, user_metadata: {} } });

    const codesBuilder = createQueryBuilderMock({ data: { code: 'BESTAND1' }, error: null });
    codesBuilder.insert = vi.fn(() =>
      codesBuilder.__setResult({ data: null, error: { code: '23505' } }));
    const countBuilder = createQueryBuilderMock({ count: 0, error: null });

    supabaseMock.current.from = vi.fn((table) => {
      if (table === 'user_referral_codes') return codesBuilder;
      if (table === 'referrals') return countBuilder;
      return createQueryBuilderMock();
    });

    const res = await request(app)
      .get('/api/referrals/me')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('BESTAND1');
    // Kein Wuerfeln noetig: die vorhandene Zeile wird direkt uebernommen.
    expect(codesBuilder.insert).not.toHaveBeenCalled();
    // Der Code wird in die Metadaten nachgezogen, damit der naechste Aufruf ihn dort findet.
    expect(supabaseMock.current.auth.admin.updateUserById).toHaveBeenCalledWith(
      REFERRER.id,
      { user_metadata: expect.objectContaining({ referral_code: 'BESTAND1' }) },
    );
  });
});

describe('POST /api/referrals/redeem', () => {
  it('lehnt fehlenden Code ab', async () => {
    await bootApp({ authUser: NEW_USER });
    const res = await request(app)
      .post('/api/referrals/redeem')
      .set('Authorization', 'Bearer test-token')
      .send({});
    expect(res.status).toBe(400);
  });

  it('verweigert Doppel-Einlösung', async () => {
    await bootApp({
      authUser: { ...NEW_USER, user_metadata: { referred_by: 'FRIENDS1' } },
    });
    const res = await request(app)
      .post('/api/referrals/redeem')
      .set('Authorization', 'Bearer test-token')
      .send({ code: 'friends1' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('already_redeemed');
  });

  it('lehnt unbekannten Code ab', async () => {
    await bootApp({ authUser: NEW_USER });
    supabaseMock.current.from = vi.fn((table) => {
      if (table === 'user_referral_codes') {
        return createQueryBuilderMock({ data: null, error: null });
      }
      return createQueryBuilderMock();
    });

    const res = await request(app)
      .post('/api/referrals/redeem')
      .set('Authorization', 'Bearer test-token')
      .send({ code: 'UNKNOWN1' });
    expect(res.status).toBe(404);
  });

  it('verweigert das Einlösen des eigenen Codes', async () => {
    await bootApp({ authUser: NEW_USER });
    supabaseMock.current.from = vi.fn((table) => {
      if (table === 'user_referral_codes') {
        return createQueryBuilderMock({ data: { user_id: NEW_USER.id }, error: null });
      }
      return createQueryBuilderMock();
    });

    const res = await request(app)
      .post('/api/referrals/redeem')
      .set('Authorization', 'Bearer test-token')
      .send({ code: 'SELFCODE' });
    expect(res.status).toBe(400);
  });

  it('protokolliert die Empfehlung und verlängert den Ultimate-Plan um 7 Tage', async () => {
    await bootApp({ authUser: NEW_USER });

    const insertBuilder = createQueryBuilderMock({ data: null, error: null });
    const lookupBuilder = createQueryBuilderMock({
      data: { user_id: REFERRER.id },
      error: null,
    });

    supabaseMock.current.from = vi.fn((table) => {
      if (table === 'user_referral_codes') return lookupBuilder;
      if (table === 'referrals') return insertBuilder;
      return createQueryBuilderMock();
    });

    const res = await request(app)
      .post('/api/referrals/redeem')
      .set('Authorization', 'Bearer test-token')
      .send({ code: 'friends1' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.reward_extended).toBe(true);
    expect(res.body.reward_days).toBe(7);
    expect(res.body.reward_plan_id).toBe('elite');

    // Log-Zeile geschrieben
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        referrer_user_id: REFERRER.id,
        referred_user_id: NEW_USER.id,
        referral_code: 'FRIENDS1',
        reward_days: 7,
      }),
    );

    // Referrer bekommt Ultimate + Reward-Zähler
    const updateCalls = supabaseMock.current.auth.admin.updateUserById.mock.calls;
    const referrerUpdate = updateCalls.find((c) => c[0] === REFERRER.id);
    expect(referrerUpdate).toBeDefined();
    expect(referrerUpdate[1].user_metadata.premium_plan_id).toBe('elite');
    expect(referrerUpdate[1].user_metadata.referral_reward_count).toBe(1);
    expect(new Date(referrerUpdate[1].user_metadata.premium_expires_at).getTime())
      .toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000);

    // Einladender-Nutzer wird als "referred_by" markiert
    const invitedUpdate = updateCalls.find((c) => c[0] === NEW_USER.id);
    expect(invitedUpdate).toBeDefined();
    expect(invitedUpdate[1].user_metadata.referred_by).toBe('FRIENDS1');
  });

  it('hängt an bestehende Ultimate-Laufzeit an statt sie zu kappen', async () => {
    const existingExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const paidReferrer = {
      ...REFERRER,
      user_metadata: {
        referral_code: 'FRIENDS1',
        premium_plan_id: 'friends',
        premium_expires_at: existingExpires,
      },
    };
    await bootApp({ authUser: NEW_USER });
    supabaseMock.current.auth.admin.getUserById = vi.fn(async () => ({
      data: { user: paidReferrer }, error: null,
    }));
    supabaseMock.current.from = vi.fn((table) => {
      if (table === 'user_referral_codes') {
        return createQueryBuilderMock({ data: { user_id: paidReferrer.id }, error: null });
      }
      if (table === 'referrals') return createQueryBuilderMock({ data: null, error: null });
      return createQueryBuilderMock();
    });

    const res = await request(app)
      .post('/api/referrals/redeem')
      .set('Authorization', 'Bearer test-token')
      .send({ code: 'FRIENDS1' });

    expect(res.status).toBe(200);
    const updateCalls = supabaseMock.current.auth.admin.updateUserById.mock.calls;
    const referrerUpdate = updateCalls.find((c) => c[0] === paidReferrer.id);
    // Der 'friends'-Plan bleibt bestehen (nicht auf elite herabgestuft).
    expect(referrerUpdate[1].user_metadata.premium_plan_id).toBe('friends');
    // Neue Laufzeit = bisherige + 7 Tage.
    const expected = new Date(new Date(existingExpires).getTime() + 7 * 24 * 60 * 60 * 1000);
    expect(new Date(referrerUpdate[1].user_metadata.premium_expires_at).getTime())
      .toBeCloseTo(expected.getTime(), -3);
  });
});
