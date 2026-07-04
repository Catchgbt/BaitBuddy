import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createSupabaseMock } from '../../test/mockSupabase.js';

const TEST_USER = { id: 'user-1', email: 'angler@baitbuddy.test' };

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { current: null } }));
vi.mock('../lib/supabase.js', () => ({
  get supabase() { return supabaseMock.current; },
}));

let app;

beforeEach(async () => {
  vi.resetModules();
  supabaseMock.current = createSupabaseMock({
    authUser: TEST_USER,
    fromResults: { gear_items: { data: [], error: null } },
  });
  ({ default: app } = await import('../server.js'));
});

describe('GET /api/gear/items (Query-Key-Validierung)', () => {
  it('lehnt einen Filter-Key mit ungueltigen Zeichen ab (400)', async () => {
    const res = await request(app)
      .get('/api/gear/items')
      .query({ 'foo)=1;--': 'x' })
      .set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(400);
  });

  it('akzeptiert einen normalen alphanumerischen Filter-Key', async () => {
    const res = await request(app)
      .get('/api/gear/items')
      .query({ category: 'köder' })
      .set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(200);
  });

  it('deckelt limit auf MAX_LIMIT statt einen beliebig grossen Wert durchzureichen', async () => {
    const res = await request(app)
      .get('/api/gear/items')
      .query({ limit: '999999' })
      .set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(200);
    expect(supabaseMock.current.__builders.gear_items.limit).toHaveBeenCalledWith(500);
  });

  it('ignoriert ein ungueltiges order-Feld und faellt auf updated_date zurueck', async () => {
    const res = await request(app)
      .get('/api/gear/items')
      .query({ order: '-foo)=1' })
      .set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(200);
    expect(supabaseMock.current.__builders.gear_items.order).toHaveBeenCalledWith('updated_date', { ascending: false });
  });
});
