import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sparkles, Trophy, Target, Clock, MapPin, Fish, Camera } from "lucide-react";

// Hinweise, die im Live-Ticker rotieren. Bewusst auf "Event-Punkte durch
// Nutzung" ausgerichtet: aktives Angeln, Fänge loggen und Event-Teilnahme
// bringen Punkte – genau das soll der Ticker den Nutzern nahebringen.
const HINTS = [
  { icon: Trophy, text: "Logge jeden Fang im Logbuch — Länge und Art bringen dir Event-Punkte.", to: "Logbook", color: "text-amber-300" },
  { icon: Camera, text: "Mit der CatchCam erfasste Fänge zählen automatisch für laufende Events.", to: "CatchCam", color: "text-cyan-300" },
  { icon: Target, text: "Nimm während deines Trips an einem aktiven Event teil und sichere dir Bonuspunkte.", to: "Events", color: "text-emerald-300" },
  { icon: MapPin, text: "Hinterlege Koordinaten zu deinem Spot — dann startest du die Navigation mit einem Klick.", to: null, color: "text-sky-300" },
  { icon: Sparkles, text: "Aktive Trips erscheinen oben in der Leiste und erinnern dich an deine geplante Tour.", to: null, color: "text-fuchsia-300" },
  { icon: Fish, text: "Je größer der Fang, desto mehr Punkte: Längen-Bonus zählt pro Zentimeter.", to: "Events", color: "text-lime-300" },
];

function formatCountdown(ms) {
  if (ms <= 0) return null;
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days} Tg ${hours} Std`;
  if (hours > 0) return `${hours} Std ${mins} Min`;
  return `${mins} Min`;
}

/**
 * Live-Ticker für die Trips-Seite.
 * - Zeigt einen Live-Countdown zum nächsten geplanten / aktiven Trip.
 * - Rotiert kontextbezogene Hinweise, u. a. wie man durch Nutzung Event-Punkte sammelt.
 */
export default function TripLiveTicker({ plans = [] }) {
  const [now, setNow] = useState(Date.now());
  const [hintIndex, setHintIndex] = useState(0);

  // Ein einziger 1s-Timer treibt sowohl Countdown als auch Hinweis-Rotation.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setHintIndex((i) => (i + 1) % HINTS.length), 5000);
    return () => clearInterval(id);
  }, []);

  // Nächster relevanter Trip: bevorzugt aktive, sonst zeitlich nächste zukünftige Tour.
  const nextTrip = useMemo(() => {
    const withDate = plans
      .filter((p) => p.planned_date)
      .map((p) => ({ ...p, ts: new Date(p.planned_date).getTime() }))
      .filter((p) => !Number.isNaN(p.ts));
    const active = withDate.filter((p) => p.is_active).sort((a, b) => a.ts - b.ts);
    const upcoming = withDate.filter((p) => p.ts > now).sort((a, b) => a.ts - b.ts);
    return active.find((p) => p.ts > now) || upcoming[0] || active[0] || null;
  }, [plans, now]);

  const countdown = nextTrip ? formatCountdown(nextTrip.ts - now) : null;
  const hint = HINTS[hintIndex];
  const HintIcon = hint.icon;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-700/40 bg-gradient-to-r from-cyan-950/60 via-gray-900/70 to-emerald-950/50 backdrop-blur-sm mb-6">
      <div className="flex flex-col sm:flex-row items-stretch">
        {/* Countdown / Status */}
        <div className="flex items-center gap-3 px-4 py-3 border-b sm:border-b-0 sm:border-r border-cyan-700/30 shrink-0">
          <div className="relative">
            <span className="absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </div>
          <div className="min-w-0">
            {nextTrip && countdown ? (
              <>
                <div className="text-[11px] uppercase tracking-wider text-cyan-400/80 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {nextTrip.is_active ? "Aktiver Trip in" : "Nächster Trip in"}
                </div>
                <div className="text-sm font-semibold text-white truncate">
                  {countdown} · <span className="text-cyan-300">{nextTrip.title || "Angeltour"}</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-[11px] uppercase tracking-wider text-cyan-400/80">Live-Ticker</div>
                <div className="text-sm font-semibold text-white">Kein Trip geplant</div>
              </>
            )}
          </div>
        </div>

        {/* Rotierende Hinweise */}
        <Link
          to={hint.to ? createPageUrl(hint.to) : "#"}
          onClick={(e) => { if (!hint.to) e.preventDefault(); }}
          className="group flex items-center gap-2 px-4 py-3 flex-1 min-w-0 hover:bg-white/5 transition-colors"
        >
          <HintIcon className={`w-4 h-4 shrink-0 ${hint.color}`} aria-hidden="true" />
          <span key={hintIndex} className="text-sm text-gray-200 truncate animate-in fade-in slide-in-from-right-2 duration-500">
            {hint.text}
          </span>
          {hint.to && (
            <span className="ml-auto text-xs text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              öffnen →
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}
