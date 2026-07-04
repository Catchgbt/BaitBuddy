import React, { useMemo } from 'react';
import { calculateSunTimes, formatLocalTime, getBiteTimes } from '@/utils/sunCalc';
import { Sun, Sunrise, Sunset, Clock, MapPin } from 'lucide-react';

const TWILIGHT_ROWS = [
  {
    key: 'astronomicalDawn',
    label: 'Astronomische Dämmerung',
    sub: 'Sonne 18° unter Horizont',
    color: 'text-indigo-400',
    dot: 'bg-indigo-700',
  },
  {
    key: 'nauticalDawn',
    label: 'Nautische Dämmerung',
    sub: 'Sonne 12° unter Horizont',
    color: 'text-blue-400',
    dot: 'bg-blue-600',
  },
  {
    key: 'civilDawn',
    label: 'Bürgerliche Dämmerung',
    sub: 'Sonne 6° unter Horizont',
    color: 'text-sky-300',
    dot: 'bg-sky-500',
  },
  {
    key: 'sunrise',
    label: 'Sonnenaufgang',
    sub: 'Oberer Rand erscheint',
    color: 'text-orange-300',
    dot: 'bg-orange-400',
    icon: Sunrise,
    bold: true,
  },
  {
    key: 'sunset',
    label: 'Sonnenuntergang',
    sub: 'Oberer Rand verschwindet',
    color: 'text-orange-400',
    dot: 'bg-orange-500',
    icon: Sunset,
    bold: true,
  },
  {
    key: 'civilDusk',
    label: 'Bürgerliche Dämmerung',
    sub: 'Sonne 6° unter Horizont',
    color: 'text-sky-400',
    dot: 'bg-sky-600',
  },
  {
    key: 'nauticalDusk',
    label: 'Nautische Dämmerung',
    sub: 'Sonne 12° unter Horizont',
    color: 'text-blue-500',
    dot: 'bg-blue-700',
  },
  {
    key: 'astronomicalDusk',
    label: 'Astronomische Dämmerung',
    sub: 'Sonne 18° unter Horizont — Nacht beginnt',
    color: 'text-indigo-500',
    dot: 'bg-indigo-800',
  },
];

