import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';

vi.mock('@/components/utils/elevenLabsTTS', () => ({
  speakWithElevenLabs: vi.fn(),
  cancelElevenLabs: vi.fn(),
}));

import { useElevenLabsVoice } from './useElevenLabsVoice';
import { speakWithElevenLabs } from '@/components/utils/elevenLabsTTS';

describe('useElevenLabsVoice', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('isSpeaking landet wieder auf false, wenn Audio sofort endet (Race-Regression)', async () => {
    // Simuliert die Race Condition: onEnd feuert (setIsSpeaking(false)), während
    // der speak-Aufruf noch im await hängt. Der optimistische setIsSpeaking(true)
    // VOR dem await darf danach nicht als true "hängenbleiben".
    speakWithElevenLabs.mockImplementation(async (text, cb) => {
      cb.onEnd?.();
      return { pause: () => {} };
    });

    const { result } = renderHook(() => useElevenLabsVoice());

    await act(async () => {
      await result.current.speak('hallo');
    });

    expect(result.current.isSpeaking).toBe(false);
  });

  it('setzt isSpeaking auf true, solange Audio läuft', async () => {
    // onEnd wird NICHT aufgerufen → Audio läuft weiter → isSpeaking bleibt true.
    speakWithElevenLabs.mockImplementation(async () => ({ pause: () => {} }));

    const { result } = renderHook(() => useElevenLabsVoice());

    await act(async () => {
      await result.current.speak('hallo');
    });

    expect(result.current.isSpeaking).toBe(true);
  });

  it('setzt isSpeaking auf false, wenn speakWithElevenLabs wirft', async () => {
    speakWithElevenLabs.mockRejectedValue(new Error('TTS kaputt'));

    const { result } = renderHook(() => useElevenLabsVoice());

    await act(async () => {
      await result.current.speak('hallo');
    });

    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.error).toBe('TTS kaputt');
  });

  it('ignoriert den verspäteten Fehler einer ersetzten Anfrage', async () => {
    let rejectOld;
    speakWithElevenLabs.mockImplementationOnce(() => new Promise((_, reject) => { rejectOld = reject; }));
    speakWithElevenLabs.mockResolvedValueOnce({ pause() {} });
    const { result } = renderHook(() => useElevenLabsVoice());
    let old;
    act(() => { old = result.current.speak('Alt'); });
    await act(async () => { await result.current.speak('Neu'); });
    await act(async () => { rejectOld(new Error('Alter Fehler')); await old; });
    expect(result.current.isSpeaking).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('Stop beendet den Ladezustand auch während einer noch laufenden Anfrage', async () => {
    speakWithElevenLabs.mockImplementationOnce(() => new Promise(() => {}));
    const { result } = renderHook(() => useElevenLabsVoice());
    act(() => { result.current.speak('Alt'); });
    expect(result.current.isLoading).toBe(true);
    act(() => { result.current.stop(); });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSpeaking).toBe(false);
  });

  it('setzt den Status nach zentralem Abbruch ohne onEnd zurück', async () => {
    let finish;
    speakWithElevenLabs.mockResolvedValueOnce({ pause() {}, finished: new Promise(resolve => { finish = resolve; }) });
    const { result } = renderHook(() => useElevenLabsVoice());
    await act(async () => { await result.current.speak('Hallo'); });
    expect(result.current.isSpeaking).toBe(true);
    await act(async () => { finish(); });
    expect(result.current.isSpeaking).toBe(false);
  });
});
