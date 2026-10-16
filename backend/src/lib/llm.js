// OpenAI Responses API: gemeinsame Anbindung für Buddy, Werkzeuge und Vision.
// Der Schlüssel bleibt ausschließlich im Backend. Keine Response-Persistierung.
const OPENAI_URL = 'https://api.openai.com/v1/responses';
const LLM_TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export function getOpenAIKey() {
  const value = process.env.OPENAI_API_KEY;
  if (typeof value !== 'string') return null;
  return value.trim().replace(/^["']|["']$/g, '').trim() || null;
}

export function getLLMConfig() {
  return {
    provider: 'OpenAI',
    model: process.env.OPENAI_MODEL?.trim() || 'gpt-5.4-mini',
    configured: !!getOpenAIKey(),
  };
}

function llmError(code, message, status = 502) {
  return Object.assign(new Error(message), { code, status });
}

function requireKey() {
  const key = getOpenAIKey();
  if (!key) throw llmError('LLM_NOT_CONFIGURED', 'KI-Service nicht konfiguriert: OPENAI_API_KEY fehlt.', 503);
  return key;
}

function imageUrl(image) {
  if (/^data:image\/[a-z+.-]+;base64,/i.test(image)) return image;
  const type = /^iVBORw0KGgo/.test(image) ? 'png'
    : /^R0lGOD/.test(image) ? 'gif'
      : /^UklGR/.test(image) ? 'webp' : 'jpeg';
  return `data:image/${type};base64,${image}`;
}

function requestBody(prompt, imageBase64, stream = false) {
  return JSON.stringify({
    model: getLLMConfig().model,
    store: false,
    max_output_tokens: 2048,
    input: [{ role: 'user', content: [
      { type: 'input_text', text: prompt },
      ...(imageBase64 ? [{ type: 'input_image', image_url: imageUrl(imageBase64) }] : []),
    ] }],
    ...(stream ? { stream: true } : {}),
  });
}

function requestOptions(key, body, signal) {
  return { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body, signal };
}

async function upstreamError(res) {
  // Provider-Response nicht an Nutzer oder Logs weiterreichen (kann Input enthalten).
  await res.text().catch(() => '');
  if (res.status === 401 || res.status === 403) {
    return llmError('LLM_AUTH_ERROR', `OpenAI Auth-Fehler ${res.status}`, 503);
  }
  return llmError('LLM_UPSTREAM_ERROR', `OpenAI API Fehler ${res.status}`, res.status === 429 ? 429 : 502);
}

function extractText(response) {
  if (response?.status !== 'completed') {
    throw llmError('LLM_INCOMPLETE', 'OpenAI lieferte keine vollständige Antwort.');
  }
  if (!Array.isArray(response.output)) throw llmError('LLM_EMPTY_RESPONSE', 'OpenAI lieferte eine unerwartete Antwortstruktur.');
  const blocks = response.output.flatMap(item => item.type === 'message' ? item.content || [] : []);
  if (blocks.some(block => block.type === 'refusal')) {
    throw llmError('LLM_REFUSAL', 'Die KI kann diese Anfrage nicht beantworten.', 422);
  }
  const text = blocks.filter(block => block.type === 'output_text' && typeof block.text === 'string').map(block => block.text).join('');
  if (!text.trim()) throw llmError('LLM_EMPTY_RESPONSE', 'OpenAI lieferte eine unerwartete Antwortstruktur (keine Nachricht).');
  return text;
}

function reportUsage(response, onUsage) {
  if (response?.usage && onUsage) {
    onUsage({ input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens });
  }
}

export async function invokeLLM({ prompt, imageBase64 = null, onUsage = null }) {
  const key = requireKey();
  const body = requestBody(prompt, imageBase64);
  // Ein Zeitbudget für alle Versuche, einschließlich Lesen des Response-Bodys.
  const signal = AbortSignal.timeout(LLM_TIMEOUT_MS);
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(OPENAI_URL, requestOptions(key, body, signal));
      if (!res.ok) {
        const error = await upstreamError(res);
        if (!RETRYABLE_STATUS.has(res.status)) throw error;
        if (attempt === MAX_RETRIES) throw error;
      } else {
        const response = await res.json();
        reportUsage(response, onUsage);
        return extractText(response);
      }
    } catch (error) {
      if (signal.aborted) throw llmError('LLM_TIMEOUT', 'Die KI-Anfrage hat zu lange gedauert (Timeout).', 504);
      if (error.code || attempt === MAX_RETRIES) throw error;
    }
    if (process.env.NODE_ENV !== 'test') {
      await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
}

export async function invokeLLMStream({ prompt, onDelta, signal, onUsage = null }) {
  const key = requireKey();
  const timeout = AbortSignal.timeout(LLM_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([timeout, signal]) : timeout;
  let full = '';
  let completed = false;
  let buffer = '';
  const decoder = new TextDecoder();
  const handleLine = line => {
    if (!line.startsWith('data:')) return;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') return;
    let event;
    try { event = JSON.parse(payload); } catch {
      throw llmError('LLM_INVALID_STREAM', 'Ungültiges KI-Stream-Ereignis.');
    }
    if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') {
      full += event.delta;
      onDelta?.(event.delta);
    } else if (event.type === 'response.completed') {
      reportUsage(event.response, onUsage);
      // Refusals, leere oder abgeschnittene Antworten nicht als Erfolg behandeln.
      extractText(event.response);
      completed = true;
    } else if (['error', 'response.failed', 'response.incomplete'].includes(event.type)) {
      reportUsage(event.response, onUsage);
      throw llmError('LLM_STREAM_ERROR', 'Die KI-Antwort wurde nicht vollständig übertragen.');
    }
  };
  try {
    const res = await fetch(OPENAI_URL, requestOptions(key, requestBody(prompt, null, true), combined));
    if (!res.ok) throw await upstreamError(res);
    if (!res.body) throw llmError('LLM_EMPTY_STREAM', 'OpenAI lieferte keinen Stream-Body.');
    // Kein Retry im Stream: bereits ausgegebene Wörter dürfen nicht doppelt kommen.
    for await (const chunk of res.body) {
      buffer += decoder.decode(chunk, { stream: true });
      let newline;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        handleLine(buffer.slice(0, newline).trimEnd());
        buffer = buffer.slice(newline + 1);
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) handleLine(buffer.trimEnd());
    if (!completed || !full.trim()) throw llmError('LLM_INCOMPLETE', 'Die KI-Antwort wurde nicht vollständig übertragen.');
    return full;
  } catch (error) {
    if (timeout.aborted) throw llmError('LLM_TIMEOUT', 'Die KI-Anfrage hat zu lange gedauert (Timeout).', 504);
    throw error;
  }
}
