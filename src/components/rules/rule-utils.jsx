export const FEDERAL_STATES = [
  { id: "bw", name: "Baden-Württemberg" },
  { id: "by", name: "Bayern" },
  { id: "be", name: "Berlin" },
  { id: "bb", name: "Brandenburg" },
  { id: "hb", name: "Bremen" },
  { id: "hh", name: "Hamburg" },
  { id: "he", name: "Hessen" },
  { id: "mv", name: "Mecklenburg-Vorpommern" },
  { id: "ni", name: "Niedersachsen" },
  { id: "nw", name: "Nordrhein-Westfalen" },
  { id: "rp", name: "Rheinland-Pfalz" },
  { id: "sl", name: "Saarland" },
  { id: "sn", name: "Sachsen" },
  { id: "st", name: "Sachsen-Anhalt" },
  { id: "sh", name: "Schleswig-Holstein" },
  { id: "th", name: "Thüringen" }
];

export function checkCatchRules(allRules, fish, length, date, region) {
  if (!fish) {
    return {
      type: 'info',
      message: 'Bitte Fischart für die Regelprüfung angeben.',
      warnings: [],
      infos: [],
      applicableRules: []
    };
  }

  const warnings = [];
  const infos = [];
  const fishLength = length ? parseFloat(length) : null;
  const fishLower = fish.toLowerCase();

  // 1. Finde alle relevanten Regeln
  const relevantRules = allRules.filter(rule => {
    if (!rule.fish) return false;
    const ruleFishLower = rule.fish.toLowerCase();
    
    // Akzeptiert exakte Übereinstimmung oder wenn der eine String den anderen enthält
    const fishMatches = ruleFishLower.includes(fishLower) || fishLower.includes(ruleFishLower);
    
    // Wenn eine Region angegeben ist, muss sie übereinstimmen. Sonst werden alle Regionen berücksichtigt.
    const regionMatches = !region || !rule.region || rule.region.toLowerCase().includes(region.toLowerCase());
    
    return fishMatches && regionMatches;
  });

  if (relevantRules.length === 0) {
    return {
      type: 'info',
      message: `Für "${fish}" wurden keine spezifischen Regeln gefunden${region ? ` in der Region "${region}"` : ''}. Bitte beachte die allgemeinen Angelvorschriften.`,
      warnings: [],
      infos: [],
      applicableRules: []
    };
  }

  // 2. Prüfe die relevanten Regeln
  relevantRules.forEach(rule => {
    // Mindestmaß prüfen
    if (fishLength && rule.min_size_cm && fishLength < rule.min_size_cm) {
      warnings.push(`Mindestmaß von ${rule.min_size_cm} cm nicht erreicht (${rule.region || 'Allgemein'})`);
    }

    // Schonzeit prüfen
    if (rule.closed_from && rule.closed_to && date) {
      try {
        const checkDateObj = new Date(date);
        checkDateObj.setHours(0, 0, 0, 0); // Zeitanteil ignorieren
        const currentYear = checkDateObj.getFullYear();
        
        // Erstelle Daten für dieses Jahr basierend auf MM-DD
        const fromDateStr = rule.closed_from.length > 5 ? rule.closed_from : `${currentYear}-${rule.closed_from}`;
        const toDateStr = rule.closed_to.length > 5 ? rule.closed_to : `${currentYear}-${rule.closed_to}`;

        let closedFrom = new Date(fromDateStr);
        let closedTo = new Date(toDateStr);
        closedFrom.setHours(0,0,0,0);
        closedTo.setHours(0,0,0,0);

        // Jahresübergreifende Schonzeit behandeln (z.B. 15.12. - 15.02.)
        if (closedFrom > closedTo) {
          const prevYearTo = new Date(toDateStr);
          prevYearTo.setFullYear(currentYear - 1);

          const nextYearFrom = new Date(fromDateStr);
          nextYearFrom.setFullYear(currentYear + 1);

          if (checkDateObj >= closedFrom || checkDateObj <= closedTo) {
            warnings.push(`Aktive Schonzeit vom ${rule.closed_from} bis ${rule.closed_to} (${rule.region || 'Allgemein'})`);
          }
        } else {
          // Normale Schonzeit
          if (checkDateObj >= closedFrom && checkDateObj <= closedTo) {
            warnings.push(`Aktive Schonzeit vom ${rule.closed_from} bis ${rule.closed_to} (${rule.region || 'Allgemein'})`);
          }
        }
      } catch(e) {
        console.error("Error parsing date for rule check:", e);
      }
    }

    // Zusätzliche Infos sammeln
    if (rule.hook_limit) infos.push(`Haken-/Köder-Limit: ${rule.hook_limit} (${rule.region || 'Allgemein'})`);
    if (rule.notes) infos.push(`Hinweis: ${rule.notes} (${rule.region || 'Allgemein'})`);
  });

  if (warnings.length > 0) {
    return {
      type: 'warning',
      message: '⚠️ Regelverstoß möglich!',
      warnings,
      infos,
      applicableRules: relevantRules
    };
  }

  return {
    type: 'success',
    message: '✅ Alles in Ordnung! Keine Regelverstöße gefunden.',
    warnings: [],
    infos,
    applicableRules: relevantRules
  };
}