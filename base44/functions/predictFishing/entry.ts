import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Generiert Fangprognose basierend auf aktuellen Bedingungen
 * Nutzt trainiertes ML-Modell und historische Daten
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { latitude, longitude, spotName } = await req.json();

    if (!latitude || !longitude) {
      return Response.json({ error: 'Missing coordinates' }, { status: 400 });
    }

    // Hole aktuelle Wasseranalyse
    const waterDataRes = await base44.functions.invoke('getWaterData', {
      latitude,
      longitude,
      spotName,
      saveHistory: false
    });

    const waterData = waterDataRes.data;

    // Trainiere/Lade ML-Modell
    const modelRes = await base44.functions.invoke('trainFishingModel');
    const modelData = modelRes.data;

    if (!modelData.ok) {
      return Response.json({
        error: 'Model not available',
        message: 'Nicht genügend historische Daten für Prognose'
      }, { status: 400 });
    }

    // Generiere Prognose
    const currentHour = new Date().getHours();
    const currentMonth = new Date().getMonth() + 1;

    const prediction = generatePrediction(
      waterData,
      modelData,
      currentHour,
      currentMonth
    );

    return Response.json({
      ok: true,
      prediction: prediction,
      current_conditions: {
        temperature: waterData.temperature,
        quality_score: waterData.quality_score,
        wind_speed: waterData.wind_speed,
        visibility: waterData.visibility
      },
      model_info: {
        version: modelData.model_version,
        training_samples: modelData.training_samples
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Prediction Error:', error);
    return Response.json({ 
      ok: false,
      error: error.message 
    }, { status: 500 });
  }
});

/**
 * Generiert Fangprognose basierend auf Bedingungen und Modell
 */
function generatePrediction(waterData, modelData, hour, month) {
  const stats = modelData.feature_statistics;
  const bestConditions = modelData.best_conditions;
  const topSpecies = modelData.top_species;

  // Berechne Similarity-Score zu optimalen Bedingungen
  const tempScore = calculateSimilarity(
    waterData.temperature,
    bestConditions.optimal_temp,
    stats.water_temp?.std || 5
  );

  const qualityScore = calculateSimilarity(
    waterData.quality_score,
    bestConditions.optimal_quality,
    stats.quality_score?.std || 15
  );

  const windScore = calculateSimilarity(
    waterData.wind_speed,
    bestConditions.optimal_wind,
    stats.wind_speed?.std || 2,
    true // lower is better für Wind
  );

  const hourScore = calculateSimilarity(
    hour,
    bestConditions.optimal_hour,
    3
  );

  // Gewichteter Gesamt-Score
  const overallScore = Math.round(
    (tempScore * 0.3 + 
     qualityScore * 0.25 + 
     windScore * 0.2 + 
     hourScore * 0.15 +
     (waterData.weather_impact / 100) * 0.1) * 100
  );

  // Prognose für Top 3 Fischarten
  const speciesPredictions = topSpecies.slice(0, 3).map((species, idx) => ({
    species: species.species,
    probability: Math.max(10, overallScore - (idx * 15)),
    confidence: overallScore > 70 ? 'hoch' : overallScore > 50 ? 'mittel' : 'niedrig'
  }));

  // Beste Tageszeit
  const bestTimeOfDay = getBestTimeOfDay(hour, bestConditions.optimal_hour);

  // Empfehlungen
  const recommendations = generateRecommendations(
    waterData,
    overallScore,
    bestConditions
  );

  return {
    overall_score: overallScore,
    rating: getRating(overallScore),
    species_predictions: speciesPredictions,
    best_time_of_day: bestTimeOfDay,
    recommendations: recommendations,
    condition_scores: {
      temperature: Math.round(tempScore * 100),
      quality: Math.round(qualityScore * 100),
      wind: Math.round(windScore * 100),
      time: Math.round(hourScore * 100)
    }
  };
}

