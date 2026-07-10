import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSpeechRecognition } from './useSpeechRecognition';

// Regressions-Absicherung für B3/P3: Bei stabilem onResult-Callback darf die
// SpeechRecognition-Instanz bei Re-Renders NICHT neu aufgebaut werden – ein
// Neuaufbau würde eine laufende Aufnahme via abort() abbrechen.
describe('useSpeechRecognition – Instanz-Stabilität', () => {
  let constructSpy;

  beforeEach(() => {
    constructSpy = vi.fn();
    class FakeRecognition {
      constructor() {
        constructSpy();
      }
      start() {}
      stop() {}
      abort() {}
    }
    window.SpeechRecognition = FakeRecognition;
    window.webkitSpeechRecognition = FakeRecognition;
  });

  afterEach(() => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
  });

  it('baut die Instanz bei Re-Render mit stabiler onResult-Referenz nicht neu auf', () => {
    const stableOnResult = () => {};
    const { rerender } = renderHook(({ cb }) => useSpeechRecognition({ onResult: cb }), {
      initialProps: { cb: stableOnResult },
    });

    expect(constructSpy).toHaveBeenCalledTimes(1);

    rerender({ cb: stableOnResult });
    rerender({ cb: stableOnResult });

    expect(constructSpy).toHaveBeenCalledTimes(1);
  });

  it('baut die Instanz neu auf, wenn onResult die Referenz wechselt (belegt die Notwendigkeit von useCallback)', () => {
    const { rerender } = renderHook(({ cb }) => useSpeechRecognition({ onResult: cb }), {
      initialProps: { cb: () => {} },
    });

    expect(constructSpy).toHaveBeenCalledTimes(1);

    rerender({ cb: () => {} }); // neue Funktionsreferenz pro Render
    expect(constructSpy).toHaveBeenCalledTimes(2);
  });
});
