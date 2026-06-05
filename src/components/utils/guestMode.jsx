// Gastmodus-Hilfsfunktionen

// Seiten, die für Gäste zugänglich sind
export const GUEST_ALLOWED_PAGES = [
  'Dashboard',
  'Profile',
  'Settings',
  'Tutorials',
  'AIAssistant',
  'Logbook',
  'Log',
  'Home',
];

export function isGuestAllowedPage(pageName) {
  return GUEST_ALLOWED_PAGES.includes(pageName);
}

// Gast-Session-Key
const GUEST_SESSION_KEY = 'catchgbt_guest_session';

export function getGuestSession() {
  try {
    const raw = sessionStorage.getItem(GUEST_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setGuestSession(data) {
  try {
    sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify({
      ...data,
      startedAt: data.startedAt || new Date().toISOString()
    }));
  } catch {
    // ignore
  }
}

export function clearGuestSession() {
  try {
    sessionStorage.removeItem(GUEST_SESSION_KEY);
    localStorage.removeItem('catchgbt_guest_catches');
  } catch {
    // ignore
  }
}

// Demo-Antworten für den KI-Buddy im Gastmodus
export const DEMO_KI_RESPONSES = [
  `**Hecht im Herbst - Koeder-Tipps:**

Im Herbst sind Hechte sehr aktiv und jagen intensiv, um Fettreserven fuer den Winter anzulegen.

**Beste Koeader:**
- Wobbler (7-14 cm) in naturgetreuen Farben
- Gummifische in Weiss, Silber oder Chartreuse
- Grossblinker fuer groessere Tiefen

**Taktik:** Variiere die Einholgeschwindigkeit. Pausen waehrend des Einholens imitieren verletzte Beute und provozieren Bisse.

Fuer personalisierte Tipps basierend auf deinem Spot, registriere dich kostenlos!`,

  `**Forellen und Wetter:**

Forellen reagieren sehr sensibel auf Wetterwechsel.

**Beste Bedingungen:**
- Bewoelkter Himmel mit diffusem Licht
- Leichter Regen (erhoehte Aktivitaet)
- Temperaturen zwischen 8-16 Grad Celsius
- Steigender Luftdruck nach Schlechtwetter

**Meiden:** Direkte Mittagssonne im Sommer und starke Hitze.

Erstelle dein kostenloses Konto, um Wetter-Alerts fuer deine Lieblingsgewaesser zu erhalten!`,

  `**Beste Angelzeiten fuer Zander:**

Zander sind daemmerungsaktive Raeuberfische.

**Beste Zeiten:**
- Morgengrauen (1-2 Stunden vor Sonnenaufgang)
- Abendrot (30 Minuten vor Sonnenuntergang bis 2 Stunden danach)
- Naechte mit Mondlicht

**Koeder:** Gummifische in Dunkler Farbe, Naturkoeder wie Aal-Stuecke.

Mit einem Konto kannst du deine besten Fangzeiten im Fangbuch tracken!`,

  `**Angelspots finden - Tipps:**

Die besten Spots sind oft versteckt.

**Wo suchen:**
- Strukturreiche Bereiche: Unterwasserpflanzen, Stege, Baumwurzeln
- Stroemungsberuhigte Zonen in Fluessen
- Ein- und Auslaeufe von Seen und Teichen
- Tiefenuebergaenge (Buhnen, Haenge)

**Tools:** Google Maps Satellitenansicht zeigt oft vielversprechende Strukturen.

Mit der CatchGbt Karte kannst du deine Spots speichern und Notizen hinterlegen!`,

  `**Karpfenangeln - Ausruestung:**

Fuer erfolgreiches Karpfenangeln brauchst du die richtige Ausruestung.

**Grundausstattung:**
- Karpfenrute 3,5-3,9m, 2,75-3,5 lbs TC
- Freilaufrolle mit Beissanzeiger
- Blei 60-120g (je nach Stroemung)
- Hairrig mit Boilies oder Partikeln

**Koeder:** Mais, Tigernuesse, Boilies in Frucht- oder Nussgeschmack sind bewaehrt.

Registriere dich, um KI-generierte Boilie-Rezepte fuer deinen Spot zu erhalten!`,

  `**Winterangeln in Deutschland:**

Im Winter konzentrieren sich Fische an bestimmten Stellen.

**Aktive Fischarten im Winter:**
- Hecht (sehr aktiv bis 4 Grad)
- Zander (daemmerungsaktiv auch im Kalten)
- Barsch (tief, langsame Koeadfuehrung)
- Aal (bis ca. 8 Grad aktiv)

**Strategien:** Langsame Koeadfuehrung, tiefe Zonen bevorzugen, unglueckliche Stellen meiden.

Hol dir das volle CatchGbt-Erlebnis mit einem kostenlosen Account!`
];

export function getRandomDemoResponse(questionText) {
  // Versuche eine thematisch passende Antwort zu finden
  const q = questionText.toLowerCase();
  
  if (q.includes('hecht') || q.includes('wobbler') || q.includes('koeder') || q.includes('köder')) {
    return DEMO_KI_RESPONSES[0];
  }
  if (q.includes('forelle') || q.includes('wetter') || q.includes('regen')) {
    return DEMO_KI_RESPONSES[1];
  }
  if (q.includes('zander') || q.includes('zeit') || q.includes('uhrzeit') || q.includes('abend')) {
    return DEMO_KI_RESPONSES[2];
  }
  if (q.includes('spot') || q.includes('platz') || q.includes('naehe') || q.includes('nähe')) {
    return DEMO_KI_RESPONSES[3];
  }
  if (q.includes('karpfen') || q.includes('ausruestung') || q.includes('ausrüstung') || q.includes('rute')) {
    return DEMO_KI_RESPONSES[4];
  }
  if (q.includes('winter') || q.includes('kalt') || q.includes('januar') || q.includes('februar')) {
    return DEMO_KI_RESPONSES[5];
  }
  
  // Zufaellige Antwort als Fallback
  return DEMO_KI_RESPONSES[Math.floor(Math.random() * DEMO_KI_RESPONSES.length)];
}

// Lokale Fänge für den Gastmodus
const GUEST_CATCHES_KEY = 'catchgbt_guest_catches';
const GUEST_CATCH_TTL_MS = 24 * 60 * 60 * 1000; // 24 Stunden

export function getGuestCatches() {
  try {
    const raw = localStorage.getItem(GUEST_CATCHES_KEY);
    if (!raw) return [];
    const catches = JSON.parse(raw);
    const now = Date.now();
    // Filtere abgelaufene Fänge
    const valid = catches.filter(c => {
      const age = now - new Date(c._created_at).getTime();
      return age < GUEST_CATCH_TTL_MS;
    });
    // Bereinige falls etwas entfernt wurde
    if (valid.length !== catches.length) {
      localStorage.setItem(GUEST_CATCHES_KEY, JSON.stringify(valid));
    }
    return valid;
  } catch {
    return [];
  }
}

export function addGuestCatch(catchData) {
  const catches = getGuestCatches();
  const newCatch = {
    ...catchData,
    id: `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    _created_at: new Date().toISOString(),
    created_date: new Date().toISOString()
  };
  catches.unshift(newCatch);
  localStorage.setItem(GUEST_CATCHES_KEY, JSON.stringify(catches));
  return newCatch;
}

export function updateGuestCatch(id, data) {
  const catches = getGuestCatches();
  const idx = catches.findIndex(c => c.id === id);
  if (idx !== -1) {
    catches[idx] = { ...catches[idx], ...data };
    localStorage.setItem(GUEST_CATCHES_KEY, JSON.stringify(catches));
  }
}

export function deleteGuestCatch(id) {
  const catches = getGuestCatches();
  const updated = catches.filter(c => c.id !== id);
  localStorage.setItem(GUEST_CATCHES_KEY, JSON.stringify(updated));
}