import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Routes
import planRoutes from './routes/plan.js';
import walletRoutes from './routes/wallet.js';
import aiRoutes from './routes/ai.js';
import communityRoutes from './routes/community.js';
import geoRoutes from './routes/geo.js';
import weatherRoutes from './routes/weather.js';
import miscRoutes from './routes/misc.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security & CORS ──────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'https://catchgbt.com', 'https://www.catchgbt.com'],
  credentials: true
}));

// ── Stripe Webhook: raw body BEFORE express.json() ───────────────────────
app.use('/api/stripeWebhook', express.raw({ type: 'application/json' }));

// ── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true, version: '1.0.0', timestamp: new Date().toISOString() }));

// ── API Routes ────────────────────────────────────────────────────────────
app.use('/api', planRoutes);
app.use('/api', walletRoutes);
app.use('/api', aiRoutes);
app.use('/api', communityRoutes);
app.use('/api', geoRoutes);
app.use('/api', weatherRoutes);
app.use('/api', miscRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));

// ── Global error handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`✅ CatchGBT Backend läuft auf Port ${PORT}`);
  console.log(`   ENV: ${process.env.NODE_ENV || 'development'}`);
});
