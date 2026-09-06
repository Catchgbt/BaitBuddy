import { describe, it, expect, vi, afterEach } from 'vitest';
import { timeoutSignal, anySignal } from './abortCompat';

// Die nativen statischen Methoden für den jeweiligen Test entfernen, um eine
// ältere Laufzeit (Android-WebView < 103/116, iOS < 16/17.4) nachzustellen.
function withoutNative(names, fn) {
  const saved = {};
  for (const name of names) {
    saved[name] = AbortSignal[name];
    delete AbortSignal[name];
  }
  try {
    return fn();
  } finally {
    for (const name of names) {
      if (saved[name] !== undefined) AbortSignal[name] = saved[name];
    }
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe('timeoutSignal', () => {
  it('nutzt die native Implementierung, wenn vorhanden', () => {
    const spy = vi.spyOn(AbortSignal, 'timeout');
    const signal = timeoutSignal(1000);
    expect(spy).toHaveBeenCalledWith(1000);
    expect(signal).toBeInstanceOf(AbortSignal);
    spy.mockRestore();
  });

  it('bricht ohne native Implementierung nach Ablauf der Zeit ab', async () => {
    vi.useFakeTimers();
    const signal = withoutNative(['timeout'], () => timeoutSignal(5000));

    expect(signal.aborted).toBe(false);
    vi.advanceTimersByTime(4999);
    expect(signal.aborted).toBe(false);
    vi.advanceTimersByTime(1);
    expect(signal.aborted).toBe(true);
    expect(signal.reason?.name).toBe('TimeoutError');
  });
});

describe('anySignal', () => {
  it('liefert undefined ohne verwertbares Signal', () => {
    expect(anySignal([])).toBeUndefined();
    expect(anySignal([null, undefined])).toBeUndefined();
    expect(anySignal(undefined)).toBeUndefined();
  });

  it('reicht ein einzelnes Signal unverändert durch', () => {
    const controller = new AbortController();
    expect(anySignal([controller.signal, null])).toBe(controller.signal);
  });

  it('bricht ohne native Implementierung ab, sobald ein Eingangssignal abbricht', () => {
    const a = new AbortController();
    const b = new AbortController();
    const combined = withoutNative(['any'], () => anySignal([a.signal, b.signal]));

    expect(combined.aborted).toBe(false);
    b.abort(new Error('vom Aufrufer abgebrochen'));
    expect(combined.aborted).toBe(true);
    expect(combined.reason?.message).toBe('vom Aufrufer abgebrochen');
  });

  it('bricht sofort ab, wenn ein Eingangssignal bereits abgebrochen war', () => {
    const a = new AbortController();
    a.abort(new Error('zu spaet'));
    const b = new AbortController();
    const combined = withoutNative(['any'], () => anySignal([a.signal, b.signal]));

    expect(combined.aborted).toBe(true);
    expect(combined.reason?.message).toBe('zu spaet');
  });

  it('entfernt die Abort-Listener nach dem ersten Abbruch', () => {
    const a = new AbortController();
    const b = new AbortController();
    const removeA = vi.spyOn(a.signal, 'removeEventListener');
    const removeB = vi.spyOn(b.signal, 'removeEventListener');

    const combined = withoutNative(['any'], () => anySignal([a.signal, b.signal]));
    a.abort(new Error('erster'));

    expect(removeA).toHaveBeenCalled();
    expect(removeB).toHaveBeenCalled();

    // Ein zweiter Abbruch darf den Grund nicht mehr überschreiben.
    b.abort(new Error('zweiter'));
    expect(combined.reason?.message).toBe('erster');
  });

  it('kombiniert Timeout- und Aufrufer-Signal auch ohne beide nativen APIs', () => {
    vi.useFakeTimers();
    const caller = new AbortController();
    const combined = withoutNative(['timeout', 'any'], () =>
      anySignal([timeoutSignal(30000), caller.signal])
    );

    expect(combined.aborted).toBe(false);
    vi.advanceTimersByTime(30000);
    expect(combined.aborted).toBe(true);
    expect(combined.reason?.name).toBe('TimeoutError');
  });
});