function DayLengthBar({ sunTimes }) {
  const totalMinutes = 24 * 60;

  function toMinutes(date) {
    if (!date) return null;
    return date.getHours() * 60 + date.getMinutes();
  }

  const astDawn = toMinutes(sunTimes.astronomicalDawn);
  const civDawn = toMinutes(sunTimes.civilDawn);
  const rise = toMinutes(sunTimes.sunrise);
  const set = toMinutes(sunTimes.sunset);
  const civDusk = toMinutes(sunTimes.civilDusk);
  const astDusk = toMinutes(sunTimes.astronomicalDusk);

  function pct(min) {
    return min === null ? null : (min / totalMinutes) * 100;
  }

  const segments = [
    { from: 0, to: pct(astDawn), color: '#1e1b4b' },
    { from: pct(astDawn), to: pct(civDawn), color: '#312e81' },
    { from: pct(civDawn), to: pct(rise), color: '#1d4ed8' },
    { from: pct(rise), to: pct(set), color: '#fbbf24' },
    { from: pct(set), to: pct(civDusk), color: '#1d4ed8' },
    { from: pct(civDusk), to: pct(astDusk), color: '#312e81' },
    { from: pct(astDusk), to: 100, color: '#1e1b4b' },
  ].filter(s => s.from !== null && s.to !== null && s.to > s.from);

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const nowPct = (nowMinutes / totalMinutes) * 100;

  return (
    <div className="relative h-5 rounded-full overflow-hidden bg-gray-950 border border-gray-800">
      {segments.map((seg, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0"
          style={{ left: `${seg.from}%`, width: `${seg.to - seg.from}%`, background: seg.color }}
        />
      ))}
      {/* Jetzt-Markierung */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10"
        style={{ left: `${nowPct}%` }}
      />
    </div>
  );
}

function BiteWindow({ window: w }) {
  const qualityStyles = {
    excellent: 'border-emerald-500/50 bg-emerald-900/20',
    good: 'border-cyan-600/40 bg-cyan-900/15',
  };

  return (
    <div className={`rounded-xl border p-3 ${qualityStyles[w.quality] || 'border-gray-700 bg-gray-800/30'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-white">{w.label}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-800/60 text-emerald-300 font-medium">
          {w.quality === 'excellent' ? 'Optimal' : 'Gut'}
        </span>
      </div>
      <div className="text-xs text-gray-400 mb-2">{w.description}</div>
      <div className="flex items-center gap-2 text-sm">
        <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
        <span className="text-cyan-300 tabular-nums">
          {formatLocalTime(w.start)}
          {w.end ? ` – ${formatLocalTime(w.end)}` : ' (bis Anbruch)'}
        </span>
      </div>
    </div>
  );
}

export default function SunriseSunsetPanel({ lat, lon, locationLabel }) {
  const today = useMemo(() => new Date(), []);

  const sunTimes = useMemo(() => {
    if (lat == null || lon == null) return null;
    return calculateSunTimes(today, lat, lon);
  }, [lat, lon, today]);

  const biteTimes = useMemo(() => {
    if (!sunTimes) return [];
    return getBiteTimes(sunTimes);
  }, [sunTimes]);

  const dayLength = useMemo(() => {
    if (!sunTimes?.sunrise || !sunTimes?.sunset) return null;
    const diffMs = sunTimes.sunset.getTime() - sunTimes.sunrise.getTime();
    const h = Math.floor(diffMs / 3600000);
    const m = Math.floor((diffMs % 3600000) / 60000);
    return `${h} Std. ${m} Min.`;
  }, [sunTimes]);

  if (lat == null || lon == null) {
    return (
      <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-4 text-center text-gray-500 text-sm">
        GPS-Standort oder Spot auswählen um Sonnenzeiten zu berechnen
      </div>
    );
  }

  if (!sunTimes) return null;

  const dateStr = today.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-cyan-300">{dateStr}</div>
          {locationLabel && (
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
              <MapPin className="w-3 h-3" />
              {locationLabel}
            </div>
          )}
          {dayLength && (
            <div className="flex items-center gap-1 mt-1 text-xs text-amber-400">
              <Sun className="w-3 h-3" />
              Tageslange: {dayLength}
            </div>
          )}
        </div>
        <div className="text-right text-xs text-gray-600">
          {lat.toFixed(4)}, {lon.toFixed(4)}
        </div>
      </div>

      {/* Tageszeitenbalken */}
      <DayLengthBar sunTimes={sunTimes} />
      <div className="flex justify-between text-[10px] text-gray-600 -mt-2 px-0.5">
        <span>0:00</span>
        <span>6:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>

      {/* Beste Beiszeiten */}
      <div>
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Optimale Beiszeiten
        </div>
        <div className="space-y-2">
          {biteTimes.map(w => (
            <BiteWindow key={w.id} window={w} />
          ))}
        </div>
      </div>

      {/* Alle Sonnenzeiten */}
      <div>
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Sonnen- & Dämmerungszeiten
        </div>
        <div className="rounded-xl border border-gray-800 overflow-hidden divide-y divide-gray-800/60">
          {TWILIGHT_ROWS.map(row => {
            const time = sunTimes[row.key];
            const Icon = row.icon;
            return (
              <div
                key={row.key}
                className={`flex items-center justify-between px-3 py-2.5 ${row.bold ? 'bg-gray-800/40' : ''}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${row.dot}`} />
                  <div>
                    <div className={`text-sm ${row.bold ? 'font-semibold' : 'font-medium'} ${row.color} flex items-center gap-1.5`}>
                      {Icon && <Icon className="w-3.5 h-3.5" />}
                      {row.label}
                    </div>
                    <div className="text-[10px] text-gray-600">{row.sub}</div>
                  </div>
                </div>
                <div className="text-sm tabular-nums font-mono text-white shrink-0">
                  {formatLocalTime(time)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hinweis */}
      <div className="text-[10px] text-gray-600 leading-relaxed">
        Zeiten in Ortszeit. Berechnung nach NOAA Solar Calculator. Fische reagieren
        besonders empfindlich auf Lichtveranderungen — die Dämmerungsphasen sind
        erfahrungsgemass die aktivsten Beisszeiten.
      </div>
    </div>
  );
}
