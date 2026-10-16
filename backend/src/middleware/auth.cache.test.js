import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createSupabaseMock } from '../../test/mockSupabase.js';

// Verifiziert, dass die Token-Verifikation gecacht wird: zwei authentifizierte
// Requests mit demselben Token dürfen nur EINEN GoTrue-Roundtrip
// (supabase.auth.getUser) auslösen.
const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { current: null } }));
vi.mock('../lib/supabase.js', () => ({
  get supabase() { return supabaseMock.current; },
}));

let app;

beforeEach(async () => {
  vi.resetModules();
  supabaseMock.current = createSupabaseMock({ authUser: { id: 'u1', email: 'a@b.de' } });
  ({ default: app } = await import('../server.js'));
});

describe('requireAuth Token-Cache', () => {
  it('ruft getUser bei wiederholtem Token nur einmal auf', async () => {
    const r1 = await request(app).get('/api/sync/status').set('Authorization', 'Bearer tok-123');
    const r2 = await request(app).get('/api/sync/status').set('Authorization', 'Bearer tok-123');
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(supabaseMock.current.auth.getUser).toHaveBeenCalledTimes(1);
  });

  it('verifiziert unterschiedliche Tokens separat', async () => {
    await request(app).get('/api/sync/status').set('Authorization', 'Bearer tok-a');
    await request(app).get('/api/sync/status').set('Authorization', 'Bearer tok-b');
    expect(supabaseMock.current.auth.getUser).toHaveBeenCalledTimes(2);
  });

  it('beendet Admin-Anfragen bei einem Ausfall der Tokenprüfung mit 503 statt zu hängen', async () => {
    supabaseMock.current.auth.getUser.mockRejectedValue(new Error('GoTrue unavailable'));
    const res = await request(app).get('/api/superadmin/tickets').set('Authorization', 'Bearer failure-token');
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/Anmeldedienst/);
  });

  it('wiederholt einen kurzzeitigen GoTrue-Ausfall und lässt den Request danach durch', async () => {
    supabaseMock.current.auth.getUser
      .mockRejectedValueOnce(new Error('temporary network failure'))
      .mockResolvedValueOnce({ data: { user: { id: 'u1', email: 'a@b.de' } }, error: null });
    const res = await request(app).get('/api/sync/status').set('Authorization', 'Bearer retry-token');
    expect(res.status).toBe(200);
    expect(supabaseMock.current.auth.getUser).toHaveBeenCalledTimes(2);
  });

  it.each([0, 429, 500, 503])('meldet zurückgegebene SDK-Fehler (%i) als Ausfall statt Logout', async status => {
    supabaseMock.current.auth.getUser.mockResolvedValue({
      data: { user: null }, error: { status, message: 'GoTrue unavailable' },
    });
    const res = await request(app).get('/api/superadmin/tickets').set('Authorization', 'Bearer failure-token');
    expect(res.status).toBe(503);
  });

  it.each([400, 401, 403])('lehnt tatsächlich ungültige Tokens (%i) weiterhin ab', async status => {
    supabaseMock.current.auth.getUser.mockResolvedValue({
      data: { user: null }, error: { status, message: 'Invalid token' },
    });
    const res = await request(app).get('/api/superadmin/tickets').set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });
});
