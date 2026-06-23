// Echte Fakten zur FIFA Fussball-Weltmeisterschaft 2026
// Quellen: offizielle FIFA-Angaben zur WM 2026 (USA, Kanada, Mexiko).
// Erstes Turnier mit 48 Teams und 104 Spielen.

export const TOURNAMENT = {
  name: "FIFA Fussball-Weltmeisterschaft 2026",
  // Eroeffnungsspiel im Estadio Azteca, Mexiko-Stadt
  openingMatch: "2026-06-11T19:00:00-06:00",
  // Finale im MetLife Stadium, East Rutherford, New Jersey
  finalMatch: "2026-07-19T15:00:00-04:00",
  teams: 48,
  groups: 12,
  matches: 104,
  hostCities: 16,
  hostNations: 3,
};

// Flaggen werden ueber CSS-Farbbalken dargestellt (keine Emojis).
export const HOST_NATIONS = [
  {
    code: "MEX",
    name: "Mexiko",
    colors: ["#006847", "#ffffff", "#ce1126"],
    cities: ["Mexiko-Stadt", "Guadalajara", "Monterrey"],
    note: "Erstes Land, das dreimal eine WM ausrichtet (1970, 1986, 2026).",
    gradient: "from-emerald-500 via-green-600 to-red-600",
  },
  {
    code: "USA",
    name: "USA",
    colors: ["#3c3b6e", "#ffffff", "#b22234"],
    cities: [
      "Atlanta",
      "Boston",
      "Dallas",
      "Houston",
      "Kansas City",
      "Los Angeles",
      "Miami",
      "New York / New Jersey",
      "Philadelphia",
      "San Francisco Bay Area",
      "Seattle",
    ],
    note: "Richtet mit 11 Spielorten die meisten Partien aus, inklusive Finale.",
    gradient: "from-blue-600 via-indigo-600 to-red-600",
  },
  {
    code: "CAN",
    name: "Kanada",
    colors: ["#d52b1e", "#ffffff", "#d52b1e"],
    cities: ["Toronto", "Vancouver"],
    note: "Erste WM-Endrunde auf kanadischem Boden.",
    gradient: "from-red-600 via-rose-600 to-red-700",
  },
];

// Die 16 offiziellen Austragungsorte mit Stadion
export const HOST_CITIES = [
  { city: "Mexiko-Stadt", country: "Mexiko", stadium: "Estadio Azteca", highlight: "Eroeffnungsspiel" },
  { city: "Guadalajara", country: "Mexiko", stadium: "Estadio Akron" },
  { city: "Monterrey", country: "Mexiko", stadium: "Estadio BBVA" },
  { city: "Toronto", country: "Kanada", stadium: "BMO Field" },
  { city: "Vancouver", country: "Kanada", stadium: "BC Place" },
  { city: "Atlanta", country: "USA", stadium: "Mercedes-Benz Stadium" },
  { city: "Boston", country: "USA", stadium: "Gillette Stadium" },
  { city: "Dallas", country: "USA", stadium: "AT&T Stadium" },
  { city: "Houston", country: "USA", stadium: "NRG Stadium" },
  { city: "Kansas City", country: "USA", stadium: "Arrowhead Stadium" },
  { city: "Los Angeles", country: "USA", stadium: "SoFi Stadium" },
  { city: "Miami", country: "USA", stadium: "Hard Rock Stadium" },
  { city: "New York / New Jersey", country: "USA", stadium: "MetLife Stadium", highlight: "Finale" },
  { city: "Philadelphia", country: "USA", stadium: "Lincoln Financial Field" },
  { city: "San Francisco Bay Area", country: "USA", stadium: "Levi's Stadium" },
  { city: "Seattle", country: "USA", stadium: "Lumen Field" },
];

// Startplatz-Verteilung der Konfoederationen (FIFA-Quoten WM 2026)
export const CONFEDERATION_SLOTS = [
  { code: "UEFA", region: "Europa", slots: 16, playoff: 0 },
  { code: "CAF", region: "Afrika", slots: 9, playoff: 1 },
  { code: "AFC", region: "Asien", slots: 8, playoff: 1 },
  { code: "CONMEBOL", region: "Suedamerika", slots: 6, playoff: 1 },
  { code: "CONCACAF", region: "Nord- & Mittelamerika", slots: 6, playoff: 2, note: "inkl. 3 Gastgeber" },
  { code: "OFC", region: "Ozeanien", slots: 1, playoff: 1 },
];

// Turnierverlauf als Zeitstrahl
export const STAGES = [
  { phase: "Gruppenphase", detail: "12 Gruppen à 4 Teams", dates: "11. Juni – 27. Juni 2026" },
  { phase: "Sechzehntelfinale", detail: "Beste 32 Teams", dates: "28. Juni – 3. Juli 2026" },
  { phase: "Achtelfinale", detail: "16 Teams", dates: "4. Juli – 7. Juli 2026" },
  { phase: "Viertelfinale", detail: "8 Teams", dates: "9. Juli – 11. Juli 2026" },
  { phase: "Halbfinale", detail: "4 Teams", dates: "14. Juli – 15. Juli 2026" },
  { phase: "Finale", detail: "MetLife Stadium", dates: "19. Juli 2026" },
];

// Bisherige Weltmeister mit Titelanzahl (Stand vor WM 2026)
export const PAST_CHAMPIONS = [
  { country: "Brasilien", titles: 5, colors: ["#009b3a", "#ffdf00", "#002776"] },
  { country: "Deutschland", titles: 4, colors: ["#000000", "#dd0000", "#ffce00"] },
  { country: "Italien", titles: 4, colors: ["#008c45", "#ffffff", "#cd212a"] },
  { country: "Argentinien", titles: 3, colors: ["#75aadb", "#ffffff", "#75aadb"] },
  { country: "Frankreich", titles: 2, colors: ["#0055a4", "#ffffff", "#ef4135"] },
  { country: "Uruguay", titles: 2, colors: ["#0038a8", "#ffffff", "#0038a8"] },
  { country: "England", titles: 1, colors: ["#ffffff", "#cf142b", "#ffffff"] },
  { country: "Spanien", titles: 1, colors: ["#aa151b", "#f1bf00", "#aa151b"] },
];
