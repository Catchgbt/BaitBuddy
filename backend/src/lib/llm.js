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

export function getGroqKey() {
  return process.env.GROQ_API_KEY || null;
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

  // 2048 statt 1024: Schritt-für-Schritt-Anleitungen des KI-Buddys (Montage,
  // Köderführung) brauchen mehr Platz und dürfen nicht mitten im Schritt enden.
  const requestBody = JSON.stringify({ model, messages, max_tokens: 2048 });
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
      let errorMsg = body.slice(0, 300);

      // Bessere Fehlerdiagnose für häufige Probleme
      if (res.status === 401 || res.status === 403) {
        errorMsg = `Groq-Auth-Fehler ${res.status}: Ungültiger oder fehlender API-Key. Bitte GROQ_API_KEY überprüfen.`;
        console.error('[LLM]', errorMsg);
      } else if (res.status === 429) {
        errorMsg = `Groq Rate-Limit (429): Zu viele Anfragen. Versuch später erneut.`;
      } else {
        errorMsg = `Groq API Fehler ${res.status}: ${errorMsg}`;
      }

      const err = new Error(errorMsg);
      // Nur transiente Status erneut versuchen; 4xx (außer 429) sofort werfen.
      if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_LLM_RETRIES) {
        lastErr = err;
        console.warn(`[LLM] Versuch ${attempt + 1}/${MAX_LLM_RETRIES} nach ${res.status}...`);
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

/**
 * Wie invokeLLM, aber gestreamt (Groq stream:true). Ruft `onDelta` je Text-
 * Stück auf und liefert am Ende den akkumulierten Volltext. Bewusst OHNE
 * Retry-Logik: ein bereits begonnener SSE-Stream lässt sich nicht sauber
 * wiederholen — bei Fehler wirft die Funktion, der Aufrufer fällt dann auf den
 * Nicht-Stream-Pfad (invokeLLM) zurück. Nur Text (kein Vision-Streaming).
 *
 * @param {{ prompt: string, onDelta?: (text: string) => void, signal?: AbortSignal }} params
 * @returns {Promise<string>} vollständiger Antworttext
 */
export async function invokeLLMStream({ prompt, onDelta, signal }) {
  const apiKey = getGroqKey();
  if (!apiKey) {
    throw new Error('KI-Service nicht verfügbar – GROQ_API_KEY fehlt in den Server-Einstellungen.');
  }

  const requestBody = JSON.stringify({
    model: TEXT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2048,
    stream: true,
  });

  // Direktes fetch statt fetchWithTimeout: Wir brauchen für den Stream sowohl
  // ein hartes Timeout ALS AUCH das externe Abbruch-Signal (Client-Disconnect).
  // fetchWithTimeout überschreibt ein übergebenes signal, deshalb hier selbst
  // kombinieren.
  const timeoutSignal = AbortSignal.timeout(LLM_TIMEOUT_MS);
  const combinedSignal = signal ? AbortSignal.any([timeoutSignal, signal]) : timeoutSignal;

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: requestBody,
    signal: combinedSignal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq API Fehler ${res.status}: ${body.slice(0, 300)}`);
  }
  if (!res.body) {
    throw new Error('Groq API lieferte keinen Stream-Body.');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  // Verarbeitet eine komplette SSE-Zeile ("data: {...}" oder "data: [DONE]").
  const handleLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    const payload = trimmed.slice(5).trim();
    if (payload === '[DONE]') return;
    try {
      const json = JSON.parse(payload);
      const delta = json?.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta.length) {
        full += delta;
        onDelta?.(delta);
      }
    } catch {
      // Unvollständige/fehlerhafte Zeile ignorieren (Groq sendet nur ganze Events).
    }
  };

  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let nlIndex;
    while ((nlIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nlIndex);
      buffer = buffer.slice(nlIndex + 1);
      handleLine(line);
    }
  }
  // Letzten Rest verarbeiten (falls kein abschließendes \n kam).
  if (buffer.trim()) handleLine(buffer);

  return full;
}
