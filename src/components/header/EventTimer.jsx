import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function EventTimer() {
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    loadEventTime();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const loadEventTime = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return;

      const user = await base44.auth.me();
      const events = await base44.entities.AppEvent.filter({ is_active: true });
      if (!events || events.length === 0) return;

      const event = events[0];
      const now = new Date();
      const eventStart = new Date(event.start_date);
      const eventEnd = new Date(event.end_date);
      if (now < eventStart || now > eventEnd) return;

      const sessions = await base44.entities.UsageSession.filter({ user_id: user.email });

      let seconds = 0;
      for (const session of sessions) {
        const start = new Date(session.started_at);
        if (start < eventStart || start > eventEnd) continue;
        if (session.status === 'stopped' && session.stopped_at) {
          seconds += Math.floor((new Date(session.stopped_at) - start) / 1000);
        } else if (session.status === 'active') {
          seconds += Math.floor((new Date() - start) / 1000);
        }
      }

      setTotalSeconds(seconds);
      setVisible(true);

      intervalRef.current = setInterval(() => {
        setTotalSeconds(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Fehler beim Laden der Event-Zeit:", error);
    }
  };

  if (!visible) return null;

  return (
    <Link to={createPageUrl("Events")}>
      <div className="flex items-center bg-gray-900/80 border border-cyan-500/30 rounded-md px-2 py-1 cursor-pointer hover:border-cyan-400/60 transition-colors">
        <span className="font-mono text-[11px] text-cyan-400 tracking-widest">
          {formatTime(totalSeconds)}
        </span>
      </div>
    </Link>
  );
}

export default React.memo(EventTimer);