/**
 * Tour Features Katalog
 *
 * Definiert alle erklär-baren UI-Elemente, ihre Erreichbarkeit je User-Level
 * und die textlichen Erklärungen (DE/EN).
 *
 * Struktur:
 * {
 *   id: string (eindeutig)
 *   title_de: string
 *   title_en: string
 *   content_de: string (längere Erklärung)
 *   content_en: string
 *   route: string (React Router path, wo Element zu finden ist)
 *   minLevel: 'beginner' | 'experienced' | 'professional'
 *   selector: string (optional — CSS-Selektor für Element-Suche per DOM-Query)
 *   refPath: string (preferred — React-Ref-Pfad innerhalb Component)
 * }
 */

export const TOUR_FEATURES = [
  // === DASHBOARD FEATURES ===
  {
    id: 'dashboard-welcome',
    title_de: 'Willkommen auf dem Dashboard',
    title_en: 'Welcome to Your Dashboard',
    content_de: 'Das Dashboard ist dein Zentralplatz: Hier siehst du schnelle Statistiken zu deinen Fängen, die KI-Angelempfehlungen für heute und den Schonzeit-Wächter für dein Bundesland.',
    content_en: 'Your Dashboard is your central hub: Quick stats on catches, AI fishing recommendations for today, and a closed season watcher for your state.',
    route: 'Dashboard',
    minLevel: 'beginner',
  },

  {
    id: 'dashboard-catch-stats',
    title_de: 'Fang-Statistiken',
    title_en: 'Catch Statistics',
    content_de: 'Hier siehst du die Gesamtzahl deiner Fänge, die beliebteste Fischart und deine Rekord-Größe. Mit einem Klick gelangst du ins Fangbuch mit allen Details.',
    content_en: 'Total catches, most frequent species, and your record size. Click to view all details in your logbook.',
    route: 'Dashboard',
    minLevel: 'beginner',
  },

  {
    id: 'dashboard-weather-alert',
    title_de: 'Wetter-Alarm',
    title_en: 'Weather Alert',
    content_de: 'Aktive Wetter-Warnungen werden hier angezeigt. Tippe darauf, um zu den detaillierten Wetter-Alarmen zu gelangen.',
    content_en: 'Active weather alerts appear here. Tap to jump to detailed weather settings.',
    route: 'Dashboard',
    minLevel: 'beginner',
  },

  {
    id: 'dashboard-ai-recommendation',
    title_de: 'KI-Angelempfehlung',
    title_en: 'AI Fishing Recommendation',
    content_de: 'Die KI analysiert Wetter, Jahreszeit und deine Fang-Historie und empfiehlt die beste Fischart und Köder für heute. Tippe „Analysieren", um Details zu sehen.',
    content_en: 'AI analyzes weather, season, and your catch history to recommend species and baits. Tap "Analyze" for details.',
    route: 'Dashboard',
    minLevel: 'beginner',
  },

  {
    id: 'dashboard-quick-actions',
    title_de: 'Schnellzugriff',
    title_en: 'Quick Actions',
    content_de: 'Große Buttons für direkte Funktionen: Neue Fang erfassen, Angelplatz hinzufügen, Karte öffnen, Wetter checken und Chat mit dem KI-Buddy.',
    content_en: 'Quick buttons: Log catch, add spot, open map, check weather, chat with AI buddy.',
    route: 'Dashboard',
    minLevel: 'beginner',
  },

  // === LOGBOOK FEATURES ===
  {
    id: 'logbook-intro',
    title_de: 'Dein Fangbuch',
    title_en: 'Your Logbook',
    content_de: 'Das Fangbuch speichert alle deine Fänge mit Fotos, Größe, Gewicht, Köder und Stelle. Exportiere deine Statistiken oder teile Fänge in der Community.',
    content_en: 'Your logbook stores all catches with photos, size, weight, bait, and location. Export stats or share in community.',
    route: 'Logbook',
    minLevel: 'beginner',
  },

  {
    id: 'logbook-add-catch',
    title_de: 'Fang hinzufügen',
    title_en: 'Add Catch',
    content_de: 'Tippe auf „Fang hinzufügen" oder mache direkt ein Foto. Die KI erkennt Fischart, Länge und Gewicht automatisch. Spiele deinen Fang für Punkte und Ranglisten in die Community.',
    content_en: 'Tap "Add Catch" or take a photo. AI auto-detects species, length, weight. Share for community points.',
    route: 'Logbook',
    minLevel: 'beginner',
  },

  {
    id: 'logbook-filters',
    title_de: 'Filter & Suche',
    title_en: 'Filters & Search',
    content_de: 'Filtere deine Fänge nach Fischart, Gewicht, Monat oder Ort. Sortiere nach Größe oder neueste Fänge.',
    content_en: 'Filter by species, weight, month, location. Sort by size or newest.',
    route: 'Logbook',
    minLevel: 'experienced',
  },

  // === MAP FEATURES ===
  {
    id: 'map-intro',
    title_de: 'Deine Angelkarte',
    title_en: 'Your Fishing Map',
    content_de: 'Die Karte zeigt deine persönlichen Angelplätze (blau), öffentliche Spots von Angelvereinen (grün) und deinen aktuellen Standort (rot). Ein neuer Spot wird orange markiert.',
    content_en: 'Map shows your spots (blue), public spots (green), your location (red), and new spots (orange).',
    route: 'Map',
    minLevel: 'beginner',
  },

  {
    id: 'map-add-spot',
    title_de: 'Angelplatz hinzufügen',
    title_en: 'Add Fishing Spot',
    content_de: 'Tippe auf die Karte um einen neuen Platz zu markieren. Benenne ihn, füge Notizen hinzu und speichere Tiefenmesser-Daten. Deine Spots sind privat, es sei denn, du machst sie öffentlich.',
    content_en: 'Tap map to mark a spot. Add name, notes, depth data. Private by default.',
    route: 'Map',
    minLevel: 'beginner',
  },

  {
    id: 'map-spot-groups',
    title_de: 'Spot-Gruppen',
    title_en: 'Spot Groups',
    content_de: 'Organisiere deine Angelplätze in Gruppen (z. B. „Rhein-Strecke", „Lieblingsseen"). Einfacherer Überblick und schnellere Navigation.',
    content_en: 'Organize spots into groups for easy navigation.',
    route: 'Map',
    minLevel: 'experienced',
  },

  // === WEATHER FEATURES ===
  {
    id: 'weather-current',
    title_de: 'Aktuelles Wetter',
    title_en: 'Current Weather',
    content_de: 'Temperatur, Luftdruck, Windstärke, Luftfeuchtigkeit und Sichtweite. Alles auf einen Blick. Tippe „Standort aktualisieren", um GPS-Werte zu laden.',
    content_en: 'Temperature, pressure, wind, humidity, visibility. Tap to update your GPS location.',
    route: 'Weather',
    minLevel: 'beginner',
  },

  {
    id: 'weather-forecast',
    title_de: 'Wetter-Vorhersage',
    title_en: 'Weather Forecast',
    content_de: 'Stundliche Vorhersage für die nächsten 48 Stunden. Plant deine Angeltouren basierend auf optimalen Bedingungen.',
    content_en: 'Hourly forecast for 48 hours. Plan your trips for optimal conditions.',
    route: 'Weather',
    minLevel: 'beginner',
  },

  {
    id: 'weather-alarms',
    title_de: 'Wetter-Alarme',
    title_en: 'Weather Alerts',
    content_de: 'Stelle Schwellwerte für Regen, Wind und Sturm ein. Du erhältst Benachrichtigungen, wenn Bedingungen deine Grenzen erreichen.',
    content_en: 'Set thresholds for rain, wind, storms. Get alerts when conditions exceed your limits.',
    route: 'Weather',
    minLevel: 'beginner',
  },

  {
    id: 'weather-solunar',
    title_de: 'Solunar-Tabelle',
    title_en: 'Solunar Table',
    content_de: 'Die besten Angel-Zeiten pro Tag basierend auf Mond und Sonne. Peak-Zeiten sind ideal zum Angeln.',
    content_en: 'Best fishing times by moon and sun. Peak times are ideal.',
    route: 'Weather',
    minLevel: 'experienced',
  },

  // === KI-BUDDY FEATURES ===
  {
    id: 'kibuddy-intro',
    title_de: 'Der KI-Angel-Buddy',
    title_en: 'Your AI Fishing Buddy',
    content_de: 'Sabrina ist dein persönlicher KI-Assistent. Sie beantwortet Fragen zu Fischen, Ködern, Orten und Wetter. Schreib deine Frage oder sprich sie ins Mikro.',
    content_en: 'Sabrina is your AI assistant. Ask about fish, baits, spots, weather. Type or speak.',
    route: 'KiBuddyBeta',
    minLevel: 'beginner',
  },

  {
    id: 'kibuddy-text-input',
    title_de: 'Frage stellen',
    title_en: 'Ask a Question',
    content_de: 'Schreib deine Frage und drücke Enter. Der KI-Buddy antwortet mit detaillierten Tipps. Themen: Fischarten, Köder-Führung, beste Tageszeiten, Montagentipps.',
    content_en: 'Type your question. AI provides detailed tips on species, baits, timing, rigs.',
    route: 'KiBuddyBeta',
    minLevel: 'beginner',
  },

  {
    id: 'kibuddy-voice',
    title_de: 'Sprachfunktion',
    title_en: 'Voice Mode',
    content_de: 'Halte das Mikrofon-Icon gedrückt zum Sprechen. Die KI versteht Deutsch und Englisch. Antworten werden sofort vorgelesen.',
    content_en: 'Hold mic icon to speak. AI understands German & English. Answers read aloud.',
    route: 'KiBuddyBeta',
    minLevel: 'beginner',
  },

  // === COMMUNITY FEATURES ===
  {
    id: 'community-intro',
    title_de: 'Die Community',
    title_en: 'The Community',
    content_de: 'Teile deine Fänge, vergleiche Statistiken mit anderen Anglern, nimm an Wettbewerben teil und verdiene Punkte.',
    content_en: 'Share catches, compete, earn points in tournaments.',
    route: 'Community',
    minLevel: 'beginner',
  },

  {
    id: 'community-leaderboard',
    title_de: 'Rangliste',
    title_en: 'Leaderboard',
    content_de: 'Top Angler dieser Woche, dieses Monats und der ganzen Saison. Klettere die Rangliste nach oben, indem du große Fänge teilst.',
    content_en: 'Top anglers this week, month, season. Share big catches to climb.',
    route: 'Community',
    minLevel: 'beginner',
  },

  {
    id: 'community-tournaments',
    title_de: 'Wettbewerbe',
    title_en: 'Tournaments',
    content_de: 'Nimm an befristeten Turnieren teil und teile deine Fänge. Die beste Fischgröße oder -menge gewinnt Punkte und Belohnungen.',
    content_en: 'Join tournaments, share catches. Win points and rewards.',
    route: 'Community',
    minLevel: 'beginner',
  },

  // === SETTINGS FEATURES ===
  {
    id: 'settings-profile',
    title_de: 'Profil',
    title_en: 'Profile',
    content_de: 'Bearbeite deinen Namen, Profilbild und Bio. Dies wird in der Community sichtbar.',
    content_en: 'Edit name, avatar, bio for community profile.',
    route: 'Settings',
    minLevel: 'beginner',
  },

  {
    id: 'settings-notifications',
    title_de: 'Benachrichtigungen',
    title_en: 'Notifications',
    content_de: 'Aktiviere/Deaktiviere Push-Benachrichtigungen für Wetter-Alarme, Freunde-Updates und Wettbewerbs-Ergebnisse.',
    content_en: 'Toggle notifications for weather, friends, tournaments.',
    route: 'Settings',
    minLevel: 'beginner',
  },

  {
    id: 'settings-privacy',
    title_de: 'Datenschutz',
    title_en: 'Privacy',
    content_de: 'Wähle, ob deine Spots privat oder öffentlich sind, ob andere deine Statistiken sehen dürfen und wie deine Daten verwendet werden.',
    content_en: 'Control spot visibility, stats, and data usage.',
    route: 'Settings',
    minLevel: 'beginner',
  },
];

