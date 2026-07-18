import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createSupabaseMock } from '../../test/mockSupabase.js';

// Nutzer mit bestehenden Metadaten: vorhandene Settings dürfen beim Teil-Update
// nicht verloren gehen, Premium-Felder dürfen vom Client nicht überschreibbar sein.
const TEST_USER = {
  id: 'user-1',
  email: 'angler@baitbuddy.test',
  created_at: '2026-01-01T00:00:00Z',
  user_metadata: {
    full_name: 'Angler',
    settings: { theme: 'dark', audio_enabled: false },
    premium_plan_id: 'free',
  },
};

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: { current: null },
}));
vi.mock('../lib/supabase.js', () => ({
  get supabase() { return supabaseMock.current; },
}));

let app;
let updateUserById;

beforeEach(async () => {
  vi.resetModules();
  supabaseMock.current = createSupabaseMock({ authUser: TEST_USER });
  // Echo-Mock: liefert die gemergten Metadaten zurück wie Supabase es täte.
  updateUserById = vi.fn(async (id, { user_metadata }) => ({
    data: { user: { ...TEST_USER, user_metadata } },
    error: null,
  }));
  supabaseMock.current.auth.admin = { updateUserById };
  ({ default: app } = await import('../server.js'));
});

describe('PATCH /api/auth/me', () => {
  it('speichert nickname und profile_picture_url (Whitelist)', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', 'Bearer test-token')
      .send({ nickname: 'Hechtkönig', profile_picture_url: 'https://x/y.jpg' });

    expect(res.status).toBe(200);
    const saved = updateUserById.mock.calls[0][1].user_metadata;
    expect(saved.nickname).toBe('Hechtkönig');
    expect(saved.profile_picture_url).toBe('https://x/y.jpg');
    expect(res.body.nickname).toBe('Hechtkönig');
  });

  it('merged settings tief statt sie zu ersetzen', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', 'Bearer test-token')
      .send({ settings: { language: 'en' } });

    expect(res.status).toBe(200);
    const saved = updateUserById.mock.calls[0][1].user_metadata;
    // Neue Sprache gesetzt, bestehendes Theme und Audio-Setting bleiben erhalten.
    expect(saved.settings).toEqual({ theme: 'dark', audio_enabled: false, language: 'en' });
  });

  it('verwirft Premium- und Guthaben-Felder aus dem Request', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', 'Bearer test-token')
      .send({ premium_plan_id: 'elite', premium_expires_at: '2099-01-01', credits: 99999, nickname: 'Ok' });

    expect(res.status).toBe(200);
    const saved = updateUserById.mock.calls[0][1].user_metadata;
    expect(saved.premium_plan_id).toBe('free');
    expect(saved.premium_expires_at).toBeUndefined();
    expect(saved.credits).toBeUndefined();
    expect(saved.nickname).toBe('Ok');
  });

  it('lehnt Zugriff ohne Token ab (401)', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .send({ nickname: 'X' });

    expect(res.status).toBe(401);
  });
});
