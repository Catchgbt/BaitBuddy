import { describe, it, expect } from 'vitest';
import tideService from '@/services/TideService';

describe('TideService.timeUntilEvent', () => {
  it('berechnet zukünftige Zeitspannen korrekt (90 Minuten)', () => {
    const now = new Date('2026-06-15T12:00:00Z');
    const event = new Date('2026-06-15T13:30:00Z');
    const { hours, minutes, diff } = tideService.timeUntilEvent(now, event);
    expect(hours).toBe(1);
    expect(minutes).toBe(30);
    expect(diff).toBe(90 * 60 * 1000);
  });

  it('clampt vergangene Events auf 0 (Regression: keine negativen Zeiten)', () => {
    const now = new Date('2026-06-15T12:00:00Z');
    const past = new Date('2026-06-15T09:30:00Z');
    const { hours, minutes, diff } = tideService.timeUntilEvent(now, past);
    expect(diff).toBe(0);
    expect(hours).toBe(0);
    expect(minutes).toBe(0);
  });

  it('gibt für ein Event genau jetzt 0 zurück', () => {
    const now = new Date('2026-06-15T12:00:00Z');
    const { hours, minutes, diff } = tideService.timeUntilEvent(now, new Date(now));
    expect(diff).toBe(0);
    expect(hours).toBe(0);
    expect(minutes).toBe(0);
  });
});
