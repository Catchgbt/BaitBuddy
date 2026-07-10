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
  supabaseMock.current = createSupabaseMock({
    authUser: { id: 'u1', email: 'a@b.de' },
    fromResults: { catches: { data: { id: 'new' }, error: null } },
  });
  ({ default: app } = await import('../server.js'));
});

describe('POST /api/sync/upload', () => {
  it('verarbeitet mehrere Items und behält die Reihenfolge bei', async () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      clientId: `c${i}`,
      entity: 'catches',
      op: 'insert',
      payload: { species: 'Hecht' },
    }));
    const res = await request(app)
      .post('/api/sync/upload')
      .set('Authorization', 'Bearer tok')
      .send({ items });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(12);
    expect(res.body.ok).toBe(12);
    expect(res.body.results.map(r => r.clientId)).toEqual(items.map(i => i.clientId));
  });

  it('lehnt eine zu große Batch ab (413)', async () => {
    const items = Array.from({ length: 201 }, (_, i) => ({
      clientId: `c${i}`, entity: 'catches', op: 'insert', payload: {},
    }));
    const res = await request(app)
      .post('/api/sync/upload')
      .set('Authorization', 'Bearer tok')
      .send({ items });
    expect(res.status).toBe(413);
  });

  it('lehnt leere Uploads ab (400)', async () => {
    const res = await request(app)
      .post('/api/sync/upload')
      .set('Authorization', 'Bearer tok')
      .send({ items: [] });
    expect(res.status).toBe(400);
  });
});
