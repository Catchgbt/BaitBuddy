import { entities } from '@/api/frontendClient';
import { toast } from 'sonner';

// Zeigt nach dem Login einmalig einen Hinweis auf ein laufendes Event.
// Frueher stand diese Logik zweimal fast identisch in src/pages/Home.jsx
// (handleLogin und handleEmailAuth) — inklusive unterschiedlicher
// Fehlerbehandlung. Hier zentral, damit beide Login-Wege sich gleich verhalten.

const SEEN_KEY = 'catchgbt_event_popup_seen';

// Der Hinweis ist reine Kosmetik und darf den Login-Abschluss nie aufhalten:
// ohne Deckel haengt der Button bis zum 30s-Request-Timeout, wenn /api/events
// langsam antwortet.
const EVENT_FETCH_TIMEOUT_MS = 3000;

// Nachlaufzeit, damit der Toast lesbar ist, bevor die Navigation ihn wegreisst.
export const EVENT_POPUP_DWELL_MS = 1500;

function readSeen() {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* Storage optional (Private Mode) */
  }
}

/**
 * Zeigt den Event-Toast, falls ein aktives Event laeuft und der Hinweis noch
 * nicht gezeigt wurde.
 *
 * @returns {Promise<boolean>} true, wenn ein Toast gezeigt wurde (Aufrufer
 *   sollte dann EVENT_POPUP_DWELL_MS warten, bevor er navigiert).
 */
export async function maybeShowEventPopup() {
  try {
    if (readSeen()) return false;

    const events = await Promise.race([
      entities.AppEvent.filter({ is_active: true }),
      new Promise((resolve) => setTimeout(() => resolve([]), EVENT_FETCH_TIMEOUT_MS)),
    ]);
    if (!events || events.length === 0) return false;

    const event = events[0];
    const now = new Date();
    if (now < new Date(event.start_date) || now > new Date(event.end_date)) return false;

    markSeen();
    const endStr = new Date(event.end_date).toLocaleDateString('de-DE');
    const description = [
      event.description,
      event.prize_description ? `Preis: ${event.prize_description}` : null,
      `Event endet am: ${endStr}`,
    ]
      .filter(Boolean)
      .join('\n');
    toast(event.name, { description, duration: 8000 });
    return true;
  } catch (error) {
    console.debug('Event-Hinweis konnte nicht geladen werden:', error);
    return false;
  }
}
