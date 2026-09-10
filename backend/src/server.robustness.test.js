import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Verifiziert, dass in async-Handlern GEWORFENE Fehler (nicht nur zurückgegebene
// {error}-Objekte) dank express-async-errors an die zentrale Error-Middleware
// gehen — sonst würde der Request in Express 4 bis zum Plattform-Timeout hängen.
const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { current: null } }));
vi.mock('./lib/supabase.js', () => ({
  get supabase() { return supabaseMock.current; },
  supabaseUrl: 'https://test.supabase.co',
  supabaseKey: 'test-key',
}));

let app;

beforeEach(async () => {
  vi.resetModules();
  ({ default: app } = await import('./server.js'));
});

describe('Async-Fehlerbehandlung im Backend', () => {
  it('liefert 500 statt zu hängen, wenn ein async-Handler wirft', async () => {
    supabaseMock.current = {
      auth: { signInWithPassword: vi.fn(async () => { throw new Error('Netzwerkfehler'); }) },
    };
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.de', password: 'geheim' });
    expect(res.status).toBe(500);
    // Generische Meldung aus dem zentralen errorLogger (lib/logger.js) — der
    // echte Fehler wird nur serverseitig geloggt, nie an den Client gereicht.
    expect(res.body.error).toBe('Interner Fehler');
    expect(res.body.requestId).toBeTruthy();
  });

  it('liefert 504, wenn ein Upstream-Timeout durchgereicht wird', async () => {
    supabaseMock.current = {
      auth: {
        signInWithPassword: vi.fn(async () => {
          const err = new Error('Zeitüberschreitung');
          err.name = 'FetchTimeoutError';
          err.timeout = true;
          throw err;
        }),
      },
    };
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.de', password: 'geheim' });
    expect(res.status).toBe(504);
  });
});
