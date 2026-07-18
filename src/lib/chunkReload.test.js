import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { installChunkReloadHandler } from './chunkReload.js';

// Vite dispatcht das Event cancelable mit dem Fehler als payload.
function firePreloadError() {
  const event = new Event('vite:preloadError', { cancelable: true });
  event.payload = new Error('Failed to fetch dynamically imported module');
  window.dispatchEvent(event);
  return event;
}

describe('installChunkReloadHandler', () => {
  let reload;
  let uninstall;

  beforeEach(() => {
    sessionStorage.clear();
    reload = vi.fn();
    uninstall = installChunkReloadHandler({ reload });
  });

  afterEach(() => {
    uninstall();
  });

  it('lädt die Seite beim ersten Chunk-Ladefehler automatisch neu', () => {
    const event = firePreloadError();

    expect(reload).toHaveBeenCalledTimes(1);
    // Fehler wird unterdrückt — kein Error-Screen-Flackern vor dem Reload.
    expect(event.defaultPrevented).toBe(true);
  });

  it('verhindert Reload-Schleifen: innerhalb des Guards kein zweiter Reload', () => {
    firePreloadError();
    const second = firePreloadError();

    expect(reload).toHaveBeenCalledTimes(1);
    // Zweiter Fehler läuft normal weiter (ErrorBoundary übernimmt).
    expect(second.defaultPrevented).toBe(false);
  });

  it('erlaubt einen erneuten Selbstheilungs-Versuch nach Ablauf des Guards', () => {
    firePreloadError();
    // Guard-Zeitstempel künstlich in die Vergangenheit setzen (> 60s).
    sessionStorage.setItem('bb_chunk_reload_at', String(Date.now() - 61000));

    firePreloadError();
    expect(reload).toHaveBeenCalledTimes(2);
  });
});
