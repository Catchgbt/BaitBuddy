// Schonzeiten wiederholen sich jaehrlich, werden in rule_entries aber mit
// konkretem Jahr gespeichert (z.B. "2027-02-15"). Volldatum-Vergleiche
// (today >= closed_from) treffen daher nur im geseedeten Jahr zu. Dieser Helfer
// vergleicht ausschliesslich Monat und Tag und behandelt jahresuebergreifende
// Schonzeiten (z.B. Okt-Feb) korrekt. Backend-Pendant zu src/lib/closedSeason.js.

function monthDay(dateStr) {
  const parts = String(dateStr).split('-').map((p) => parseInt(p, 10));
  const [month, day] = parts.length >= 3 ? parts.slice(1) : parts;
  return { month, day };
}

export function isInClosedSeason(closedFrom, closedTo, atDate = new Date()) {
  if (!closedFrom || !closedTo) return false;
  const from = monthDay(closedFrom);
  const to = monthDay(closedTo);
  if (!from.month || !to.month) return false;

  const today = new Date(atDate);
  const year = today.getFullYear();
  let fromDate = new Date(year, from.month - 1, from.day, 0, 0, 0, 0);
  let toDate = new Date(year, to.month - 1, to.day, 23, 59, 59, 999);

  if (fromDate > toDate) {
    if (today <= toDate) {
      fromDate = new Date(year - 1, from.month - 1, from.day, 0, 0, 0, 0);
    } else {
      toDate = new Date(year + 1, to.month - 1, to.day, 23, 59, 59, 999);
    }
  }
  return today >= fromDate && today <= toDate;
}
