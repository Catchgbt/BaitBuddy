// Parser für hochgeladene Tiefendaten (Bathymetrie-Crowdsourcing).
// Unterstützt zwei vom Upload-Panel beworbene Formate:
//   - CSV/TXT: lat,lng,tiefe in beliebiger Spaltenreihenfolge/-benennung,
//     Trennzeichen ; , Tab oder Leerzeichen, mit oder ohne Kopfzeile.
//   - GPX: <trkpt>/<wpt>/<rtept> mit <depth> (Tiefe in Metern).
// Liefert ein Array { lat, lon, depth } mit auf Plausibilität geprüften Werten.

const LAT_KEYS = ['lat', 'latitude', 'breite', 'y'];
const LON_KEYS = ['lon', 'lng', 'long', 'longitude', 'laenge', 'länge', 'x'];
const DEPTH_KEYS = ['depth', 'tiefe', 'depth_m', 'depthm', 'd', 'z', 'm'];

function isValidPoint(lat, lon, depth) {
  return (
    Number.isFinite(lat) && Number.isFinite(lon) && Number.isFinite(depth) &&
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 &&
    depth >= 0 && depth <= 12000
  );
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];

  // Trennzeichen aus der ersten Zeile raten.
  const guessDelim = (line) => {
    for (const d of [';', ',', '\t', '|']) if (line.includes(d)) return d;
    return /\s+/;
  };
  const delim = guessDelim(lines[0]);
  const split = (line) => line.split(delim).map((c) => c.trim());

  // Kopfzeile anhand bekannter Spaltennamen erkennen.
  const firstCells = split(lines[0]).map((c) => c.toLowerCase());
  const known = [...LAT_KEYS, ...LON_KEYS, ...DEPTH_KEYS];
  const hasHeader = firstCells.some((c) => known.includes(c));

  let latIdx = 0, lonIdx = 1, depthIdx = 2, startRow = 0;
  if (hasHeader) {
    latIdx = firstCells.findIndex((c) => LAT_KEYS.includes(c));
    lonIdx = firstCells.findIndex((c) => LON_KEYS.includes(c));
    depthIdx = firstCells.findIndex((c) => DEPTH_KEYS.includes(c));
    startRow = 1;
    // Fallback auf Standardreihenfolge, falls eine Spalte fehlt.
    if (latIdx < 0 || lonIdx < 0 || depthIdx < 0) { latIdx = 0; lonIdx = 1; depthIdx = 2; }
  }

  const points = [];
  for (let i = startRow; i < lines.length; i++) {
    const cells = split(lines[i]);
    const lat = parseFloat(cells[latIdx]);
    const lon = parseFloat(cells[lonIdx]);
    let depth = parseFloat(cells[depthIdx]);
    if (depth < 0) depth = Math.abs(depth); // als negative Werte kodierte Tiefen normalisieren
    if (isValidPoint(lat, lon, depth)) points.push({ lat, lon, depth });
  }
  return points;
}

function parseGpx(text) {
  const points = [];
  const ptRe = /<(?:trkpt|wpt|rtept)\b[^>]*\blat="([-\d.]+)"[^>]*\blon="([-\d.]+)"[^>]*>([\s\S]*?)<\/(?:trkpt|wpt|rtept)>/gi;
  let m;
  while ((m = ptRe.exec(text)) !== null) {
    const lat = parseFloat(m[1]);
    const lon = parseFloat(m[2]);
    // Nur echte Tiefenangaben verwenden (<ele> ist GPS-Höhe, keine Tiefe).
    const depthMatch = m[3].match(/<depth>([-\d.]+)<\/depth>/i);
    if (!depthMatch) continue;
    const depth = Math.abs(parseFloat(depthMatch[1]));
    if (isValidPoint(lat, lon, depth)) points.push({ lat, lon, depth });
  }
  return points;
}

export function parseDepthFile(text, fileName = '') {
  const looksGpx = /\.gpx(\?|$)/i.test(fileName) || /<gpx[\s>]/i.test(text.slice(0, 500));
  return looksGpx ? parseGpx(text) : parseCsv(text);
}
