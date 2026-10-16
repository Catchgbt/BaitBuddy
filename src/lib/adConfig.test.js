import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let loadAdConfig;
let updateAdConfig;
let getAdConfig;
let fetchMock;

beforeEach(async () => {
  vi.resetModules();
  ({ loadAdConfig, updateAdConfig, getAdConfig } = await import('./adConfig'));
  fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ads_enabled: false }) });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Werbe-Konfiguration', () => {
  it('lädt den Hauptschalter vom Server und ergänzt fehlende Werberegeln', async () => {
    expect(await loadAdConfig()).toMatchObject({ ads_enabled: false, basic_banner_enabled: true });
    expect(fetchMock).toHaveBeenCalledWith('/api/ads/config', expect.objectContaining({ cache: 'no-store' }));
    expect(getAdConfig().ads_enabled).toBe(false);
  });

  it('nutzt den Cache bis zur expliziten Aktualisierung', async () => {
    await loadAdConfig();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ads_enabled: true }) });
    expect((await loadAdConfig()).ads_enabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await loadAdConfig({ fresh: true })).ads_enabled).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('umgeht auch einen gespeicherten Cache beim Wiederöffnen der App', async () => {
    localStorage.setItem('bb_ad_config', JSON.stringify({ ts: Date.now(), data: { ads_enabled: true } }));
    expect((await loadAdConfig()).ads_enabled).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await loadAdConfig({ fresh: true })).ads_enabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('verlängert die Lebensdauer eines gespeicherten Cache beim Lesen nicht', async () => {
    vi.useFakeTimers();
    localStorage.setItem('bb_ad_config', JSON.stringify({ ts: Date.now() - 299_000, data: { ads_enabled: true } }));
    await loadAdConfig();
    vi.advanceTimersByTime(1001);
    expect((await loadAdConfig()).ads_enabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('teilt parallele Aktualisierungen zwischen Polling und App-Resume', async () => {
    await Promise.all([loadAdConfig({ fresh: true }), loadAdConfig({ fresh: true }), loadAdConfig()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('behält die Admin-Änderung trotz einer verspäteten alten Serverantwort', async () => {
    let resolve;
    fetchMock.mockImplementation(() => new Promise(done => { resolve = done; }));
    const pending = loadAdConfig();
    updateAdConfig({ ads_enabled: true });
    resolve({ ok: true, json: async () => ({ ads_enabled: false }) });
    expect((await pending).ads_enabled).toBe(true);
    expect((await loadAdConfig()).ads_enabled).toBe(true);
    expect(JSON.parse(localStorage.getItem('bb_ad_config')).data.ads_enabled).toBe(true);
  });

  it.each(['network', 'http', 'json'])('kann nach einem %s-Fehler erneut aktualisieren', async failure => {
    if (failure === 'network') fetchMock.mockRejectedValueOnce(new Error('offline'));
    if (failure === 'http') fetchMock.mockResolvedValueOnce({ ok: false });
    if (failure === 'json') fetchMock.mockResolvedValueOnce({ ok: true, json: async () => { throw new Error('invalid JSON'); } });
    expect((await loadAdConfig()).ads_enabled).toBe(true);
    expect((await loadAdConfig({ fresh: true })).ads_enabled).toBe(false);
  });
});
