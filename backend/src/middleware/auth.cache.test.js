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

  // Ohne Invalidierung lieferte der Cache nach einer Metadaten-Änderung (Kauf,
  // Referral-Einlösung, Profil-Update) bis zu 60 s lang den alten Nutzer aus.
  it('holt den Nutzer nach invalidateCachedUser neu von GoTrue', async () => {
    const { invalidateCachedUser } = await import('./auth.js');

    await request(app).get('/api/sync/status').set('Authorization', 'Bearer tok-x');
    expect(supabaseMock.current.auth.getUser).toHaveBeenCalledTimes(1);

    invalidateCachedUser('u1');

    await request(app).get('/api/sync/status').set('Authorization', 'Bearer tok-x');
    expect(supabaseMock.current.auth.getUser).toHaveBeenCalledTimes(2);
  });

  it('lässt die Einträge anderer Nutzer unangetastet', async () => {
    const { invalidateCachedUser } = await import('./auth.js');

    await request(app).get('/api/sync/status').set('Authorization', 'Bearer tok-x');
    invalidateCachedUser('ein-anderer-nutzer');

    await request(app).get('/api/sync/status').set('Authorization', 'Bearer tok-x');
    expect(supabaseMock.current.auth.getUser).toHaveBeenCalledTimes(1);
  });
});
