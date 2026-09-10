// Merkzustand für das App-Tutorial.
// =============================================================================
// Zwei getrennte Angaben, weil sie unterschiedliche Fragen beantworten:
//
//   bb_tutorial_prompted  — Wurde dem Nutzer die Tour schon einmal angeboten?
//                           Steuert, ob der Erst-Login-Hinweis noch erscheint.
//                           Wird auch bei „Später" gesetzt: laut Produktvorgabe
//                           darf es keine wiederholte Erinnerung geben.
//   bb_tutorial_completed — Hat er sie bis zum Ende durchlaufen? Rein
//                           informativ (Profil-Text „erneut starten").
//
// localStorage statt Server: Das Tutorial erklärt die Oberfläche, nicht die
// Nutzerdaten. Ein zweites Gerät darf die Tour ruhig erneut anbieten, und der
// Rest der App merkt sich Anzeige-Zustände genauso (bb_referral_popup_last_shown,
// bb_action_notifications_prompted).
//
// Jeder Zugriff ist gekapselt: Im Capacitor-WebView und in privaten Fenstern
// kann localStorage werfen oder ganz fehlen — ein Tutorial-Hinweis darf davon
// niemals die App mitreißen.

export const TUTORIAL_PROMPTED_KEY = 'bb_tutorial_prompted';
export const TUTORIAL_COMPLETED_KEY = 'bb_tutorial_completed';

function readFlag(key) {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    // Kein Speicher lesbar: so behandeln, als sei nichts gemerkt.
    return false;
  }
}

function writeFlag(key, value) {
  try {
    localStorage.setItem(key, value ? 'true' : 'false');
    return true;
  } catch {
    return false;
  }
}

/** Wurde die Tour schon einmal angeboten (egal ob angenommen oder abgelehnt)? */
export function wasTutorialPrompted() {
  return readFlag(TUTORIAL_PROMPTED_KEY);
}

/** Merkt, dass gefragt wurde — danach fragt die App nicht erneut. */
export function markTutorialPrompted() {
  return writeFlag(TUTORIAL_PROMPTED_KEY, true);
}

/** Wurde die Tour bis zum letzten Schritt durchlaufen? */
export function isTutorialCompleted() {
  return readFlag(TUTORIAL_COMPLETED_KEY);
}

/**
 * Merkt den Abschluss. Setzt implizit auch „gefragt", damit ein Nutzer, der die
 * Tour aus dem Profil startet und durchläuft, den Erst-Login-Hinweis nicht
 * hinterher noch bekommt.
 */
export function markTutorialCompleted() {
  markTutorialPrompted();
  return writeFlag(TUTORIAL_COMPLETED_KEY, true);
}

/** Soll der Erst-Login-Hinweis erscheinen? */
export function shouldOfferTutorial() {
  return !wasTutorialPrompted() && !isTutorialCompleted();
}
