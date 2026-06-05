import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Trainiert ein Machine Learning Modell für Fangprognosen
 * Basierend auf historischen Fängen, Wetterdaten und Wasserqualität
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Lade historische Fangdaten
    const catches = await base44.entities.Catch.list();
    const waterAnalyses = await base44.entities.WaterAnalysisHistory.list();
    
    if (catches.length < 10) {
      return Response.json({
        error: 'Insufficient data',
        message: 'Mindestens 10 Fänge benötigt für ML-Training',
        currentCatches: catches.length
      }, { status: 400 });
    }

    // Bereite Trainingsdaten auf
    const trainingData = prepareTrainingData(catches, waterAnalyses);
    
    // Berechne Feature-Statistiken
    const statistics = calculateStatistics(trainingData);
    
    // Erstelle Korrelations-Matrix
    const correlations = calculateCorrelations(trainingData);
    
    return Response.json({
      ok: true,
      model_version: '1.0',
      training_samples: trainingData.length,
      feature_statistics: statistics,
      correlations: correlations,
      top_species: getTopSpecies(catches),
      best_conditions: findBestConditions(trainingData),
      training_completed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Model Training Error:', error);
    return Response.json({ 
      ok: false,
      error: error.message 
    }, { status: 500 });
  }
});

/**
 * Bereitet Daten für ML-Training auf
 */
function prepareTrainingData(catches, waterAnalyses) {
  const trainingData = [];
  
  for (const catchRecord of catches) {
    // Finde passende Wasseranalyse (zeitlich nächste)
    const catchTime = new Date(catchRecord.catch_time);
    const relevantAnalysis = findClosestAnalysis(catchTime, waterAnalyses);
    
    if (!relevantAnalysis) continue;
    
    // Extrahiere Features
    const features = {
      // Zeitliche Features
      hour: catchTime.getHours(),
      day_of_week: catchTime.getDay(),
      month: catchTime.getMonth() + 1,
      
      // Wasser-Features
      water_temp: relevantAnalysis.temperature || 15,
      quality_score: relevantAnalysis.quality_score || 50,
      visibility: relevantAnalysis.visibility || 2,
      
      // Wetter-Features
      wind_speed: relevantAnalysis.wind_speed || 5,
      weather_impact: relevantAnalysis.weather_impact || 50,
      
      // Satelliten-Features (falls verfügbar)
      chlorophyll: relevantAnalysis.chlorophyll_a || 0,
      turbidity: relevantAnalysis.turbidity_ntu || 0,
      
      // Target
      species: catchRecord.species,
      success: 1,
      weight: catchRecord.weight_kg || 0,
      length: catchRecord.length_cm || 0
    };
    
    trainingData.push(features);
  }
  
  return trainingData;
}

/**
 * Findet die zeitlich nächste Wasseranalyse
 */
function findClosestAnalysis(catchTime, analyses) {
  if (analyses.length === 0) return null;
  
  let closest = analyses[0];
  let minDiff = Math.abs(new Date(closest.analyzed_at) - catchTime);
  
  for (const analysis of analyses) {
    const diff = Math.abs(new Date(analysis.analyzed_at) - catchTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = analysis;
    }
  }
  
  // Nur Analysen innerhalb von 24 Stunden verwenden
  if (minDiff > 24 * 60 * 60 * 1000) return null;
  
  return closest;
}

/**
 * Berechnet Statistiken über Features
 */
function calculateStatistics(data) {
  if (data.length === 0) return {};
  
  const stats = {};
  const numericFields = ['hour', 'water_temp', 'quality_score', 'visibility', 'wind_speed', 'weather_impact', 'chlorophyll', 'turbidity'];
  
  for (const field of numericFields) {
    const values = data.map(d => d[field]).filter(v => v != null);
    
    if (values.length === 0) continue;
    
    const sorted = values.sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    
    stats[field] = {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: Math.round(mean * 100) / 100,
      std: Math.round(Math.sqrt(variance) * 100) / 100,
      median: sorted[Math.floor(sorted.length / 2)]
    };
  }
  
  return stats;
}

/**
 * Berechnet Korrelationen zwischen Features und Fangerfolg
 */
function calculateCorrelations(data) {
  if (data.length === 0) return {};
  
  const correlations = {};
  const numericFields = ['hour', 'water_temp', 'quality_score', 'visibility', 'wind_speed', 'weather_impact'];
  
  for (const field of numericFields) {
    const correlation = calculatePearsonCorrelation(
      data.map(d => d[field]),
      data.map(d => d.weight || 0)
    );
    
    correlations[field] = Math.round(correlation * 100) / 100;
  }
  
  return correlations;
}

/**
 * Berechnet Pearson-Korrelationskoeffizient
 */
function calculatePearsonCorrelation(x, y) {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const sumY2 = y.reduce((a, b) => a + b * b, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (denominator === 0) return 0;
  
  return numerator / denominator;
}

/**
 * Findet die häufigsten Fischarten
 */
function getTopSpecies(catches) {
  const speciesCount = {};
  
  for (const catchRecord of catches) {
    const species = catchRecord.species;
    speciesCount[species] = (speciesCount[species] || 0) + 1;
  }
  
  return Object.entries(speciesCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([species, count]) => ({ species, count }));
}

/**
 * Findet optimale Bedingungen
 */
function findBestConditions(data) {
  // Gruppiere nach Gewicht
  const sorted = [...data].sort((a, b) => (b.weight || 0) - (a.weight || 0));
  const top20Percent = sorted.slice(0, Math.ceil(sorted.length * 0.2));
  
  if (top20Percent.length === 0) return {};
  
  return {
    optimal_temp: Math.round(average(top20Percent.map(d => d.water_temp)) * 10) / 10,
    optimal_hour: Math.round(average(top20Percent.map(d => d.hour))),
    optimal_quality: Math.round(average(top20Percent.map(d => d.quality_score))),
    optimal_wind: Math.round(average(top20Percent.map(d => d.wind_speed)) * 10) / 10,
    sample_size: top20Percent.length
  };
}

function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}