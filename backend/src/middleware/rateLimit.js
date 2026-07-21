import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';

// Vercel terminiert die Verbindung am Edge-Proxy: ohne 'trust proxy' ist
// req.ip immer die interne Proxy-Adresse — damit zaehlten ALLE Nutzer in
// denselben Limit-Topf (20 KI-Requests/Minute global statt pro Nutzer) und
// express-rate-limit loggte pro Request zwei ValidationErrors
// (ERR_ERL_UNEXPECTED_X_FORWARDED_FOR / ERR_ERL_FORWARDED_HEADER). Die echte
// Client-IP kommt aus den von Vercel gesetzten, vertrauenswuerdigen Headern;
// ipKeyGenerator normalisiert IPv6-Adressen auf ihr Subnetz.
function clientIp(req) {
  const fwd = req.headers['x-vercel-forwarded-for']
    || req.headers['x-real-ip']
    || req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    const first = fwd.split(',')[0].trim();
    if (first) return first;
  }
  return req.ip || 'unknown';
}

export const rateLimitKeyGenerator = (req) => ipKeyGenerator(clientIp(req));

// Instanzuebergreifendes Rate-Limiting auf Vercel Serverless.
// Der Standard-MemoryStore von express-rate-limit zaehlt PRO Lambda-Instanz —
// bei mehreren gleichzeitigen Instanzen und kalten Starts ist das kein globales
// Limit. Mit gesetztem KV_URL (Vercel KV / Upstash Redis, ioredis-kompatibel)
// laeuft der Zaehler stattdessen ueber einen gemeinsamen Redis-Store, sodass das
// Limit global greift. Ohne KV_URL faellt es auf den MemoryStore zurueck (lokal,
// Dev, Tests laufen unveraendert). Faellt der KV-Store aus, blockiert das die
// App nicht (Fail-Open) — der Fehler wird geloggt, Requests laufen weiter.

const redisUrl = process.env.KV_URL || process.env.REDIS_URL;

// Modul-Scope-Singleton: auf Vercel wird der Client ueber warme Invocations
// hinweg wiederverwendet, statt pro Request neu zu verbinden.
let redisClient = null;
if (redisUrl) {
  redisClient = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableAutoPipelining: true,
  });
  redisClient.on('error', (err) => {
    console.error('[rateLimit] Redis-Store-Fehler (Fail-Open):', err.message);
  });
}

// Erzeugt fuer jeden Limiter einen eigenen RedisStore (express-rate-limit
// verlangt eine frische Store-Instanz pro Limiter). Ohne konfigurierten Redis
// gibt die Factory undefined zurueck ⇒ express-rate-limit nutzt den MemoryStore.
export function createRateLimitStore() {
  if (!redisClient) return undefined;
  return new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: 'bb:rl:',
  });
}

// KI-Chat/Analyse-Endpunkte (Claude LLM — echte Kosten pro Aufruf).
// Getrennt von TTS, damit Sprachausgabe das Chat-Budget nicht aufbraucht.
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: rateLimitKeyGenerator,
  store: createRateLimitStore(),
  message: { error: 'Zu viele KI-Anfragen — bitte kurz warten' },
});

// TTS-Endpunkt (ElevenLabs) — eigener Limiter, da jede Chat-Nachricht mit Voice
// automatisch einen TTS-Call ausloest und sonst das gemeinsame Budget doppelt
// belastet wird.
export const ttsRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: rateLimitKeyGenerator,
  store: createRateLimitStore(),
  message: { error: 'Zu viele Sprachanfragen — bitte kurz warten' },
});

// Auth-Endpunkte (Login/Register/Refresh) gegen Brute-Force/Credential-Stuffing.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: rateLimitKeyGenerator,
  store: createRateLimitStore(),
  message: { error: 'Zu viele Anmeldeversuche — bitte später erneut versuchen' },
});
