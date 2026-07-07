/**
 * Prefetch aller Seiten-Chunks im Hintergrund, solange eine Verbindung besteht.
 *
 * Hintergrund: Jede Seite in ./pages wird per React.lazy als eigener JS-Chunk
 * geladen (siehe pages.config.js). Der Service Worker (public/sw.js) cached
 * statische Assets per Stale-While-Revalidate — ein Chunk landet also erst NACH
 * seinem ersten Abruf im Cache. Beim Install werden nur die App-Shell
 * (index.html + Icons) vorgecacht, keine Seiten-Chunks.
 *
 * Folge ohne dieses Prefetch: Offline lassen sich nur Seiten öffnen, die man
 * vorher online besucht hat (deren Chunk im Cache liegt). Alle anderen Chunks
 * fehlen, der dynamische import() schlägt fehl und die Seite „öffnet sich nicht".
 *
 * Deshalb laden wir bei bestehender Verbindung im Leerlauf alle Seiten-Module
 * gestaffelt vor. Vite/Rollup dedupliziert Chunks pro Modul: der hier ausgelöste
 * Abruf cached exakt denselben Chunk, den React.lazy später anfordert.
 */
import { isOnline, onOnlineStatusChange } from '@/utils/networkStatus';

// import.meta.glob liefert für jede Seite eine dynamische Import-Funktion.
// Test-Dateien werden ausgeschlossen, damit ihr Code nicht mitgeladen wird.
const pageLoaders = import.meta.glob(['../pages/*.jsx', '!../pages/*.test.jsx']);

// Kleine Batches + Leerlauf-Pausen halten den Main-Thread frei (Low-End-Geräte,
// App-Start-Budget). Manche Seiten ziehen schwere Libs (three, leaflet) nach.
const BATCH_SIZE = 3;

let started = false;
let done = false;
let running = false;

function schedule(fn) {
  if (typeof window === 'undefined') {
    fn();
    return;
  }
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(fn, { timeout: 4000 });
  } else {
    setTimeout(fn, 1500);
  }
}

async function warmChunks() {
  if (done || running) return;
  running = true;
  try {
    const loaders = Object.values(pageLoaders);
    for (let i = 0; i < loaders.length; i += BATCH_SIZE) {
      if (!isOnline()) return; // offline gegangen — später erneut versuchen
      const batch = loaders.slice(i, i + BATCH_SIZE);
      // Einzelfehler (z. B. ein einzelner nicht erreichbarer Chunk) ignorieren,
      // damit die restlichen Seiten trotzdem vorgeladen werden.
      await Promise.all(batch.map((load) => load().catch(() => {})));
      // Kurze Leerlauf-Pause zwischen den Batches.
      await new Promise((resolve) => schedule(resolve));
    }
    if (isOnline()) done = true;
  } finally {
    running = false;
  }
}

/**
 * Startet das Vorladen aller Seiten-Chunks. Idempotent — mehrfaches Aufrufen
 * hat keinen zusätzlichen Effekt. In App.jsx beim Start aufrufen.
 */
export function prefetchAllPages() {
  if (started || typeof window === 'undefined') return;
  started = true;

  // Nach dem initialen Rendern im Leerlauf beginnen.
  schedule(() => {
    if (isOnline()) warmChunks();
  });

  // Falls beim Start offline oder unterbrochen: fortsetzen, sobald wieder online.
  onOnlineStatusChange((online) => {
    if (online && !done) schedule(warmChunks);
  });
}
