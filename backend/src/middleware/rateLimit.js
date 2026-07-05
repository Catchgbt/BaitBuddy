import rateLimit from 'express-rate-limit';

// WICHTIG — Vercel-Einschränkung: express-rate-limit zählt im Standard-
// MemoryStore PRO Lambda-Instanz. Auf Vercel Serverless (mehrere gleichzeitige
// Instanzen, kalte Starts) ist das nur eine grobe Bremse gegen Cost-Abuse
// einzelner Clients, KEIN globales Limit. Für harte, instanzübergreifende
// Limits wäre ein externer Store nötig (z.B. Vercel KV / Upstash Redis) — als
// Follow-up dokumentiert. Diese Basis-Limits verhindern immerhin, dass eine
// einzelne Instanz von einem Client mit Requests geflutet wird.

// Teure KI/TTS-Endpunkte (Groq/OpenAI/ElevenLabs — echte Kosten pro Aufruf).
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Zu viele KI-Anfragen — bitte kurz warten' },
});

// Auth-Endpunkte (Login/Register/Refresh) gegen Brute-Force/Credential-Stuffing.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Zu viele Anmeldeversuche — bitte später erneut versuchen' },
});
