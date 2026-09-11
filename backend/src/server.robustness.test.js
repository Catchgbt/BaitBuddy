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

// POST /api/auth/login spricht GoTrue bewusst direkt per fetchWithTimeout an
// (nicht über supabase.auth.signInWithPassword), damit der geteilte
// Service-Role-Client keine User-Session bekommt — siehe routes/auth.js.
// Der Login bleibt hier trotzdem das Vehikel, um die Fehlerweitergabe zu prüfen.
const { fetchMock } = vi.hoisted(() => ({ fetchMock: { current: null } }));
vi.mock('./lib/fetchWithTimeout.js', () => ({
  fetchWithTimeout: (...args) => fetchMock.current(...args),
}));

let app;

beforeEach(async () => {
  vi.resetModules();
  supabaseMock.current = { auth: {} };
  ({ default: app } = await import('./server.js'));
});

describe('Async-Fehlerbehandlung im Backend', () => {
  it('liefert 500 statt zu hängen, wenn ein async-Handler wirft', async () => {
    fetchMock.current = vi.fn(async () => { throw new Error('Netzwerkfehler'); });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.de', password: 'geheim' });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Interner Fehler');
  });

  it('liefert 504, wenn ein Upstream-Timeout durchgereicht wird', async () => {
    fetchMock.current = vi.fn(async () => {
      const err = new Error('Zeitüberschreitung');
      err.name = 'FetchTimeoutError';
      err.timeout = true;
      throw err;
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.de', password: 'geheim' });
    expect(res.status).toBe(504);
  });
});
