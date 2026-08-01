// Zentrale Zustellung von System-Benachrichtigungen.
// ============================================================================
// Wichtig für Android und iOS: Der `new Notification(...)`-Konstruktor ist auf
// beiden mobilen Zielplattformen NICHT nutzbar.
//
//   Android (Chrome/WebView): wirft
//     "TypeError: Failed to construct 'Notification': Illegal constructor.
//      Use ServiceWorkerRegistration.showNotification() instead."
//   iOS (Safari/Home-Screen-PWA ab 16.4): unterstützt Benachrichtigungen
//     ebenfalls ausschließlich über ServiceWorkerRegistration.showNotification().
//
// Der Konstruktor funktioniert nur auf Desktop-Browsern. Deshalb geht die
// Zustellung immer zuerst über die Service-Worker-Registrierung (die App
// registriert `/sw.js` in Layout.jsx) und fällt nur dann auf den Konstruktor
// zurück, wenn kein Service Worker verfügbar ist.
//
// Der Klick wird im Service Worker behandelt (`notificationclick` in sw.js);
// die Ziel-Route reist dafür in `data.url` mit.

/**
 * @typedef {object} NotificationHandle
 * @property {'serviceworker'|'constructor'} via Zustellweg
 * @property {() => void} close Schließt die Benachrichtigung wieder
 */

// `navigator.serviceWorker.ready` wird bewusst NICHT verwendet: Ohne
// registrierten Service Worker bleibt dieses Promise für immer pending und die
// Benachrichtigung würde nie erscheinen. `getRegistration()` antwortet immer.
async function getRegistration() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return (await navigator.serviceWorker.getRegistration()) || null;
  } catch {
    return null;
  }
}

/**
 * Zeigt eine System-Benachrichtigung an — über den Service Worker, wo möglich.
 * Die Permission muss vom Aufrufer bereits geprüft/eingeholt worden sein.
 *
 * @param {string} title
 * @param {NotificationOptions & { url?: string }} [options]
 * @returns {Promise<NotificationHandle|null>} null, wenn keine Zustellung möglich war
 */
export async function showSystemNotification(title, options = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;

  const { url, ...notificationOptions } = options;
  const payload = {
    ...notificationOptions,
    data: { ...(notificationOptions.data || {}), ...(url ? { url } : {}) },
  };

  const registration = await getRegistration();
  if (registration && typeof registration.showNotification === 'function') {
    try {
      await registration.showNotification(title, payload);
      return {
        via: 'serviceworker',
        close: () => {
          // showNotification liefert keine Instanz zurück — offene
          // Benachrichtigungen werden über den Tag wieder eingesammelt.
          registration
            .getNotifications({ tag: payload.tag })
            .then((list) => list.forEach((n) => n.close()))
            .catch(() => { /* bereits geschlossen */ });
        },
      };
    } catch (error) {
      // Bei Android/iOS gibt es keinen sinnvollen Fallback — den Fehler nicht
      // eskalieren, die Aktion selbst ist ja erfolgreich gelaufen.
      console.warn('Notification über Service Worker fehlgeschlagen:', error);
      return null;
    }
  }

  // Desktop-Browser ohne Service Worker: klassischer Konstruktor.
  try {
    const notification = new Notification(title, payload);
    if (url) {
      notification.onclick = () => {
        try { window.focus(); } catch { /* ignore */ }
        try { window.location.href = url; } catch { /* ignore */ }
        notification.close();
      };
    }
    return { via: 'constructor', close: () => notification.close() };
  } catch (error) {
    console.warn('Notification konnte nicht angezeigt werden:', error);
    return null;
  }
}
