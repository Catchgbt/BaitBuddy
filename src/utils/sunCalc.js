// NOAA Solar Calculator — Sonnenaufgang, Sonnenuntergang & Dämmerungszeiten
// Basiert auf dem NOAA Solar Calculator Algorithmus (genauer als einfache Approximationen)

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

function julianDay(date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

function julianCentury(jd) {
  return (jd - 2451545.0) / 36525.0;
}

function geomMeanLongSun(t) {
  return (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
}

function geomMeanAnomalySun(t) {
  return 357.52911 + t * (35999.05029 - 0.0001537 * t);
}

function eccentricityEarthOrbit(t) {
  return 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
}

function sunEqOfCenter(t) {
  const mRad = geomMeanAnomalySun(t) * RAD;
  return (
    Math.sin(mRad) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * mRad) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * mRad) * 0.000289
  );
}

function sunTrueLong(t) {
  return geomMeanLongSun(t) + sunEqOfCenter(t);
}

function sunApparentLong(t) {
  const omega = (125.04 - 1934.136 * t) * RAD;
  return sunTrueLong(t) - 0.00569 - 0.00478 * Math.sin(omega);
}

function meanObliquityOfEcliptic(t) {
  return 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
}

function obliquityCorrection(t) {
  const omega = (125.04 - 1934.136 * t) * RAD;
  return meanObliquityOfEcliptic(t) + 0.00256 * Math.cos(omega);
}

function sunDeclination(t) {
  const eRad = obliquityCorrection(t) * RAD;
  const lambdaRad = sunApparentLong(t) * RAD;
  return Math.asin(Math.sin(eRad) * Math.sin(lambdaRad)) * DEG;
}

function equationOfTime(t) {
  const e = eccentricityEarthOrbit(t);
  const l0Rad = geomMeanLongSun(t) * RAD;
  const mRad = geomMeanAnomalySun(t) * RAD;
  const y = Math.pow(Math.tan((obliquityCorrection(t) * RAD) / 2), 2);
  return (
    4 *
    DEG *
    (y * Math.sin(2 * l0Rad) -
      2 * e * Math.sin(mRad) +
      4 * e * y * Math.sin(mRad) * Math.cos(2 * l0Rad) -
      0.5 * y * y * Math.sin(4 * l0Rad) -
      1.25 * e * e * Math.sin(2 * mRad))
  );
}

// Gibt null zurück bei Polartag oder Polarnacht
function hourAngleSunrise(lat, decl, zenithDeg) {
  const latRad = lat * RAD;
  const declRad = decl * RAD;
  const zenithRad = zenithDeg * RAD;
  const cosHA =
    (Math.cos(zenithRad) - Math.sin(latRad) * Math.sin(declRad)) /
    (Math.cos(latRad) * Math.cos(declRad));
  if (cosHA < -1 || cosHA > 1) return null;
  return Math.acos(cosHA) * DEG;
}

function calcSunEventMinutesUTC(jd, lat, lon, zenithDeg, isRise) {
  const t = julianCentury(jd);
  const eqt = equationOfTime(t);
  const decl = sunDeclination(t);
  const ha = hourAngleSunrise(lat, decl, zenithDeg);
  if (ha === null) return null;
  const solarNoon = 720 - 4 * lon - eqt;
  return solarNoon + (isRise ? -ha : ha) * 4;
}

function minutesToDate(date, utcMinutes) {
  if (utcMinutes === null || utcMinutes === undefined) return null;
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() + utcMinutes * 60000);
}

/**
 * Berechnet alle Sonnenpositionen für ein Datum und einen Standort.
 * Alle zurückgegebenen Zeiten sind Date-Objekte in UTC.
 *
 * Zenitwinkel:
 *   90.833° = offizieller Aufgang/Untergang (Refraktion + Sonnenrand)
 *   96°     = bürgerliche Dämmerung (civil twilight)
 *   102°    = nautische Dämmerung
 *   108°    = astronomische Dämmerung
 */
export function calculateSunTimes(date, lat, lon) {
  const d = new Date(date);
  d.setUTCHours(12, 0, 0, 0);
  const jd = julianDay(d);

  return {
    astronomicalDawn: minutesToDate(date, calcSunEventMinutesUTC(jd, lat, lon, 108, true)),
    nauticalDawn: minutesToDate(date, calcSunEventMinutesUTC(jd, lat, lon, 102, true)),
    civilDawn: minutesToDate(date, calcSunEventMinutesUTC(jd, lat, lon, 96, true)),
    sunrise: minutesToDate(date, calcSunEventMinutesUTC(jd, lat, lon, 90.833, true)),
    sunset: minutesToDate(date, calcSunEventMinutesUTC(jd, lat, lon, 90.833, false)),
    civilDusk: minutesToDate(date, calcSunEventMinutesUTC(jd, lat, lon, 96, false)),
    nauticalDusk: minutesToDate(date, calcSunEventMinutesUTC(jd, lat, lon, 102, false)),
    astronomicalDusk: minutesToDate(date, calcSunEventMinutesUTC(jd, lat, lon, 108, false)),
  };
}

export function formatLocalTime(date) {
  if (!date) return '—';
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Gibt optimale Beiszeiten basierend auf Sonnenstand zurück.
 * Fische reagieren besonders auf Lichtveränderungen — Dämmerungsphasen sind die aktivsten Phasen.
 */
export function getBiteTimes(sunTimes) {
  const windows = [];

  if (sunTimes.civilDawn && sunTimes.sunrise) {
    const morningEnd = sunTimes.sunrise
      ? new Date(sunTimes.sunrise.getTime() + 60 * 60 * 1000)
      : null;
    windows.push({
      id: 'morning',
      label: 'Morgen-Beisszeit',
      description: 'Bürgerliche Dämmerung bis 1 Std. nach Sonnenaufgang',
      start: sunTimes.civilDawn,
      end: morningEnd,
      quality: 'excellent',
    });
  }

  if (sunTimes.sunset && sunTimes.civilDusk) {
    const eveningStart = sunTimes.sunset
      ? new Date(sunTimes.sunset.getTime() - 60 * 60 * 1000)
      : null;
    windows.push({
      id: 'evening',
      label: 'Abend-Beisszeit',
      description: '1 Std. vor Sonnenuntergang bis bürgerliche Dämmerung',
      start: eveningStart,
      end: sunTimes.civilDusk,
      quality: 'excellent',
    });
  }

  if (sunTimes.astronomicalDusk) {
    windows.push({
      id: 'night',
      label: 'Nacht-Ansitz',
      description: 'Ab astronomischer Dämmerung — gut für Karpfen & Wels',
      start: sunTimes.astronomicalDusk,
      end: null,
      quality: 'good',
    });
  }

  return windows;
}
