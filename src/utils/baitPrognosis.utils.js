// KI-Prognose-Engine für Köder-Erfolgswaarscheinlichkeit
// Berechnet Erfolgs-Score basierend auf wissenschaftlichen Faktoren

/**
 * Berechnet die Erfolgswahrscheinlichkeit eines Köders
 * @param {Object} mix - Zutat-Verhältnis { "Fischmehl": 25, ... }
 * @param {Array} ingredients - Alle verfügbaren Zutaten mit Attributen
 * @param {string} targetFish - Zielfisch (z.B. "Karpfen")
 * @param {number} waterTemp - Wassertemperatur (°C, 0-30)
 * @param {string} season - Jahreszeit (summer, winter, allround)
 * @param {string} waterType - Gewässer-Typ (lake, river, canal, pond)
 * @returns {Object} Prognose mit Score, Faktoren, Erklärung
 */
export function calculateSuccessRate(
  mix = {},
  ingredients = [],
  targetFish = "Karpfen",
  waterTemp = 15,
  season = "allround",
  waterType = "lake"
) {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. BASIS-SCORE (wie im Original BaitMixer)
  // ──────────────────────────────────────────────────────────────────────────
  const baseScore = calculateBaseAttractivenessScore(
    mix,
    ingredients,
    targetFish
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 2. JAHRESZEITEN-MODIFIER
  // ──────────────────────────────────────────────────────────────────────────
  const seasonModifier = getSeasonModifier(season, targetFish, waterTemp);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. TEMPERATUR-FAKTOR
  // ──────────────────────────────────────────────────────────────────────────
  const temperatureModifier = getTemperatureFactor(targetFish, waterTemp);

  // ──────────────────────────────────────────────────────────────────────────
  // 4. GEWÄSSER-TYP BONUS
  // ──────────────────────────────────────────────────────────────────────────
  const waterTypeModifier = getWaterTypeBonus(targetFish, waterType);

  // ──────────────────────────────────────────────────────────────────────────
  // 5. ZUTATEN-DIVERSITÄT BONUS
  // ──────────────────────────────────────────────────────────────────────────
  const ingredientCount = Object.values(mix).filter(v => v > 0).length;
  const diversityBonus = getDiversityBonus(ingredientCount);

  // ──────────────────────────────────────────────────────────────────────────
  // FINALE BERECHNUNG
  // ──────────────────────────────────────────────────────────────────────────
  const finalScore =
    (baseScore * seasonModifier * temperatureModifier * waterTypeModifier * diversityBonus);

  // Success-Rate: Begrenzt auf 0–100%
  const successRate = Math.min(Math.max(Math.round(finalScore), 0), 100);

  // ──────────────────────────────────────────────────────────────────────────
  // FAKTOREN FÜR RADAR-CHART
  // ──────────────────────────────────────────────────────────────────────────
  const factors = [
    {
      name: "Basis-Attraktion",
      emoji: "✨",
      score: Math.round(baseScore),
      raw: baseScore,
      description: "Zutaten-Mischung Affinität zum Ziel-Fisch"
    },
    {
      name: "Jahreszeit",
      emoji: "🌡️",
      score: Math.round(seasonModifier * 100),
      raw: seasonModifier,
      description: getSeasonDescription(season, targetFish, waterTemp)
    },
    {
      name: "Temperatur",
      emoji: "🌊",
      score: Math.round(temperatureModifier * 100),
      raw: temperatureModifier,
      description: getTemperatureDescription(targetFish, waterTemp)
    },
    {
      name: "Gewässer-Typ",
      emoji: "🏞️",
      score: Math.round(waterTypeModifier * 100),
      raw: waterTypeModifier,
      description: getWaterTypeDescription(targetFish, waterType)
    },
    {
      name: "Zutaten-Mix",
      emoji: "🎯",
      score: Math.round(diversityBonus * 100),
      raw: diversityBonus,
      description: getDiversityDescription(ingredientCount)
    }
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // DETAILLIERTE ERKLÄRUNG
  // ──────────────────────────────────────────────────────────────────────────
  const explanation = generateExplanation(
    targetFish,
    season,
    waterTemp,
    waterType,
    successRate,
    factors,
    mix
  );

  return {
    baseScore: Math.round(baseScore * 10) / 10,
    seasonModifier: Math.round(seasonModifier * 100) / 100,
    temperatureModifier: Math.round(temperatureModifier * 100) / 100,
    waterTypeModifier: Math.round(waterTypeModifier * 100) / 100,
    diversityBonus: Math.round(diversityBonus * 100) / 100,
    finalScore: Math.round(finalScore * 10) / 10,
    successRate,
    factors,
    explanation,
    recommendation: getRecommendation(successRate, targetFish)
  };
}

/**
 * Berechnet die Basis-Attractiveness aus Zutaten
 */
function calculateBaseAttractivenessScore(mix, ingredients, targetFish) {
  let totalScore = 0;
  let activeIngredientsCount = 0;

  Object.entries(mix).forEach(([ingName, percentage]) => {
    if (percentage > 0) {
      const ingredient = ingredients.find(i => i.name === ingName);
      if (ingredient) {
        const attractiveness = ingredient.fish_attractiveness?.[targetFish] || 0;
        totalScore += (attractiveness * percentage) / 10;
        activeIngredientsCount++;
      }
    }
  });

  // Normalisierung: durchschnitt pro aktive Zutat
  return activeIngredientsCount > 0 ? totalScore / activeIngredientsCount : 0;
}

/**
 * Jahreszeiten-Modifier: Wie saisonal ideal ist der Köder?
 */
function getSeasonModifier(season, targetFish, waterTemp) {
  const seasonMods = {
    // Sommer: Erhöhter Stoffwechsel, aber Überangebot
    summer: {
      "Karpfen": 1.15,
      "Brassen": 1.10,
      "Rotauge": 1.12,
      "Hecht": 0.95,      // Räuber weniger aktiv in Hitze
      "Zander": 1.05,
      "Barsch": 1.10,
      "Forelle": 0.90,    // Forellen meiden zu warmes Wasser
      "Aal": 1.20         // Aale aktiv in warmen Nächten
    },
    // Winter: Träger Metabolismus, aber Hunger
    winter: {
      "Karpfen": 0.80,    // Weniger aktiv, aber Köder muss "sprechen"
      "Brassen": 0.85,
      "Rotauge": 0.75,    // Sehr träge
      "Hecht": 1.30,      // Räuber noch aktiv auf Jagd
      "Zander": 1.25,
      "Barsch": 0.95,
      "Forelle": 1.20,    // Winteraktiv in kalten Gewässern
      "Aal": 0.90         // Aale weniger aktiv
    },
    allround: {
      "Karpfen": 1.0,
      "Brassen": 1.0,
      "Rotauge": 1.0,
      "Hecht": 1.0,
      "Zander": 1.0,
      "Barsch": 1.0,
      "Forelle": 1.0,
      "Aal": 1.0
    }
  };

  return (seasonMods[season] || {})[targetFish] || 1.0;
}

/**
 * Temperatur-Faktor: Wie optimal ist die Temperatur für Zielgewässer-Typ?
 * 0–1.0, wobei 1.0 = ideale Temperatur
 */
function getTemperatureFactor(targetFish, waterTemp) {
  // Ideale Temperaturbereiche pro Fisch (°C)
  const optimalRanges = {
    "Karpfen": { min: 18, max: 24, ideal: 21 },
    "Brassen": { min: 16, max: 22, ideal: 19 },
    "Rotauge": { min: 14, max: 20, ideal: 17 },
    "Hecht": { min: 10, max: 18, ideal: 14 },
    "Zander": { min: 12, max: 20, ideal: 16 },
    "Barsch": { min: 14, max: 21, ideal: 18 },
    "Forelle": { min: 8, max: 14, ideal: 11 },
    "Aal": { min: 15, max: 24, ideal: 20 }
  };

  const range = optimalRanges[targetFish] || { min: 10, max: 20, ideal: 15 };

  // Wenn außerhalb des Bereichs: rapide Abnahme
  if (waterTemp < range.min - 5 || waterTemp > range.max + 5) {
    return 0.3; // Zu kalt oder zu warm
  }
  if (waterTemp < range.min || waterTemp > range.max) {
    return 0.65; // Nicht ideal, aber möglich
  }

  // Im idealen Bereich: Gauß-Kurve um ideale Temp
  const distance = Math.abs(waterTemp - range.ideal);
  const factor = Math.exp(-Math.pow(distance / 3, 2)); // Gauß
  return Math.max(0.7, factor); // Mindestens 0.7 im Bereich
}

/**
 * Gewässer-Typ Bonus: Spezialisierung auf See/Fluss/Kanal/Pond
 */
function getWaterTypeBonus(targetFish, waterType) {
  // Manche Fische bevorzugen bestimmte Gewässer-Typen
  const preferences = {
    "Karpfen": { lake: 1.05, river: 0.95, canal: 1.00, pond: 1.10 },
    "Brassen": { lake: 1.00, river: 1.10, canal: 1.05, pond: 0.95 },
    "Rotauge": { lake: 0.95, river: 1.15, canal: 1.00, pond: 1.00 },
    "Hecht": { lake: 1.10, river: 0.95, canal: 0.90, pond: 1.05 },
    "Zander": { lake: 1.00, river: 1.15, canal: 1.05, pond: 0.90 },
    "Barsch": { lake: 1.00, river: 1.05, canal: 1.00, pond: 1.10 },
    "Forelle": { lake: 0.95, river: 1.20, canal: 0.85, pond: 0.90 },
    "Aal": { lake: 1.05, river: 1.10, canal: 1.00, pond: 0.95 }
  };

  return (preferences[targetFish] || {})[waterType] || 1.0;
}

/**
 * Zutaten-Diversität Bonus: Mehr Varietät = bessere Wirkung
 */
function getDiversityBonus(ingredientCount) {
  if (ingredientCount === 0) return 0.5;  // Keine Zutaten
  if (ingredientCount === 1) return 0.70; // Eintönig
  if (ingredientCount === 2) return 0.85; // Begrenzt
  if (ingredientCount === 3) return 1.0;  // Optimal
  if (ingredientCount === 4) return 1.05; // Sehr gut
  if (ingredientCount >= 5) return 1.08; // Hervorragend
  return 1.0;
}

/**
 * Hilfsfunktionen für Beschreibungen
 */
function getSeasonDescription(season, targetFish, waterTemp) {
  const map = {
    summer: `Sommerphase: Erhöhte Aktivität durch warmes Wasser`,
    winter: `Winterphase: Reduzierter Stoffwechsel, aber höhere Fokussierung`,
    allround: `Ganzjährig einsetzbar`
  };
  return map[season] || "";
}

function getTemperatureDescription(targetFish, waterTemp) {
  const ranges = {
    "Karpfen": { min: 18, max: 24 },
    "Forelle": { min: 8, max: 14 },
    "Hecht": { min: 10, max: 18 }
  };
  const range = ranges[targetFish] || { min: 10, max: 20 };

  if (waterTemp < range.min) return `${waterTemp}°C ist etwas kühl (Optimal: ${range.min}–${range.max}°C)`;
  if (waterTemp > range.max) return `${waterTemp}°C ist etwas warm (Optimal: ${range.min}–${range.max}°C)`;
  return `${waterTemp}°C ist ideal für ${targetFish}`;
}

function getWaterTypeDescription(targetFish, waterType) {
  const types = {
    lake: "Stille See — gute Köder-Verteilung",
    river: "Fließgewässer — schnelle Lockstoff-Verteilung",
    canal: "Kanal — moderate Strömung",
    pond: "Kleines Gewässer — intensive Wirkung"
  };
  return types[waterType] || "Gewässer-Typ unbekannt";
}

function getDiversityDescription(count) {
  if (count === 0) return "Keine Zutaten hinzugefügt";
  if (count === 1) return `${count} Zutat — eintönig`;
  if (count <= 2) return `${count} Zutaten — begrenzte Vielfalt`;
  if (count === 3) return `${count} Zutaten — optimale Balance`;
  return `${count} Zutaten — hochkomplexe Mischung`;
}

/**
 * Generiert eine detaillierte Erklärung basierend auf Faktoren
 */
function generateExplanation(targetFish, season, waterTemp, waterType, successRate, factors, mix) {
  let explanation = "";

  if (successRate >= 80) {
    explanation = `Ausgezeichnet! Dein ${targetFish}-Mix hat eine hohe Erfolgswahrscheinlichkeit von ${successRate}%. `;
    explanation += `Die Kombination aus perfekter Zutaten-Balance, saisonalen Bedingungen und Wasser-Parametern ist ideal. `;
  } else if (successRate >= 60) {
    explanation = `Gut! Dein Rezept sollte ${successRate}% Erfolgschance haben. `;
    explanation += `Es gibt noch Raum für Optimierung, aber die Grundmischung stimmt. `;
  } else if (successRate >= 40) {
    explanation = `Mittelmäßig. Dein Mix hat eine ${successRate}% Erfolgschance. `;
    explanation += `Überdenke die Zutaten oder passe die Jahreszeit/Temperatur an. `;
  } else {
    explanation = `Schwach. Mit nur ${successRate}% Erfolgschance solltest du dein Rezept überarbeiten. `;
  }

  // Spezifische Hinweise
  if (waterTemp < 10 && successRate < 70) {
    explanation += `Der ${targetFish} ist bei ${waterTemp}°C träge — füge intensivere Lockstoffe hinzu. `;
  }
  if (waterTemp > 24 && successRate < 70) {
    explanation += `Bei ${waterTemp}°C ist das Wasser zu warm — nutze leichtere, schneller freisetzbare Zutaten. `;
  }

  explanation += `Wichtige Faktoren: ${factors
    .sort((a, b) => b.raw - a.raw)
    .slice(0, 2)
    .map(f => `${f.emoji} ${f.name} (${f.score}%)`)
    .join(", ")}.`;

  return explanation;
}

/**
 * Gibt eine Empfehlung basierend auf Score
 */
function getRecommendation(successRate, targetFish) {
  if (successRate >= 85) {
    return "Direkt am Wasser einsetzen — Top-Rezept!";
  } else if (successRate >= 70) {
    return "Bewährtes Rezept — sollte funktionieren";
  } else if (successRate >= 50) {
    return "Experimentelle Mischung — mit Vorsicht testen";
  } else {
    return "Überarbeitung empfohlen — zu schwach für aktuellen Zustand";
  }
}

/**
 * Utility: Berechne Success-Rate für vordefiniertes Rezept
 */
export function calculatePredefinedRecipeSuccessRate(recipe, ingredients, waterTemp = 15, season = "allround", waterType = "lake") {
  return calculateSuccessRate(
    recipe.ingredients,
    ingredients,
    recipe.fish,
    waterTemp,
    season,
    waterType
  );
}

/**
 * Utility: Sortiere Rezepte nach Success-Rate
 */
export function sortRecipesBySuccessRate(recipes, ingredients, waterTemp, season, waterType) {
  return recipes
    .map(recipe => ({
      ...recipe,
      prognosis: calculatePredefinedRecipeSuccessRate(recipe, ingredients, waterTemp, season, waterType)
    }))
    .sort((a, b) => b.prognosis.successRate - a.prognosis.successRate);
}
