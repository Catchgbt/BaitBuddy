// Geräte-Ausrichtung (Kompass) plattformübergreifend.
// ============================================================================
// Zwei Apple-Besonderheiten, die eine reine `addEventListener('deviceorientation')`
// -Lösung auf iPhone und iPad wirkungslos machen:
//
//  1. Seit iOS 13 liefert Safari überhaupt keine Orientierungs-Events mehr,
//     bevor `DeviceOrientationEvent.requestPermission()` erfolgreich war — und
//     dieser Aufruf ist nur innerhalb einer Nutzer-Geste erlaubt. Ohne diesen
//     Schritt bleibt der Kompass auf allen Apple-Geräten still, ganz ohne
//     Fehlermeldung.
//  2. iOS kennt `deviceorientationabsolute` nicht. Das dort gelieferte `alpha`
//     ist relativ zur Ausrichtung beim Start und damit als Nordreferenz
//     unbrauchbar. Die echte Kompassrichtung steht in `webkitCompassHeading`
//     (Grad im Uhrzeigersinn ab Nord).
//
// `headingFromOrientationEvent` vereinheitlicht beides auf die im Projekt
// verwendete alpha-Konvention (Grad gegen den Uhrzeigersinn ab Nord), damit
// Android und iOS dieselben Werte in die 3D-Szene geben.

/**
 * True, wenn die Laufzeit eine explizite Nutzer-Freigabe verlangt (iOS 13+).
 */
export function needsOrientationPermission() {
  return (
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function'
  );
}

/**
 * Fordert die Freigabe an. MUSS aus einem Nutzer-Event heraus aufgerufen
 * werden (Tap/Click), sonst lehnt iOS grundsätzlich ab.
 *
 * @returns {Promise<'granted'|'denied'|'not-required'|'unsupported'>}
 */
export async function requestOrientationPermission() {
  if (typeof DeviceOrientationEvent === 'undefined') return 'unsupported';
  if (!needsOrientationPermission()) return 'not-required';
  try {
    const result = await DeviceOrientationEvent.requestPermission();
    return result === 'granted' ? 'granted' : 'denied';
  } catch {
    // iOS wirft, wenn der Aufruf außerhalb einer Nutzer-Geste passiert.
    return 'denied';
  }
}

/**
 * Name des Events mit der besten Nordreferenz auf dieser Plattform.
 * @returns {'deviceorientationabsolute'|'deviceorientation'}
 */
export function orientationEventName() {
  return typeof window !== 'undefined' && 'ondeviceorientationabsolute' in window
    ? 'deviceorientationabsolute'
    : 'deviceorientation';
}

/**
 * Liefert die Kompassrichtung in alpha-Konvention (0–360, gegen den
 * Uhrzeigersinn ab Nord) oder null, wenn das Event keine Richtung enthält.
 *
 * @param {DeviceOrientationEvent & { webkitCompassHeading?: number }} event
 * @returns {number|null}
 */
export function headingFromOrientationEvent(event) {
  if (!event) return null;

  // iOS: einzige verlässliche Nordreferenz. Im Uhrzeigersinn ab Nord, deshalb
  // Umrechnung in die alpha-Konvention der übrigen Plattformen.
  const compass = event.webkitCompassHeading;
  if (typeof compass === 'number' && Number.isFinite(compass)) {
    return (360 - compass) % 360;
  }

  if (typeof event.alpha === 'number' && Number.isFinite(event.alpha)) {
    return ((event.alpha % 360) + 360) % 360;
  }

  return null;
}
