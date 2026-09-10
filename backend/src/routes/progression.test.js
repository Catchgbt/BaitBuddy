import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createSupabaseMock, createQueryBuilderMock } from '../../test/mockSupabase.js';
import { TOOL_BY_ID, googlePlayProductIdForTool } from '../../../shared/toolUnlocks.js';

// XP-Rechnung für den Test-Nutzer:
//   12 Fänge  * 25 = 300
//    3 Arten  * 40 = 120
//    2 Spots  * 30 =  60
//    1 Tour   * 20 =  20
//    4 Gear   * 10 =  40
//   50 Punkte *  2 = 100
//    0 Posts  * 15 =   0
//                   = 640 XP -> Level 3 (Schwelle 600)
const EXPECTED_XP = 640;
const EXPECTED_LEVEL = 3;

const USER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'angler@baitbuddy.test',
  user_metadata: {},
};

const { supabaseMock, stripeMock, playMock } = vi.hoisted(() => ({
  supabaseMock: { current: null },
  stripeMock: {
    verify: null,
    checkout: null,
  },
  playMock: { verify: null },
}));

vi.mock('../lib/supabase.js', () => ({
  get supabase() { return supabaseMock.current; },
}));

vi.mock('../lib/purchaseVerification.js', () => ({
  verifyStripePayment: (...args) => stripeMock.verify(...args),
  verifyGooglePlayPurchase: (...args) => playMock.verify(...args),
  createStripeCheckoutSession: (...args) => stripeMock.checkout(...args),
}));

let app;

/**
 * @param {{ user?: object, unlockRows?: object[], insertResult?: object,
 *           counts?: object }} [options]
 */
async function bootApp({ user = USER, unlockRows = [], insertResult = { data: null, error: null }, counts = {} } = {}) {
  vi.resetModules();
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = '{"client_email":"x"}';

  supabaseMock.current = createSupabaseMock({ authUser: user });
  supabaseMock.current.auth.admin = {
    updateUserById: vi.fn(async () => ({ data: {}, error: null })),
    getUserById: vi.fn(async () => ({ data: { user }, error: null })),
  };

  const unlockBuilder = createQueryBuilderMock({ data: unlockRows, error: null });
  // insert/upsert liefern ein eigenes Ergebnis, select das Zeilen-Array.
  unlockBuilder.insert = vi.fn(() => createQueryBuilderMock(insertResult));
  unlockBuilder.upsert = vi.fn(() => createQueryBuilderMock({ data: null, error: null }));

  const tables = {
    // catches deckt beide Abfragen ab: HEAD-Count (count) und Artenliste (data).
    catches: createQueryBuilderMock({
      count: counts.catches ?? 12,
      data: [{ species: 'Hecht' }, { species: 'hecht' }, { species: 'Zander' }, { species: 'Barsch' }, { species: null }],
      error: null,
    }),
    spots: createQueryBuilderMock({ count: counts.spots ?? 2, data: [], error: null }),
    fishing_plans: createQueryBuilderMock({ count: counts.plans ?? 1, data: [], error: null }),
    gear_items: createQueryBuilderMock({ count: counts.gear ?? 4, data: [], error: null }),
    event_participants: createQueryBuilderMock({ data: [{ total_points: 30 }, { total_points: 20.4 }], error: null }),
    community_posts: createQueryBuilderMock({ count: counts.posts ?? 0, data: [], error: null }),
    user_tool_unlocks: unlockBuilder,
  };

  supabaseMock.current.from = vi.fn((table) => tables[table] || createQueryBuilderMock());

  ({ default: app } = await import('../server.js'));
  return { app, tables, unlockBuilder };
}

function authed(req) {
  return req.set('Authorization', 'Bearer test-token');
}

beforeEach(() => {
  supabaseMock.current = null;
  stripeMock.verify = vi.fn(async () => ({ valid: false, reason: 'nicht gemockt' }));
  stripeMock.checkout = vi.fn(async () => ({ ok: true, id: 'cs_test_1', url: 'https://checkout.stripe.test/cs_test_1' }));
  playMock.verify = vi.fn(async () => ({ valid: false, reason: 'nicht gemockt' }));
});

