import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import aiRoutes from './routes/ai.js';
import catchesRoutes from './routes/catches.js';
import spotsRoutes from './routes/spots.js';
import communityRoutes from './routes/community.js';
import premiumRoutes from './routes/premium.js';
import miscRoutes from './routes/misc.js';

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

app.get('/health', (req, res) => res.json({ ok: true, app: 'BaitBuddy', version: '1.0.0' }));
app.get('/api/health', (req, res) => res.json({ ok: true, app: 'BaitBuddy', version: '1.0.0' }));

app.use('/api', authRoutes);
app.use('/api', aiRoutes);
app.use('/api', catchesRoutes);
app.use('/api', spotsRoutes);
app.use('/api', communityRoutes);
app.use('/api', premiumRoutes);
app.use('/api', miscRoutes);

app.use((req, res) => res.status(404).json({ error: `Not found: ${req.method} ${req.path}` }));
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`BaitBuddy Backend läuft auf :${PORT}`));
}

export default app;
