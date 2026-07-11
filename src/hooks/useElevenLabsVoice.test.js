import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/components/utils/elevenLabsTTS', () => ({
  speakWithElevenLabs: vi.fn(),
  cancelElevenLabs: vi.fn(),
}));

import { useElevenLabsVoice } from './useElevenLabsVoice';
import { speakWithElevenLabs } from '@/components/utils/elevenLabsTTS';

describe('useElevenLabsVoice', () => {
  beforeEach(() => {
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
});
