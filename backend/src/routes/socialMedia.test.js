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
    fromResults: {
      catches: { data: { id: 'catch-1', created_by: TEST_USER.email, photo_url: 'https://x/y.jpg' }, error: null },
      social_media_shares: { data: { id: 'share-1' }, error: null },
    },
  });
  ({ default: app } = await import('../server.js'));
});

describe('POST /api/social-media/shares (Pfad-Fix)', () => {
  it('ist unter dem Plural-Pfad erreichbar (frontendClient.js ENTITY_MAP erwartet /shares)', async () => {
    const res = await request(app)
      .post('/api/social-media/shares')
      .set('Authorization', 'Bearer test-token')
      .send({ catch_id: 'catch-1', platform: 'instagram' });

    expect(res.status).toBe(200);
  });

  it('existiert nicht mehr unter dem alten Singular-Pfad', async () => {
    const res = await request(app)
      .post('/api/social-media/share')
      .set('Authorization', 'Bearer test-token')
      .send({ catch_id: 'catch-1', platform: 'instagram' });

    expect(res.status).toBe(404);
  });
});
