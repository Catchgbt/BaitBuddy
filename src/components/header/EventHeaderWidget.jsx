import React, { useState, useEffect } from 'react';
import { events } from '@/api/frontendClient';
import { Trophy, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function EventHeaderWidget() {
  const [points, setPoints] = useState(0);
  const [activeEvent, setActiveEvent] = useState(null);
  const [loaded, setLoaded] = useState(false);

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
      setPoints(pointsData?.total_points || 0);
      setActiveEvent(eventData?.active_event || null);
      setLoaded(true);
    } catch {
      setLoaded(true);
    }
  };

  if (!loaded) return null;

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
