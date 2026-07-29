import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createSupabaseMock } from '../../test/mockSupabase.js';

// GET /api/admin/premium/check-expiry — der taegliche Vercel-Cron (vercel.json,
// 03:00 UTC). Deckt drei Regressionen ab:
//  1. Vercel sendet `Authorization: Bearer <CRON_SECRET>`; die Route akzeptierte
//     nur `x-cron-secret`/?secret= und antwortete dem Cron mit 401.
//  2. `listUsers()` liefert `{ data: { users: [...] } }` — ein `for (const u of
//     data)` warf einen TypeError, der Cron setzte also nie einen Plan zurueck.
//  3. Ohne Paginierung wurde nur die erste GoTrue-Seite geprueft.

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { current: null } }));
vi.mock('../lib/supabase.js', () => ({
  get supabase() { return supabaseMock.current; },
}));

const PAST = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
const FUTURE = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

let app;

function userWith(id, meta) {
  return { id, email: `${id}@test.de`, user_metadata: meta };
}

async function bootApp(pages) {
  vi.resetModules();
  supabaseMock.current = createSupabaseMock({});
  supabaseMock.current.auth.admin = {
    listUsers: vi.fn(async ({ page }) => ({
      data: { users: pages[page - 1] || [] },
      error: null,
    })),
    updateUserById: vi.fn(async () => ({ data: {}, error: null })),
  };
  ({ default: app } = await import('../server.js'));
}

beforeEach(() => {
  supabaseMock.current = null;
  process.env.CRON_SECRET = 'cron-secret-xyz';
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe('GET /api/admin/premium/check-expiry — Cron-Auth', () => {
  it('akzeptiert das Secret als Authorization-Bearer (so ruft Vercel Cron auf)', async () => {
    await bootApp([[]]);

    const res = await request(app)
      .get('/api/admin/premium/check-expiry')
      .set('Authorization', 'Bearer cron-secret-xyz');

    expect(res.status).toBe(200);
  });

  it('akzeptiert weiterhin den x-cron-secret-Header', async () => {
    await bootApp([[]]);

    const res = await request(app)
      .get('/api/admin/premium/check-expiry')
      .set('x-cron-secret', 'cron-secret-xyz');

    expect(res.status).toBe(200);
  });

  it('lehnt ein falsches Secret ab (403)', async () => {
    await bootApp([[]]);

    const res = await request(app)
      .get('/api/admin/premium/check-expiry')
      .set('Authorization', 'Bearer falsch');

    expect(res.status).toBe(403);
  });

  it('sperrt den Endpunkt, wenn gar kein Secret konfiguriert ist (kein offener Default)', async () => {
    delete process.env.CRON_SECRET;
    delete process.env.ADMIN_API_KEY;
    await bootApp([[]]);

    const res = await request(app).get('/api/admin/premium/check-expiry');

    expect(res.status).toBe(500);
    expect(supabaseMock.current.auth.admin.listUsers).not.toHaveBeenCalled();
  });
});

describe('GET /api/admin/premium/check-expiry — Ablauf-Logik', () => {
  it('setzt nur abgelaufene Plaene zurueck und laesst laufende in Ruhe', async () => {
    await bootApp([[
      userWith('abgelaufen', { premium_plan_id: 'elite', premium_expires_at: PAST }),
      userWith('laeuft-noch', { premium_plan_id: 'basic', premium_expires_at: FUTURE }),
      userWith('ohne-plan', {}),
    ]]);

    const res = await request(app)
      .get('/api/admin/premium/check-expiry')
      .set('Authorization', 'Bearer cron-secret-xyz');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, checked: 3, expired: 1 });

    const update = supabaseMock.current.auth.admin.updateUserById;
    expect(update).toHaveBeenCalledTimes(1);
    const [userId, payload] = update.mock.calls[0];
    expect(userId).toBe('abgelaufen');
    expect(payload.user_metadata).toMatchObject({
      premium_plan_id: null,
      premium_expires_at: null,
      premium_trial: null,
      premium_check_expiry_version: 1,
    });
  });

  it('laeuft ueber alle Seiten, nicht nur ueber die erste', async () => {
    const fullPage = Array.from({ length: 200 }, (_, i) =>
      userWith(`u${i}`, { premium_plan_id: 'elite', premium_expires_at: PAST }));
    const secondPage = [userWith('spaet', { premium_plan_id: 'elite', premium_expires_at: PAST })];
    await bootApp([fullPage, secondPage]);

    const res = await request(app)
      .get('/api/admin/premium/check-expiry')
      .set('Authorization', 'Bearer cron-secret-xyz');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ checked: 201, expired: 201 });
    expect(supabaseMock.current.auth.admin.listUsers).toHaveBeenCalledTimes(2);
  });
});
