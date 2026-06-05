import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AdminTracking() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [range, setRange] = useState(7); // Tage

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        if (me?.role !== "admin") {
          setLoading(false);
          return;
        }
        const [evts, sess] = await Promise.all([
          base44.entities.TrackingEvent.list("-created_date", 5000),
          base44.entities.UsageSession.list("-created_date", 5000),
        ]);
        setEvents(evts || []);
        setSessions(sess || []);
      } catch (e) {
        // ignore
      }
      setLoading(false);
    })();
  }, []);

  const cutoff = useMemo(() => Date.now() - range * 24 * 60 * 60 * 1000, [range]);

  const filteredEvents = useMemo(
    () => events.filter((e) => new Date(e.created_date).getTime() >= cutoff),
    [events, cutoff]
  );
  const filteredSessions = useMemo(
    () => sessions.filter((s) => new Date(s.created_date).getTime() >= cutoff),
    [sessions, cutoff]
  );

  const pageViews = useMemo(() => {
    const map = {};
    filteredEvents
      .filter((e) => e.event_type === "page_view" && e.page_name)
      .forEach((e) => {
        map[e.page_name] = (map[e.page_name] || 0) + 1;
      });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [filteredEvents]);

  const featureClicks = useMemo(() => {
    const map = {};
    filteredEvents
      .filter((e) => e.event_type === "feature_click" && e.feature_id)
      .forEach((e) => {
        map[e.feature_id] = (map[e.feature_id] || 0) + 1;
      });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [filteredEvents]);

  const userSessions = useMemo(() => {
    const map = {};
    filteredSessions
      .filter((s) => s.feature_id === "app_general" && s.started_at)
      .forEach((s) => {
        const start = new Date(s.started_at).getTime();
        const end = s.stopped_at
          ? new Date(s.stopped_at).getTime()
          : new Date(s.last_heartbeat || s.started_at).getTime();
        const minutes = Math.max(0, Math.round((end - start) / 60000));
        if (!map[s.user_id]) map[s.user_id] = { user: s.user_id, minutes: 0, count: 0 };
        map[s.user_id].minutes += minutes;
        map[s.user_id].count += 1;
      });
    return Object.values(map).sort((a, b) => b.minutes - a.minutes).slice(0, 30);
  }, [filteredSessions]);

  const totalPageViews = filteredEvents.filter((e) => e.event_type === "page_view").length;
  const totalClicks = filteredEvents.filter((e) => e.event_type === "feature_click").length;
  const uniqueUsers = new Set(filteredEvents.map((e) => e.user_id)).size;
  const totalMinutes = userSessions.reduce((s, u) => s + u.minutes, 0);

  if (loading) {
    return (
      <div className="p-6 text-gray-400">Lade Tracking-Daten...</div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="p-6 max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Zugriff verweigert</h1>
        <p className="text-gray-400">Diese Seite ist nur fuer Administratoren verfuegbar.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Tracking Auswertung</h1>
          <p className="text-sm text-gray-400">Nutzungsdaten der letzten {range} Tage</p>
        </div>
        <div className="flex gap-2">
          {[1, 7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setRange(d)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                range === d
                  ? "bg-cyan-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {d === 1 ? "Heute" : `${d} Tage`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Seitenaufrufe" value={totalPageViews} />
        <StatCard label="Feature-Klicks" value={totalClicks} />
        <StatCard label="Aktive Nutzer" value={uniqueUsers} />
        <StatCard label="Gesamt-Minuten" value={totalMinutes} />
      </div>

      <Card className="bg-gray-900/60 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Seitenaufrufe (Top 20)</CardTitle>
        </CardHeader>
        <CardContent>
          {pageViews.length === 0 ? (
            <p className="text-gray-500 text-sm">Keine Daten</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, pageViews.length * 28)}>
              <BarChart data={pageViews} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis type="category" dataKey="name" stroke="#9ca3af" width={120} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151" }} />
                <Bar dataKey="count" fill="#22d3ee" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gray-900/60 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Feature-Nutzung (Top 20)</CardTitle>
        </CardHeader>
        <CardContent>
          {featureClicks.length === 0 ? (
            <p className="text-gray-500 text-sm">Keine Daten</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, featureClicks.length * 28)}>
              <BarChart data={featureClicks} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis type="category" dataKey="name" stroke="#9ca3af" width={120} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151" }} />
                <Bar dataKey="count" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gray-900/60 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Sitzungsdauer pro Nutzer</CardTitle>
        </CardHeader>
        <CardContent>
          {userSessions.length === 0 ? (
            <p className="text-gray-500 text-sm">Keine Daten</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-800">
                    <th className="py-2 pr-4">Nutzer</th>
                    <th className="py-2 pr-4 text-right">Sitzungen</th>
                    <th className="py-2 text-right">Minuten gesamt</th>
                  </tr>
                </thead>
                <tbody>
                  {userSessions.map((u) => (
                    <tr key={u.user} className="border-b border-gray-800/50">
                      <td className="py-2 pr-4 text-gray-200">{u.user}</td>
                      <td className="py-2 pr-4 text-right text-gray-300">{u.count}</td>
                      <td className="py-2 text-right text-cyan-400 font-medium">{u.minutes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <Card className="bg-gray-900/60 border-gray-800">
      <CardContent className="p-4">
        <div className="text-xs text-gray-400 uppercase tracking-wide">{label}</div>
        <div className="text-2xl md:text-3xl font-bold text-white mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}