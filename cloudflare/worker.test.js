import { describe, it, expect, vi, afterEach } from 'vitest';
import worker, { backendTarget, isVercelFailure } from './worker.js';

const OLD = 'https://bait-buddy.vercel.app';
const NEW = 'https://bait-buddy-ssbedburg-2361s-projects.vercel.app';
const protectedEnv = { BACKEND_URL: OLD, VERCEL_BACKEND_URL: NEW, VERCEL_PROTECTION_BYPASS: 'geheim' };

afterEach(() => {
  vi.unstubAllGlobals();
});

const ssoRedirect = () => new Response(null, {
  status: 302,
  headers: { location: 'https://vercel.com/sso-api?url=https%3A%2F%2Fx.vercel.app%2Fapi%2Fhealth' },
});

describe('backendTarget – no stale API backend', () => {
  it('routes to the current deployment with the server-side bypass header', () => {
    expect(backendTarget({ ...protectedEnv, VERCEL_BACKEND_URL: `${NEW}/` }))
      .toEqual({ base: NEW, headers: { 'x-vercel-protection-bypass': 'geheim' }, canFallback: false });
  });

  it('supports the legacy name of the bypass secret', () => {
    expect(backendTarget({ ...protectedEnv, VERCEL_PROTECTION_BYPASS: undefined, VERCEL_PROTECTION: 'abc' }).headers)
      .toEqual({ 'x-vercel-protection-bypass': 'abc' });
  });

  it('fails closed rather than using the old backend when bypass is absent', () => {
    expect(() => backendTarget({ BACKEND_URL: OLD, VERCEL_BACKEND_URL: NEW }))
      .toThrow('VERCEL_PROTECTION_BYPASS is not configured');
  });

  it('blocks the retired origin even without VERCEL_BACKEND_URL', () => {
    expect(() => backendTarget({ BACKEND_URL: OLD })).toThrow('Legacy backend is retired');
  });

  it('supports a future independent backend container', () => {
    expect(backendTarget({ BACKEND_URL: 'https://baitbuddy-api.example.com/' }))
      .toEqual({ base: 'https://baitbuddy-api.example.com', headers: {}, canFallback: false });
  });

  it('rejects missing backend configuration', () => {
    expect(() => backendTarget({})).toThrow('BACKEND_URL is not configured');
  });
});

describe('fetch proxy – preserve requests and never fail over to outdated API', () => {
  it('forwards recipe POST to current backend with body, bearer and trusted bypass', async () => {
    const fetchMock = vi.fn(async () => new Response('{"error":"Kein Token"}', {
      status: 401, headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await worker.fetch(new Request('https://catchgbt.com/api/ai/fish-recipes?source=app', {
      method: 'POST',
      headers: { 'x-vercel-protection-bypass': 'client-spoof', authorization: 'Bearer test', 'content-type': 'application/json' },
      body: '{"species":"Hecht"}',
    }), protectedEnv);
    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sent = fetchMock.mock.calls[0][0];
    expect(sent.url).toBe(`${NEW}/api/ai/fish-recipes?source=app`);
    expect(sent.redirect).toBe('manual');
    expect(sent.method).toBe('POST');
    expect(sent.headers.get('x-vercel-protection-bypass')).toBe('geheim');
    expect(sent.headers.get('authorization')).toBe('Bearer test');
    expect(sent.headers.get('x-forwarded-host')).toBe('catchgbt.com');
    expect(await sent.text()).toBe('{"species":"Hecht"}');
  });

  it('returns explicit 503 when the bypass secret is missing; never contacts old backend', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = await worker.fetch(new Request('https://catchgbt.com/api/ai/fish-recipes', {
      method: 'POST', body: '{"species":"Hecht"}',
    }), { BACKEND_URL: OLD, VERCEL_BACKEND_URL: NEW });
    expect(res.status).toBe(503);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 503 without retrying against old origin if Vercel bypass is rejected', async () => {
    const fetchMock = vi.fn(async () => ssoRedirect());
    vi.stubGlobal('fetch', fetchMock);
    const res = await worker.fetch(new Request('https://catchgbt.com/api/ai/fish-recipes', {
      method: 'POST', body: '{"species":"Hecht"}',
    }), protectedEnv);
    expect(res.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0].url).toBe(`${NEW}/api/ai/fish-recipes`);
  });

  it('returns 503 on Vercel function crash without switching to outdated routes', async () => {
    const fetchMock = vi.fn(async () => new Response('A server error has occurred', {
      status: 500, headers: { server: 'Vercel', 'x-vercel-error': 'FUNCTION_INVOCATION_FAILED' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    expect((await worker.fetch(new Request('https://catchgbt.com/api/ai/fish-recipes'), protectedEnv)).status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns 503 for a network failure', async () => {
    const fetchMock = vi.fn(async () => { throw new Error('Connection refused'); });
    vi.stubGlobal('fetch', fetchMock);
    expect((await worker.fetch(new Request('https://catchgbt.com/api/health'), protectedEnv)).status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('passes genuine app errors through without hiding auth or quota failures', async () => {
    const fetchMock = vi.fn(async () => new Response('{"error":"Datenbankfehler"}', {
      status: 500, headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await worker.fetch(new Request('https://catchgbt.com/api/catches'), protectedEnv);
    expect(res.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('passes genuine backend 404 through; no silent legacy fallback', async () => {
    const fetchMock = vi.fn(async () => new Response('{"error":"Not found"}', {
      status: 404, headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await worker.fetch(new Request('https://catchgbt.com/api/unknown'), protectedEnv);
    expect(res.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('distinguishes platform failures from application responses', () => {
    expect(isVercelFailure(ssoRedirect())).toBe(true);
    expect(isVercelFailure(new Response('<html>', { status: 401, headers: { server: 'Vercel', 'content-type': 'text/html' } }))).toBe(true);
    expect(isVercelFailure(new Response('{"error":"Kein Token"}', { status: 401, headers: { server: 'Vercel', 'content-type': 'application/json' } }))).toBe(false);
    expect(isVercelFailure(new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } }))).toBe(false);
  });
});

describe('Cron – use only the current deployment', () => {
  it('calls the current backend with cron auth and bypass', async () => {
    const fetchMock = vi.fn(async () => new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);
    await worker.scheduled({ cron: '0 2 * * *' }, { ...protectedEnv, CRON_SECRET: 'c' }, { waitUntil: () => {} });
    expect(fetchMock).toHaveBeenCalledWith(`${NEW}/api/admin/events/auto-archive`, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'x-vercel-protection-bypass': 'geheim', Authorization: 'Bearer c' },
    });
  });

  it('rejects a protected Vercel failure without calling stale cron endpoints', async () => {
    const fetchMock = vi.fn(async () => ssoRedirect());
    vi.stubGlobal('fetch', fetchMock);
    await expect(worker.scheduled({ cron: '0 2 * * *' },
      { ...protectedEnv, CRON_SECRET: 'c' }, { waitUntil: () => {} }))
      .rejects.toThrow('Current backend unavailable or bypass rejected');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`${NEW}/api/admin/events/auto-archive`);
  });
});