/**
 * Berechnet Ähnlichkeit zu optimalem Wert (0-1)
 */
function calculateSimilarity(actual, optimal, stdDev, lowerIsBetter = false) {
  const diff = Math.abs(actual - optimal);
  let similarity = Math.exp(-(diff * diff) / (2 * stdDev * stdDev));
  
  if (lowerIsBetter && actual > optimal) {
    similarity *= 0.7; // Penalty für höhere Werte
  }
  
  return Math.max(0, Math.min(1, similarity));
}

/**
 * Ermittelt beste Tageszeit
 */
function getBestTimeOfDay(currentHour, optimalHour) {
  const times = [
    { name: 'Früh morgens (5-8 Uhr)', hour: 6 },
    { name: 'Vormittag (8-12 Uhr)', hour: 10 },
    { name: 'Mittag (12-15 Uhr)', hour: 13 },
    { name: 'Nachmittag (15-18 Uhr)', hour: 16 },
    { name: 'Abend (18-21 Uhr)', hour: 19 },
    { name: 'Nacht (21-5 Uhr)', hour: 23 }
  ];

  let best = times[0];
  let minDiff = Math.abs(times[0].hour - optimalHour);

  for (const time of times) {
    const diff = Math.abs(time.hour - optimalHour);
    if (diff < minDiff) {
      minDiff = diff;
      best = time;
    }
  }

  const isCurrent = Math.abs(currentHour - optimalHour) < 2;

  return {
    time: best.name,
    is_current: isCurrent,
    hours_until: isCurrent ? 0 : calculateHoursUntil(currentHour, optimalHour)
  };
}

function calculateHoursUntil(currentHour, targetHour) {
  let diff = targetHour - currentHour;
  if (diff < 0) diff += 24;
  return diff;
}

/**
 * Generiert Handlungsempfehlungen
 */
function generateRecommendations(waterData, score, bestConditions) {
  const recommendations = [];

  // Temperatur-Empfehlung
  if (Math.abs(waterData.temperature - bestConditions.optimal_temp) > 3) {
    if (waterData.temperature < bestConditions.optimal_temp) {
      recommendations.push({
        type: 'temperature',
        message: `Wasser etwas kühl (${waterData.temperature}°C). Fische könnten träger sein.`,
        action: 'Langsame Köderführung versuchen'
      });
    } else {
      recommendations.push({
        type: 'temperature',
        message: `Wasser warm (${waterData.temperature}°C). Fische aktiver in tieferen Bereichen.`,
        action: 'Tiefere Stellen anvisieren'
      });
    }
  }

  // Wind-Empfehlung
  if (waterData.wind_speed > 7) {
    recommendations.push({
      type: 'wind',
      message: `Starker Wind (${waterData.wind_speed} m/s) erschwert das Angeln.`,
      action: 'Geschützte Bereiche oder schwerere Köder nutzen'
    });
  }

  // Sicht-Empfehlung
  if (waterData.visibility < 1.5) {
    recommendations.push({
      type: 'visibility',
      message: 'Geringe Sichttiefe - trübes Wasser.',
      action: 'Kontrastreiche oder lärmende Köder verwenden'
    });
  }

  // Score-basierte Empfehlung
  if (score > 75) {
    recommendations.push({
      type: 'overall',
      message: 'Ausgezeichnete Bedingungen! Jetzt ist die beste Zeit zum Angeln.',
      action: 'Verschiedene Techniken ausprobieren'
    });
  } else if (score < 40) {
    recommendations.push({
      type: 'overall',
      message: 'Schwierige Bedingungen. Geduld wird belohnt.',
      action: 'Bewährte Methoden nutzen, experimentieren vermeiden'
    });
  }

  return recommendations;
}

function getRating(score) {
  if (score >= 80) return 'Ausgezeichnet';
  if (score >= 65) return 'Gut';
  if (score >= 50) return 'Durchschnittlich';
  if (score >= 35) return 'Mäßig';
  return 'Schwierig';
}