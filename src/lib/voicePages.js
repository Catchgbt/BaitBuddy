// Zentrale Seiten-Auflösung für die Sprachsteuerung.
// Wandelt gesprochene/KI-gelieferte Seitennamen (deutsch, englisch, Kurzform)
// in die exakten Routen-Keys aus pages.config.js um. Die Routen sind
// case-sensitive (createPageUrl erzeugt z. B. "/Dashboard"), daher muss der
// kanonische Key exakt stimmen.

// Kanonische Seiten-Keys, die als Navigationsziel erlaubt sind.
export const ALLOWED_PAGES = [
  "Dashboard", "Home", "Logbook", "Map", "Weather", "WeatherAlerts",
  "Community", "Gear", "AIAssistant", "KiBuddyBeta", "TripPlanner",
  "Profile", "Settings", "Rank", "WaterAnalysis",
  "AngelscheinPruefungSchonzeiten", "Quiz", "Licenses", "Events",
  "BaitMixer", "CatchStats", "ARKnotenAssistent", "Shop", "Premium",
  "PremiumPlans", "Help", "Tutorials", "Devices", "DeviceIntegration",
  "StartFishing", "UsedGear", "BathymetricCrowdsourcing", "VoiceControl",
  "VoiceLecture"
];

// Aliase (immer kleingeschrieben) kanonischer Key.
// Deckt deutsche Begriffe, englische Begriffe und die Kurz-Bezeichner ab,
// die der KI-System-Prompt verwendet (home, log, map, chat, ...).
const PAGE_ALIASES = {
  home: "Dashboard", startseite: "Dashboard", dashboard: "Dashboard",
  start: "Dashboard", übersicht: "Dashboard", uebersicht: "Dashboard",

  log: "Logbook", logbuch: "Logbook", logbook: "Logbook",
  fangbuch: "Logbook", fänge: "Logbook", faenge: "Logbook",

  karte: "Map", map: "Map", gewässerkarte: "Map", gewaesserkarte: "Map",

  wetter: "Weather", weather: "Weather",
  warnung: "WeatherAlerts", warnungen: "WeatherAlerts",
  unwetter: "WeatherAlerts", sos: "WeatherAlerts", wetterwarnung: "WeatherAlerts",

  community: "Community", forum: "Community", feed: "Community",

  ausrüstung: "Gear", ausruestung: "Gear", gear: "Gear",
  equipment: "Gear", tackle: "Gear",

  chat: "AIAssistant", assistent: "AIAssistant", aiassistant: "AIAssistant",
  ki: "KiBuddyBeta", kibuddy: "KiBuddyBeta", buddy: "KiBuddyBeta",

  trip: "TripPlanner", tripplaner: "TripPlanner", tripplanner: "TripPlanner",
  tour: "TripPlanner", tourenplaner: "TripPlanner", trips: "TripPlanner",

  profil: "Profile", profile: "Profile", konto: "Profile", account: "Profile",

  einstellungen: "Settings", settings: "Settings", optionen: "Settings",

  rang: "Rank", ranking: "Rank", rank: "Rank", rangliste: "Rank",
  bestenliste: "Rank", leaderboard: "Rank",

  wasser: "WaterAnalysis", wasseranalyse: "WaterAnalysis",
  wateranalysis: "WaterAnalysis",

  prüfung: "AngelscheinPruefungSchonzeiten",
  pruefung: "AngelscheinPruefungSchonzeiten",
  angelschein: "AngelscheinPruefungSchonzeiten",
  schonzeiten: "AngelscheinPruefungSchonzeiten",
  schonzeit: "AngelscheinPruefungSchonzeiten",
  mindestmaße: "AngelscheinPruefungSchonzeiten",
  mindestmasse: "AngelscheinPruefungSchonzeiten",

  quiz: "Quiz",

  lizenzen: "Licenses", licenses: "Licenses", lizenz: "Licenses",

  events: "Events", event: "Events", veranstaltungen: "Events",
  termine: "Events",

  köder: "BaitMixer", koeder: "BaitMixer", bait: "BaitMixer",
  baitmixer: "BaitMixer", ködermixer: "BaitMixer", koedermixer: "BaitMixer",

  statistik: "CatchStats", statistiken: "CatchStats", stats: "CatchStats",
  catchstats: "CatchStats", fangstatistik: "CatchStats",

  knoten: "ARKnotenAssistent", ar: "ARKnotenAssistent",
  knotenassistent: "ARKnotenAssistent", arknotenassistent: "ARKnotenAssistent",

  shop: "Shop", laden: "Shop", store: "Shop",

  premium: "PremiumPlans", premiumplans: "PremiumPlans", abo: "PremiumPlans",
  upgrade: "PremiumPlans", pro: "PremiumPlans",

  hilfe: "Help", help: "Help", support: "Help",

  tutorial: "Tutorials", tutorials: "Tutorials", anleitung: "Tutorials",
  anleitungen: "Tutorials",

  geräte: "Devices", geraete: "Devices", devices: "Devices", gerät: "Devices",
  geraet: "Devices",
  deviceintegration: "DeviceIntegration", integration: "DeviceIntegration",

  startangeln: "StartFishing", startfishing: "StartFishing",
  angeln: "StartFishing", angelnstarten: "StartFishing",

  gebraucht: "UsedGear", usedgear: "UsedGear", gebrauchtmarkt: "UsedGear",

  tiefenkarte: "BathymetricCrowdsourcing",
  bathymetriccrowdsourcing: "BathymetricCrowdsourcing",

  voice: "VoiceControl", voicecontrol: "VoiceControl",
  sprachsteuerung: "VoiceControl",

  vorlesung: "VoiceLecture", voicelecture: "VoiceLecture", lehrgang: "VoiceLecture"
};

/**
 * Löst einen gesprochenen/KI-gelieferten Seitennamen in einen gültigen
 * Routen-Key auf. Gibt null zurück, wenn die Seite unbekannt ist.
 * @param {string} name
 * @returns {string|null}
 */
export function resolvePage(name) {
  if (!name) return null;
  const raw = String(name).trim();
  // 1. Direkter (case-insensitiver) Treffer auf einen kanonischen Key
  const direct = ALLOWED_PAGES.find(p => p.toLowerCase() === raw.toLowerCase());
  if (direct) return direct;
  // 2. Alias-Treffer
  const key = raw.toLowerCase();
  if (PAGE_ALIASES[key]) return PAGE_ALIASES[key];
  // 3. Ohne Leerzeichen/Bindestriche erneut versuchen
  const compact = key.replace(/[\s-]+/g, "");
  if (PAGE_ALIASES[compact]) return PAGE_ALIASES[compact];
  const directCompact = ALLOWED_PAGES.find(
    p => p.toLowerCase() === compact
  );
  if (directCompact) return directCompact;
  return null;
}
