import { describe, it, expect, vi, afterEach } from 'vitest';
import { invokeLLM } from './llm.js';

describe('invokeLLM', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('liefert den Text der ersten Choice zurück', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Hallo' } }] }),
    }));
    const out = await invokeLLM({ prompt: 'test' });
    expect(out).toBe('Hallo');
  });

  it('wirft einen aussagekräftigen Fehler bei fehlender/leerer Antwortstruktur', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
    }));
    await expect(invokeLLM({ prompt: 'test' })).rejects.toThrow(/unerwartete Antwortstruktur/i);
  });

  it('wirft bei nicht-ok Response mit Status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    }));
    await expect(invokeLLM({ prompt: 'test' })).rejects.toThrow(/429/);
  });

  it('wiederholt bei transientem 503 und liefert nach erfolgreichem Retry', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'unavailable' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: 'nach retry' } }] }) });
    vi.stubGlobal('fetch', fetchMock);

    const out = await invokeLLM({ prompt: 'test' });
    expect(out).toBe('nach retry');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('wiederholt bei 429 und liefert nach erfolgreichem Retry', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 429, text: async () => 'rate limited' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) });
    vi.stubGlobal('fetch', fetchMock);

    const out = await invokeLLM({ prompt: 'test' });
    expect(out).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('wiederholt NICHT bei 400 (nicht-transienter Fehler)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'bad request' });
    vi.stubGlobal('fetch', fetchMock);

    await expect(invokeLLM({ prompt: 'test' })).rejects.toThrow(/400/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('nutzt das Vision-Modell und baut eine data-URL für imageBase64', async () => {
    let sentBody;
    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      sentBody = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'bild-analyse' } }] }) };
    }));

    const out = await invokeLLM({ prompt: 'analysiere', imageBase64: 'QUJD' });
    expect(out).toBe('bild-analyse');

    const content = sentBody.messages[0].content;
    expect(Array.isArray(content)).toBe(true);
    expect(content[0].image_url.url).toContain('data:image/jpeg;base64,QUJD');
    expect(content[1].text).toBe('analysiere');
  });

  it('übernimmt eine bereits vollständige data-URL unverändert', async () => {
    let sentBody;
    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      sentBody = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) };
    }));

    await invokeLLM({ prompt: 'x', imageBase64: 'data:image/png;base64,ABC' });
    expect(sentBody.messages[0].content[0].image_url.url).toBe('data:image/png;base64,ABC');
  });

  it('wirft, wenn kein Groq-Key gesetzt ist', async () => {
    const orig = {
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      GROG_API_KEY: process.env.GROG_API_KEY,
      GROK_API_KEY: process.env.GROK_API_KEY,
    };
    delete process.env.GROQ_API_KEY;
    delete process.env.GROG_API_KEY;
    delete process.env.GROK_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    try {
      await expect(invokeLLM({ prompt: 'test' })).rejects.toThrow(/GROQ_API_KEY/);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      for (const [k, v] of Object.entries(orig)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });
});
