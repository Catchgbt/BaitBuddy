import { describe, it, expect, vi } from 'vitest';
import {
  computeBackoffDelay,
  withTimeout,
  retryWithBackoff,
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_MAX_DELAY_MS,
} from './bleConnection';

describe('computeBackoffDelay', () => {
  it('wächst exponentiell ohne Jitter', () => {
    const opts = { jitter: false, base: 1000, max: 30000 };
    expect(computeBackoffDelay(1, opts)).toBe(1000);
    expect(computeBackoffDelay(2, opts)).toBe(2000);
    expect(computeBackoffDelay(3, opts)).toBe(4000);
    expect(computeBackoffDelay(4, opts)).toBe(8000);
  });

  it('deckelt bei max', () => {
    const opts = { jitter: false, base: 1000, max: 5000 };
    expect(computeBackoffDelay(10, opts)).toBe(5000);
  });

  it('bleibt mit Jitter zwischen base und dem exponentiellen Wert', () => {
    const low = computeBackoffDelay(3, { base: 1000, max: 30000, random: () => 0 });
    const high = computeBackoffDelay(3, { base: 1000, max: 30000, random: () => 1 });
    expect(low).toBe(1000); // random 0 -> base
    expect(high).toBe(4000); // random 1 -> voller exponentieller Wert
  });

  it('behandelt ungültige Versuchszähler defensiv', () => {
    expect(computeBackoffDelay(0, { jitter: false })).toBe(RECONNECT_BASE_DELAY_MS);
    expect(computeBackoffDelay(-5, { jitter: false })).toBe(RECONNECT_BASE_DELAY_MS);
  });

  it('nutzt sinnvolle Defaults', () => {
    const d = computeBackoffDelay(1, { random: () => 1 });
    expect(d).toBeGreaterThanOrEqual(RECONNECT_BASE_DELAY_MS);
    expect(d).toBeLessThanOrEqual(RECONNECT_MAX_DELAY_MS);
  });
});

describe('withTimeout', () => {
  it('löst auf, wenn das Promise rechtzeitig fertig wird', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 50, 'Test')).resolves.toBe('ok');
  });

  it('lehnt mit sprechendem Fehler ab, wenn das Zeitlimit überschritten wird', async () => {
    vi.useFakeTimers();
    const never = new Promise(() => {});
    const p = withTimeout(never, 100, 'Verbindung');
    const assertion = expect(p).rejects.toThrow(/Verbindung.*Zeitlimit.*100/);
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    vi.useRealTimers();
  });

  it('reicht den ursprünglichen Fehler durch', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 50)).rejects.toThrow('boom');
  });
});

describe('retryWithBackoff', () => {
  const noSleep = () => Promise.resolve();

  it('gibt beim ersten Erfolg direkt zurück', async () => {
    const fn = vi.fn().mockResolvedValue('verbunden');
    const result = await retryWithBackoff(fn, { sleep: noSleep });
    expect(result).toBe('verbunden');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('wiederholt bis zum Erfolg', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('drop 1'))
      .mockRejectedValueOnce(new Error('drop 2'))
      .mockResolvedValue('verbunden');
    const onRetry = vi.fn();
    const result = await retryWithBackoff(fn, { sleep: noSleep, onRetry });
    expect(result).toBe('verbunden');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('wirft den letzten Fehler nach Erschöpfen der Versuche', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('immer weg'));
    await expect(
      retryWithBackoff(fn, { sleep: noSleep, maxAttempts: 3 })
    ).rejects.toThrow('immer weg');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('bricht vor dem ersten Versuch ab, wenn shouldCancel true ist', async () => {
    const fn = vi.fn().mockResolvedValue('x');
    await expect(
      retryWithBackoff(fn, { sleep: noSleep, shouldCancel: () => true })
    ).rejects.toThrow('cancelled');
    expect(fn).not.toHaveBeenCalled();
  });

  it('bricht während der Wiederholungen ab, ohne weiter zu versuchen', async () => {
    let cancelled = false;
    const fn = vi.fn().mockRejectedValue(new Error('drop'));
    const sleep = vi.fn().mockImplementation(() => {
      cancelled = true;
      return Promise.resolve();
    });
    await expect(
      retryWithBackoff(fn, { sleep, shouldCancel: () => cancelled, maxAttempts: 5 })
    ).rejects.toThrow('cancelled');
    // 1. Versuch scheitert -> sleep setzt cancelled -> nächste Iteration bricht ab.
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
