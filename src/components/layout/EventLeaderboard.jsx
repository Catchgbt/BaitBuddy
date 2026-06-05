import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function EventLeaderboard() {
  const [topUsers, setTopUsers] = useState([]);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEventData();
    const interval = setInterval(loadEventData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadEventData = async () => {
    try {
      const events = await base44.entities.AppEvent.filter({ is_active: true });
      if (!events || events.length === 0) {
        setLoading(false);
        return;
      }

      const activeEvent = events[0];
      setEvent(activeEvent);

      const eventStart = new Date(activeEvent.start_date);
      const eventEnd = new Date(activeEvent.end_date);

      const calcSeconds = (session) => {
        const start = new Date(session.started_at);
        if (start < eventStart || start > eventEnd) return 0;
        if (session.status === 'stopped' && session.stopped_at) {
          return Math.floor((new Date(session.stopped_at) - start) / 1000);
        } else if (session.status === 'active') {
          return Math.floor((new Date() - start) / 1000);
        }
        return 0;
      };

      const allSessions = await base44.asServiceRole.entities.UsageSession.list();
      const userMap = {};
      for (const session of allSessions) {
        if (session.feature_id !== 'app_general') continue;
        if (!userMap[session.user_id]) userMap[session.user_id] = 0;
        userMap[session.user_id] += calcSeconds(session);
      }

      const sorted = Object.entries(userMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([userId, secs]) => ({ userId, seconds: secs }));
      
      setTopUsers(sorted);
    } catch (error) {
      console.error("Fehler beim Laden des Event-Leaderboards:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !event || topUsers.length === 0) return null;

  return (
    <div className="p-4 border-t border-gray-800 space-y-3">
      <div className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center justify-between">
        <span>Live Event Top 3</span>
        <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
          LIVE
        </span>
      </div>
      <div className="space-y-1.5">
        {topUsers.map((u, i) => (
          <div key={u.userId} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <span className={`font-bold w-4 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : 'text-amber-700'}`}>
                {i + 1}.
              </span>
              <span className="text-gray-300 truncate max-w-[120px]">{u.userId}</span>
            </div>
            <span className="font-mono text-cyan-400 font-semibold text-[11px]">{formatTime(u.seconds)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}