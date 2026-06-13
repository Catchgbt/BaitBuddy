// Seiten-spezifische KI-Buddy Tipps
// Format: pageName -> { title, message, suggestions }

export const BUDDY_TIPS = {
  Dashboard: {
    title: '🎣 Willkommen zurück!',
    message: 'Ich kann dir helfen, deine beste Fangzeit zu finden und neue Spots zu entdecken.',
    suggestions: ['Analyse meiner Fänge', 'Wetter für Heute', 'Beste Fangzeit'],
  },
  Home: {
    title: '🎣 Willkommen bei BaitBuddy!',
    message: 'Ich bin dein persönlicher Angel-Assistent. Lass mich dir helfen, bessere Fänge zu machen!',
    suggestions: ['Erste Schritte', 'Tipps zum Angeln', 'Meine Fangausrüstung'],
  },
  Weather: {
    title: '⛅ Wetter & Bedingungen',
    message: 'Ich kann dir sagen, wie die Bedingungen für deine Zielart sind und wann es optimal wird.',
    suggestions: ['Beste Fangzeit heute', 'Wetter-Vorhersage', 'Wie fische ich bei Regen?'],
  },
  Map: {
    title: '🗺️ Angelplätze',
    message: 'Markiere hier deine liebsten Spots und ich lerne, wo du erfolgreich bist!',
    suggestions: ['Neuen Spot eintragen', 'Spots analysieren', 'Ähnliche Plätze finden'],
  },
  Logbook: {
    title: '📔 Fangbuch',
    message: 'Erzähl mir von deinen Fängen – ich kann deine Erfolgsquote und Muster analysieren.',
    suggestions: ['Fang eintragen', 'Meine Statistiken', 'Erfolgreichste Köder'],
  },
  Log: {
    title: '📔 Fangbuch',
    message: 'Erzähl mir von deinen Fängen – ich kann deine Erfolgsquote und Muster analysieren.',
    suggestions: ['Fang eintragen', 'Meine Statistiken', 'Erfolgreichste Köder'],
  },
  BaitMixer: {
    title: '🎣 Köder-Mixer',
    message: 'Brauchst du ein neues Köder-Rezept? Ich kann dir basierend auf deinen Erfolgen eine Mischung empfehlen!',
    suggestions: ['Köder-Rezept', 'Meine erfolgreichsten Köder', 'Was lockt diese Art an?'],
  },
  BaitMixerPro: {
    title: '🎣 Köder-Mixer PRO',
    message: 'Mit erweiterten Analysen kann ich dir die perfekte Köder-Zusammensetzung vorschlagen.',
    suggestions: ['Köder analysieren', 'Neue Rezeptur', 'Nährstoff-Berechnung'],
  },
  WaterAnalysis: {
    title: '💧 Wasseranalyse',
    message: 'Die Wasser-Bedingungen sind entscheidend! Lass mich helfen, optimale Parameter zu verstehen.',
    suggestions: ['Wie fische ich bei pH 7?', 'Temperatur-Tipps', 'Trübung ausnützen'],
  },
  TripPlanner: {
    title: '🧳 Trip-Planner',
    message: 'Lass mich deinen nächsten Angelurlaub planen – mit den besten Spots und Bedingungen!',
    suggestions: ['Trip planen', 'Best Spots in der Region', 'Ausrüstung packen'],
  },
  ARKnotenAssistent: {
    title: '🔗 AR-Knoten-Assistent',
    message: 'Ich kann dir jeden Knoten Schritt-für-Schritt zeigen – mit AR-Unterstützung!',
    suggestions: ['Knoten lernen', 'Palomar-Knoten', 'Welcher Knoten passt?'],
  },
  Community: {
    title: '👥 Community',
    message: 'Vergleiche deine Erfolge mit anderen Anglern und teile deine besten Tipps!',
    suggestions: ['Top Angler dieser Woche', 'Fänge vergleichen', 'Tipps teilen'],
  },
  Events: {
    title: '🎉 Events',
    message: 'Finde Angelwettbewerbe und Events in deiner Nähe – und tritt dem Buddy-Netzwerk bei!',
    suggestions: ['Events in meiner Nähe', 'Event anmelden', 'Leaderboard'],
  },
  Premium: {
    title: '⭐ Premium Features',
    message: 'Mit Premium-Analysen kann ich dir noch bessere, detailliertere Vorhersagen geben!',
    suggestions: ['Was ist Premium?', 'Premium-Features', 'Upgrade-Vorteile'],
  },
  Shop: {
    title: '🛍️ Shop',
    message: 'Findest du die richtige Ausrüstung? Lass mich dir empfohlene Produkte zeigen!',
    suggestions: ['Ruten für Anfänger', 'Köder kaufen', 'Komplette Ausrüstung'],
  },
  Profile: {
    title: '👤 Profil',
    message: 'Hier kannst du dein Profil verwalten – deine Angel-Karriere in einer Übersicht!',
    suggestions: ['Meine Statistiken', 'Erfolgsgeschichte', 'Abzeichen ansehen'],
  },
  Settings: {
    title: '⚙️ Einstellungen',
    message: 'Personalisiere dein BaitBuddy-Erlebnis nach deinen Vorlieben!',
    suggestions: ['Benachrichtigungen', 'Sprache ändern', 'Datenschutz'],
  },
  Analysis: {
    title: '📊 Analyse',
    message: 'Tiefe Analysen deiner Erfolge – ich finde die Muster und zeige dir, was funktioniert!',
    suggestions: ['Beste Fangzeit', 'Erfolgsquote nach Köder', 'Saisonale Trends'],
  },
  CatchStats: {
    title: '📈 Fang-Statistiken',
    message: 'Deine Erfolgsbilanz im Detail – Arten, Größen, Gewichte und mehr!',
    suggestions: ['Größte Fänge', 'Häufigste Arten', 'Diesen Monat vs. letzten'],
  },
  KiBuddyBeta: {
    title: '🤖 KI-Buddy Chat',
    message: 'Du bist bereits hier – wir können sofort starten! Frag mich, was du wissen möchtest.',
    suggestions: ['Schnelle Frage', 'Live-Sprechen', 'Tutorial starten'],
  },
  AIAssistant: {
    title: '🤖 KI-Assistent',
    message: 'Dein vollständiger Angel-Copilot – Text oder Voice, ich helfe bei allem!',
    suggestions: ['Schnelle Frage', 'Live-Sprechen', 'Meine Fänge analysieren'],
  },
  Tutorials: {
    title: '🎓 Tutorials',
    message: 'Lerne Schritt für Schritt von Anfänger bis Profi-Techniken!',
    suggestions: ['Anfänger-Guide', 'Fortgeschrittene Techniken', 'Video-Tutorials'],
  },
  Fishing: {
    title: '🎣 Angeln',
    message: 'Alle deine Angeltechniken, Fangmethoden und Tipps auf einen Blick!',
    suggestions: ['Welche Technik passt?', 'Für diese Art', 'Wassertyp-Guide'],
  },
  Gear: {
    title: '🎽 Ausrüstung',
    message: 'Verwalte deine Ruten, Rollen, Schnüre – und ich helfe dir, die richtige zu wählen!',
    suggestions: ['Neue Rute kaufen?', 'Meine Ausrüstung', 'Pflege-Tipps'],
  },
  Water: {
    title: '💧 Gewässer',
    message: 'Entdecke neue Gewässer in deiner Nähe – mit Infos zu Arten, Gesetzen und Bedingungen!',
    suggestions: ['Gewässer in meiner Nähe', 'Beste für meine Art', 'Regeln & Gesetze'],
  },
  User: {
    title: '👤 Benutzer',
    message: 'Dein Angel-Profil und Erfolgsgeschichte – deine persönliche Legende!',
    suggestions: ['Meine Bestleistungen', 'Meilensteine', 'Erfolgsgeschichte'],
  },
  CatchCam: {
    title: '📸 Fang-Kamera',
    message: 'Dokumentiere deine Fänge mit Fotos – ich erkenne automatisch die Art und Größe!',
    suggestions: ['Foto machen', 'Fang identifizieren', 'Galerie ansehen'],
  },
  Match3Game: {
    title: '🎮 Fang-Match',
    message: 'Löse Rätsel und gewinne Punkte – und lerne dabei über Fischarten!',
    suggestions: ['Neues Spiel', 'Meine Bestleistung', 'Regeln verstehen'],
  },
  Rank: {
    title: '🏆 Rangliste',
    message: 'Vergleiche deine Erfolge mit anderen – wer ist der beste Angler?',
    suggestions: ['Mein Rang', 'Top 10 Angler', 'Meinen Score steigern'],
  },
  VoiceControl: {
    title: '🎤 Sprach-Steuerung',
    message: 'Kontrolliere dein BaitBuddy vollständig mit Sprachkommandos!',
    suggestions: ['Sprachkommandos lernen', 'Demo starten', 'Einstellungen'],
  },
  StartFishing: {
    title: '🎣 Angeln starten',
    message: 'Bereite dich auf deinen nächsten Angelausflug vor – Ausrüstung, Wetter, Tipps!',
    suggestions: ['Meine Ausrüstung', 'Wetter prüfen', 'Spot auswählen'],
  },
  VoiceLecture: {
    title: '🎧 Audio-Anleitung',
    message: 'Höre dir Expert-Tipps an – perfekt für die Fahrt zum Gewässer!',
    suggestions: ['Neue Lektion', 'Beliebte Themen', 'Fortschritt'],
  },
  DeviceIntegration: {
    title: '📱 Geräte-Integration',
    message: 'Verbinde deine Smartwatch, GPS-Geräte und Sensoren mit BaitBuddy!',
    suggestions: ['Gerät hinzufügen', 'Verfügbare Geräte', 'Kopplung hilfe'],
  },
  Help: {
    title: '❓ Hilfe & Unterstützung',
    message: 'Ich helfe dir mit Fragen zu BaitBuddy, Angeln oder technischen Problemen!',
    suggestions: ['Häufig gestellt', 'Tutorial starten', 'Kontakt zum Support'],
  },
  Datenschutz: {
    title: '🔒 Datenschutz',
    message: 'Deine Privatsphäre ist mir wichtig – alle Infos zu deinen Daten!',
    suggestions: ['Was wird gespeichert?', 'Daten löschen', 'Einwilligung'],
  },
  Impressum: {
    title: '📋 Impressum',
    message: 'Rechtliche Infos zu BaitBuddy – Kontakt und Verantwortliche!',
    suggestions: ['Kontakt', 'Unternehmen', 'Disclaimer'],
  },
};

// Fallback wenn keine Seite gelistet ist
export const DEFAULT_TIP = {
  title: '🎣 Wie kann ich dir helfen?',
  message: 'Ich bin hier, um dich bei deinem Angel-Abenteuer zu unterstützen. Hast du eine Frage zu dieser Seite oder zum Angeln allgemein?',
  suggestions: ['Diese Seite erklären', 'Schnelle Frage', 'Live sprechen', 'Tutorial starten'],
};

/**
 * Hole den Tip für eine Seite basierend auf pageName
 * @param {string} pageName - Name der Seite (z.B. "Dashboard", "Weather")
 * @returns {object} Tip-Objekt mit title, message, suggestions
 */
export function getTipForPage(pageName) {
  // Entferne führende "/" wenn vorhanden
  const cleanName = pageName.replace(/^\//, '');

  return BUDDY_TIPS[cleanName] || DEFAULT_TIP;
}