describe('GET /api/progression/me', () => {
  it('berechnet XP und Level aus echten Nutzerdaten', async () => {
    await bootApp();

    const res = await authed(request(app).get('/api/progression/me'));

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.xp.total).toBe(EXPECTED_XP);
    expect(res.body.level.current).toBe(EXPECTED_LEVEL);
    expect(res.body.level.rank).toBe('Hakenheld');
    expect(res.body.level.next_level_xp).toBe(1100);
    expect(res.body.level.xp_to_next).toBe(1100 - EXPECTED_XP);
    expect(res.body.xp.incomplete_sources).toEqual([]);

    const speciesRow = res.body.xp.breakdown.find((b) => b.source === 'species');
    expect(speciesRow.count).toBe(3); // Hecht/hecht dedupliziert, null ignoriert
    const eventRow = res.body.xp.breakdown.find((b) => b.source === 'event_point');
    expect(eventRow.count).toBe(50); // 30 + 20.4 -> abgerundet
  });

  it('schaltet die Tools der erreichten Level frei und sperrt die höheren', async () => {
    await bootApp();

    const res = await authed(request(app).get('/api/progression/me'));

    expect(res.body.unlocked_tools).toContain('fishing-map');    // Level 2
    expect(res.body.unlocked_tools).toContain('weather');        // Level 3
    expect(res.body.unlocked_tools).not.toContain('bait-mixer'); // Level 5
    expect(res.body.unlocked_tools).not.toContain('device-hub'); // Level 10
    // Basis-Tools sind nie gesperrt.
    expect(res.body.unlocked_tools).toEqual(expect.arrayContaining(['profile', 'settings', 'dashboard']));
  });

  it('schreibt neu erreichte Level-Freischaltungen dauerhaft fest', async () => {
    const { unlockBuilder } = await bootApp();

    await authed(request(app).get('/api/progression/me'));

    expect(unlockBuilder.upsert).toHaveBeenCalledTimes(1);
    const [rows, options] = unlockBuilder.upsert.mock.calls[0];
    expect(options).toEqual({ onConflict: 'user_id,tool_id', ignoreDuplicates: true });
    expect(rows.map((r) => r.tool_id).sort()).toEqual(
      ['catch-stats', 'fishing-map', 'trip-planner', 'weather'].sort()
    );
    expect(rows.every((r) => r.source === 'level' && r.user_id === USER.id)).toBe(true);
  });

  it('schreibt nichts, wenn die Freischaltungen bereits gespeichert sind', async () => {
    const { unlockBuilder } = await bootApp({
      unlockRows: ['fishing-map', 'catch-stats', 'weather', 'trip-planner'].map((tool_id) => ({
        tool_id, source: 'level', created_at: '2026-01-01T00:00:00Z', unlocked_at_level: 3,
      })),
    });

    await authed(request(app).get('/api/progression/me'));

    expect(unlockBuilder.upsert).not.toHaveBeenCalled();
  });

  it('behält gekaufte Tools trotz zu niedrigem Level', async () => {
    await bootApp({
      unlockRows: [{ tool_id: 'device-hub', source: 'purchase', created_at: '2026-01-01T00:00:00Z', unlocked_at_level: 3 }],
    });

    const res = await authed(request(app).get('/api/progression/me'));

    expect(res.body.unlocked_tools).toContain('device-hub');
    expect(res.body.purchased_tools).toEqual(['device-hub']);
    const tool = res.body.tools.find((t) => t.id === 'device-hub');
    expect(tool.unlock_reason).toBe('purchase');
  });

  it('umgeht das Level-Gate für Abonnenten (keine Regression für Zahlende)', async () => {
    await bootApp({
      user: {
        ...USER,
        user_metadata: {
          premium_plan_id: 'elite',
          premium_expires_at: new Date(Date.now() + 86400000).toISOString(),
        },
      },
    });

    const res = await authed(request(app).get('/api/progression/me'));

    expect(res.body.plan_id).toBe('elite');
    const catchCam = res.body.tools.find((t) => t.id === 'catch-cam'); // Level 7, elite
    expect(catchCam.unlocked).toBe(true);
    expect(catchCam.unlock_reason).toBe('plan');
  });

  it('meldet ein ausstehendes Level-Up mit den neuen Tools', async () => {
    await bootApp();

    const res = await authed(request(app).get('/api/progression/me'));

    expect(res.body.pending_level_up.from_level).toBe(1);
    expect(res.body.pending_level_up.to_level).toBe(EXPECTED_LEVEL);
    expect(res.body.pending_level_up.new_tools.map((t) => t.id).sort()).toEqual(
      ['catch-stats', 'fishing-map', 'trip-planner', 'weather'].sort()
    );
  });

  it('zeigt kein Level-Up mehr, wenn der Stand quittiert wurde', async () => {
    await bootApp({ user: { ...USER, user_metadata: { progression_seen_level: 3 } } });

    const res = await authed(request(app).get('/api/progression/me'));

    expect(res.body.pending_level_up).toBeNull();
    expect(res.body.seen_level).toBe(3);
  });

  it('meldet unlesbare XP-Quellen statt einen zu niedrigen Stand als Wahrheit zu liefern', async () => {
    const { tables } = await bootApp();
    tables.spots.__setResult({ count: null, error: { message: 'relation does not exist' } });

    const res = await authed(request(app).get('/api/progression/me'));

    expect(res.status).toBe(200);
    expect(res.body.xp.incomplete_sources).toContain('spots');
    expect(res.body.xp.total).toBe(EXPECTED_XP - 60);
  });

  it('verlangt Authentifizierung', async () => {
    await bootApp();
    const res = await request(app).get('/api/progression/me');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/progression/catalog', () => {
  it('liefert Level-Kurve und Tools ohne Anmeldung', async () => {
    await bootApp();

    const res = await request(app).get('/api/progression/catalog');

    expect(res.status).toBe(200);
    expect(res.body.max_level).toBe(10);
    expect(res.body.levels).toHaveLength(10);
    expect(res.body.price_cents).toBe(99);
    // Level 1 hat keine freischaltbaren Tools, Level 2..10 je zwei.
    expect(res.body.levels[0].tools).toHaveLength(0);
    for (const level of res.body.levels.slice(1)) {
      expect(level.tools).toHaveLength(2);
    }
  });
});

describe('POST /api/progression/tools/access', () => {
  it('erlaubt ein freigeschaltetes Tool', async () => {
    await bootApp();
    const res = await authed(request(app).post('/api/progression/tools/access')).send({ tool_id: 'weather' });
    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(true);
    expect(res.body.reason).toBe('level');
  });

  it('sperrt ein zu hohes Tool und nennt das Ziel-Level', async () => {
    await bootApp();
    const res = await authed(request(app).post('/api/progression/tools/access')).send({ tool_id: 'device-hub' });
    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(false);
    expect(res.body.required_level).toBe(10);
    expect(res.body.current_level).toBe(EXPECTED_LEVEL);
  });

  it('weist unbekannte Tool-IDs ab', async () => {
    await bootApp();
    const res = await authed(request(app).post('/api/progression/tools/access')).send({ tool_id: 'kein-tool' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/progression/level-seen', () => {
  it('schreibt den quittierten Level-Stand', async () => {
    await bootApp();
    const res = await authed(request(app).post('/api/progression/level-seen')).send({ level: 3 });
    expect(res.status).toBe(200);
    expect(res.body.seen_level).toBe(3);
    expect(supabaseMock.current.auth.admin.updateUserById).toHaveBeenCalledWith(
      USER.id,
      { user_metadata: { progression_seen_level: 3 } }
    );
  });

  it('setzt den Stand nie zurück', async () => {
    await bootApp({ user: { ...USER, user_metadata: { progression_seen_level: 5 } } });
    const res = await authed(request(app).post('/api/progression/level-seen')).send({ level: 2 });
    expect(res.body.seen_level).toBe(5);
    expect(supabaseMock.current.auth.admin.updateUserById).not.toHaveBeenCalled();
  });

  it('weist unsinnige Level ab', async () => {
    await bootApp();
    const res = await authed(request(app).post('/api/progression/level-seen')).send({ level: 99 });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/progression/tools/checkout', () => {
  it('erstellt eine Stripe-Session mit serverseitigem Preis', async () => {
    await bootApp();

    const res = await authed(request(app).post('/api/progression/tools/checkout')).send({ tool_id: 'bait-mixer' });

    expect(res.status).toBe(200);
    expect(res.body.checkout_url).toBe('https://checkout.stripe.test/cs_test_1');
    expect(res.body.price_cents).toBe(99);
    const [args] = stripeMock.checkout.mock.calls[0];
    expect(args.amountCents).toBe(99);
    expect(args.planName).toBe(TOOL_BY_ID['bait-mixer'].name);
    expect(args.metadata).toEqual({ tool_id: 'bait-mixer', purchase_type: 'tool_unlock' });
    expect(args.userId).toBe(USER.id);
  });

  it('verkauft nichts, was bereits freigeschaltet ist', async () => {
    await bootApp();
    const res = await authed(request(app).post('/api/progression/tools/checkout')).send({ tool_id: 'weather' });
    expect(res.status).toBe(409);
    expect(stripeMock.checkout).not.toHaveBeenCalled();
  });

  it('weist Basis-Tools ab', async () => {
    await bootApp();
    const res = await authed(request(app).post('/api/progression/tools/checkout')).send({ tool_id: 'settings' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/progression/tools/purchase', () => {
  it('schaltet nach verifizierter Stripe-Zahlung frei', async () => {
    stripeMock.verify = vi.fn(async () => ({
      valid: true,
      raw: { client_reference_id: USER.id, metadata: { tool_id: 'bait-mixer', purchase_type: 'tool_unlock' } },
    }));
    const { unlockBuilder } = await bootApp();

    const res = await authed(request(app).post('/api/progression/tools/purchase'))
      .send({ tool_id: 'bait-mixer', transaction_id: 'cs_test_1' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const [row] = unlockBuilder.insert.mock.calls[0];
    expect(row).toMatchObject({
      user_id: USER.id,
      tool_id: 'bait-mixer',
      source: 'purchase',
      price_cents: 99,
      payment_method: 'stripe',
      transaction_id: 'cs_test_1',
    });
  });

  it('lehnt eine Zahlung ab, die zu einem anderen Konto gehört', async () => {
    stripeMock.verify = vi.fn(async () => ({
      valid: true,
      raw: { client_reference_id: 'jemand-anderes', metadata: { tool_id: 'bait-mixer' } },
    }));
    await bootApp();

    const res = await authed(request(app).post('/api/progression/tools/purchase'))
      .send({ tool_id: 'bait-mixer', transaction_id: 'cs_test_1' });

    expect(res.status).toBe(403);
  });

  it('lehnt eine Zahlung für ein anderes Tool ab', async () => {
    stripeMock.verify = vi.fn(async () => ({
      valid: true,
      raw: { client_reference_id: USER.id, metadata: { tool_id: 'catch-cam' } },
    }));
    await bootApp();

    const res = await authed(request(app).post('/api/progression/tools/purchase'))
      .send({ tool_id: 'bait-mixer', transaction_id: 'cs_test_1' });

    expect(res.status).toBe(400);
  });

  it('lehnt eine Plan-Zahlung ohne tool_id-Metadata ab', async () => {
    stripeMock.verify = vi.fn(async () => ({
      valid: true,
      raw: { client_reference_id: USER.id, metadata: { plan_id: 'elite' } },
    }));
    await bootApp();

    const res = await authed(request(app).post('/api/progression/tools/purchase'))
      .send({ tool_id: 'bait-mixer', transaction_id: 'cs_test_1' });

    expect(res.status).toBe(400);
  });

  it('schaltet nach verifiziertem Google-Play-Kauf frei', async () => {
    playMock.verify = vi.fn(async () => ({ valid: true, raw: { purchaseState: 0 } }));
    const { unlockBuilder } = await bootApp();

    const res = await authed(request(app).post('/api/progression/tools/purchase')).send({
      tool_id: 'bait-mixer',
      purchase_token: 'play-token-1',
      product_id: googlePlayProductIdForTool('bait-mixer'),
    });

    expect(res.status).toBe(200);
    const [row] = unlockBuilder.insert.mock.calls[0];
    expect(row.payment_method).toBe('google_play');
    expect(row.purchase_token).toBe('play-token-1');
  });

  it('lehnt einen Play-Kauf mit fremder Produkt-ID ab', async () => {
    playMock.verify = vi.fn(async () => ({ valid: true, raw: {} }));
    await bootApp();

    const res = await authed(request(app).post('/api/progression/tools/purchase')).send({
      tool_id: 'bait-mixer',
      purchase_token: 'play-token-1',
      product_id: googlePlayProductIdForTool('catch-cam'),
    });

    expect(res.status).toBe(400);
  });

  it('lehnt unverifizierte Zahlungen ab', async () => {
    stripeMock.verify = vi.fn(async () => ({ valid: false, reason: 'payment_status=unpaid' }));
    await bootApp();

    const res = await authed(request(app).post('/api/progression/tools/purchase'))
      .send({ tool_id: 'bait-mixer', transaction_id: 'cs_test_1' });

    expect(res.status).toBe(402);
  });

  it('verlangt einen Zahlungsnachweis', async () => {
    await bootApp();
    const res = await authed(request(app).post('/api/progression/tools/purchase')).send({ tool_id: 'bait-mixer' });
    expect(res.status).toBe(400);
    expect(stripeMock.verify).not.toHaveBeenCalled();
  });

  it('ist idempotent bei bereits freigeschaltetem Tool', async () => {
    stripeMock.verify = vi.fn(async () => ({
      valid: true,
      raw: { client_reference_id: USER.id, metadata: { tool_id: 'device-hub' } },
    }));
    const { unlockBuilder } = await bootApp({
      unlockRows: [{ tool_id: 'device-hub', source: 'purchase', created_at: '2026-01-01T00:00:00Z' }],
    });

    const res = await authed(request(app).post('/api/progression/tools/purchase'))
      .send({ tool_id: 'device-hub', transaction_id: 'cs_test_2' });

    expect(res.status).toBe(200);
    expect(res.body.already_unlocked).toBe(true);
    expect(unlockBuilder.insert).not.toHaveBeenCalled();
  });

  it('verhindert das erneute Einlösen derselben Transaktion', async () => {
    stripeMock.verify = vi.fn(async () => ({
      valid: true,
      raw: { client_reference_id: USER.id, metadata: { tool_id: 'bait-mixer' } },
    }));
    await bootApp({ insertResult: { data: null, error: { code: '23505', message: 'duplicate key' } } });

    const res = await authed(request(app).post('/api/progression/tools/purchase'))
      .send({ tool_id: 'bait-mixer', transaction_id: 'cs_already_used' });

    expect(res.status).toBe(409);
  });
});

describe('Geführte Tour', () => {
  it('liefert Startwerte für einen Nutzer ohne Tour-Metadaten', async () => {
    await bootApp();
    const res = await authed(request(app).get('/api/progression/tour'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, step: 0, completed: false, user_level: 'beginner' });
  });

  it('liest einen gespeicherten Stand aus den User-Metadaten', async () => {
    await bootApp({
      user: {
        ...USER,
        user_metadata: {
          guided_tour_step: 4,
          guided_tour_completed: true,
          tour_user_level: 'experienced',
        },
      },
    });
    const res = await authed(request(app).get('/api/progression/tour'));
    expect(res.body).toMatchObject({ step: 4, completed: true, user_level: 'experienced' });
  });

  it('speichert den Fortschritt', async () => {
    await bootApp();
    const res = await authed(request(app).patch('/api/progression/tour')).send({ step: 3 });
    expect(res.status).toBe(200);
    expect(res.body.step).toBe(3);
    const [, attrs] = supabaseMock.current.auth.admin.updateUserById.mock.calls[0];
    expect(attrs.user_metadata.guided_tour_step).toBe(3);
  });

  it('ändert nur die mitgeschickten Felder', async () => {
    // Sonst würde ein Fortschritts-Update den Abschluss zurücksetzen.
    await bootApp({
      user: { ...USER, user_metadata: { guided_tour_completed: true, tour_user_level: 'professional' } },
    });
    const res = await authed(request(app).patch('/api/progression/tour')).send({ step: 2 });
    expect(res.body).toMatchObject({ step: 2, completed: true, user_level: 'professional' });
  });

  it('behält übrige Metadaten beim Schreiben', async () => {
    await bootApp({ user: { ...USER, user_metadata: { premium_plan_id: 'basic', referral_code: 'ABC12345' } } });
    await authed(request(app).patch('/api/progression/tour')).send({ completed: true });
    const [, attrs] = supabaseMock.current.auth.admin.updateUserById.mock.calls[0];
    expect(attrs.user_metadata.premium_plan_id).toBe('basic');
    expect(attrs.user_metadata.referral_code).toBe('ABC12345');
  });

  it('akzeptiert nur bekannte Nutzer-Level', async () => {
    await bootApp();
    const ok = await authed(request(app).patch('/api/progression/tour')).send({ user_level: 'professional' });
    expect(ok.status).toBe(200);
    expect(ok.body.user_level).toBe('professional');

    const bad = await authed(request(app).patch('/api/progression/tour')).send({ user_level: 'halbgott' });
    expect(bad.status).toBe(400);
  });

  it('weist unsinnige Werte ab', async () => {
    await bootApp();
    for (const payload of [{ step: -1 }, { step: 'drei' }, { completed: 'ja' }, {}]) {
      const res = await authed(request(app).patch('/api/progression/tour')).send(payload);
      expect(res.status, JSON.stringify(payload)).toBe(400);
    }
  });

  it('verlangt Authentifizierung', async () => {
    await bootApp();
    expect((await request(app).get('/api/progression/tour')).status).toBe(401);
    expect((await request(app).patch('/api/progression/tour').send({ step: 1 })).status).toBe(401);
  });
});
