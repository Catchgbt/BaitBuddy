import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createSupabaseMock } from '../../test/mockSupabase.js';

const REGULAR_USER = { id: 'user-1', email: 'angler@baitbuddy.test' };
const ADMIN_USER = { id: 'admin-1', email: 'admin@baitbuddy.test' };

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { current: null } }));
vi.mock('../lib/supabase.js', () => ({
  get supabase() { return supabaseMock.current; },
}));

let app;

beforeEach(async () => {
  vi.resetModules();
  process.env.ADMIN_EMAILS = 'admin@baitbuddy.test';
  supabaseMock.current = createSupabaseMock({ authUser: REGULAR_USER });
  ({ default: app } = await import('../server.js'));
});

describe('/api/maps/*', () => {
  it('lehnt Zugriff ohne Token ab (401)', async () => {
    const res = await request(app).get('/api/maps/available');
    expect(res.status).toBe(401);
  });

  it('lehnt Zugriff fuer einen normalen (nicht-Admin) Nutzer ab (403)', async () => {
    const res = await request(app)
      .get('/api/maps/available')
      .set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(403);
  });

  it('erlaubt Zugriff fuer einen Admin-Nutzer', async () => {
    supabaseMock.current = createSupabaseMock({ authUser: ADMIN_USER });
    vi.resetModules();
    ({ default: app } = await import('../server.js'));

    const res = await request(app)
      .get('/api/maps/available')
      .set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('lehnt POST /maps/download mit unbekannter sourceId ab (400 ausserhalb von Vercel)', async () => {
    delete process.env.VERCEL;
    supabaseMock.current = createSupabaseMock({ authUser: ADMIN_USER });
    vi.resetModules();
    ({ default: app } = await import('../server.js'));

    const res = await request(app)
      .post('/api/maps/download')
      .set('Authorization', 'Bearer test-token')
      .send({ sourceId: '../../etc/passwd' });
    expect(res.status).toBe(400);
    process.env.VERCEL = '1';
  });

  it('lehnt DELETE /maps/:sourceId mit unbekannter sourceId ab (400 ausserhalb von Vercel)', async () => {
    delete process.env.VERCEL;
    supabaseMock.current = createSupabaseMock({ authUser: ADMIN_USER });
    vi.resetModules();
    ({ default: app } = await import('../server.js'));

    const res = await request(app)
      .delete('/api/maps/something-unknown')
      .set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(400);
    process.env.VERCEL = '1';
  });

  it('lehnt Download/Delete auf Vercel grundsaetzlich ab (501)', async () => {
    supabaseMock.current = createSupabaseMock({ authUser: ADMIN_USER });
    vi.resetModules();
    ({ default: app } = await import('../server.js'));

    const res = await request(app)
      .post('/api/maps/download')
      .set('Authorization', 'Bearer test-token')
      .send({ sourceId: 'gebco_europe_tile' });
    expect(res.status).toBe(501);
  });
});
