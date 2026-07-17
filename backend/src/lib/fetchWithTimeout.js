// Zentraler fetch-Wrapper mit hartem Timeout. Vercel-Serverless-Funktionen
// haben ein Plattform-Limit; ein langsamer Upstream (Groq, OpenAI, ElevenLabs,
// open-meteo, GoTrue) darf die Funktion nicht bis dorthin blockieren. Ohne
// AbortController hängt der Request und verursacht 504s und unnötige Kosten.
const DEFAULT_TIMEOUT_MS = 15000;

export class FetchTimeoutError extends Error {
  constructor(url, timeoutMs) {
    super(`Zeitüberschreitung nach ${timeoutMs}ms beim Aufruf von ${url}`);
    this.name = 'FetchTimeoutError';
    this.timeout = true;
  }
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    if (e?.name === 'AbortError') {
      throw new FetchTimeoutError(typeof url === 'string' ? url : 'upstream', timeoutMs);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
