// System-Push-Benachrichtigungen für Nutzer-Aktionen.
// ============================================================================
// Bewusst schmal gehalten: eine Notification-API pro erfolgreicher Mutation
// (Trip anlegen, Alarm setzen, Fang speichern …). Kein Server-Push nötig —
// die Aktion passiert lokal, die Bestätigung darf lokal bleiben.
//
// Läuft in drei Umgebungen ohne Extra-Plugin:
//   1. Desktop-Browser / Vercel-Preview: Browser-`Notification`-API.
//   2. Android-WebView (Capacitor): dieselbe Web-Notifications-API — der
//      WebView-Prozess zeigt die Notification als Chromium-System-Notification.
//   3. Alte Browser ohne Notification-API: still, kein Fehler.
//
// Der User steuert das Feature per Setting `bb_action_notifications_enabled`
// (default an). Fehlende OS-Permission ist kein Fehler — wir fragen einmal
// per `ensurePermission()` und geben still auf, wenn abgelehnt.

const STORAGE_KEY_ENABLED = 'bb_action_notifications_enabled';
const STORAGE_KEY_PROMPTED = 'bb_action_notifications_prompted';
const RECENT_KEY = 'bb_action_notifications_recent';
const DUPLICATE_WINDOW_MS = 4000;

const ICON = '/icons/icon-192.png';

function isSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function isActionNotificationsEnabled() {
  if (typeof localStorage === 'undefined') return true;
  const raw = localStorage.getItem(STORAGE_KEY_ENABLED);
  if (raw === null) return true;
  return raw === '1' || raw === 'true';
}

export function setActionNotificationsEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY_ENABLED, enabled ? '1' : '0');
  } catch { /* Storage optional */ }
}

export function getPermissionState() {
  if (!isSupported()) return 'unsupported';
  return Notification.permission;
}

// Fragt die OS-Permission einmalig ab. Speichert, dass wir gefragt haben, um
// den User bei Ablehnung nicht erneut zu nerven. Wenn die Permission später
// im OS wieder auf "default" zurückgesetzt wird, fragen wir bewusst NICHT
// erneut — der User kann sie über die Systemeinstellungen oder Settings-
// Toggle jederzeit selbst neu freigeben.
export async function ensurePermission({ force = false } = {}) {
  if (!isSupported()) return 'unsupported';
  const current = Notification.permission;
  if (current === 'granted' || current === 'denied') return current;

  if (!force) {
    try {
      if (localStorage.getItem(STORAGE_KEY_PROMPTED) === '1') return 'default';
    } catch { /* ignore */ }
  }

  try {
    const result = await Notification.requestPermission();
    try { localStorage.setItem(STORAGE_KEY_PROMPTED, '1'); } catch { /* ignore */ }
    return result;
  } catch {
    return 'default';
  }
}

// Kurzer In-Memory-Dedupe für Sonderfälle (Doppelklick auf Save-Button,
// zwei parallele Handler auf demselben Event). Vier Sekunden reichen —
// länger würde legitime Wiederholungen (mehrere Fänge hintereinander)
// schlucken.
const recentTags = new Map();
function isDuplicate(tag) {
  if (!tag) return false;
  const now = Date.now();
  for (const [key, ts] of recentTags) {
    if (now - ts > DUPLICATE_WINDOW_MS) recentTags.delete(key);
  }
  if (recentTags.has(tag)) return true;
  recentTags.set(tag, now);
  return false;
}

/**
 * Sendet eine Bestätigungs-Notification für eine Nutzer-Aktion.
 *
 * @param {string} title - Kurzer Titel, z.B. "Trip gespeichert"
 * @param {object} [options]
 * @param {string} [options.body] - Zweite Zeile mit Details
 * @param {string} [options.tag]  - Dedupe/Zusammenfassungs-Tag
 * @param {string} [options.url]  - Beim Klick anzusteuernde In-App-Route
 * @param {boolean} [options.requestPermission=true] - Beim ersten Aufruf permission asken
 * @returns {Promise<Notification|null>}
 */
