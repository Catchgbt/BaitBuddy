import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchWithTimeout, FetchTimeoutError } from './fetchWithTimeout.js';

describe('fetchWithTimeout', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('gibt die Antwort zurück, wenn der Upstream rechtzeitig antwortet', async () => {
    const fake = { ok: true, json: async () => ({ hi: 1 }) };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fake));
    const res = await fetchWithTimeout('https://example.test', {}, 5000);
    expect(res).toBe(fake);
  });

  it('wirft FetchTimeoutError, wenn der Upstream nicht rechtzeitig antwortet', async () => {
    // fetch respektiert das AbortSignal und lehnt mit AbortError ab.
    vi.stubGlobal('fetch', vi.fn((url, opts) => new Promise((_, reject) => {
      opts.signal.addEventListener('abort', () => {
        const err = new Error('aborted');
        err.name = 'AbortError';
        reject(err);
      });
    })));
    await expect(fetchWithTimeout('https://slow.test', {}, 20)).rejects.toBeInstanceOf(FetchTimeoutError);
  });

  it('reicht andere Netzwerkfehler unverändert weiter', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(fetchWithTimeout('https://down.test', {}, 5000)).rejects.toThrow('ECONNREFUSED');
  });
});
