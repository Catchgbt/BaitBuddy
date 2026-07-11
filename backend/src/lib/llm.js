// Groq API (OpenAI-kompatibel) – kein SDK nötig, nutzt natives fetch.
import { fetchWithTimeout } from './fetchWithTimeout.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// LLM-Antworten können langsamer sein als andere Upstreams; großzügigeres
// Timeout, aber immer noch unter dem Vercel-Funktionslimit.
const LLM_TIMEOUT_MS = 30000;

// Text-Modell und Vision-Modell (für Bildanalyse)
const TEXT_MODEL = 'llama-3.3-70b-versatile';
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

// Transiente Upstream-Fehler (Rate-Limit, Gateway-/Server-Fehler) einmal kurz
// erneut versuchen, statt sie sofort als 5xx durchzureichen — direkt relevant
// für die Zuverlässigkeit des KI-Buddys. MAX_LLM_RETRIES sind ZUSÄTZLICHE Versuche.
const MAX_LLM_RETRIES = 2;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Exponentielles Backoff (500ms, 1000ms). In Tests ohne echte Wartezeit, damit
// die Retry-Tests nicht künstlich verlangsamt werden.
function backoffDelay(attempt) {
  if (process.env.NODE_ENV === 'test') return 0;
  return 500 * 2 ** attempt;
}

// Akzeptiert mehrere mögliche Variablennamen für den Groq-Key.
function getGroqKey() {
  return (
    process.env.GROQ_API_KEY ||
    process.env.GROG_API_KEY ||
    process.env.GROK_API_KEY ||
    null
  );
}

export async function invokeLLM({ prompt, imageBase64 = null }) {
  const apiKey = getGroqKey();
  if (!apiKey) {
    throw new Error('KI-Service nicht verfügbar – GROQ_API_KEY fehlt in den Server-Einstellungen.');
  }

  const messages = [];
  let model = TEXT_MODEL;

  if (imageBase64) {
    model = VISION_MODEL;
    const url = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;
    messages.push({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url } },
        { type: 'text', text: prompt }
      ]
    });
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  const requestBody = JSON.stringify({ model, messages, max_tokens: 1024 });
  let lastErr = null;

  for (let attempt = 0; attempt <= MAX_LLM_RETRIES; attempt++) {
    let res;
    try {
      res = await fetchWithTimeout(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: requestBody
      }, LLM_TIMEOUT_MS);
    } catch (e) {
      // Netzwerk-/Timeout-Fehler: begrenzt wiederholen.
      lastErr = e;
      if (attempt < MAX_LLM_RETRIES) {
        await sleep(backoffDelay(attempt));
        continue;
      }
      throw e;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err = new Error(`Groq API Fehler ${res.status}: ${body.slice(0, 300)}`);
      // Nur transiente Status erneut versuchen; 4xx (außer 429) sofort werfen.
      if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_LLM_RETRIES) {
        lastErr = err;
        await sleep(backoffDelay(attempt));
        continue;
      }
      throw err;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error('Groq API lieferte eine unerwartete Antwortstruktur (keine Nachricht).');
    }
    return content;
  }

  // Retries erschöpft (nur erreichbar, wenn der letzte Versuch transient war).
  throw lastErr || new Error('Groq API Fehler: unbekannt');
}
