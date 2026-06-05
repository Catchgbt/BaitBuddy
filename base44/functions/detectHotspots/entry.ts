import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Erkennt Hotspots basierend auf historischen Fängen und Wasseranalysen
 * Kombiniert Fangerfolg mit Wasserqualität für Empfehlungen
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Lade historische Daten
    const catches = await base44.entities.Catch.list();
    const waterAnalyses = await base44.entities.WaterAnalysisHistory.list();
    const spots = await base44.entities.Spot.list();

    // Analysiere jeden Spot
    const spotAnalysis = [];
    
    for (const spot of spots) {
      // Fänge an diesem Spot
      const spotCatches = catches.filter(c => c.spot_id === spot.id);
      
      // Wasseranalysen an diesem Spot
      const spotAnalyses = waterAnalyses.filter(a => 
        Math.abs(a.latitude - spot.latitude) < 0.01 && 
        Math.abs(a.longitude - spot.longitude) < 0.01
      );

      if (spotCatches.length === 0) continue;

      // Berechne Score
      const catchScore = calculateCatchScore(spotCatches);
      const waterScore = calculateAverageWaterScore(spotAnalyses);
      const recencyScore = calculateRecencyScore(spotCatches);
      
      const overallScore = Math.round(
        catchScore * 0.5 + 
        waterScore * 0.3 + 
        recencyScore * 0.2
      );

      spotAnalysis.push({
        spot_id: spot.id,
        name: spot.name,
        latitude: spot.latitude,
        longitude: spot.longitude,
        score: overallScore,
        catches_count: spotCatches.length,
        avg_quality: waterScore,
        recent_activity: recencyScore,
        reason: generateReason(catchScore, waterScore, recencyScore)
      });
    }

    // Sortiere nach Score und nimm Top 5
    const hotspots = spotAnalysis
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .filter(spot => spot.score > 60); // Mindest-Score für Hotspot

    return Response.json({
      ok: true,
      hotspots: hotspots,
      total_spots_analyzed: spots.length,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Hotspot Detection Error:', error);
    return Response.json({ 
      ok: false,
      error: error.message 
    }, { status: 500 });
  }
});

/**
 * Berechnet Score basierend auf Fangerfolg
 */
function calculateCatchScore(catches) {
  if (catches.length === 0) return 0;
  
  // Gewichte größere Fische höher
  const weightScore = catches.reduce((sum, c) => {
    const weight = c.weight_kg || 0;
    return sum + Math.min(weight * 10, 50);
  }, 0) / catches.length;
  
  // Anzahl der Fänge
  const countScore = Math.min(catches.length * 5, 50);
  
  return weightScore + countScore;
}

/**
 * Berechnet durchschnittlichen Wasserqualitäts-Score
 */
function calculateAverageWaterScore(analyses) {
  if (analyses.length === 0) return 50; // Neutral wenn keine Daten
  
  const avgQuality = analyses.reduce((sum, a) => sum + a.quality_score, 0) / analyses.length;
  return avgQuality;
}

/**
 * Berechnet Aktualitäts-Score (neuere Fänge = höher)
 */
function calculateRecencyScore(catches) {
  if (catches.length === 0) return 0;
  
  const now = new Date();
  const scores = catches.map(c => {
    const catchDate = new Date(c.catch_time);
    const daysDiff = (now - catchDate) / (1000 * 60 * 60 * 24);
    
    // Score fällt exponentiell mit Zeit
    if (daysDiff < 7) return 100;
    if (daysDiff < 30) return 80;
    if (daysDiff < 90) return 60;
    if (daysDiff < 180) return 40;
    return 20;
  });
  
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Generiert Erklärung für Hotspot-Score
 */
function generateReason(catchScore, waterScore, recencyScore) {
  const reasons = [];
  
  if (catchScore > 70) {
    reasons.push('Viele erfolgreiche Fänge');
  }
  
  if (waterScore > 75) {
    reasons.push('Ausgezeichnete Wasserqualität');
  }
  
  if (recencyScore > 70) {
    reasons.push('Kürzlich aktiv');
  }
  
  if (reasons.length === 0) {
    reasons.push('Gute Gesamtbedingungen');
  }
  
  return reasons.join(' • ');
}