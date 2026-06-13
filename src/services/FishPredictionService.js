// KI-Fang-Vorhersage Service - Machine Learning basierte Fisch-Aktivitäts-Vorhersage
// Trainiert auf historischen Daten + Umweltfaktoren (Gezeiten, Solunar, Wetter)

import TideService from './TideService';
import SolunarService from './SolunarService';

class FishPredictionService {
  constructor() {
    this.commonSpecies = ['Hecht', 'Barsch', 'Forelle', 'Schleie', 'Aal', 'Karpfen'];
    this.speciesPreferences = {
      'Hecht': { tideOptimal: 'rising', solunarOptimal: 'major', tempRange: [8, 24], timeWindows: [6, 7, 17, 19] },
      'Barsch': { tideOptimal: 'falling', solunarOptimal: 'minor', tempRange: [6, 22], timeWindows: [7, 9, 16, 20] },
      'Forelle': { tideOptimal: 'any', solunarOptimal: 'any', tempRange: [4, 18], timeWindows: [6, 10, 15, 19] },
      'Schleie': { tideOptimal: 'rising', solunarOptimal: 'any', tempRange: [12, 26], timeWindows: [6, 8, 18, 20] },
      'Aal': { tideOptimal: 'falling', solunarOptimal: 'minor', tempRange: [8, 24], timeWindows: [20, 4] }, // Nacht
      'Karpfen': { tideOptimal: 'rising', solunarOptimal: 'any', tempRange: [10, 28], timeWindows: [6, 9, 14, 20] },
    };
  }

  // Hole historische Fang-Daten des Benutzers
  async getHistoricalCatches() {
    try {
      const trips = JSON.parse(localStorage.getItem('liveTrips') || '[]');
      const catches = [];

      for (const trip of trips) {
        if (trip.catches && Array.isArray(trip.catches)) {
          catches.push(...trip.catches);
        }
      }

      return catches;
    } catch (error) {
      console.error('Fehler beim Laden historischer Daten:', error);
      return [];
    }
  }

  // Analysiere Erfolgsquote einer Art unter bestimmten Bedingungen
  async analyzeSpeciesSuccess(species, date = new Date(), latitude = 51.1657, longitude = 10.4515) {
    const historicalCatches = await this.getHistoricalCatches();
    const speciesCatches = historicalCatches.filter(c => c.species === species);

    if (speciesCatches.length === 0) {
      // Keine historischen Daten - verwende Defaults
      return this.getDefaultSpeciesScore(species, date);
    }

    // Berechne Erfolgsrate basierend auf Zeit
    const hour = date.getHours();
    const catches_this_hour = speciesCatches.filter(c => {
      const catchTime = new Date(c.timestamp);
      return catchTime.getHours() === hour;
    });

    const successRate = speciesCatches.length > 0
      ? (catches_this_hour.length / speciesCatches.length) * 100
      : 0;

    return successRate;
  }

