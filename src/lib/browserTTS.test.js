import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

function mockVoice(name, lang, localService = true) {
  return { name, lang, localService };
}

async function freshModule() {
  vi.resetModules();
  return await import('./browserTTS');
}

describe('browserTTS – Stimmwahl (Regressionstests)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('window', {
      speechSynthesis: Object.assign(new EventTarget(), { getVoices: vi.fn(() => []), speak: vi.fn(), cancel: vi.fn() }),
      SpeechSynthesisUtterance: function SpeechSynthesisUtterance(text) { this.text = text; },
    });
  });

  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('wartet auf eine deutsche Stimme statt zuerst mit der Standardstimme zu sprechen', async () => {
    const { speakBrowser, isBrowserTTSAvailable } = await freshModule();
    expect(isBrowserTTSAvailable()).toBe(true);
    const handle = speakBrowser('Hallo');
    expect(handle).toBeTruthy();
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
    window.speechSynthesis.getVoices.mockReturnValue([mockVoice('Google Deutsch', 'de-DE')]);
    window.speechSynthesis.dispatchEvent(new Event('voiceschanged'));
    const utterance = window.speechSynthesis.speak.mock.calls[0][0];
    expect(utterance.voice.name).toBe('Google Deutsch');
  });

  it('endet bei fehlendem deutschem Sprachpaket ohne eine zufällige andere Stimme', async () => {
    const { speakBrowser } = await freshModule();
    const handle = speakBrowser('Hallo');
    handle.onerror = vi.fn();
    await vi.advanceTimersByTimeAsync(2000);
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
    expect(handle.onerror).toHaveBeenCalledTimes(1);
  });

  it('stoppt auch eine noch auf voiceschanged wartende Ausgabe', async () => {
    const { speakBrowser, cancelBrowserTTS } = await freshModule();
    const handle = speakBrowser('Hallo');
    handle.onended = vi.fn();
    cancelBrowserTTS();
    window.speechSynthesis.getVoices.mockReturnValue([mockVoice('Google Deutsch', 'de-DE')]);
    window.speechSynthesis.dispatchEvent(new Event('voiceschanged'));
    await vi.advanceTimersByTimeAsync(2000);
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
    expect(handle.onended).toHaveBeenCalledTimes(1);
  });

  it('bevorzugt eine namentlich weibliche deutsche Stimme', async () => {
    window.speechSynthesis.getVoices = vi.fn(() => [
      mockVoice('Google Deutsch', 'de-DE'),
      mockVoice('Yannick', 'de-DE'),
    ]);
    const { speakBrowser } = await freshModule();
    speakBrowser('Hallo');
    const utterance = window.speechSynthesis.speak.mock.calls[0][0];
    expect(utterance.voice.name).toBe('Google Deutsch');
  });

  it('pausiert und setzt dieselbe Utterance fort ohne erneut zu sprechen', async () => {
    window.speechSynthesis.getVoices.mockReturnValue([mockVoice('Google Deutsch', 'de-DE')]);
    window.speechSynthesis.pause = vi.fn();
    window.speechSynthesis.resume = vi.fn();
    const { speakBrowser } = await freshModule();
    const handle = speakBrowser('Hallo');
    handle.pause();
    await handle.play();
    expect(window.speechSynthesis.pause).toHaveBeenCalledTimes(1);
    expect(window.speechSynthesis.resume).toHaveBeenCalledTimes(1);
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
  });

  it('pinnt die einmal aufgelöste Stimme für die restliche Session (keine erneute getVoices-Auswertung)', async () => {
    window.speechSynthesis.getVoices = vi.fn(() => [
      mockVoice('Google Deutsch', 'de-DE'),
      mockVoice('Yannick', 'de-DE'),
    ]);
    const { speakBrowser } = await freshModule();
    speakBrowser('Erster Satz');
    // Stimmenliste ändert sich (z.B. Sprachpaket nachgeladen) — die Auswahl
    // darf sich innerhalb der Session trotzdem nicht mehr ändern.
    window.speechSynthesis.getVoices = vi.fn(() => [mockVoice('Yannick', 'de-DE')]);
    speakBrowser('Zweiter Satz');
    const secondUtterance = window.speechSynthesis.speak.mock.calls[1][0];
    expect(secondUtterance.voice.name).toBe('Google Deutsch');
  });

  it('fällt ohne weibliche Stimme auf die erste lokale deutsche Stimme zurück', async () => {
    window.speechSynthesis.getVoices = vi.fn(() => [
      mockVoice('Yannick', 'de-DE', false),
      mockVoice('Markus', 'de-DE', true),
    ]);
    const { speakBrowser } = await freshModule();
    speakBrowser('Hallo');
    const utterance = window.speechSynthesis.speak.mock.calls[0][0];
    expect(utterance.voice.name).toBe('Markus');
  });
});
