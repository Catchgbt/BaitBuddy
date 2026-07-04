import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, entities, auth } from './frontendClient';

function jsonResponse(body, { ok = true, status = ok ? 200 : 400 } = {}) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

describe('ApiClient.request', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('sendet keinen Authorization-Header ohne gespeichertes Token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await api.get('/api/health');

    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers.Authorization).toBeUndefined();
  });

  it('haengt das gespeicherte Token als Bearer-Header an', async () => {
    api.setToken('token-123');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await api.get('/api/health');

    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers.Authorization).toBe('Bearer token-123');
  });

  it('erneuert das Token bei 401 einmalig und wiederholt die Anfrage', async () => {
    api.setToken('expired-token');
    api.setRefreshToken('refresh-token');

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'Ungueltiger Token' }, { ok: false, status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ token: 'fresh-token', refresh_token: 'fresh-refresh' }))
      .mockResolvedValueOnce(jsonResponse({ id: 1, name: 'Erfolg' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await api.get('/api/catches/1');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ id: 1, name: 'Erfolg' });
    expect(api.getToken()).toBe('fresh-token');
    expect(api.getRefreshToken()).toBe('fresh-refresh');
  });

  it('raeumt Tokens auf, wenn der Refresh-Versuch fehlschlaegt', async () => {
    api.setToken('expired-token');
    api.setRefreshToken('refresh-token');

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'Ungueltiger Token' }, { ok: false, status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ error: 'Refresh ungueltig' }, { ok: false, status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.get('/api/catches/1')).rejects.toThrow();

    expect(api.getToken()).toBeNull();
    expect(api.getRefreshToken()).toBeNull();
  });

  it('versucht bei /api/auth/login keinen Refresh, auch bei 401', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'Falsche Zugangsdaten' }, { ok: false, status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.post('/api/auth/login', { email: 'a@b.de', password: 'x' })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('entities (frontendClient)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('list() liefert ein leeres Array, wenn der Server einen Fehler meldet', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ error: 'Serverfehler' }, { ok: false, status: 500 })
    ));

    const result = await entities.Catch.list();
    expect(result).toEqual([]);
  });

  it('list() liefert die Server-Liste bei Erfolg', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([{ id: 1 }, { id: 2 }])));

    const result = await entities.Catch.list();
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('create() wirft bei einem Serverfehler statt ein Fake-Objekt zu liefern', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ error: 'Ungueltige Daten' }, { ok: false, status: 400 })
    ));

    await expect(entities.Catch.create({ species: 'Hecht' })).rejects.toThrow('Ungueltige Daten');
  });

  it('get() liefert null bei einem Fehler statt zu werfen', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ error: 'Nicht gefunden' }, { ok: false, status: 404 })
    ));

    const result = await entities.Catch.get('123');
    expect(result).toBeNull();
  });
});

describe('auth.login', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('speichert Token und Refresh-Token nach erfolgreichem Login', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ token: 'tok', refresh_token: 'ref', user: { email: 'a@b.de' } })
    ));

    await auth.login('a@b.de', 'geheim');

    expect(api.getToken()).toBe('tok');
    expect(api.getRefreshToken()).toBe('ref');
  });
});
