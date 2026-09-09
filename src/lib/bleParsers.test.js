import { describe, it, expect } from 'vitest';
import { parseBLE, HR_SERVICE, HR_MEASUREMENT } from './bleParsers';

// Baut einen DataView aus Byte-Werten (little-endian wie im BLE-Standard).
function dv(...bytes) {
  const buffer = new Uint8Array(bytes).buffer;
  return new DataView(buffer);
}

describe('parseBLE — heartRate', () => {
  it('liest 8-Bit-BPM (Flag-Bit 0 = 0)', () => {
    expect(parseBLE(dv(0x00, 72), 'heartRate')).toEqual({ bpm: 72, flags: 0x00 });
  });

  it('liest 16-Bit-BPM (Flag-Bit 0 = 1) little-endian', () => {
    // 300 bpm = 0x012C -> LE-Bytes 0x2C 0x01
    expect(parseBLE(dv(0x01, 0x2c, 0x01), 'heartRate')).toMatchObject({ bpm: 300 });
  });

  it('liest Energy Expended, wenn Flag-Bit 3 gesetzt ist', () => {
    // flags 0x08, bpm 60, energy 500 (0x01F4 LE)
    const result = parseBLE(dv(0x08, 60, 0xf4, 0x01), 'heartRate');
    expect(result).toMatchObject({ bpm: 60, energy_expended: 500 });
  });

  it('liest alle RR-Intervalle, wenn Flag-Bit 4 gesetzt ist', () => {
    // flags 0x10, bpm 60, RR 800 (0x0320 LE) und 810 (0x032A LE)
    const result = parseBLE(dv(0x10, 60, 0x20, 0x03, 0x2a, 0x03), 'heartRate');
    expect(result.rr_intervals).toEqual([800, 810]);
  });

  it('kombiniert Energy Expended und RR-Intervalle in der richtigen Reihenfolge', () => {
    // flags 0x18 (Bit 3 + Bit 4), bpm 55, energy 100 (0x0064), RR 900 (0x0384)
    const result = parseBLE(dv(0x18, 55, 0x64, 0x00, 0x84, 0x03), 'heartRate');
    expect(result).toMatchObject({ bpm: 55, energy_expended: 100, rr_intervals: [900] });
  });

  it('faellt bei zu kurzem Paket auf den Hex-Dump zurueck', () => {
    expect(parseBLE(dv(0x00), 'heartRate')).toEqual({ raw_hex: '00', len: 1 });
  });
});

describe('parseBLE — scale', () => {
  it('rechnet Gramm in Kilogramm um', () => {
    // 2500 g = 0x09C4 LE
    expect(parseBLE(dv(0xc4, 0x09), 'scale')).toEqual({ weight_g: 2500, weight_kg: 2.5 });
  });

  it('faellt bei zu kurzem Paket auf den Hex-Dump zurueck', () => {
    expect(parseBLE(dv(0x07), 'scale')).toEqual({ raw_hex: '07', len: 1 });
  });
});

describe('parseBLE — reel', () => {
  it('skaliert Distanz (cm) und Batteriespannung (mV)', () => {
    // rpm 120 (0x0078), distance 1550 cm (0x060E), battery 3700 mV (0x0E74)
    expect(parseBLE(dv(0x78, 0x00, 0x0e, 0x06, 0x74, 0x0e), 'reel')).toEqual({
      rpm: 120,
      distance_m: 15.5,
      battery_v: 3.7,
    });
  });

  it('faellt unter 6 Byte auf den Hex-Dump zurueck', () => {
    expect(parseBLE(dv(0x01, 0x02), 'reel')).toEqual({ raw_hex: '0102', len: 2 });
  });
});

describe('parseBLE — sonarSimple', () => {
  it('skaliert Tiefe (cm) und Temperatur (Zehntelgrad)', () => {
    // depth 450 cm (0x01C2), temp 187 (0x00BB) -> 18.7 °C
    expect(parseBLE(dv(0xc2, 0x01, 0xbb, 0x00), 'sonarSimple')).toEqual({
      depth_m: 4.5,
      temp_c: 18.7,
    });
  });
});

describe('parseBLE — button und unbekannte Typen', () => {
  it('meldet einen Tastendruck mit Rohdaten', () => {
    expect(parseBLE(dv(0xab, 0xcd), 'button')).toEqual({ pressed: true, raw: 'abcd' });
  });

  it('liefert fuer unbekannte Parser einen Hex-Dump', () => {
    expect(parseBLE(dv(0x0f, 0xff), 'gibtsNicht')).toEqual({ raw_hex: '0fff', len: 2 });
  });
});

describe('GATT-Konstanten', () => {
  it('verwendet die standardisierten Heart-Rate-UUIDs', () => {
    expect(HR_SERVICE).toBe('0000180d-0000-1000-8000-00805f9b34fb');
    expect(HR_MEASUREMENT).toBe('00002a37-0000-1000-8000-00805f9b34fb');
  });
});
