// Hilfsfunktionen für die KI-Fischerkennung im Fangbuch.
//
// Die Vision-Analyse (`analyzeCatchPhoto`) liefert neben Art/Länge/Gewicht/Köder
// zusätzliche Merkmale (wissenschaftlicher Name, Körperumfang, Geschlecht,
// geschätztes Alter, Zustand). Für diese Zusatzfelder existiert bewusst keine
// eigene DB-Spalte in `catches` (Schema-Eingriff auf Live-Supabase vermieden) —
// stattdessen werden sie beim Übernehmen in die Notizen des Fangs geschrieben,
// damit sie im Fangbuch dauerhaft sichtbar bleiben. Diese Helfer halten die
// Formatierung an einer Stelle, damit Anzeige-Karte und Notiz-Text konsistent
// bleiben.

// Marker, an dem die automatisch erzeugte KI-Notiz erkannt und beim erneuten
// Übernehmen ersetzt (statt dupliziert) wird.
export const AI_NOTE_MARKER = 'KI-Erkennung:';

// Wandelt das Vision-Ergebnis in eine Liste anzeigbarer Detailzeilen um.
// Nur tatsächlich erkannte Werte werden aufgenommen — keine Platzhalter.
export function recognitionDetails(data) {
  if (!data) return [];
  const rows = [];
  if (data.species_name) rows.push({ label: 'Fischart', value: data.species_name });
  if (data.species_latin) rows.push({ label: 'Wiss. Name', value: data.species_latin, italic: true });
  if (data.length_cm != null) rows.push({ label: 'Länge', value: `${formatNumber(data.length_cm)} cm` });
  if (data.weight_kg != null) rows.push({ label: 'Gewicht', value: `${formatNumber(data.weight_kg)} kg` });
  if (data.girth_cm != null) rows.push({ label: 'Körperumfang', value: `${formatNumber(data.girth_cm)} cm` });
  if (data.sex) rows.push({ label: 'Geschlecht', value: data.sex });
  if (data.estimated_age_years != null) rows.push({ label: 'Alter (geschätzt)', value: `ca. ${formatNumber(data.estimated_age_years)} Jahre` });
  if (data.bait_used) rows.push({ label: 'Köder', value: data.bait_used });
  if (data.condition) rows.push({ label: 'Zustand', value: data.condition });
  return rows;
}

// Baut die Notiz-Zeile mit den Zusatzmerkmalen, die nicht in eigene
// Formularfelder (Art/Länge/Gewicht/Köder) übernommen werden.
export function buildRecognitionNote(data) {
  if (!data) return '';
  const parts = [];
  if (data.species_latin) parts.push(data.species_latin);
  if (data.girth_cm != null) parts.push(`Umfang ${formatNumber(data.girth_cm)} cm`);
  if (data.sex) parts.push(`Geschlecht ${data.sex}`);
  if (data.estimated_age_years != null) parts.push(`Alter ca. ${formatNumber(data.estimated_age_years)} Jahre`);
  if (data.condition) parts.push(data.condition);
  if (data.confidence != null) parts.push(`${Math.round(data.confidence * 100)}% sicher`);
  if (parts.length === 0) return '';
  return `${AI_NOTE_MARKER} ${parts.join(', ')}`;
}

// Fügt die KI-Notiz in vorhandene Notizen ein bzw. ersetzt eine frühere
// KI-Notiz, ohne vom Nutzer geschriebenen Text zu verlieren.
export function mergeRecognitionNote(existingNotes, data) {
  const aiNote = buildRecognitionNote(data);
  const base = (existingNotes || '')
    .split('\n')
    .filter((line) => !line.trim().startsWith(AI_NOTE_MARKER))
    .join('\n')
    .trim();
  if (!aiNote) return base;
  return base ? `${base}\n${aiNote}` : aiNote;
}

function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  // Ganzzahlen ohne Nachkomma, sonst eine Nachkommastelle, deutsches Komma.
  const rounded = Math.round(n * 10) / 10;
  return (Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)).replace('.', ',');
}
