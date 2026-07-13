import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runWhenAudioReady, isAudioReady, __resetAudioUnlock } from './audioUnlock.js';

describe('audioUnlock', () => {
  beforeEach(() => {
    __resetAudioUnlock();
  });

  it('stellt Callbacks zurück, bis eine Nutzer-Geste kommt', () => {
    const fn = vi.fn();
    runWhenAudioReady(fn);
    // Ohne Geste noch nicht ausgeführt (Autoplay-Policy).
    expect(fn).not.toHaveBeenCalled();
    expect(isAudioReady()).toBe(false);

    // Erste Geste entsperrt und holt den Callback nach.
    window.dispatchEvent(new Event('pointerdown'));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(isAudioReady()).toBe(true);
  });

  it('führt Callbacks nach der ersten Geste sofort aus', () => {
    window.dispatchEvent(new Event('click'));
    const fn = vi.fn();
    runWhenAudioReady(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('spielt mehrere zurückgestellte Callbacks bei der ersten Geste ab', () => {
    const a = vi.fn();
    const b = vi.fn();
    runWhenAudioReady(a);
    runWhenAudioReady(b);
    window.dispatchEvent(new Event('touchend'));
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('ein Fehler in einem Callback stoppt die anderen nicht', () => {
    const boom = vi.fn(() => { throw new Error('boom'); });
    const ok = vi.fn();
    runWhenAudioReady(boom);
    runWhenAudioReady(ok);
    window.dispatchEvent(new Event('keydown'));
    expect(ok).toHaveBeenCalledTimes(1);
  });
});