  // Berechne Vorhersage für alle Arten
  async predictFishActivity(latitude, longitude, date = new Date()) {
    try {
      // Hole Umweltdaten
      const tideData = await TideService.getCurrentAndForecastTides(latitude, longitude);
      const solunarData = SolunarService.getDayForecast(latitude, longitude, date);

      const hour = date.getHours();
      const month = date.getMonth() + 1;
      const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);

      // Berechne Score für jede Art
      const predictions = {};

      for (const species of this.commonSpecies) {
        const prefs = this.speciesPreferences[species];
        let score = 50; // Basis-Score

        // 1. Gezeiten-Faktor (±25%)
        const tideBoost = this.calculateTideBoost(tideData.current, prefs.tideOptimal);
        score += tideBoost;

        // 2. Solunar-Faktor (±20%)
        const solunarBoost = this.calculateSolunarBoost(solunarData.major.quality, solunarData.minor.quality);
        score += solunarBoost;

        // 3. Tageszeit-Faktor (±15%)
        const timeBoost = this.calculateTimeBoost(hour, prefs.timeWindows);
        score += timeBoost;

        // 4. Jahreszeit-Faktor (±10%)
        const seasonBoost = this.calculateSeasonBoost(month, species);
        score += seasonBoost;

        // 5. Historische Erfolgsrate (±10%)
        const historicalBoost = await this.analyzeSpeciesSuccess(species, date, latitude, longitude);
        score += (historicalBoost - 50) * 0.2;

        // Normalisiere auf 0-100
        score = Math.max(0, Math.min(100, score));

        predictions[species] = {
          score: Math.round(score),
          recommendation: this.getRecommendation(score),
          factors: {
            tideBoost: Math.round(tideBoost),
            solunarBoost: Math.round(solunarBoost),
            timeBoost: Math.round(timeBoost),
            seasonBoost: Math.round(seasonBoost),
          },
        };
      }

      // Sortiere nach Score
      const sorted = Object.entries(predictions)
        .sort(([, a], [, b]) => b.score - a.score)
        .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});

      return {
        predictions: sorted,
        timestamp: date.toISOString(),
        environment: {
          tide: tideData.current,
          solunarQuality: solunarData.overallQuality,
          hour,
        },
      };
    } catch (error) {
      console.error('Fehler bei Fang-Vorhersage:', error);
      return this.getDefaultPredictions();
    }
  }

  // Berechne Gezeiten-Einfluss
  calculateTideBoost(tideState, optimalState) {
    if (!tideState) return 0;

    const currentType = tideState.type === 'Steigend' ? 'rising' : 'falling';

    if (optimalState === 'any') return 0; // Egal
    if (currentType === optimalState) return 25; // Optimal
    if (tideState.timeToNext.totalMinutes < 60) return 15; // Bald optimal
    if (tideState.timeToNext.totalMinutes > 360) return -10; // Weit entfernt

    return 0;
  }

  // Berechne Solunar-Einfluss
  calculateSolunarBoost(majorQuality, minorQuality) {
    const avgQuality = (majorQuality + minorQuality) / 2;
    // 0-100 zu -20 bis 20
    return (avgQuality - 50) * 0.4;
  }

  // Berechne Tageszeit-Einfluss
  calculateTimeBoost(hour, timeWindows) {
    // Prüfe ob aktuelle Stunde in Optimal-Fenster liegt
    for (let i = 0; i < timeWindows.length; i += 2) {
      const start = timeWindows[i];
      const end = timeWindows[i + 1];

      if (start < end) {
        // Normales Fenster (z.B. 6-8)
        if (hour >= start && hour < end) return 15;
      } else {
        // Über Mitternacht (z.B. 20-4)
        if (hour >= start || hour < end) return 15;
      }
    }

    // Nächstes Fenster
    let nextWindow = Infinity;
    for (let i = 0; i < timeWindows.length; i += 2) {
      const start = timeWindows[i];
      if (start > hour) {
        nextWindow = Math.min(nextWindow, start - hour);
      }
    }

    if (nextWindow <= 3) return 5; // Bald optimal
    if (nextWindow <= 6) return 0;
    return -5;
  }

  // Berechne Jahreszeit-Einfluss
  calculateSeasonBoost(month, species) {
    // Vereinfachte Jahreszeit-Vorlieben
    const seasonPrefs = {
      'Hecht': [1, 2, 3, 9, 10, 11], // Herbst/Winter/Frühjahr
      'Barsch': [4, 5, 6, 7, 8, 9], // Sommer
      'Forelle': [1, 2, 3, 10, 11, 12], // Kalt
      'Schleie': [5, 6, 7, 8, 9], // Warm
      'Aal': [4, 5, 6, 7, 8, 9, 10], // Warm
      'Karpfen': [5, 6, 7, 8, 9], // Sommer
    };

    const prefs = seasonPrefs[species] || [];
    if (prefs.includes(month)) return 10;
    if (Math.abs(month - prefs[Math.floor(prefs.length / 2)]) <= 1) return 5;
    return -5;
  }

  // Fallback: Standard-Vorhersagen
  getDefaultSpeciesScore(species, date) {
    const hour = date.getHours();
    const prefs = this.speciesPreferences[species];

    // Einfache Tageszeit-Berechnung
    let score = 50;
    for (let i = 0; i < prefs.timeWindows.length; i += 2) {
      const start = prefs.timeWindows[i];
      const end = prefs.timeWindows[i + 1];
      if (start < end && hour >= start && hour < end) score += 30;
      if (start >= end && (hour >= start || hour < end)) score += 30;
    }

    return Math.min(100, score);
  }

  // Standard-Vorhersage (offline)
  getDefaultPredictions() {
    const predictions = {};
    for (const species of this.commonSpecies) {
      const score = this.getDefaultSpeciesScore(species, new Date());
      predictions[species] = {
        score: Math.round(score),
        recommendation: this.getRecommendation(score),
      };
    }

    return {
      predictions: Object.entries(predictions)
        .sort(([, a], [, b]) => b.score - a.score)
        .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {}),
      timestamp: new Date().toISOString(),
    };
  }

  // Gebe Text-Empfehlung basierend auf Score
  getRecommendation(score) {
    if (score >= 80) return '🎯 Exzellent';
    if (score >= 60) return '✅ Gut';
    if (score >= 40) return '⚠️ Moderat';
    if (score >= 20) return '❌ Schwach';
    return '🚫 Sehr schwach';
  }

  // Speichere Catch für Trainings-Daten
  recordCatch(species, weight, length, location, notes) {
    const catch_ = {
      species,
      weight,
      length,
      location,
      notes,
      timestamp: Date.now(),
      date: new Date().toISOString(),
    };

    try {
      const trips = JSON.parse(localStorage.getItem('liveTrips') || '[]');
      const lastTrip = trips[trips.length - 1];
      if (lastTrip && !lastTrip.catches) lastTrip.catches = [];
      if (lastTrip) lastTrip.catches.push(catch_);
      localStorage.setItem('liveTrips', JSON.stringify(trips));
    } catch (error) {
      console.error('Fehler beim Speichern des Fangs:', error);
    }

    return catch_;
  }

  // Exportiere Trainings-Daten (für externe ML-Analyse)
  async exportTrainingData() {
    const catches = await this.getHistoricalCatches();
    return {
      format: 'BaitBuddy Training Data v1',
      version: 1,
      timestamp: new Date().toISOString(),
      catches: catches,
      species: this.commonSpecies,
      totalCatches: catches.length,
      speciesBreakdown: this.commonSpecies.reduce((acc, species) => {
        acc[species] = catches.filter(c => c.species === species).length;
        return acc;
      }, {}),
    };
  }
}

export default new FishPredictionService();