export async function notifyAction(title, options = {}) {
  if (!title) return null;
  if (!isSupported()) return null;
  if (!isActionNotificationsEnabled()) return null;

  const {
    body,
    tag,
    url,
    requestPermission: shouldAsk = true,
  } = options;

  if (isDuplicate(tag)) return null;

  let permission = Notification.permission;
  if (permission === 'default' && shouldAsk) {
    permission = await ensurePermission();
  }
  if (permission !== 'granted') return null;

  try {
    const notification = new Notification(title, {
      body: body || '',
      icon: ICON,
      badge: ICON,
      tag: tag || 'bb-action',
      silent: false,
      requireInteraction: false,
    });
    if (url) {
      notification.onclick = () => {
        try { window.focus(); } catch { /* ignore */ }
        try { window.location.href = url; } catch { /* ignore */ }
        notification.close();
      };
    }
    // Kompakt loggen (nicht mit Body — der kann Nutzerinhalte enthalten).
    if (import.meta?.env?.DEV) {
      console.debug('[action-notification]', title, { tag });
    }
    return notification;
  } catch (error) {
    console.warn('Notification konnte nicht angezeigt werden:', error);
    return null;
  }
}

// Vorgefertigte Message-Bauer für die häufigsten Aktionen, damit die
// Aufrufer keine Sprach-/Emoji-Regeln erneut abwägen müssen (CLAUDE.md:
// keine dekorativen Emojis, konsistente Sprache).
export const actionMessages = {
  tripCreated: (title) => ({
    title: 'Trip gespeichert',
    body: title ? `„${title}" wurde erstellt.` : 'Dein neuer Trip ist bereit.',
    tag: 'trip-created',
    url: '/TripPlanner',
  }),
  tripUpdated: (title) => ({
    title: 'Trip aktualisiert',
    body: title ? `Änderungen an „${title}" gespeichert.` : 'Änderungen gespeichert.',
    tag: 'trip-updated',
    url: '/TripPlanner',
  }),
  tripActivated: (title) => ({
    title: 'Trip aktiv',
    body: title ? `„${title}" läuft jetzt live.` : 'Trip läuft jetzt live.',
    tag: 'trip-activated',
    url: '/LiveTrip',
  }),
  tripDeactivated: (title) => ({
    title: 'Trip beendet',
    body: title ? `„${title}" wurde deaktiviert.` : 'Trip wurde beendet.',
    tag: 'trip-deactivated',
    url: '/TripPlanner',
  }),
  tripDeleted: () => ({
    title: 'Trip gelöscht',
    body: 'Der Trip wurde aus deiner Liste entfernt.',
    tag: 'trip-deleted',
    url: '/TripPlanner',
  }),
  catchLogged: (species, lengthCm) => ({
    title: 'Fang gespeichert',
    body: species
      ? `${species}${lengthCm ? `, ${lengthCm} cm` : ''} ins Fangbuch übertragen.`
      : 'Neuer Fang im Fangbuch.',
    tag: 'catch-logged',
    url: '/Logbook',
  }),
  spotCreated: (name) => ({
    title: 'Spot gespeichert',
    body: name ? `„${name}" ist in deinen Angelplätzen.` : 'Neuer Spot in deiner Karte.',
    tag: 'spot-created',
    url: '/Map',
  }),
  weatherAlertsSaved: () => ({
    title: 'Wetter-Alarme aktualisiert',
    body: 'Deine Warnschwellen wurden gespeichert.',
    tag: 'weather-alerts-saved',
    url: '/Settings',
  }),
  gearAdded: (name) => ({
    title: 'Ausrüstung ergänzt',
    body: name ? `„${name}" ist jetzt in deinem Tackle.` : 'Neuer Ausrüstungs-Eintrag.',
    tag: 'gear-added',
    url: '/Gear',
  }),
  eventCreated: (name) => ({
    title: 'Event erstellt',
    body: name ? `„${name}" ist live für die Community.` : 'Event ist live.',
    tag: 'event-created',
    url: '/Events',
  }),
};

// Alle Storage-Keys zentral bekannt machen, damit Tests/Settings sie kennen.
export const NOTIFICATION_STORAGE_KEYS = {
  enabled: STORAGE_KEY_ENABLED,
  prompted: STORAGE_KEY_PROMPTED,
  recent: RECENT_KEY,
};
