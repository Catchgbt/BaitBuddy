import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, entities, auth, integrations } from './frontendClient';

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

  it('update() wirft bei einem Serverfehler statt ein Fake-Objekt zurueckzugeben', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ error: 'Nicht autorisiert' }, { ok: false, status: 403 })
    ));

    await expect(entities.Catch.update('123', { species: 'Zander' })).rejects.toThrow('Nicht autorisiert');
  });

  it('delete() wirft bei einem Serverfehler statt {ok:true} vorzutaeuschen', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ error: 'Nicht gefunden' }, { ok: false, status: 404 })
    ));

    await expect(entities.Catch.delete('123')).rejects.toThrow('Nicht gefunden');
  });

  it('bulkCreate() wirft bei einem Serverfehler statt [] zurueckzugeben', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ error: 'Ungueltige Daten' }, { ok: false, status: 400 })
    ));

    await expect(entities.Catch.bulkCreate([{ species: 'Aal' }])).rejects.toThrow('Ungueltige Daten');
  });
});

describe('integrations.Core.InvokeLLM (strukturierte Antworten)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const schema = { type: 'object', properties: { summary: { type: 'string' } } };

  it('parst eine Antwort, die direkt reines JSON ist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ reply: '{"summary": "gut"}' })
    ));
    const result = await integrations.Core.InvokeLLM({ prompt: 'x', response_json_schema: schema });
    expect(result).toEqual({ summary: 'gut' });
  });

  it('parst JSON aus einem Markdown-Codefence', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ reply: 'Hier ist das Ergebnis:\n```json\n{"summary": "prima"}\n```\nDanke!' })
    ));
    const result = await integrations.Core.InvokeLLM({ prompt: 'x', response_json_schema: schema });
    expect(result).toEqual({ summary: 'prima' });
  });

  it('parst JSON mit Prosa davor UND danach (Greedy-Regex haette hier versagt)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ reply: 'Klar, hier: {"summary": "ok"} Lass es mich wissen, falls du mehr brauchst!' })
    ));
    const result = await integrations.Core.InvokeLLM({ prompt: 'x', response_json_schema: schema });
    expect(result).toEqual({ summary: 'ok' });
  });

  it('liefert ein leeres Objekt, wenn kein JSON gefunden werden kann', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ reply: 'Tut mir leid, das kann ich nicht beantworten.' })
    ));
    const result = await integrations.Core.InvokeLLM({ prompt: 'x', response_json_schema: schema });
    expect(result).toEqual({});
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
