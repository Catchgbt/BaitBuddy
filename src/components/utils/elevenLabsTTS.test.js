import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const invokeMock = vi.fn();
vi.mock('@/api/frontendClient', () => ({
  functions: { invoke: (...args) => invokeMock(...args) },
}));

import { speakWithFallback, speakWithElevenLabs, cancelElevenLabs } from './elevenLabsTTS';

// Alle abgespielten FakeAudio-Instanzen, um Überlappungen prüfen zu können.
let audioInstances;
let lastAudio;

class FakeAudio {
  constructor(url) {
    this.src = url;
    this.onended = null;
    this.onerror = null;
    this.paused = false;
    audioInstances.push(this);
    lastAudio = this;
  }
  play() { return Promise.resolve(); }
  pause() { this.paused = true; }
}

beforeEach(() => {
  vi.clearAllMocks();
  audioInstances = [];
  lastAudio = null;

  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  });
  vi.stubGlobal('Audio', FakeAudio);

  invokeMock.mockResolvedValue({ audioBase64: btoa('audio-bytes'), contentType: 'audio/mpeg' });
});

afterEach(() => {
  // Modul-globalen Singleton-Zustand (currentAudio/Generation) zurücksetzen.
  cancelElevenLabs();
  vi.unstubAllGlobals();
});

describe('speakWithFallback – Blob-URL-Leak-Regression', () => {
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

describe('speakWithFallback – nur die ElevenLabs-Stimme, still bei Fehlern', () => {
  it('löst still auf, wenn der TTS-Request fehlschlägt (kein Browser-TTS-Fallback)', async () => {
    invokeMock.mockRejectedValue(new Error('offline'));

    await expect(speakWithFallback('Hallo', { voiceEnabled: true })).resolves.toBeUndefined();
    expect(audioInstances).toHaveLength(0);
  });

  it('löst still auf, wenn kein Audio geliefert wird (z. B. API-Key fehlt)', async () => {
    invokeMock.mockResolvedValue({ error: 'ELEVENLABS_API_KEY not configured' });

    await expect(speakWithFallback('Hallo', { voiceEnabled: true })).resolves.toBeUndefined();
    expect(audioInstances).toHaveLength(0);
  });

  it('spielt nichts ab, wenn voiceEnabled false ist', async () => {
    await speakWithFallback('Hallo', { voiceEnabled: false });
    expect(invokeMock).not.toHaveBeenCalled();
  });
});

describe('speakWithElevenLabs – überlappende Aufrufe (Doppelstimmen-Race)', () => {
  it('verwirft die ältere Antwort, wenn während des Requests ein neuer Aufruf startet', async () => {
    // Erster Aufruf: Request bleibt hängen, bis wir ihn manuell auflösen.
    let resolveFirst;
    invokeMock.mockImplementationOnce(
      () => new Promise((resolve) => { resolveFirst = resolve; })
    );

    const first = speakWithElevenLabs('Erster Text');
    await new Promise((r) => setTimeout(r, 0));

    // Zweiter Aufruf übernimmt (löst sofort auf und spielt ab).
    const second = await speakWithElevenLabs('Zweiter Text');
    expect(second).toBeInstanceOf(FakeAudio);
    expect(audioInstances).toHaveLength(1);

    // Jetzt trifft die verspätete Antwort des ersten Aufrufs ein: Sie darf
    // KEIN zweites Audio erzeugen — sonst sprächen zwei Stimmen gleichzeitig.
    resolveFirst({ audioBase64: btoa('altes-audio'), contentType: 'audio/mpeg' });
    await expect(first).resolves.toBeNull();
    expect(audioInstances).toHaveLength(1);
  });

  it('cancelElevenLabs verhindert die Wiedergabe eines noch laufenden Requests', async () => {
    let resolveRequest;
    invokeMock.mockImplementationOnce(
      () => new Promise((resolve) => { resolveRequest = resolve; })
    );

    const speaking = speakWithElevenLabs('Text');
    await new Promise((r) => setTimeout(r, 0));

    cancelElevenLabs();
    resolveRequest({ audioBase64: btoa('audio'), contentType: 'audio/mpeg' });

    await expect(speaking).resolves.toBeNull();
    expect(audioInstances).toHaveLength(0);
  });
});
