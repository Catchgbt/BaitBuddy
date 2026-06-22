// Schonzeiten sind jaehrlich wiederkehrend, werden in den Regel-Daten (rule_entries)
// aber mit konkretem Jahr gespeichert (z.B. "2027-02-15"). Vergleiche auf Volldatum-
// Basis (today >= closed_from) treffen daher nur im geseedeten Jahr zu und verfehlen
// die Schonzeit in allen anderen Jahren. Diese Helfer vergleichen ausschliesslich
// Monat und Tag und behandeln jahresuebergreifende Schonzeiten (z.B. Okt-Feb) korrekt.

// Extrahiert { month, day } aus "YYYY-MM-DD" oder "MM-DD".
function monthDay(dateStr) {
  const parts = String(dateStr).split('-').map((p) => parseInt(p, 10));
  const [month, day] = parts.length >= 3 ? parts.slice(1) : parts;
  return { month, day };
}

// Liegt atDate (Default: jetzt) innerhalb der jaehrlich wiederkehrenden Schonzeit?
export function isInClosedSeason(closedFrom, closedTo, atDate = new Date()) {
  if (!closedFrom || !closedTo) return false;
  const from = monthDay(closedFrom);
  const to = monthDay(closedTo);
  if (!from.month || !to.month) return false;

  const today = new Date(atDate);
  const year = today.getFullYear();
  let fromDate = new Date(year, from.month - 1, from.day, 0, 0, 0, 0);
  let toDate = new Date(year, to.month - 1, to.day, 23, 59, 59, 999);

  // Jahresuebergreifende Schonzeit (z.B. Okt-Feb): das passende Jahr waehlen.
  if (fromDate > toDate) {
    if (today <= toDate) {
      fromDate = new Date(year - 1, from.month - 1, from.day, 0, 0, 0, 0);
    } else {
      toDate = new Date(year + 1, to.month - 1, to.day, 23, 59, 59, 999);
    }
  }
  return today >= fromDate && today <= toDate;
}

// Naechster Beginn der Schonzeit ab atDate als Date (im passenden Jahr), oder null.
// Liegt der Start im aktuellen Jahr bereits in der Vergangenheit, wird das Folgejahr
// herangezogen.
export function nextClosedSeasonStart(closedFrom, atDate = new Date()) {
  if (!closedFrom) return null;
  const from = monthDay(closedFrom);
  if (!from.month) return null;

  const today = new Date(atDate);
  const year = today.getFullYear();
  let start = new Date(year, from.month - 1, from.day, 0, 0, 0, 0);
  if (start < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    start = new Date(year + 1, from.month - 1, from.day, 0, 0, 0, 0);
  }
  return start;
}
