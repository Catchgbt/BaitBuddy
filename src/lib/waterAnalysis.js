// Auswertung echter Gewässerdaten.
// ============================================================================
// Datenquelle ist ausschließlich `POST /api/water-data/fetch` im Backend, das
// Open-Meteo Forecast (Luft, Druck, Wind, Bodentemperaturen) und Open-Meteo
// Marine (Wasseroberflächen-Temperatur, Wellenhöhe) abruft und das Ergebnis in
// `water_scenes` ablegt.
//
// Vorher erzeugte WaterAnalysisPanel.jsx alle Werte per Math.random() —
// Chlorophyll, Blaualgen, Trübung, pH und Sauerstoff wurden als
// "Satellitenmessung" ausgegeben, obwohl es dafür weder eine Quelle noch eine
// Messung gab. Diese fünf Parameter sind ersatzlos entfallen: Open-Meteo
// liefert sie nicht, und Erfinden ist keine Option.
//
// Grundregel hier: Ein Parameter erscheint nur, wenn ein echter Messwert
// vorliegt. Fehlt er (z. B. Wasseroberflächen-Temperatur im Binnenland, wo das
// Marine-Modell nicht greift), fehlt er auch in der Anzeige.

// Bewertungsfenster je Parameter: [untere Grenze, optimal von, optimal bis,
// obere Grenze]. Ausserhalb von min/max gibt es 0 Punkte, im Optimum 100.
const SCORE_WINDOWS = {
  water_temp: { min: 2, optimalFrom: 12, optimalTo: 22, max: 30, weight: 3 },
  ground_temp: { min: 2, optimalFrom: 10, optimalTo: 20, max: 30, weight: 1 },
  air_temp: { min: -5, optimalFrom: 10, optimalTo: 24, max: 38, weight: 1 },
  pressure: { min: 980, optimalFrom: 1012, optimalTo: 1025, max: 1045, weight: 2 },
  wind: { min: 0, optimalFrom: 4, optimalTo: 18, max: 55, weight: 2 },
  wave_height: { min: 0, optimalFrom: 0, optimalTo: 0.4, max: 2.5, weight: 1 },
};

const LABELS = {
  water_temp: { label: 'Wassertemperatur', unit: '°C', description: 'Oberfläche (Marine-Modell)' },
  ground_temp: { label: 'Bodentemperatur', unit: '°C', description: 'Substrat in 0 cm Tiefe' },
  air_temp: { label: 'Lufttemperatur', unit: '°C', description: '2 m über Grund' },
  pressure: { label: 'Luftdruck', unit: 'hPa', description: 'Auf Meereshöhe reduziert' },
  wind: { label: 'Wind', unit: 'km/h', description: 'Geschwindigkeit in 10 m Höhe' },
  humidity: { label: 'Luftfeuchte', unit: '%', description: 'Relative Feuchte' },
  wave_height: { label: 'Wellenhöhe', unit: 'm', description: 'Signifikante Wellenhöhe' },
};

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Normalisiert einen Messwert auf 0–100. Im Optimalfenster 100, zu den
 * Aussengrenzen hin linear auf 0 fallend.
 */
export function normalizeToScore(value, window) {
  if (!isNumber(value) || !window) return null;
  const { min, optimalFrom, optimalTo, max } = window;
  if (value >= optimalFrom && value <= optimalTo) return 100;
  if (value <= min || value >= max) return 0;
  if (value < optimalFrom) {
    return ((value - min) / (optimalFrom - min)) * 100;
  }
  return (1 - (value - optimalTo) / (max - optimalTo)) * 100;
}

function qualityFromScore(score) {
  if (score === null) return 'unbekannt';
  if (score >= 80) return 'optimal';
  if (score >= 55) return 'gut';
  if (score >= 30) return 'mittel';
  return 'schlecht';
}

/**
 * Baut die Parameterliste aus einer `water_scenes`-Zeile. Enthalten ist nur,
 * wofür es einen echten Wert gibt.
 *
 * @param {object} scene Antwort von POST /api/water-data/fetch
 * @returns {{ parameters: object, series: object[], source: string }}
 */
