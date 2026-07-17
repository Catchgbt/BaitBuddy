import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ioredis wird gemockt — die Tests laufen ohne echten Netz-/Redis-Zugriff.
// Der Client selbst wird im Modul-Scope nur erzeugt, wenn KV_URL gesetzt ist;
// hier reicht ein Stub mit on() und call().
vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    // SCRIPT LOAD (von RedisStore.init) muss einen SHA-String liefern, sonst
    // wirft rate-limit-redis "unexpected reply". Alles andere: numerischer Count.
    call: vi.fn(async (cmd) =>
      String(cmd).toUpperCase() === 'SCRIPT' ? 'test-sha' : 1
    ),
  })),
}));

const ORIGINAL_KV_URL = process.env.KV_URL;
const ORIGINAL_REDIS_URL = process.env.REDIS_URL;

function restoreEnv(key, value) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

beforeEach(() => {
  // rateLimit.js liest die Env beim Modul-Import — vor jedem Import zuruecksetzen.
  vi.resetModules();
  delete process.env.KV_URL;
  delete process.env.REDIS_URL;
});

afterEach(() => {
  restoreEnv('KV_URL', ORIGINAL_KV_URL);
  restoreEnv('REDIS_URL', ORIGINAL_REDIS_URL);
});

describe('createRateLimitStore', () => {
  it('gibt ohne KV_URL undefined zurueck (MemoryStore-Fallback)', async () => {
    const mod = await import('./rateLimit.js');
    expect(mod.createRateLimitStore()).toBeUndefined();
  });

  it('liefert mit gesetztem KV_URL einen RedisStore', async () => {
    process.env.KV_URL = 'redis://localhost:6379';
    const mod = await import('./rateLimit.js');
    const store = mod.createRateLimitStore();
    expect(store).toBeDefined();
    // rate-limit-redis RedisStore erfuellt das express-rate-limit Store-Interface.
    expect(typeof store.increment).toBe('function');
  });

  it('nutzt REDIS_URL als Fallback fuer KV_URL', async () => {
    process.env.REDIS_URL = 'redis://localhost:6380';
    const mod = await import('./rateLimit.js');
    expect(mod.createRateLimitStore()).toBeDefined();
  });
});

describe('Rate-Limiter-Middleware', () => {
  it('exportiert konfigurierte Middleware fuer KI- und Auth-Endpunkte', async () => {
    const mod = await import('./rateLimit.js');
    expect(typeof mod.aiRateLimiter).toBe('function');
    expect(typeof mod.ttsRateLimiter).toBe('function');
    expect(typeof mod.authRateLimiter).toBe('function');
  });
});

describe('rateLimitKeyGenerator', () => {
  // Auf Vercel ist req.ip die interne Proxy-Adresse — der Key muss aus den
  // vertrauenswuerdigen Client-IP-Headern kommen, sonst teilen sich alle
  // Nutzer denselben Limit-Zaehler.
  it('bevorzugt x-vercel-forwarded-for vor anderen Headern und req.ip', async () => {
    const { rateLimitKeyGenerator } = await import('./rateLimit.js');
    const key = rateLimitKeyGenerator({
      headers: {
        'x-vercel-forwarded-for': '203.0.113.7',
        'x-real-ip': '198.51.100.1',
        'x-forwarded-for': '192.0.2.1, 10.0.0.1',
      },
      ip: '10.0.0.2',
    });
    expect(key).toBe('203.0.113.7');
  });

  it('nimmt bei x-forwarded-for den ersten (Client-)Eintrag', async () => {
    const { rateLimitKeyGenerator } = await import('./rateLimit.js');
    const key = rateLimitKeyGenerator({
      headers: { 'x-forwarded-for': '192.0.2.1, 10.0.0.1' },
      ip: '10.0.0.2',
    });
    expect(key).toBe('192.0.2.1');
  });

  it('faellt ohne Header auf req.ip zurueck', async () => {
    const { rateLimitKeyGenerator } = await import('./rateLimit.js');
    expect(rateLimitKeyGenerator({ headers: {}, ip: '10.1.2.3' })).toBe('10.1.2.3');
  });

  it('normalisiert IPv6-Adressen auf ihr Subnetz (ipKeyGenerator)', async () => {
    const { rateLimitKeyGenerator } = await import('./rateLimit.js');
    const a = rateLimitKeyGenerator({
      headers: { 'x-vercel-forwarded-for': '2001:db8:0:1:aaaa::1' },
      ip: undefined,
    });
    const b = rateLimitKeyGenerator({
      headers: { 'x-vercel-forwarded-for': '2001:db8:0:1:bbbb::2' },
      ip: undefined,
    });
    // Gleiches /56-Subnetz ⇒ gleicher Key; vollstaendige Adresse taucht nicht auf.
    expect(a).toBe(b);
    expect(a).toContain('/');
  });
});
