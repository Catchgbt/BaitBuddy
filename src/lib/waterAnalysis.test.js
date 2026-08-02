import { describe, it, expect } from 'vitest';
import {
  normalizeToScore,
  extractParameters,
  assessConditions,
  toChartSeries,
  buildWaterAnalysis,
} from './waterAnalysis';

// Antwortform von POST /api/water-data/fetch (Zeile aus `water_scenes`).
function makeScene({ marine = true, current = {}, series = null } = {}) {
  return {
    id: 'scene-1',
    latitude: 54.32,
    longitude: 10.13,
    source: marine ? 'open-meteo-marine+forecast' : 'open-meteo-forecast',
    temperature_profile: {
      current: {
        temperature_2m: 18,
        wind_speed_10m: 12,
        pressure_msl: 1018,
        relative_humidity_2m: 72,
        ...current,
      },
      series: series ?? [
        {
          time: '2026-08-02T10:00',
          air_temp: 17,
          soil_0: 16,
          sea_surface: marine ? 17.5 : null,
          wave_height: marine ? 0.3 : null,
        },
        {
          time: '2026-08-02T11:00',
          air_temp: 18,
          soil_0: 16.5,
          sea_surface: marine ? 18 : null,
          wave_height: marine ? 0.35 : null,
        },
      ],
    },
  };
}

describe('normalizeToScore', () => {
  const window = { min: 2, optimalFrom: 12, optimalTo: 22, max: 30 };

  it('gibt im Optimalfenster 100', () => {
    expect(normalizeToScore(12, window)).toBe(100);
    expect(normalizeToScore(18, window)).toBe(100);
    expect(normalizeToScore(22, window)).toBe(100);
  });

  it('faellt zu den Aussengrenzen hin auf 0', () => {
    expect(normalizeToScore(2, window)).toBe(0);
    expect(normalizeToScore(30, window)).toBe(0);
    expect(normalizeToScore(7, window)).toBeCloseTo(50, 0);
    expect(normalizeToScore(26, window)).toBeCloseTo(50, 0);
  });

  it('liefert null fuer fehlende oder unbrauchbare Werte', () => {
    expect(normalizeToScore(null, window)).toBeNull();
    expect(normalizeToScore(undefined, window)).toBeNull();
    expect(normalizeToScore(NaN, window)).toBeNull();
    expect(normalizeToScore(15, null)).toBeNull();
  });
});

describe('extractParameters', () => {
  it('liest die echten Messwerte aus der Szene', () => {
    const { parameters, source } = extractParameters(makeScene());

    expect(source).toBe('open-meteo-marine+forecast');
    expect(parameters.air_temp.value).toBe(18);
    expect(parameters.pressure.value).toBe(1018);
    expect(parameters.wind.value).toBe(12);
    expect(parameters.humidity.value).toBe(72);
    // Jeweils der juengste Eintrag der Zeitreihe.
    expect(parameters.water_temp.value).toBe(18);
    expect(parameters.ground_temp.value).toBe(16.5);
    expect(parameters.wave_height.value).toBe(0.35);
  });

  it('laesst Marine-Parameter im Binnenland komplett weg statt sie zu erfinden', () => {
    const { parameters } = extractParameters(makeScene({ marine: false }));

    expect(parameters.water_temp).toBeUndefined();
    expect(parameters.wave_height).toBeUndefined();
    // Was echt vorhanden ist, bleibt.
    expect(parameters.ground_temp.value).toBe(16.5);
    expect(parameters.air_temp.value).toBe(18);
  });

  it('erfindet keine Parameter ohne Datenquelle', () => {
    const { parameters } = extractParameters(makeScene());
    for (const erfunden of ['chlorophyll', 'cyanobacteria', 'turbidity', 'ph', 'oxygen']) {
      expect(parameters[erfunden]).toBeUndefined();
    }
  });

  it('kommt mit einer leeren oder kaputten Szene zurecht', () => {
    expect(extractParameters(null).parameters).toEqual({});
    expect(extractParameters({}).parameters).toEqual({});
    expect(extractParameters({ temperature_profile: { series: 'kaputt' } }).series).toEqual([]);
  });

  it('vergibt Qualitaetsstufen aus dem Messwert', () => {
    const optimal = extractParameters(makeScene({ current: { temperature_2m: 18 } }));
    expect(optimal.parameters.air_temp.quality).toBe('optimal');

    const kalt = extractParameters(makeScene({ current: { temperature_2m: -4 } }));
    expect(kalt.parameters.air_temp.quality).toBe('schlecht');
  });
});

describe('assessConditions', () => {
  it('gewichtet die Parameter und legt jeden Beitrag offen', () => {
    const { parameters } = extractParameters(makeScene());
    const result = assessConditions(parameters);

    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.parameterCount).toBeGreaterThan(0);
    // Jeder Beitrag ist nachvollziehbar: Wert, Optimalbereich, Gewicht.
    for (const reason of result.reasons) {
      expect(reason).toHaveProperty('label');
      expect(reason).toHaveProperty('value');
      expect(reason).toHaveProperty('optimal');
      expect(reason.weight).toBeGreaterThan(0);
    }
  });

  it('sortiert den schwaechsten Faktor nach vorn', () => {
    const { parameters } = extractParameters(
      makeScene({ current: { wind_speed_10m: 50, temperature_2m: 18 } })
    );
    const result = assessConditions(parameters);
    expect(result.reasons[0].key).toBe('wind');
  });

  it('bewertet gute Bedingungen hoeher als schlechte', () => {
    const gut = assessConditions(
      extractParameters(makeScene({ current: { temperature_2m: 18, pressure_msl: 1018, wind_speed_10m: 10 } })).parameters
    );
    const schlecht = assessConditions(
      extractParameters(makeScene({ current: { temperature_2m: 36, pressure_msl: 985, wind_speed_10m: 52 } })).parameters
    );
    expect(gut.score).toBeGreaterThan(schlecht.score);
  });

  it('liefert null ohne verwertbare Parameter', () => {
    const result = assessConditions({});
    expect(result.score).toBeNull();
    expect(result.rating).toBe('unbekannt');
  });
});

describe('toChartSeries', () => {
  it('uebernimmt nur Felder mit echten Werten', () => {
    const series = toChartSeries(extractParameters(makeScene({ marine: false })).series);
    expect(series).toHaveLength(2);
    expect(series[0].air_temp).toBe(17);
    expect(series[0].ground_temp).toBe(16);
    expect(series[0].water_temp).toBeUndefined();
    expect(series[0].wave_height).toBeUndefined();
    expect(series[0].label).toMatch(/\d{2}:\d{2}/);
  });

  it('ist robust gegen Muell', () => {
    expect(toChartSeries(null)).toEqual([]);
    expect(toChartSeries([null, {}, { time: '2026-08-02T10:00' }])).toHaveLength(1);
  });
});

describe('buildWaterAnalysis', () => {
  it('setzt Position, Quelle, Parameter, Reihe und Bewertung zusammen', () => {
    const result = buildWaterAnalysis(makeScene(), { name: 'Kieler Förde' });

    expect(result.location).toMatchObject({ lat: 54.32, lon: 10.13, name: 'Kieler Förde' });
    expect(result.source).toBe('open-meteo-marine+forecast');
    expect(Object.keys(result.parameters).length).toBeGreaterThan(3);
    expect(result.series).toHaveLength(2);
    expect(result.assessment.score).toBeGreaterThan(0);
    expect(new Date(result.timestamp).getTime()).not.toBeNaN();
  });
});
