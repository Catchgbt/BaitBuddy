import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createSupabaseMock } from '../../test/mockSupabase.js';

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { current: null } }));
vi.mock('../lib/supabase.js', () => ({
  get supabase() { return supabaseMock.current; },
}));

let app;

beforeEach(async () => {
  vi.resetModules();
  ({ default: app } = await import('../server.js'));
});

describe('GET /api/catches/stats/summary', () => {
  it('aggregiert total (Count), biggest und die Artenliste', async () => {
    supabaseMock.current = createSupabaseMock({
      authUser: { id: 'u1', email: 'a@b.de' },
      fromResults: {
        catches: {
          data: [
            { species: 'Hecht', length_cm: 80, weight_kg: 4 },
            { species: 'Barsch', length_cm: 20, weight_kg: 0.3 },
          ],
          error: null,
          count: 2,
        },
      },
    });
    const res = await request(app)
      .get('/api/catches/stats/summary')
      .set('Authorization', 'Bearer tok');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.species).toContain('Hecht');
    expect(res.body.species).toContain('Barsch');
    expect(res.body.biggest).toBeTruthy();
  });

  it('lehnt Zugriff ohne Token ab (401)', async () => {
    supabaseMock.current = createSupabaseMock({ authUser: null });
    const res = await request(app).get('/api/catches/stats/summary');
    expect(res.status).toBe(401);
  });
});