export function extractParameters(scene) {
  const profile = scene?.temperature_profile || {};
  const current = profile.current || {};
  const series = Array.isArray(profile.series) ? profile.series : [];

  // Der jüngste Eintrag mit Marine-Werten; das Marine-Modell deckt Binnenland
  // nicht ab und liefert dort durchgehend null.
  const latestMarine = [...series].reverse().find(
    (s) => isNumber(s?.sea_surface) || isNumber(s?.wave_height)
  ) || {};
  const latestGround = [...series].reverse().find((s) => isNumber(s?.soil_0)) || {};

  const raw = {
    water_temp: latestMarine.sea_surface,
    ground_temp: latestGround.soil_0,
    air_temp: current.temperature_2m,
    pressure: current.pressure_msl,
    wind: current.wind_speed_10m,
    humidity: current.relative_humidity_2m,
    wave_height: latestMarine.wave_height,
  };

  const parameters = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isNumber(value)) continue;
    const score = normalizeToScore(value, SCORE_WINDOWS[key]);
    parameters[key] = {
      value,
      score,
      quality: qualityFromScore(score),
      ...LABELS[key],
    };
  }

  return { parameters, series, source: scene?.source || 'open-meteo' };
}

/**
 * Regelbasierte Einschätzung der Angelbedingungen — bewusst KEINE "KI-Analyse":
 * das Ergebnis ist ein gewichteter Mittelwert der oben dokumentierten
 * Bewertungsfenster, jeder Beitrag wird in `reasons` offengelegt.
 */
export function assessConditions(parameters) {
  const contributions = [];
  let weighted = 0;
  let totalWeight = 0;

  for (const [key, param] of Object.entries(parameters)) {
    const window = SCORE_WINDOWS[key];
    if (!window || param.score === null) continue;
    weighted += param.score * window.weight;
    totalWeight += window.weight;
    contributions.push({
      key,
      label: param.label,
      value: param.value,
      unit: param.unit,
      score: Math.round(param.score),
      weight: window.weight,
      optimal: `${window.optimalFrom}–${window.optimalTo} ${param.unit}`,
    });
  }

  if (totalWeight === 0) {
    return { score: null, rating: 'unbekannt', reasons: [], parameterCount: 0 };
  }

  const score = Math.round(weighted / totalWeight);
  contributions.sort((a, b) => a.score - b.score);

  return {
    score,
    rating: qualityFromScore(score),
    // Schwächster Faktor zuerst — das ist die Information, die dem Angler hilft.
    reasons: contributions,
    parameterCount: contributions.length,
  };
}

/**
 * Formt die Zeitreihe für die Diagramme um. Nur Felder mit echten Werten.
 */
export function toChartSeries(series) {
  if (!Array.isArray(series)) return [];
  return series
    .filter((point) => point && point.time)
    .map((point) => {
      const date = new Date(point.time);
      const entry = {
        time: point.time,
        label: Number.isNaN(date.getTime())
          ? String(point.time)
          : date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      };
      if (isNumber(point.air_temp)) entry.air_temp = point.air_temp;
      if (isNumber(point.sea_surface)) entry.water_temp = point.sea_surface;
      if (isNumber(point.soil_0)) entry.ground_temp = point.soil_0;
      if (isNumber(point.wave_height)) entry.wave_height = point.wave_height;
      return entry;
    });
}

/**
 * Setzt aus einer `water_scenes`-Zeile das komplette Analyse-Objekt zusammen,
 * das Panel, Anzeige, Diagramme und Export gemeinsam nutzen.
 */
export function buildWaterAnalysis(scene, location = {}) {
  const { parameters, series, source } = extractParameters(scene);
  return {
    timestamp: new Date().toISOString(),
    location: {
      lat: isNumber(scene?.latitude) ? scene.latitude : location.lat ?? null,
      lon: isNumber(scene?.longitude) ? scene.longitude : location.lon ?? null,
      name: location.name || 'Aktueller Standort',
    },
    source,
    parameters,
    series: toChartSeries(series),
    assessment: assessConditions(parameters),
  };
}
