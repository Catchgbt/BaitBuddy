import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { invokeLLM, invokeLLMStream, getAnthropicKey } from './llm.js';

// Baut aus SSE-Text-Stücken einen async-iterierbaren Response-Body (wie fetch
// ihn liefert), damit invokeLLMStream ihn Chunk für Chunk verarbeiten kann.
function sseBody(chunks) {
  return (async function* () {
    for (const c of chunks) yield new TextEncoder().encode(c);
  })();
}

describe('invokeLLM', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('liefert den Text der ersten Choice zurück', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'Hallo' }] }),
    }));
    const out = await invokeLLM({ prompt: 'test' });
    expect(out).toBe('Hallo');
  });

  it('wirft einen aussagekräftigen Fehler bei fehlender/leerer Antwortstruktur', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [] }),
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
      .mockResolvedValueOnce({ ok: true, json: async () => ({ content: [{ type: 'text', text: 'nach retry' }] }) });
    vi.stubGlobal('fetch', fetchMock);

    const out = await invokeLLM({ prompt: 'test' });
    expect(out).toBe('nach retry');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('wiederholt bei 429 und liefert nach erfolgreichem Retry', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 429, text: async () => 'rate limited' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ content: [{ type: 'text', text: 'ok' }] }) });
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
      return { ok: true, json: async () => ({ content: [{ type: 'text', text: 'bild-analyse' }] }) };
    }));

    const out = await invokeLLM({ prompt: 'analysiere', imageBase64: 'QUJD' });
    expect(out).toBe('bild-analyse');

    const content = sentBody.messages[0].content;
    expect(Array.isArray(content)).toBe(true);
    expect(content[0].source.type).toBe('base64');
    expect(content[0].source.media_type).toBe('image/jpeg');
    expect(content[0].source.data).toBe('QUJD');
    expect(content[1].text).toBe('analysiere');
  });

  it('zerlegt eine data-URL in media_type und rohe Base64-Daten', async () => {
    let sentBody;
    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      sentBody = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ content: [{ type: 'text', text: 'ok' }] }) };
    }));

    await invokeLLM({ prompt: 'x', imageBase64: 'data:image/png;base64,ABC' });
    expect(sentBody.messages[0].content[0].source.media_type).toBe('image/png');
    expect(sentBody.messages[0].content[0].source.data).toBe('ABC');
  });

  it('wirft, wenn kein Anthropic-Key gesetzt ist', async () => {
    const orig = {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
    };
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CLAUDE_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    try {
      await expect(invokeLLM({ prompt: 'test' })).rejects.toThrow(/ANTHROPIC_API_KEY/);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      for (const [k, v] of Object.entries(orig)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });
});

describe('invokeLLMStream', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parst SSE-Deltas, ruft onDelta pro Stück und liefert den Volltext', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      body: sseBody([
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hallo "}}\n\n',
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Welt."}}\n\n',
        'data: {"type":"message_stop"}\n\n',
      ]),
    }));

    const deltas = [];
    const full = await invokeLLMStream({ prompt: 'x', onDelta: (t) => deltas.push(t) });

    expect(deltas).toEqual(['Hallo ', 'Welt.']);
    expect(full).toBe('Hallo Welt.');
  });

  it('verarbeitet über Chunk-Grenzen zerrissene SSE-Zeilen korrekt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      // Ein Event ist über zwei Chunks verteilt (kein abschließendes \n im ersten).
      body: sseBody([
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Te',
        'il1"}}\n\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Teil2"}}\n\n',
      ]),
    }));

    const full = await invokeLLMStream({ prompt: 'x' });
    expect(full).toBe('Teil1Teil2');
  });

  it('wirft bei nicht-ok Response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'boom',
    }));
    await expect(invokeLLMStream({ prompt: 'x' })).rejects.toThrow(/500/);
  });
});

describe('getAnthropicKey — toleranter Env-Lookup', () => {
  const NAMES = ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY', 'NGROK_TOKEN'];
  const orig = {};

  beforeEach(() => {
    for (const k of NAMES) { orig[k] = process.env[k]; delete process.env[k]; }
  });

  afterEach(() => {
    for (const k of NAMES) {
      if (orig[k] === undefined) delete process.env[k];
      else process.env[k] = orig[k];
    }
  });

  it('nimmt ANTHROPIC_API_KEY direkt und trimmt Whitespace/Anführungszeichen', () => {
    process.env.ANTHROPIC_API_KEY = ' "sk-ant-test" \n';
    expect(getAnthropicKey()).toBe('sk-ant-test');
  });

  it('findet abweichend benannte Varianten wie CLAUDE_API_KEY', () => {
    process.env.CLAUDE_API_KEY = 'sk-ant-variant';
    expect(getAnthropicKey()).toBe('sk-ant-variant');
  });

  it('ignoriert Fremd-Variablen wie NGROK_TOKEN', () => {
    process.env.NGROK_TOKEN = 'not-a-claude-key';
    expect(getAnthropicKey()).toBe(null);
  });

  it('liefert null bei leerem Wert', () => {
    process.env.ANTHROPIC_API_KEY = '   ';
    expect(getAnthropicKey()).toBe(null);
  });
});
