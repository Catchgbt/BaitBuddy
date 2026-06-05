import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getEventLeaderboard } from "@/functions/getEventLeaderboard";

function formatTime(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return "0h 0min";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h === 0) return `${m}min`;
  return `${h}h ${m}min`;
}

function getCountdown(endDate) {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end - now;
  if (diff <= 0) return "Event beendet";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}T ${hours}h ${minutes}min`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

const TROPHY_COLORS = [
  { label: "Gold", text: "text-amber-400", border: "border-amber-500/50", bg: "bg-amber-500/10" },
  { label: "Silber", text: "text-gray-300", border: "border-gray-400/40", bg: "bg-gray-400/5" },
  { label: "Bronze", text: "text-amber-700", border: "border-amber-700/40", bg: "bg-amber-700/5" },
];

function TrophyIcon({ rank }) {
  if (rank === 1) return <span className="text-2xl font-black text-amber-400">#1</span>;
  if (rank === 2) return <span className="text-2xl font-black text-gray-300">#2</span>;
  if (rank === 3) return <span className="text-2xl font-black text-amber-700">#3</span>;
  return <span className="text-sm font-bold text-gray-500">#{rank}</span>;
}

function Avatar({ name, url }) {
  if (url) {
    return <img src={url} alt={name} className="w-10 h-10 rounded-full object-cover border border-gray-700" />;
  }
  const initials = name
    ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  return (
    <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-sm font-bold text-cyan-400">
      {initials}
    </div>
  );
}

export default function Events() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [event, setEvent] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [mySeconds, setMySeconds] = useState(0);
  const [countdown, setCountdown] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calculatedAt, setCalculatedAt] = useState(null);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [result, user] = await Promise.all([
        getEventLeaderboard({}),
        base44.auth.me().catch(() => null)
      ]);

      const data = result?.data || result;
      setLeaderboard(data?.leaderboard || []);
      setEvent(data?.event || null);
      setCalculatedAt(data?.calculated_at ? new Date(data.calculated_at) : new Date());
      setCurrentUser(user);

      if (data?.event) {
        setCountdown(getCountdown(data.event.end_date));
      }

      // Calculate my own time from leaderboard
      if (user && data?.leaderboard) {
        const myEntry = data.leaderboard.find(e => e.user_id === user.email);
        setMySeconds(myEntry?.total_seconds || 0);
      }
    } catch (err) {
      console.error("Fehler beim Laden:", err);
      setError("Leaderboard konnte nicht geladen werden.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Countdown ticker
  useEffect(() => {
    if (!event) return;
    const interval = setInterval(() => {
      setCountdown(getCountdown(event.end_date));
      setMySeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [event]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Lade Event-Daten...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-white">Kein aktives Event</h2>
          <p className="text-gray-400 text-sm">Aktuell laeuft kein Event. Schau spaeter wieder vorbei.</p>
        </div>
      </div>
    );
  }

  const isEnded = new Date() > new Date(event.end_date);
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 max-w-lg mx-auto space-y-6 pb-32">

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Tester Challenge</div>
          {!isEnded && (
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-500/20 text-green-400 border border-green-500/40 animate-pulse font-bold uppercase tracking-wider">
              LIVE
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white">{event.name}</h1>
        {event.description && (
          <p className="text-gray-400 text-sm leading-relaxed">{event.description}</p>
        )}
      </div>

      {/* Meine Zeit */}
      <div className="bg-gray-900/80 border border-cyan-500/20 rounded-2xl p-5 text-center space-y-1">
        <div className="text-xs text-gray-500 uppercase tracking-widest">Meine Online-Zeit</div>
        <div className="font-mono text-4xl font-bold text-cyan-400 tracking-widest">
          {formatTime(mySeconds)}
        </div>
        <div className="text-xs text-gray-600">wird live gezaehlt waehrend du die App verwendest</div>
      </div>

      {/* Top 3 Podium */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest">Rangliste</h3>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded-lg transition text-xs text-gray-300"
            >
              {refreshing ? "..." : "Aktualisieren"}
            </button>
            <button
              onClick={() => { setLeaderboard([]); setError(null); loadData(); }}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/40 hover:bg-red-900/70 disabled:opacity-50 rounded-lg transition text-xs text-red-300 border border-red-800/50"
            >
              Hard Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700/40 rounded-xl p-3 text-sm text-red-300 text-center">
            {error}
          </div>
        )}

        {leaderboard.length === 0 && !error && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-500 text-sm">
            Noch keine Teilnehmer. Starte die App, damit deine Zeit gezaehlt wird.
          </div>
        )}

        {/* Top 3 */}
        <div className="grid gap-3">
          {top3.map((entry, i) => {
            const style = TROPHY_COLORS[i];
            const isMe = currentUser && entry.user_id === currentUser.email;
            return (
              <div
                key={entry.user_id}
                className={`${style.bg} border ${style.border} rounded-xl p-4 flex items-center justify-between gap-3 ${isMe ? "ring-2 ring-cyan-500/40" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <TrophyIcon rank={entry.rank} />
                  <Avatar name={entry.display_name} url={entry.profile_picture_url} />
                  <div className="min-w-0">
                    <div className={`font-semibold text-sm truncate ${style.text}`}>
                      {entry.display_name}
                    </div>
                    {isMe && (
                      <span className="inline-block text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded px-1.5 py-0.5 font-bold mt-0.5">
                        Du
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-lg font-bold text-cyan-400">
                    {formatTime(entry.total_seconds)}
                  </div>
                  <div className="text-xs text-gray-600">Online-Zeit</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rest of leaderboard */}
        {rest.length > 0 && (
          <div className="space-y-1.5 mt-2">
            {rest.map((entry) => {
              const isMe = currentUser && entry.user_id === currentUser.email;
              return (
                <div
                  key={entry.user_id}
                  className={`bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 flex items-center justify-between gap-3 ${isMe ? "border-cyan-500/30 bg-cyan-950/20" : ""}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-sm font-bold text-gray-500 w-6 text-center">#{entry.rank}</span>
                    <Avatar name={entry.display_name} url={entry.profile_picture_url} />
                    <div className="min-w-0">
                      <div className="text-sm text-gray-300 truncate">{entry.display_name}</div>
                      {isMe && (
                        <span className="inline-block text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded px-1.5 py-0.5 font-bold">
                          Du
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-mono text-sm text-cyan-400 font-semibold shrink-0">
                    {formatTime(entry.total_seconds)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {calculatedAt && (
          <div className="text-center text-xs text-gray-700 pt-1">
            Stand: {calculatedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
          </div>
        )}
      </div>

      {/* Countdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center space-y-1">
        <div className="text-xs text-gray-500 uppercase tracking-widest">
          {isEnded ? "Event beendet am" : "Endet in"}
        </div>
        <div className="text-2xl font-bold text-cyan-400">
          {isEnded ? new Date(event.end_date).toLocaleDateString('de-DE') : countdown}
        </div>
        <div className="text-xs text-gray-600">
          {new Date(event.start_date).toLocaleDateString('de-DE')} bis {new Date(event.end_date).toLocaleDateString('de-DE')}
        </div>
      </div>

      {/* Preis */}
      {event.prize && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-2">
          <div className="text-xs font-bold text-amber-400 uppercase tracking-widest">Preis</div>
          <div className="text-xl font-bold text-white">{event.prize}</div>
          <p className="text-gray-400 text-sm">
            Der Tester mit der laengsten kumulierten Online-Zeit gewinnt.
          </p>
        </div>
      )}

      {/* Regeln */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Regeln</div>
        <div className="space-y-2 text-sm text-gray-300">
          {event.rules ? (
            <p>{event.rules}</p>
          ) : (
            <>
              <p>1. Jede aktive Session in der App wird gezaehlt.</p>
              <p>2. Der Event laeuft vom {new Date(event.start_date).toLocaleDateString('de-DE')} bis {new Date(event.end_date).toLocaleDateString('de-DE')}.</p>
              <p>3. Der Gewinner wird nach Eventende per E-Mail benachrichtigt.</p>
              <p>4. Pro Benutzer ist nur ein Gewinn moeglich.</p>
            </>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-gray-600 pb-4">
        Deine Zeit wird automatisch getrackt, solange du die App verwendest.
      </div>
    </div>
  );
}