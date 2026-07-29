import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createSupabaseMock } from '../../test/mockSupabase.js';

// GET /events Sichtbarkeit + POST /events visibility-Gate.
// Deckt die Regression ab: früher baute die Route ungültiges Roh-SQL in .or()
// (SELECT-Subqueries) und verglich created_by (E-Mail) gegen UUIDs — dadurch
// war die Events-Liste für eingeloggte Nutzer kaputt. Hier wird geprüft, dass
// die Route 200 liefert und der .or()-Ausdruck gültige PostgREST-Syntax hat.

const ME = { id: 'me-uuid', email: 'me@test.de', user_metadata: {} };

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { current: null } }));
vi.mock('../lib/supabase.js', () => ({
  get supabase() { return supabaseMock.current; },
}));

let app;

async function buildApp() {
  vi.resetModules();
  ({ default: app } = await import('../server.js'));
}

beforeEach(() => {
  supabaseMock.current = null;
});

describe('GET /api/events — Sichtbarkeit', () => {
  it('ausgeloggt: filtert auf visibility=public, kein .or()', async () => {
    supabaseMock.current = createSupabaseMock({
      authUser: null,
      fromResults: { events: { data: [{ id: 'e1', visibility: 'public', name: 'Public Cup' }], error: null } },
    });
    await buildApp();

    const res = await request(app).get('/api/events');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    const eventsBuilder = supabaseMock.current.__builders.events;
    expect(eventsBuilder.eq).toHaveBeenCalledWith('visibility', 'public');
    expect(eventsBuilder.or).not.toHaveBeenCalled();
  });

  it('eingeloggt: baut gueltigen .or()-Ausdruck (kein SELECT), inkl. eigener + Freundes-E-Mail', async () => {
    supabaseMock.current = createSupabaseMock({
      authUser: ME,
      fromResults: {
        events: { data: [{ id: 'e1', visibility: 'public' }], error: null },
        referrals: { data: [{ referred_user_id: 'friend-uuid' }], error: null },
      },
    });
    supabaseMock.current.auth.admin = {
      getUserById: vi.fn(async () => ({ data: { user: { email: 'friend@test.de' } }, error: null })),
    };
    await buildApp();

    const res = await request(app).get('/api/events').set('Authorization', 'Bearer tok');

    expect(res.status).toBe(200);
    const orArg = supabaseMock.current.__builders.events.or.mock.calls[0][0];
    expect(orArg).toContain('visibility.eq.public');
    expect(orArg).toContain('and(visibility.eq.friends,created_by.in.(');
    expect(orArg).toContain('"me@test.de"');
    expect(orArg).toContain('"friend@test.de"');
    // Kein Roh-SQL: PostgREST .or() kennt keine Subqueries.
    expect(orArg.toUpperCase()).not.toContain('SELECT');
  });

  it('eingeloggt ohne Freunde: .or() enthaelt nur die eigene E-Mail', async () => {
    supabaseMock.current = createSupabaseMock({
      authUser: ME,
      fromResults: {
        events: { data: [], error: null },
        referrals: { data: [], error: null },
      },
    });
    supabaseMock.current.auth.admin = { getUserById: vi.fn() };
    await buildApp();

    const res = await request(app).get('/api/events').set('Authorization', 'Bearer tok');

    expect(res.status).toBe(200);
    const orArg = supabaseMock.current.__builders.events.or.mock.calls[0][0];
    expect(orArg).toContain('"me@test.de"');
    // Keine Freundes-E-Mail in der in-Liste (der Ausdruck enthält zwar
    // "visibility.eq.friends", aber keine zusätzliche eingequotete Adresse).
    expect(orArg).toBe('visibility.eq.public,and(visibility.eq.friends,created_by.in.("me@test.de"))');
    expect(supabaseMock.current.auth.admin.getUserById).not.toHaveBeenCalled();
  });
});

describe('POST /api/events — visibility-Gate', () => {
  async function postAppFor(user) {
    supabaseMock.current = createSupabaseMock({
      authUser: user,
      fromResults: {
        events: { data: { id: 'e-new' }, error: null },
        event_templates: { data: null, error: null },
      },
    });
    await buildApp();
  }

  const body = { name: 'Cup', start_date: '2026-08-01', end_date: '2026-08-10', visibility: 'friends' };

  it('Free-User: friends-Sichtbarkeit faellt still auf public zurueck', async () => {
    await postAppFor({ ...ME, user_metadata: {} });

    const res = await request(app).post('/api/events').set('Authorization', 'Bearer tok').send(body);

    expect(res.status).toBe(201);
    const inserted = supabaseMock.current.__builders.events.insert.mock.calls[0][0];
    expect(inserted.visibility).toBe('public');
  });

  it('Friends-Plan: friends-Sichtbarkeit wird uebernommen', async () => {
    const future = new Date(Date.now() + 300 * 24 * 3600 * 1000).toISOString();
    await postAppFor({ ...ME, user_metadata: { premium_plan_id: 'friends', premium_expires_at: future } });

    const res = await request(app).post('/api/events').set('Authorization', 'Bearer tok').send(body);

    expect(res.status).toBe(201);
    const inserted = supabaseMock.current.__builders.events.insert.mock.calls[0][0];
    expect(inserted.visibility).toBe('friends');
  });
});

describe('POST /api/events/:id/invite', () => {
  // Regression: an der Query-Kette hing ein `.catch(...)`. Der Supabase-Builder
  // ist aber nur ein PromiseLike (nur `then`, kein `catch`) — der Aufruf warf
  // synchron einen TypeError, sodass JEDE Einladung im 500er des aeusseren
  // try/catch endete.
  it('legt die Einladungen an und liefert sie zurueck (kein 500)', async () => {
    supabaseMock.current = createSupabaseMock({
      authUser: ME,
      fromResults: {
        event_invitations: { data: { id: 'inv-1', invitee_id: 'freund@test.de' }, error: null },
      },
    });
    await buildApp();

    const res = await request(app)
      .post('/api/events/evt-1/invite')
      .set('Authorization', 'Bearer tok')
      .send({ invitee_emails: ['freund@test.de'] });

    expect(res.status).toBe(201);
    expect(res.body.invitations).toHaveLength(1);
    const inserted = supabaseMock.current.__builders.event_invitations.insert.mock.calls[0][0];
    expect(inserted).toMatchObject({
      event_id: 'evt-1',
      inviter_id: ME.email,
      invitee_id: 'freund@test.de',
      status: 'pending',
    });
  });

  it('lehnt einen leeren invitee_emails-Array ab (400)', async () => {
    supabaseMock.current = createSupabaseMock({ authUser: ME });
    await buildApp();

    const res = await request(app)
      .post('/api/events/evt-1/invite')
      .set('Authorization', 'Bearer tok')
      .send({ invitee_emails: [] });

    expect(res.status).toBe(400);
  });
});
