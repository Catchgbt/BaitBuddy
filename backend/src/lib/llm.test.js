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
});
