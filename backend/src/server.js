import 'dotenv/config';
// Leitet in async-Route-Handlern geworfene Rejections an die Error-Middleware
// weiter. Express 4 tut das nicht von selbst — ohne dies würde ein geworfener
// Fehler (z.B. Netzwerk-/Timeout aus Supabase oder fetch) zu einer unbehandelten
// Rejection und der Request bliebe bis zum Plattform-Timeout hängen.
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import aiRoutes from './routes/ai.js';
import catchesRoutes from './routes/catches.js';
import spotsRoutes from './routes/spots.js';
import communityRoutes from './routes/community.js';
import eventsRoutes from './routes/events.js';
import premiumRoutes from './routes/premium.js';
import gearRoutes from './routes/gear.js';
import miscRoutes from './routes/misc.js';
import mapsRoutes from './routes/maps.js';
import supportRoutes from './routes/support.js';
import userEntitiesRoutes from './routes/userEntities.js';
import socialMediaRoutes from './routes/socialMedia.js';
import syncRoutes from './routes/sync.js';
import waterDataRoutes from './routes/waterData.js';
import bathymetryRoutes from './routes/bathymetry.js';
import backupRoutes from './routes/backups.js';
import notesRoutes from './routes/notes.js';
import functionsRoutes from './routes/functions.js';
import referralsRoutes from './routes/referrals.js';
import { aiRateLimiter, ttsRateLimiter, authRateLimiter } from './middleware/rateLimit.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'https://bait-buddy.vercel.app',
    'capacitor://localhost',
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Findet den OpenAI-Key tolerant (OPENAI_API_KEY, Openai_key, …) — nur zur
// Diagnose, ob Voice serverseitig konfiguriert ist. Gibt KEINEN Wert preis.
function hasOpenAIKey() {
  return !!(process.env.OPENAI_API_KEY
    || Object.entries(process.env).find(([k, v]) => /open.?_?ai/i.test(k) && /key|token|secret/i.test(k) && v)?.[1]);
}
const healthPayload = () => ({ ok: true, app: 'BaitBuddy', version: '1.0.0', voice: hasOpenAIKey() });
app.get('/health', (req, res) => res.json(healthPayload()));
app.get('/api/health', (req, res) => res.json(healthPayload()));

// Rate-Limiting per Pfad-Präfix (in Tests via NODE_ENV=test übersprungen, damit
// wiederholte Requests im selben Testlauf nicht in die Limits laufen). Scoped
// auf teure/sensible Pfade: Das /api/ai-Präfix deckt ALLE KI-Routen ab, inkl.
// /api/ai/test (auth-pflichtig + limitiert). Nur /health und /api/health sind
// unlimitiert (kein LLM-Call). /api/analyze-photo zählt zu den KI-Kosten,
// liegt aber nicht unter /api/ai, daher separat verdrahtet.
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/ai/tts', ttsRateLimiter);
  app.use('/api/ai', aiRateLimiter);
  app.use('/api/analyze-photo', aiRateLimiter);
  app.use('/api/auth/login', authRateLimiter);
  app.use('/api/auth/register', authRateLimiter);
  app.use('/api/auth/refresh', authRateLimiter);
}

app.use('/api', authRoutes);
app.use('/api', aiRoutes);
app.use('/api', catchesRoutes);
app.use('/api', spotsRoutes);
app.use('/api', communityRoutes);
app.use('/api', eventsRoutes);
app.use('/api', premiumRoutes);
app.use('/api', gearRoutes);
app.use('/api', miscRoutes);
app.use('/api', mapsRoutes);
app.use('/api', supportRoutes);
app.use('/api', userEntitiesRoutes);
app.use('/api', socialMediaRoutes);
app.use('/api', syncRoutes);
app.use('/api', waterDataRoutes);
app.use('/api', bathymetryRoutes);
app.use('/api', backupRoutes);
app.use('/api', notesRoutes);
app.use('/api', functionsRoutes);
app.use('/api', referralsRoutes);

app.use((req, res) => res.status(404).json({ error: `Not found: ${req.method} ${req.path}` }));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error('Unhandled error:', err);
  // Upstream-Timeouts (Groq, OpenAI, ElevenLabs, open-meteo, GoTrue) sauber als
  // Gateway-Timeout melden statt als generischen 500.
  if (err?.timeout || err?.name === 'FetchTimeoutError' || err?.name === 'AbortError') {
    return res.status(504).json({ error: 'Zeitüberschreitung beim externen Dienst — bitte erneut versuchen' });
  }
  res.status(500).json({ error: 'Interner Fehler' });
});

// NODE_ENV=test (siehe backend/test/setup.js) haelt den Server auch dann vom
// echten Port-Binding ab, wenn ein Test absichtlich process.env.VERCEL
// entfernt, um den Nicht-Vercel-Codepfad einzelner Routen zu pruefen.
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {});
}

export default app;
