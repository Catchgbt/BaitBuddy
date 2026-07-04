import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createSupabaseMock } from '../../test/mockSupabase.js';

const TEST_USER = { id: 'user-1', email: 'angler@baitbuddy.test' };

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { current: null } }));
vi.mock('../lib/supabase.js', () => ({
  get supabase() { return supabaseMock.current; },
  get supabaseUrl() { return 'https://yejiqenqdzupauddjcyi.supabase.co'; },
}));

let app;

beforeEach(async () => {
  vi.resetModules();
  supabaseMock.current = createSupabaseMock({ authUser: TEST_USER });
  ({ default: app } = await import('../server.js'));
});

describe('POST /api/water/bathymetry (SSRF-Schutz)', () => {
  it('lehnt eine file_url auf einem fremden Host ab', async () => {
    const res = await request(app)
      .post('/api/water/bathymetry')
      .set('Authorization', 'Bearer test-token')
      .send({ file_url: 'https://evil.example.com/internal', water_body_name: 'Test-See' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Supabase-Storage/);
  });

  it('lehnt eine file_url mit http (statt https) ab', async () => {
    const res = await request(app)
      .post('/api/water/bathymetry')
      .set('Authorization', 'Bearer test-token')
      .send({ file_url: 'http://yejiqenqdzupauddjcyi.supabase.co/storage/v1/object/public/x.csv', water_body_name: 'Test-See' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/fishing/plans (Feld-Mapping)', () => {
  it('speichert title/target_fish/steps/is_active statt sie stillschweigend zu verwerfen', async () => {
    const res = await request(app)
      .post('/api/fishing/plans')
      .set('Authorization', 'Bearer test-token')
      .send({ title: 'Hechtangeln am See', target_fish: 'Hecht', spot_info: 'Nordufer', steps: ['a', 'b'], is_active: true });

    expect(res.status).toBe(200);
    const insertCall = supabaseMock.current.__builders.fishing_plans.insert.mock.calls[0][0];
    expect(insertCall).toMatchObject({
      title: 'Hechtangeln am See',
      target_fish: 'Hecht',
      spot_info: 'Nordufer',
      steps: ['a', 'b'],
      is_active: true,
      created_by: TEST_USER.email,
    });
  });
});
