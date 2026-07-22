import { describe, it, expect, vi } from 'vitest';
import { MemoryCache } from './memoryCache.js';

describe('MemoryCache', () => {
  it('liefert gesetzte Werte innerhalb der TTL zurück', () => {
    let clock = 1000;
    const cache = new MemoryCache({ defaultTtlMs: 100, now: () => clock });
    cache.set('a', 42);
    expect(cache.get('a')).toBe(42);
    clock += 99;
    expect(cache.get('a')).toBe(42);
  });

  it('lässt Einträge nach Ablauf der TTL verfallen und räumt sie ab', () => {
    let clock = 1000;
    const cache = new MemoryCache({ defaultTtlMs: 100, now: () => clock });
    cache.set('a', 42);
    clock += 100;
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('wrap() ruft den Producer nur beim Miss auf und cacht das Ergebnis', async () => {
    let clock = 0;
    const cache = new MemoryCache({ defaultTtlMs: 1000, now: () => clock });
    const producer = vi.fn(async () => ['x']);

    const first = await cache.wrap('k', producer);
    const second = await cache.wrap('k', producer);

    expect(first).toEqual(['x']);
    expect(second).toEqual(['x']);
    expect(producer).toHaveBeenCalledTimes(1);
  });

  it('wrap() cacht Fehler nicht (kein Negativ-Caching)', async () => {
    const cache = new MemoryCache({ defaultTtlMs: 1000 });
    const producer = vi.fn()
      .mockRejectedValueOnce(new Error('DB weg'))
      .mockResolvedValueOnce('ok');

    await expect(cache.wrap('k', producer)).rejects.toThrow('DB weg');
    await expect(cache.wrap('k', producer)).resolves.toBe('ok');
    expect(producer).toHaveBeenCalledTimes(2);
  });

  it('delete() invalidiert einen Schlüssel gezielt', async () => {
    const cache = new MemoryCache({ defaultTtlMs: 1000 });
    await cache.wrap('k', async () => 'v1');
    cache.delete('k');
    const value = await cache.wrap('k', async () => 'v2');
    expect(value).toBe('v2');
  });

  it('verdrängt bei Überlauf den ältesten Eintrag (LRU-Kapazitätsgrenze)', () => {
    const cache = new MemoryCache({ defaultTtlMs: 10000, maxEntries: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3); // verdrängt 'a'
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  it('cacht undefined nicht (Treffer bleibt von leer unterscheidbar)', async () => {
    const cache = new MemoryCache({ defaultTtlMs: 1000 });
    const producer = vi.fn(async () => undefined);
    await cache.wrap('k', producer);
    await cache.wrap('k', producer);
    expect(producer).toHaveBeenCalledTimes(2);
  });
});
