import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

// ── POST /api/getWeatherForLocation ───────────────────────────────────────
router.post('/getWeatherForLocation', requireAuth, async (req, res) => {
  try {
    const { latitude, longitude, spotName } = req.body;
    if (!latitude || !longitude) return res.status(400).json({ error: 'Latitude und Longitude sind erforderlich' });

    const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
    const params = { latitude, longitude, current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility', hourly: 'temperature_2m,precipitation_probability,weather_code', daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max', timezone: 'auto' };
    Object.entries(params).forEach(([k, v]) => weatherUrl.searchParams.set(k, v));

    const weatherResponse = await fetch(weatherUrl.toString());
    if (!weatherResponse.ok) return res.status(500).json({ error: 'Fehler beim Abrufen der Wetterdaten' });
    const weatherData = await weatherResponse.json();

    const getDesc = code => {
      if ([0, 1].includes(code)) return 'Sonnig & klar';
      if ([2, 3].includes(code)) return 'Teilweise bewölkt';
      if ([45, 48].includes(code)) return 'Nebelig';
      if ([51, 53, 55].includes(code)) return 'Leichter Nieselregen';
      if ([61, 63, 65].includes(code)) return 'Regen';
      if ([71, 73, 75, 77].includes(code)) return 'Schneefall';
      if ([80, 81, 82].includes(code)) return 'Schauer';
      if ([95, 96, 99].includes(code)) return 'Gewitter';
      return 'Wechselhaft';
    };

    const current = weatherData.current;
    let fishingScore = 0;
    const fishingFactors = [];

    if (current.pressure_msl > 1020) { fishingScore += 2; fishingFactors.push('Stabiler Hochdruck (gut)'); }
    else if (current.pressure_msl < 1000) { fishingScore += 3; fishingFactors.push('Tiefdruck – Fische sehr aktiv!'); }
    else { fishingScore += 1; fishingFactors.push('Normaler Luftdruck'); }

    if (current.wind_speed_10m < 5) { fishingScore += 2; fishingFactors.push('Wenig Wind (optimal)'); }
    else if (current.wind_speed_10m > 15) { fishingScore -= 1; fishingFactors.push('Starker Wind (erschwert)'); }
    else { fishingScore += 1; fishingFactors.push('Mäßiger Wind'); }

    if (current.cloud_cover > 50 && current.cloud_cover < 90) { fishingScore += 1; fishingFactors.push('Gute Bewölkung'); }
    if (current.temperature_2m >= 10 && current.temperature_2m <= 22) { fishingScore += 1; fishingFactors.push('Optimale Temperatur'); }

    let fishingCondition = 'Schwierig';
    if (fishingScore >= 5) fishingCondition = 'Ausgezeichnet';
    else if (fishingScore >= 3) fishingCondition = 'Gut';
    else if (fishingScore >= 1) fishingCondition = 'Mittel';

    return res.json({
      location: { latitude, longitude, spotName: spotName || `${parseFloat(latitude).toFixed(4)}, ${parseFloat(longitude).toFixed(4)}` },
      current: { temperature: Math.round(current.temperature_2m), feels_like: Math.round(current.apparent_temperature), humidity: current.relative_humidity_2m, pressure: Math.round(current.pressure_msl), wind_speed: Math.round(current.wind_speed_10m * 3.6), wind_gusts: Math.round(current.wind_gusts_10m * 3.6), wind_direction: current.wind_direction_10m, cloud_cover: current.cloud_cover, visibility: Math.round((current.visibility || 0) / 1000), precipitation: current.precipitation || 0, weather_description: getDesc(current.weather_code) },
      forecast: { today: { max_temp: Math.round(weatherData.daily.temperature_2m_max[0]), min_temp: Math.round(weatherData.daily.temperature_2m_min[0]), precipitation_probability: weatherData.daily.precipitation_probability_max[0], precipitation_sum: weatherData.daily.precipitation_sum[0], uv_index: weatherData.daily.uv_index_max[0] }, next_hours: weatherData.hourly.temperature_2m.slice(0, 6).map((temp, i) => ({ hour: i, temperature: Math.round(temp), precipitation_probability: weatherData.hourly.precipitation_probability[i] })) },
      fishing: { condition: fishingCondition, score: fishingScore, factors: fishingFactors, recommendation: fishingScore >= 4 ? 'Perfekte Bedingungen zum Angeln! Nutze die Gelegenheit.' : fishingScore >= 2 ? 'Gute Bedingungen. Ein Versuch lohnt sich!' : 'Bedingungen nicht ideal, aber mit richtiger Technik kann es klappen.' }
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/getWaterData ────────────────────────────────────────────────
router.post('/getWaterData', requireAuth, async (req, res) => {
  try {
    const { latitude, longitude, spotName, spotId, saveHistory = true } = req.body;
    if (!latitude || !longitude) return res.status(400).json({ error: 'Missing coordinates' });

    const [weatherRes, marineRes] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code&timezone=auto`).then(r => r.json()),
      fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&current=wave_height,wave_direction,wave_period&timezone=auto`).then(r => r.json()).catch(() => ({ current: null }))
    ]);

    const current = weatherRes.current;
    const marine = marineRes.current;
    const airTemp = current.temperature_2m;
    const waterTemp = Math.round(Math.max(4, airTemp - (airTemp > 20 ? 3 : 2)));
    const waveHeight = marine?.wave_height || 0;

    let visibility = 5;
    if (waveHeight > 1.0) visibility -= 2;
    else if (waveHeight > 0.6) visibility -= 1;
    visibility = Math.max(1, visibility);

    let qualityScore = 70;
    if (waterTemp >= 15 && waterTemp <= 22) qualityScore += 15;
    else if (waterTemp >= 10 && waterTemp <= 25) qualityScore += 5;
    else qualityScore -= 10;
    if (waveHeight < 0.5) qualityScore += 10;
    else if (waveHeight > 1.5) qualityScore -= 15;
    if (current.wind_speed_10m < 3) qualityScore += 5;
    else if (current.wind_speed_10m > 8) qualityScore -= 10;
    qualityScore = Math.max(0, Math.min(100, qualityScore));

    const weatherDescs = { 0: 'Klar', 1: 'Leicht bewölkt', 2: 'Teilweise bewölkt', 3: 'Bewölkt', 45: 'Nebel', 61: 'Leichter Regen', 63: 'Mäßiger Regen', 80: 'Regenschauer', 95: 'Gewitter' };
    const weatherCondition = weatherDescs[current.weather_code] || 'Variabel';

    let weatherImpact = 50;
    if (current.weather_code === 0 || current.weather_code === 1) weatherImpact += 10;
    else if ([61, 63, 80, 81].includes(current.weather_code)) weatherImpact += 20;
    else if (current.weather_code >= 95) weatherImpact -= 30;
    if (current.wind_speed_10m < 4) weatherImpact += 10;
    else if (current.wind_speed_10m > 8) weatherImpact -= 20;
    weatherImpact = Math.max(0, Math.min(100, weatherImpact));

    const result = { temperature: waterTemp, wind_speed: current.wind_speed_10m, wind_direction: current.wind_direction_10m, wave_height: waveHeight, visibility, quality_score: qualityScore, weather_condition: weatherCondition, weather_impact: weatherImpact, satellite_data_available: false };

    if (saveHistory) {
      try {
        await supabase.from('water_analysis_history').insert({ spot_id: spotId || null, spot_name: spotName || 'Unbekannter Ort', latitude, longitude, temperature: waterTemp, wind_speed: current.wind_speed_10m, wave_height: waveHeight, visibility, quality_score: qualityScore, weather_impact: weatherImpact, weather_condition: weatherCondition, analyzed_at: new Date().toISOString(), created_by: req.user.email });
      } catch {}
    }

    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/getSatelliteData ────────────────────────────────────────────
router.post('/getSatelliteData', requireAuth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) return res.status(400).json({ error: 'Missing coordinates' });

    // NOAA ERDDAP für SST
    let satellite_sst = null;
    try {
      const erdapUrl = `https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplMURSST41.json?analysed_sst[(last)][(${latitude})][(${longitude})]`;
      const r = await fetch(erdapUrl, { headers: { 'User-Agent': 'CatchGBT-WaterAnalysis/1.0' }, signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const data = await r.json();
        if (data.table?.rows?.[0]) {
          const sstKelvin = data.table.rows[0][3];
          satellite_sst = Math.round((sstKelvin - 273.15) * 10) / 10;
        }
      }
    } catch {}

    // NOAA CoastWatch für Chlorophyll
    let chlorophyll_a = null;
    try {
      const cwUrl = `https://coastwatch.pfeg.noaa.gov/erddap/griddap/erdMH1chla8day.json?chlorophyll[(last)][(0.0)][(${latitude})][(${longitude})]`;
      const r = await fetch(cwUrl, { headers: { 'User-Agent': 'CatchGBT-WaterAnalysis/1.0' }, signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const data = await r.json();
        if (data.table?.rows?.[0]) chlorophyll_a = Math.round(data.table.rows[0][4] * 100) / 100;
      }
    } catch {}

    const algae_risk = !chlorophyll_a ? 'unknown' : chlorophyll_a < 5 ? 'low' : chlorophyll_a < 15 ? 'medium' : 'high';

    return res.json({ satellite_sst, chlorophyll_a, turbidity_ntu: null, algae_risk, satellite_data_available: !!(satellite_sst || chlorophyll_a), retrieved_at: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ error: e.message, satellite_data_available: false });
  }
});

// ── POST /api/predictFishing ──────────────────────────────────────────────
router.post('/predictFishing', requireAuth, async (req, res) => {
  try {
    const { latitude, longitude, spotName } = req.body;
    if (!latitude || !longitude) return res.status(400).json({ error: 'Missing coordinates' });

    // Wetter holen
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m,weather_code&timezone=auto`).then(r => r.json());
    const current = weatherRes.current;

    // Fangdaten des Users
    const { data: catches } = await supabase.from('catches').select('*').eq('created_by', req.user.email);
    if (!catches || catches.length < 10) {
      return res.status(400).json({ error: 'Nicht genügend historische Daten (min. 10 Fänge)', currentCatches: catches?.length || 0 });
    }

    // Beste Bedingungen aus Top-20% der Fänge (nach Gewicht)
    const sorted = [...catches].sort((a, b) => (b.weight_kg || 0) - (a.weight_kg || 0));
    const top = sorted.slice(0, Math.ceil(sorted.length * 0.2));
    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const bestConditions = {
      optimal_temp: avg(top.map(c => c.water_temp || 15)),
      optimal_hour: Math.round(avg(top.map(c => new Date(c.catch_time).getHours()))),
      optimal_wind: avg(top.map(c => c.wind_speed || 5))
    };

    const speciesMap = {};
    for (const c of catches) if (c.species) speciesMap[c.species] = (speciesMap[c.species] || 0) + 1;
    const topSpecies = Object.entries(speciesMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([species]) => ({ species }));

    const airTemp = current.temperature_2m;
    const waterTemp = Math.max(4, airTemp - (airTemp > 20 ? 3 : 2));
    const tempDiff = Math.abs(waterTemp - (bestConditions.optimal_temp || 15));
    const tempScore = Math.round(Math.exp(-(tempDiff * tempDiff) / 50) * 100);

    const windDiff = Math.abs(current.wind_speed_10m - (bestConditions.optimal_wind || 3));
    const windScore = Math.round(Math.exp(-(windDiff * windDiff) / 8) * 100);

    const currentHour = new Date().getHours();
    const hourDiff = Math.abs(currentHour - (bestConditions.optimal_hour || 6));
    const hourScore = Math.round(Math.exp(-(hourDiff * hourDiff) / 18) * 100);

    const overallScore = Math.round(tempScore * 0.4 + windScore * 0.3 + hourScore * 0.3);

    const getRating = s => s >= 80 ? 'Ausgezeichnet' : s >= 65 ? 'Gut' : s >= 50 ? 'Durchschnittlich' : s >= 35 ? 'Mäßig' : 'Schwierig';

    return res.json({
      ok: true,
      prediction: {
        overall_score: overallScore,
        rating: getRating(overallScore),
        species_predictions: topSpecies.map((s, i) => ({ species: s.species, probability: Math.max(10, overallScore - i * 15), confidence: overallScore > 70 ? 'hoch' : overallScore > 50 ? 'mittel' : 'niedrig' })),
        condition_scores: { temperature: tempScore, wind: windScore, time: hourScore }
      },
      current_conditions: { temperature: waterTemp, wind_speed: current.wind_speed_10m },
      generated_at: new Date().toISOString()
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// ── POST /api/trainFishingModel ───────────────────────────────────────────
router.post('/trainFishingModel', requireAuth, async (req, res) => {
  try {
    const [{ data: catches }, { data: waterAnalyses }] = await Promise.all([
      supabase.from('catches').select('*').eq('created_by', req.user.email),
      supabase.from('water_analysis_history').select('*').eq('created_by', req.user.email)
    ]);

    if (!catches || catches.length < 10) {
      return res.status(400).json({ ok: false, error: 'Mindestens 10 Fänge benötigt', currentCatches: catches?.length || 0 });
    }

    // Feature-Statistiken berechnen
    const speciesMap = {};
    const features = [];
    for (const c of catches) {
      if (c.species) speciesMap[c.species] = (speciesMap[c.species] || 0) + 1;
      const catchTime = new Date(c.catch_time);
      const analysis = waterAnalyses?.find(a => Math.abs(new Date(a.analyzed_at) - catchTime) < 86400000);
      if (!analysis) continue;
      features.push({ hour: catchTime.getHours(), water_temp: analysis.temperature || 15, quality_score: analysis.quality_score || 50, wind_speed: analysis.wind_speed || 5, weight: c.weight_kg || 0 });
    }

    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const std = arr => { const m = avg(arr); return Math.sqrt(avg(arr.map(x => (x - m) ** 2))); };
    const numFields = ['hour', 'water_temp', 'quality_score', 'wind_speed'];
    const statistics = {};
    for (const f of numFields) {
      const vals = features.map(d => d[f]);
      statistics[f] = { mean: parseFloat(avg(vals).toFixed(2)), std: parseFloat(std(vals).toFixed(2)), min: Math.min(...vals), max: Math.max(...vals) };
    }

    const sorted = [...features].sort((a, b) => (b.weight || 0) - (a.weight || 0));
    const top = sorted.slice(0, Math.ceil(sorted.length * 0.2));
    const best_conditions = top.length ? {
      optimal_temp: parseFloat(avg(top.map(d => d.water_temp)).toFixed(1)),
      optimal_hour: Math.round(avg(top.map(d => d.hour))),
      optimal_quality: Math.round(avg(top.map(d => d.quality_score))),
      optimal_wind: parseFloat(avg(top.map(d => d.wind_speed)).toFixed(1)),
      sample_size: top.length
    } : {};

    const topSpecies = Object.entries(speciesMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([species, count]) => ({ species, count }));

    return res.json({ ok: true, model_version: '1.0', training_samples: features.length, feature_statistics: statistics, best_conditions, top_species: topSpecies, training_completed_at: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
