import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { invokeLLM, invokeLLMStream, getOpenAIKey, getLLMConfig } from './llm.js';

const response = (text = 'Hallo', extra = {}) => ({
  status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }], ...extra,
});
const ok = (data = response()) => ({ ok: true, json: async () => data });
const failure = status => ({ ok: false, status, text: async () => 'private upstream details' });
const event = value => `data: ${JSON.stringify(value)}\r\n\r\n`;
function stream(chunks) {
  return { ok: true, body: (async function* () { for (const chunk of chunks) yield new TextEncoder().encode(chunk); })() };
}

beforeEach(() => { vi.stubEnv('OPENAI_API_KEY', 'test-openai-key'); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('OpenAI Responses API', () => {
  it('sendet Text serverseitig, ohne Speicherung, und meldet echte Tokenzahlen', async () => {
    const onUsage = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(ok(response('Hallo', { usage: { input_tokens: 20, output_tokens: 4 } })));
    vi.stubGlobal('fetch', fetchMock);
    expect(await invokeLLM({ prompt: 'Petri', onUsage })).toBe('Hallo');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(options.headers.Authorization).toBe('Bearer test-openai-key');
    expect(JSON.parse(options.body)).toEqual({ model: 'gpt-5.4-mini', store: false, max_output_tokens: 2048,
      input: [{ role: 'user', content: [{ type: 'input_text', text: 'Petri' }] }] });
    expect(onUsage).toHaveBeenCalledWith({ input_tokens: 20, output_tokens: 4 });
  });

  it.each([
    ['QUJD', 'data:image/jpeg;base64,QUJD'],
    ['iVBORw0KGgoAAA', 'data:image/png;base64,iVBORw0KGgoAAA'],
    ['data:image/webp;base64,ABC', 'data:image/webp;base64,ABC'],
  ])('übergibt Bilder im Responses-Format: %s', async (imageBase64, expected) => {
    const fetchMock = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', fetchMock);
    await invokeLLM({ prompt: 'Fisch bestimmen', imageBase64 });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).input[0].content[1]).toEqual({ type: 'input_image', image_url: expected });
  });

  it('verwendet ausschließlich OPENAI_API_KEY, trimmt und erlaubt ein konfiguriertes Modell', () => {
    vi.stubEnv('OPENAI_API_KEY', ' "sk-project-example" \n');
    vi.stubEnv('OPENAI_MODEL', ' gpt-4.1 ');
    expect(getOpenAIKey()).toBe('sk-project-example');
    expect(getLLMConfig()).toEqual({ provider: 'OpenAI', model: 'gpt-4.1', configured: true });
    vi.stubEnv('OPENAI_API_KEY', ' ');
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-unused');
    expect(getOpenAIKey()).toBeNull();
    expect(getLLMConfig().configured).toBe(false);
  });

  it('blockiert ohne OpenAI-Key vor dem Netzwerkaufruf, auch mit altem Anthropic-Key', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(invokeLLM({ prompt: 'x' })).rejects.toMatchObject({ code: 'LLM_NOT_CONFIGURED', status: 503 });
    await expect(invokeLLMStream({ prompt: 'x' })).rejects.toMatchObject({ code: 'LLM_NOT_CONFIGURED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([429, 503])('wiederholt transiente HTTP-%s-Fehler begrenzt', async status => {
    const fetchMock = vi.fn().mockResolvedValueOnce(failure(status)).mockResolvedValueOnce(ok());
    vi.stubGlobal('fetch', fetchMock);
    expect(await invokeLLM({ prompt: 'x' })).toBe('Hallo');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('stoppt nach drei Versuchen und verrät keine Provider-Details', async () => {
    const fetchMock = vi.fn().mockResolvedValue(failure(429));
    vi.stubGlobal('fetch', fetchMock);
    await expect(invokeLLM({ prompt: 'x' })).rejects.toMatchObject({ status: 429, message: 'OpenAI API Fehler 429' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each([400, 401, 403])('wiederholt HTTP-%s nicht', async status => {
    const fetchMock = vi.fn().mockResolvedValue(failure(status));
    vi.stubGlobal('fetch', fetchMock);
    await expect(invokeLLM({ prompt: 'x' })).rejects.toThrow(new RegExp(String(status)));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('wiederholt Netzwerkfehler', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(ok());
    vi.stubGlobal('fetch', fetchMock);
    expect(await invokeLLM({ prompt: 'x' })).toBe('Hallo');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    response('', {}),
    response('abgeschnitten', { status: 'incomplete' }),
    response('x', { output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }] }),
  ])('akzeptiert leere, unvollständige oder abgelehnte Antworten nicht', async data => {
    const fetchMock = vi.fn().mockResolvedValue(ok(data));
    vi.stubGlobal('fetch', fetchMock);
    await expect(invokeLLM({ prompt: 'x' })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('OpenAI Streaming', () => {
  it('verarbeitet Chunkgrenzen, CRLF, Abschluss und echte Nutzungswerte', async () => {
    const first = event({ type: 'response.output_text.delta', delta: 'Hallo ' });
    const usage = { input_tokens: 8, output_tokens: 5 };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(stream([
      first.slice(0, 30), first.slice(30) + event({ type: 'response.output_text.delta', delta: 'Welt.' }),
      event({ type: 'response.completed', response: response('Hallo Welt.', { usage }) }).trimEnd(),
    ])));
    const onDelta = vi.fn();
    const onUsage = vi.fn();
    expect(await invokeLLMStream({ prompt: 'x', onDelta, onUsage })).toBe('Hallo Welt.');
    expect(onDelta.mock.calls.map(([text]) => text)).toEqual(['Hallo ', 'Welt.']);
    expect(onUsage).toHaveBeenCalledWith(usage);
  });

  it.each(['response.failed', 'response.incomplete', 'error'])('wirft bei %s ohne Stream-Retry', async type => {
    const fetchMock = vi.fn().mockResolvedValue(stream([event({ type })]));
    vi.stubGlobal('fetch', fetchMock);
    await expect(invokeLLMStream({ prompt: 'x' })).rejects.toMatchObject({ code: 'LLM_STREAM_ERROR' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('erkennt einen abgebrochenen Stream statt Teiltext als Erfolg zu melden', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(stream([event({ type: 'response.output_text.delta', delta: 'Teil' })])));
    await expect(invokeLLMStream({ prompt: 'x' })).rejects.toMatchObject({ code: 'LLM_INCOMPLETE' });
  });

  it('reicht den Abbruch durch den Client an fetch weiter', async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
      expect(options.signal.aborted).toBe(true);
      throw new DOMException('Abgebrochen', 'AbortError');
    }));
    await expect(invokeLLMStream({ prompt: 'x', signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });
});

it('beendet ein abgelaufenes Gesamtzeitbudget ohne weitere Versuche', async () => {
  const controller = new AbortController();
  controller.abort();
  vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
  const fetchMock = vi.fn().mockRejectedValue(new DOMException('Timeout', 'AbortError'));
  vi.stubGlobal('fetch', fetchMock);
  await expect(invokeLLM({ prompt: 'x' })).rejects.toMatchObject({ code: 'LLM_TIMEOUT', status: 504 });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
