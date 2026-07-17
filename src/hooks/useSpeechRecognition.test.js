import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSpeechRecognition } from './useSpeechRecognition';

// Absicherung: Die SpeechRecognition-Instanz muss über Re-Renders stabil bleiben
// – ein Neuaufbau würde eine laufende Aufnahme via abort() abbrechen. Die
// Callbacks werden in Refs gehalten, daher ist der Consumer NICHT auf
// useCallback angewiesen und trotzdem wird stets der aktuellste Callback
// aufgerufen.
describe('useSpeechRecognition – Instanz-Stabilität', () => {
  let constructSpy;
  let lastInstance;

  beforeEach(() => {
    constructSpy = vi.fn();
    lastInstance = null;
    class FakeRecognition {
      constructor() {
        constructSpy();
        lastInstance = this;
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

  it('baut die Instanz NICHT neu auf, wenn onResult die Referenz wechselt (Ref-basiert, kein useCallback nötig)', () => {
    const { rerender } = renderHook(({ cb }) => useSpeechRecognition({ onResult: cb }), {
      initialProps: { cb: () => {} },
    });

    expect(constructSpy).toHaveBeenCalledTimes(1);

    rerender({ cb: () => {} }); // neue Funktionsreferenz pro Render
    rerender({ cb: () => {} });
    expect(constructSpy).toHaveBeenCalledTimes(1);
  });

  it('ruft stets den aktuellsten onResult-Callback auf, auch ohne useCallback', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useSpeechRecognition({ onResult: cb }), {
      initialProps: { cb: first },
    });

    rerender({ cb: second });

    // Ein Erkennungsergebnis auf der (unveränderten) Instanz auslösen.
    lastInstance.onresult({ results: [[{ transcript: 'Hallo' }]] });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('Hallo');
  });
});
