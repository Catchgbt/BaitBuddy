import React, { useState, useEffect } from 'react';
import { events } from '@/api/frontendClient';
import { Trophy, Clock, Zap, Loader2 } from 'lucide-react';

export default function EventHeaderWidget() {
  const [points, setPoints] = useState(0);
  const [activeEvent, setActiveEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // Aktualisiere jede Minute
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pointsData, eventData] = await Promise.all([
        events.getCurrentPoints(),
        events.getActiveEvent()
      ]);

      setPoints(pointsData?.total_points || 0);
      setActiveEvent(eventData?.active_event || null);
    } catch (error) {
      console.error('Fehler beim Laden der Event-Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-800/40 border border-gray-700/50">
        <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-600/30 hover:border-amber-500/50 transition-all">
      {/* Punkte Anzeige */}
      <div className="flex items-center gap-1.5">
        <Zap className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-semibold text-amber-300">
          {Math.round(points * 100) / 100}
        </span>
        <span className="text-xs text-gray-400">Pkt.</span>
      </div>

      {/* Separator */}
      <div className="w-px h-4 bg-gray-700/50"></div>

      {/* Event Laufzeit */}
      {activeEvent ? (
        <div className="flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-medium text-blue-300">
            {activeEvent.name}
          </span>
          <span className="text-xs text-blue-400/70 font-semibold">
            {activeEvent.days_left}d
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-400">Kein aktives Event</span>
        </div>
      )}
    </div>
  );
}
