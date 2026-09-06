// Kompatibilitäts-Helfer für AbortSignal.
// ============================================================================
// Der API-Client hängt an JEDEN Request ein Timeout-Signal und kombiniert es
// bei Bedarf mit dem Abbruch-Signal der aufrufenden Komponente. Beide dafür
// genutzten statischen Methoden sind aber deutlich jünger als die von uns
// unterstützten Laufzeitumgebungen:
//
//   AbortSignal.timeout : Chrome/WebView 103+, Safari 16+  (iOS 16)
//   AbortSignal.any     : Chrome/WebView 116+, Safari 17.4+ (iOS 17.4)
//
// capacitor.config.json erlaubt `minWebViewVersion: 90`, und die Web-App läuft
// auf iPhones/iPads ab iOS 15. Ohne Fallback wirft dort bereits der Aufbau des
// Requests einen TypeError — auf WebView 90–102 bzw. iOS 15 scheiterte damit
// jeder einzelne Backend-Aufruf, auf WebView 103–115 und iOS 16–17.3 alle
// Aufrufe mit zusätzlichem Komponenten-Signal (Abbruch beim Unmount).
//
// Beide Helfer nutzen die native Implementierung, wenn sie vorhanden ist, und
// bauen sie sonst über einen AbortController nach.

// Erzeugt den Abbruch-Grund, den auch die native Implementierung liefert:
// eine DOMException vom Typ "TimeoutError".
function timeoutReason() {
  try {
    return new DOMException('signal timed out', 'TimeoutError');
  } catch {
    // Sehr alte Umgebungen ohne DOMException-Konstruktor
    const error = new Error('signal timed out');
    error.name = 'TimeoutError';
    return error;
  }
}

/**
 * Liefert ein Signal, das nach `ms` Millisekunden automatisch abbricht.
 * @param {number} ms
 * @returns {AbortSignal}
 */
export function timeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => {
    // `abort(reason)` kennen ältere Implementierungen teilweise noch nicht.
    try { controller.abort(timeoutReason()); } catch { controller.abort(); }
  }, ms);
  return controller.signal;
}

/**
 * Kombiniert mehrere Signale zu einem: das Ergebnis bricht ab, sobald das
 * erste Eingangssignal abbricht. Nullish-Einträge werden ignoriert, damit
 * Aufrufer optionale Signale ohne Vorprüfung durchreichen können.
 *
 * @param {Array<AbortSignal|null|undefined>} signals
 * @returns {AbortSignal|undefined} undefined, wenn kein Signal übergeben wurde
 */
export function anySignal(signals) {
  const list = (signals || []).filter(Boolean);
  if (list.length === 0) return undefined;
  if (list.length === 1) return list[0];

  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') {
    return AbortSignal.any(list);
  }

  const controller = new AbortController();
  const cleanups = [];
  const abortWith = (reason) => {
    // Listener zuerst lösen: Ein bereits abgebrochener Controller braucht sie
    // nicht mehr, und die Eingangssignale (z. B. ein langlebiges Timeout)
    // dürfen den Controller nicht am Leben halten.
    cleanups.forEach((off) => off());
    cleanups.length = 0;
    if (controller.signal.aborted) return;
    try { controller.abort(reason); } catch { controller.abort(); }
  };

  for (const signal of list) {
    if (signal.aborted) {
      abortWith(signal.reason);
      return controller.signal;
    }
    const onAbort = () => abortWith(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    cleanups.push(() => signal.removeEventListener('abort', onAbort));
  }

  return controller.signal;
}
