// Solunar Service - Mondphase & optimale Fresszeiten für Fische
// Basiert auf astronomischen Berechnungen der Mondposition

class SolunarService {
  constructor() {
    // Referenz-Neumondlich: 6. Januar 2000 18:14 UTC
    this.referenceNewMoon = new Date(2000, 0, 6, 18, 14, 0);
    this.lunarCycle = 29.530588861; // Tage
    this.sideralDay = 1.00273790935; // Sideraler Tag in Sonnentagen
  }

  // Berechne aktuelle Mondphase (0-1)
  getMoonPhase(date = new Date()) {
    const daysSinceNewMoon = (date.getTime() - this.referenceNewMoon.getTime()) / (1000 * 60 * 60 * 24);
    const phase = (daysSinceNewMoon % this.lunarCycle) / this.lunarCycle;
    return Math.max(0, Math.min(1, phase));
  }

  // Gebe Mondphase-Namen
  getMoonPhaseName(phase) {
    if (phase < 0.125) return 'Neumondlich';
    if (phase < 0.25) return 'Zunehmend';
    if (phase < 0.375) return 'Erstes Viertel';
    if (phase < 0.5) return 'Zunehmend';
    if (phase < 0.625) return 'Vollmond';
    if (phase < 0.75) return 'Abnehmend';
    if (phase < 0.875) return 'Letztes Viertel';
    return 'Abnehmend';
  }

  // Emoji für Mondphase
  getMoonEmoji(phase) {
    const index = Math.round(phase * 7);
    const phases = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
    return phases[index];
  }

  // Berechne Mondstand (Azimut & Höhe) für Lat/Lon
  getMoonPosition(latitude, longitude, date = new Date()) {
    // Vereinfachte Berechnung (genau genug für Solunar)
    const JD = this.getJulianDate(date);
    const T = (JD - 2451545.0) / 36525; // Julianische Jahrhunderte seit J2000

    // Mittlere Länge des Mondes (in Grad)
    const L = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T * T * T / 538841 - T * T * T * T / 65194000;
    const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T * T * T / 545868 - T * T * T * T / 113065000;
    const M = 357.52910918 + 35999.0502909 * T - 0.0001536 * T * T + T * T * T / 24490000;
    const MPrime = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T * T * T / 69699 - T * T * T * T / 14712000;

    // Mondbreite
    const Fh = 93.272095 + 483202.0175233 * T - 0.0036539 * T * T - T * T * T / 3526000 + T * T * T * T / 863310000;

    // Interpolation für aktuelle Stunde
    const hour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
    const dayFraction = hour / 24;

    let moonLat = Math.sin((MPrime * Math.PI / 180) * 0.0895) * 5.1286; // Vereinfachte Latitude

    // Höhe & Azimut
    const GMST = this.getGMST(date);
    const localHourAngle = (GMST * 15 + longitude - L) * Math.PI / 180;

    const latRad = latitude * Math.PI / 180;
    const decRad = moonLat * Math.PI / 180;

    const sinH = Math.sin(latRad) * Math.sin(decRad) +
      Math.cos(latRad) * Math.cos(decRad) * Math.cos(localHourAngle);
    const height = Math.asin(Math.max(-1, Math.min(1, sinH))) * 180 / Math.PI;

    return {
      height: height,
      isVisible: height > -0.833, // -0.833° = Sonnenuntergang Horizont
    };
  }

  // Solunar-Perioden: Hauptevent (±1h um Mond-Transit) & Minevent (±1h um Mond-Opposition)
  getSolunarTimes(latitude, longitude, date = new Date()) {
    const moonPhase = this.getMoonPhase(date);

    // Mond-Transit ist ungefähr 24h 50min nach letztem Transit (sideraler Tag)
    // Major Period: Um Mond-Transit herum
    const transitHour = (moonPhase * this.sideralDay * 24) % 24;

    // Minor Period: 12h später (Mond-Opposition)
    const minorHour = (transitHour + 12) % 24;

    // Berechne Quality Score (0-100) basierend auf Mondphase
    const quality = this.calculateQualityScore(moonPhase);

    return {
      major: {
        time: this.getTimeFromHour(date, transitHour),
        hour: transitHour,
        label: 'Major Period',
        emoji: '🌙',
        description: 'Höchste Fisch-Aktivität - Mond-Transit',
        quality: quality,
      },
      minor: {
        time: this.getTimeFromHour(date, minorHour),
        hour: minorHour,
        label: 'Minor Period',
        emoji: '🌙',
        description: 'Erhöhte Fisch-Aktivität - Mond-Opposition',
        quality: Math.max(30, quality - 10),
      },
    };
  }

