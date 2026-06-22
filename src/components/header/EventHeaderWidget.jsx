import React, { useState, useEffect } from 'react';
import { events } from '@/api/frontendClient';
import { Trophy, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const CACHE_KEY = 'bb_header_points';

// Zuletzt bekannten Punktestand aus dem lokalen Cache lesen, damit das Widget
// sofort einen Wert anzeigt und nicht erst auf den (bei Cold-Start langsamen)
// API-Call wartet.
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function EventHeaderWidget() {
  const [points, setPoints] = useState(() => readCache()?.points ?? 0);
  const [activeEvent, setActiveEvent] = useState(() => readCache()?.activeEvent ?? null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [pointsData, eventData] = await Promise.all([
        events.getCurrentPoints(),
        events.getActiveEvent()
      ]);
      const nextPoints = pointsData?.total_points || 0;
      const nextEvent = eventData?.active_event || null;
      setPoints(nextPoints);
      setActiveEvent(nextEvent);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ points: nextPoints, activeEvent: nextEvent }));
      } catch {
        // localStorage nicht verfuegbar - Anzeige funktioniert trotzdem
      }
    } catch {
      // Netzwerk-/Auth-Fehler: zuletzt bekannten Stand weiter anzeigen
    }
  };

  return (
    <Link to={createPageUrl('Events')}>
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-600/40 hover:border-amber-500/60 transition-all">
        <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-amber-300 tabular-nums">
            {Math.round(points)}
          </span>
        </div>
        {activeEvent && (
          <span className="text-[10px] text-amber-400/70 font-medium hidden sm:inline">
            {activeEvent.days_left}d
          </span>
        )}
      </div>
    </Link>
  );
}
