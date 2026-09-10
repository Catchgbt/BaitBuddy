import { describe, it, expect } from 'vitest';
import { EchogramRenderer, synthesizeIntensities, DEPTH_MAX_METERS } from './echogram';

// Minimaler 2D-Kontext-Stub: der Renderer liest ImageData, schreibt Pixel und
// gibt sie zurueck. Ein echtes Canvas ist in jsdom nicht verfuegbar.
function createCanvasStub(width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  const ctx = {
    fillStyle: '',
    fillRectCalls: [],
    getImageData: () => ({ data, width, height }),
    putImageData: (imageData) => {
      data.set(imageData.data);
    },
    fillRect: (...args) => ctx.fillRectCalls.push(args),
  };
  return { width, height, getContext: () => ctx, __ctx: ctx, __data: data };
}

describe('synthesizeIntensities', () => {
  it('liefert genau `height` Werte im Bereich 0..255', () => {
    const values = synthesizeIntensities(64, 10);
    expect(values).toHaveLength(64);
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(255);
    }
  });

  it('setzt das Maximum auf die Pixelzeile der gemessenen Tiefe', () => {
    const height = 100;
    const depth = 25; // Haelfte von DEPTH_MAX_METERS -> Zeile 50
    const values = synthesizeIntensities(height, depth);
    const peak = values.indexOf(Math.max(...values));
    expect(peak).toBe(Math.round((depth / DEPTH_MAX_METERS) * height));
    expect(values[peak]).toBe(255);
  });

  it('klemmt Tiefen jenseits der Skala auf die unterste Zeile', () => {
    const height = 40;
    const values = synthesizeIntensities(height, DEPTH_MAX_METERS * 3);
    expect(values.indexOf(Math.max(...values))).toBe(height - 1);
  });

  it('faellt ohne Tiefenmesswert auf 60 % der Hoehe zurueck', () => {
    const height = 100;
    const values = synthesizeIntensities(height, null);
    expect(values.indexOf(Math.max(...values))).toBe(60);
  });

  it('faellt die Intensitaet mit dem Abstand zur Tiefenzeile ab', () => {
    const values = synthesizeIntensities(100, 25);
    // 10 Pixel Abstand -> 255 - 10*10 = 155
    expect(values[40]).toBe(155);
    expect(values[60]).toBe(155);
    // Weit entfernte Zeilen sind auf 0 geklemmt, nicht negativ.
    expect(values[0]).toBe(0);
  });
});

describe('EchogramRenderer', () => {
  it('erzeugt eine RGBA-Palette mit 256 vollstaendig opaken Eintraegen', () => {
    const renderer = new EchogramRenderer(createCanvasStub(8, 8));
    expect(renderer.palette).toHaveLength(256 * 4);
    for (let i = 0; i < 256; i++) {
      expect(renderer.palette[i * 4 + 3]).toBe(255);
    }
    // Kaltes Ende blau, warmes Ende rot (Standard-Echolot-Farbverlauf).
    expect(renderer.palette[255 * 4]).toBe(255); // R bei Maximum
    expect(renderer.palette[2]).toBe(0); // B bei Minimum noch dunkel
  });

  it('schreibt pro Ping genau eine Spalte und rueckt den Schreibzeiger vor', () => {
    const canvas = createCanvasStub(4, 4);
    const renderer = new EchogramRenderer(canvas);
    expect(renderer.columnIndex).toBe(0);

    renderer.pushPing({ intensities: [255, 255, 255, 255], depth_m: 5, temp_c: 12 });

    expect(renderer.columnIndex).toBe(1);
    // Spalte 0 ist gefuellt (Alpha gesetzt), Spalte 2 unberuehrt.
    expect(canvas.__data[3]).toBe(255);
    expect(canvas.__data[2 * 4 + 3]).toBe(0);
  });

  it('laeuft am rechten Rand zyklisch wieder auf Spalte 0', () => {
    const renderer = new EchogramRenderer(createCanvasStub(3, 2));
    for (let i = 0; i < 3; i++) renderer.pushPing({ depth_m: 3 });
    expect(renderer.columnIndex).toBe(0);
  });

  it('gibt Tiefe und Temperatur des Pings unveraendert zurueck', () => {
    const renderer = new EchogramRenderer(createCanvasStub(4, 4));
    expect(renderer.pushPing({ depth_m: 7.5, temp_c: 14.2 })).toEqual({
      depth_m: 7.5,
      temp_c: 14.2,
    });
  });

  it('synthetisiert eine Spalte, wenn keine Intensitaeten geliefert werden', () => {
    const canvas = createCanvasStub(4, 4);
    const renderer = new EchogramRenderer(canvas);
    renderer.pushPing({ depth_m: 25 });
    // Ohne Intensitaeten wird trotzdem gezeichnet (Alpha der Spalte 0 gesetzt).
    expect(canvas.__data[3]).toBe(255);
  });
});
