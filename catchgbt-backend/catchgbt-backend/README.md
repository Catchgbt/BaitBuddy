# CatchGBT Backend

Express.js Backend – vollständiger Ersatz für alle Base44 Functions.

## Setup

```bash
cp .env.example .env
# .env befüllen

npm install
npm run dev
```

## Deployment auf Railway

1. Repository pushen: `git push`
2. Railway: New Project → Deploy from GitHub → dieses Repo
3. Alle `.env`-Variablen in Railway eintragen
4. Fertig – Railway gibt eine URL wie `https://catchgbt-backend.up.railway.app`

## Deployment auf Render

1. New Web Service → Connect GitHub Repo
2. Build Command: `npm install`
3. Start Command: `npm start`
4. Environment Variables eintragen

## API-Endpunkte (vollständige Liste)

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | /health | Health check |
| POST | /api/getPlanStatus | Premium-Plan des Users |
| POST | /api/activatePlan | Plan aktivieren |
| POST | /api/checkFeatureAccess | Feature-Zugang prüfen |
| POST | /api/premiumStatus | Premium-Status |
| POST | /api/getPremiumWalletStatus | Wallet-Status |
| POST | /api/startPremiumMeter | Session starten |
| POST | /api/heartbeatPremiumMeter | Session Heartbeat |
| POST | /api/stopPremiumMeter | Session stoppen |
| POST | /api/cleanupOldSessions | Sessions bereinigen |
| POST | /api/getPremiumProducts | Credit-Pakete |
| POST | /api/purchasePremium | Credits kaufen (Demo) |
| POST | /api/createStripeCheckoutSession | Stripe Checkout |
| POST | /api/stripeWebhook | Stripe Webhook |
| POST | /api/catchgbtChat | KI-Chat (BaitBuddy/Marina) |
| POST | /api/analyzeCatchPhoto | Fischfoto analysieren |
| POST | /api/aiEvaluateCatch | KI-Fang-Bewertung |
| POST | /api/getFishingRecommendation | Angel-Empfehlungen |
| POST | /api/generateCatchReport | Fangbericht generieren |
| POST | /api/createClan | Clan erstellen |
| POST | /api/joinClan | Clan beitreten |
| POST | /api/getClanLeaderboard | Clan-Rangliste |
| POST | /api/getVotingLeaderboard | Voting-Rangliste |
| POST | /api/addVotingLike | Like hinzufügen |
| POST | /api/startCommunityCompetition | Wettbewerb starten |
| POST | /api/submitClanCatch | Clan-Fang einreichen |
| POST | /api/submitVotingCatch | Voting-Fang einreichen |
| POST | /api/getEventLeaderboard | Event-Rangliste |
| GET | /api/angelspotsGeojson | Angelplätze als GeoJSON |
| POST | /api/loadWaterBodies | Gewässer laden (OSM) |
| GET | /api/bathymetryProxy | Bathymetrie-Tiles Proxy |
| POST | /api/geocodeFishingClubs | Clubs geocodieren |
| POST | /api/detectHotspots | Hotspots erkennen |
| POST | /api/processDepthData | Tiefendaten importieren |
| POST | /api/generateBathymetricMap | Tiefenkarte generieren |
| POST | /api/calculateTravelTime | Fahrtzeit berechnen |
| POST | /api/getWeatherForLocation | Wetter abrufen |
| POST | /api/getWaterData | Wasseranalyse |
| POST | /api/getSatelliteData | Satellitendaten |
| POST | /api/predictFishing | Fangprognose |
| POST | /api/trainFishingModel | ML-Modell trainieren |
| POST | /api/textToSpeech | ElevenLabs TTS |
| POST | /api/freeNeuralTTS | Kostenlose TTS |
| POST | /api/backendTextToSpeech | Backend TTS (Fallback) |
| POST | /api/geminiTextToSpeech | Gemini TTS (Fallback) |
| POST | /api/deleteAccount | Account löschen |
| POST | /api/activateDemoMode | Demo-Modus aktivieren |
| POST | /api/verifyPlayIntegrity | Google Play Integrity |
| POST | /api/admin/assignPlan | [Admin] Plan zuweisen |
| POST | /api/admin/resetWallet | [Admin] Wallet reset |
| POST | /api/admin/setCredits | [Admin] Credits setzen |
| POST | /api/admin/autoRenewPlans | [Admin] Pläne erneuern |

## Frontend Umstellen

1. `frontend-apiClient.js` nach `src/api/base44Client.js` kopieren
2. `.env` im Frontend erweitern:
   ```
   VITE_BACKEND_URL=https://deine-railway-url.up.railway.app
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
3. Supabase Auth statt Base44 Auth verwenden

## Supabase Setup

1. Schema aus `schema.sql` im Supabase SQL Editor ausführen
2. Auth → Email aktivieren
3. Service Role Key in `.env` eintragen