  // Qualitäts-Score basierend auf Mondphase (0-100)
  // Beste Zeiten: Vollmond & Neumondlich
  calculateQualityScore(phase) {
    // Vollmond (0.5) und Neumondlich (0) sind optimal
    const distToFullMoon = Math.abs(phase - 0.5);
    const distToNewMoon = Math.min(phase, 1 - phase);
    const minDist = Math.min(distToFullMoon, distToNewMoon);

    // 0 (perfekt) bis 0.5 (schlecht) normalisieren
    return Math.round(100 * (1 - minDist / 0.5));
  }

  // Tages-Vorhersage: Beste Zeiten für heute
  getDayForecast(latitude, longitude, date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const solunarTimes = this.getSolunarTimes(latitude, longitude, date);
    const moonPhase = this.getMoonPhase(date);
    const phaseName = this.getMoonPhaseName(moonPhase);

    // Nächste Extrema
    const now = new Date();
    const nowHour = now.getHours() + now.getMinutes() / 60;

    const nextMajor = this.getNextEvent(solunarTimes.major, nowHour);
    const nextMinor = this.getNextEvent(solunarTimes.minor, nowHour);

    return {
      date: date.toLocaleDateString('de-DE'),
      moonPhase: {
        phase: moonPhase,
        name: phaseName,
        emoji: this.getMoonEmoji(moonPhase),
        quality: this.calculateQualityScore(moonPhase),
      },
      major: solunarTimes.major,
      minor: solunarTimes.minor,
      nextMajor,
      nextMinor,
      overallQuality: Math.round((solunarTimes.major.quality + solunarTimes.minor.quality) / 2),
    };
  }

  // 7-Tage Vorhersage
  getWeekForecast(latitude, longitude, startDate = new Date()) {
    const forecast = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      date.setHours(12, 0, 0, 0);
      forecast.push(this.getDayForecast(latitude, longitude, date));
    }
    return forecast;
  }

  // Berechne Zeit bis nächstes Event
  getNextEvent(event, currentHour) {
    let eventHour = event.hour;

    // Wenn Event-Zeit in der Vergangenheit liegt, morgen
    if (eventHour < currentHour) {
      eventHour += 24;
    }

    const hours = Math.floor(eventHour - currentHour);
    const minutes = Math.round((eventHour - currentHour - hours) * 60);

    return {
      hours,
      minutes,
      totalMinutes: hours * 60 + minutes,
    };
  }

  // Konvertiere Hour (0-24) zu Date mit Zeit
  getTimeFromHour(baseDate, hour) {
    const time = new Date(baseDate);
    time.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
    return time;
  }

  // Julian Date Berechnung
  getJulianDate(date) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const hour = date.getUTCHours();
    const minute = date.getUTCMinutes();
    const second = date.getUTCSeconds();

    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;

    const JDN = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

    const JD = JDN + (hour - 12) / 24 + minute / 1440 + second / 86400;
    return JD;
  }

  // Greenwich Mean Sidereal Time
  getGMST(date) {
    const JD = this.getJulianDate(date);
    const T = (JD - 2451545.0) / 36525;
    const GMST = 280.46061837 + 360.98564724 * (JD - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000;
    return GMST % 360;
  }

  // Gebe Empfehlung basierend auf Solunar-Qualität
  getRecommendation(quality) {
    if (quality >= 80) return 'Exzellent! Beste Fangzeit';
    if (quality >= 60) return 'Gut. Sehr gute Bedingungen';
    if (quality >= 40) return 'Moderat. Passable Bedingungen';
    return 'Schwach. Ungünstige Bedingungen';
  }
}

export default new SolunarService();
