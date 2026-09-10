import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requireCronAuth } from './cronAuth.js';

const SECRET = 'ein-langes-zufaelliges-cron-secret';

function mockReq(headers = {}, query = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    headers: lower,
    query,
    get: (name) => lower[String(name).toLowerCase()],
  };
}

function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) { res.statusCode = code; return res; },
    json(payload) { res.body = payload; return res; },
  };
  return res;
}

let warn;
beforeEach(() => {
  delete process.env.CRON_SECRET;
  delete process.env.ADMIN_API_KEY;
  warn = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
  delete process.env.CRON_SECRET;
  delete process.env.ADMIN_API_KEY;
});

describe('requireCronAuth', () => {
  it('lässt den Vercel-Cron-Header durch (Authorization: Bearer)', () => {
    process.env.CRON_SECRET = SECRET;
    const next = vi.fn();
    const res = mockRes();
    requireCronAuth(mockReq({ Authorization: `Bearer ${SECRET}` }), res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBeNull();
  });

  it('akzeptiert weiterhin x-cron-secret und x-api-key', () => {
    process.env.CRON_SECRET = SECRET;
    for (const header of ['x-cron-secret', 'x-api-key']) {
      const next = vi.fn();
      requireCronAuth(mockReq({ [header]: SECRET }), mockRes(), next);
      expect(next, header).toHaveBeenCalledOnce();
    }
  });

  it('weist ein falsches Secret mit 401 ab', () => {
    process.env.CRON_SECRET = SECRET;
    const next = vi.fn();
    const res = mockRes();
    requireCronAuth(mockReq({ Authorization: 'Bearer falsch' }), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('weist einen Aufruf ganz ohne Secret ab', () => {
    process.env.CRON_SECRET = SECRET;
    const next = vi.fn();
    const res = mockRes();
    requireCronAuth(mockReq(), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('hat KEIN Fallback-Secret: ohne Env wird jeder Aufruf abgewiesen', () => {
    // Regressionsschutz: vorher galt process.env.CRON_SECRET || 'dev-secret',
    // womit ein öffentlich bekanntes Passwort den Endpunkt geöffnet hat.
    for (const headers of [{}, { Authorization: 'Bearer dev-secret' }, { 'x-cron-secret': 'dev-secret' }]) {
      const next = vi.fn();
      const res = mockRes();
      requireCronAuth(mockReq(headers), res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(500);
    }
  });

  it('akzeptiert das Secret nicht mehr aus dem Query-String', () => {
    // Query-Strings landen in Access-Logs — dort gehört ein Secret nicht hin.
    process.env.CRON_SECRET = SECRET;
    const next = vi.fn();
    const res = mockRes();
    requireCronAuth(mockReq({}, { secret: SECRET }), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('fällt auf ADMIN_API_KEY zurück, wenn CRON_SECRET fehlt', () => {
    process.env.ADMIN_API_KEY = SECRET;
    const next = vi.fn();
    requireCronAuth(mockReq({ Authorization: `Bearer ${SECRET}` }), mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('lehnt ein Secret mit passendem Präfix, aber anderer Länge ab', () => {
    process.env.CRON_SECRET = SECRET;
    const next = vi.fn();
    const res = mockRes();
    requireCronAuth(mockReq({ Authorization: `Bearer ${SECRET}xyz` }), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });
});
