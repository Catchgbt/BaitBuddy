import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const invokeMock = vi.fn();
vi.mock('@/api/frontendClient', () => ({
  functions: { invoke: (...args) => invokeMock(...args) },
}));

import { speakWithFallback } from './elevenLabsTTS';

describe('speakWithFallback – Blob-URL-Leak-Regression', () => {
  let lastAudio;

  beforeEach(() => {
    vi.clearAllMocks();
    lastAudio = null;

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });

    class FakeAudio {
      constructor(url) {
        this.src = url;
        this.onended = null;
        this.onerror = null;
        lastAudio = this;
      }
      play() { return Promise.resolve(); }
      pause() {}
    }
    vi.stubGlobal('Audio', FakeAudio);

    invokeMock.mockResolvedValue({ audioBase64: btoa('audio-bytes'), contentType: 'audio/mpeg' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('gibt die Blob-URL beim onended frei (revokeObjectURL)', async () => {
    const p = speakWithFallback('Hallo Welt', { voiceEnabled: true });

    // Warten, bis play() aufgelöst und die (gewrappten) Handler gesetzt sind.
    await new Promise((r) => setTimeout(r, 0));
    expect(lastAudio).not.toBeNull();
    expect(typeof lastAudio.onended).toBe('function');

    // Audio-Ende simulieren → Original-Cleanup muss die URL freigeben.
    lastAudio.onended();
    await p;

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('überschreibt die Original-Cleanup-Handler nicht (onended bleibt eine Funktion)', async () => {
    const p = speakWithFallback('Hallo Welt', { voiceEnabled: true });
    await new Promise((r) => setTimeout(r, 0));

    // Der gewrappte Handler muss weiterhin gesetzt sein — würde speakWithFallback
    // ihn wie früher plump durch `resolve` ersetzen, ginge die Freigabe verloren.
    expect(typeof lastAudio.onended).toBe('function');

    lastAudio.onended();
    await p;
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });
});
