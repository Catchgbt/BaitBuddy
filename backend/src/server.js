import 'dotenv/config';
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

app.use((req, res) => res.status(404).json({ error: `Not found: ${req.method} ${req.path}` }));
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Interner Fehler' });
});

// NODE_ENV=test (siehe backend/test/setup.js) haelt den Server auch dann vom
// echten Port-Binding ab, wenn ein Test absichtlich process.env.VERCEL
// entfernt, um den Nicht-Vercel-Codepfad einzelner Routen zu pruefen.
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {});
}

export default app;