/**
 * Filtere Tour-Features nach User-Level
 * @param {string} userLevel - 'beginner', 'experienced', oder 'professional'
 * @returns {Array} Gefilterte Features
 */
export function getTourFeaturesByLevel(userLevel) {
  const levelHierarchy = { beginner: 0, experienced: 1, professional: 2 };
  const userRank = levelHierarchy[userLevel] || 0;

  return TOUR_FEATURES.filter((feature) => {
    const featureRank = levelHierarchy[feature.minLevel] || 0;
    return userRank >= featureRank;
  });
}

/**
 * Hole einen spezifischen Feature nach ID
 * @param {string} id - Feature ID
 * @param {string} language - 'de' oder 'en'
 * @returns {Object} Feature mit Sprache
 */
export function getTourFeature(id, language = 'de') {
  const feature = TOUR_FEATURES.find((f) => f.id === id);
  if (!feature) return null;

  return {
    ...feature,
    title: language === 'en' ? feature.title_en : feature.title_de,
    content: language === 'en' ? feature.content_en : feature.content_de,
  };
}

/**
 * Hole alle Features für eine bestimmte Route
 * @param {string} route - React Router route
 * @param {string} userLevel - User level filter
 * @returns {Array} Features für diese Route
 */
export function getTourFeaturesForRoute(route, userLevel = 'beginner') {
  return getTourFeaturesByLevel(userLevel).filter((f) => f.route === route);
}
