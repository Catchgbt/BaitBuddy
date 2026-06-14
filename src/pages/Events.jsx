import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/api/auth";
import { api } from "@/api/frontendClient";

function getCountdown(endDate) {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end - now;
  if (diff <= 0) return "Beendet";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}T ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function TrophyIcon({ rank }) {
  if (rank === 1) return <span className="text-2xl">🥇</span>;
  if (rank === 2) return <span className="text-2xl">🥈</span>;
  if (rank === 3) return <span className="text-2xl">🥉</span>;
  return <span className="text-sm font-bold text-gray-400">#{rank}</span>;
}

function Avatar({ name, initials }) {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white border border-cyan-400/50">
      {initials || name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?"}
    </div>
  );
}

export default function Events() {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(new Set());
  const [joined, setJoined] = useState(new Set());
  const [leaderboards, setLeaderboards] = useState({});

  const loadData = useCallback(async () => {
    try {
      const [comps, user] = await Promise.all([
        api.get('/api/events'),
        auth.me().catch(() => null)
      ]);

      setCompetitions(Array.isArray(comps) ? comps : []);
      setCurrentUser(user);

      if (Array.isArray(comps) && comps.length > 0 && user) {
        const leaderboardsMap = {};
        await Promise.all(comps.map(async (comp) => {
          const lb = await api.get(`/api/events/${comp.id}/leaderboard`).catch(() => []);
          leaderboardsMap[comp.id] = Array.isArray(lb) ? lb : [];
          const userJoined = lb.some(entry => entry.user_id === user.email);
          if (userJoined) setJoined(prev => new Set([...prev, comp.id]));
        }));
        setLeaderboards(leaderboardsMap);
      }
    } catch (err) {
      console.error("Error loading competitions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleJoin = async (compId) => {
    setJoining(prev => new Set([...prev, compId]));
    try {
      await api.post(`/api/events/${compId}/join`, {});
      setJoined(prev => new Set([...prev, compId]));
    } catch (err) {
      console.error("Error joining competition:", err);
    } finally {
      setJoining(prev => {
        const newSet = new Set(prev);
        newSet.delete(compId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 text-sm">Wettbewerbe werden geladen...</p>
        </div>
      </div>
    );
  }

  if (!competitions.length) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 flex items-center justify-center px-4">
        <div className="text-center space-y-3 max-w-sm">
          <div className="text-5xl">🎯</div>
          <h2 className="text-xl font-bold text-white">Keine aktiven Wettbewerbe</h2>
          <p className="text-gray-400 text-sm">Aktuell sind keine Wettbewerbe aktiv. Schau später wieder vorbei!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 px-4 py-8 max-w-2xl mx-auto pb-32">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              🏆 Wettbewerbe
            </h1>
            <p className="text-gray-400 text-sm">Tritt Wettbewerben bei und sammle Punkte für Premium-Zugang</p>
          </div>
          {currentUser && (
            <button
              onClick={() => navigate('/events/create')}
              className="inline-block px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold rounded-lg transition text-sm"
            >
              ➕ Neues Event erstellen
            </button>
          )}
        </div>

        {/* Competition Cards */}
        <div className="space-y-4">
          {competitions.map((comp) => {
            const lb = leaderboards[comp.id] || [];
            const isEnded = new Date() > new Date(comp.end_date);
            const isUserJoined = joined.has(comp.id);
            const userEntry = lb.find(e => e.user_id === currentUser?.email);
            const countdown = getCountdown(comp.end_date);

            return (
              <div
                key={comp.id}
                className="bg-gray-900/50 border border-cyan-500/20 rounded-2xl overflow-hidden hover:border-cyan-500/40 transition backdrop-blur"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-cyan-500/20 px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white truncate">{comp.name}</h3>
                      {comp.description && (
                        <p className="text-gray-400 text-sm mt-1">{comp.description}</p>
                      )}
                    </div>
                    {!isEnded && (
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-500/20 text-green-400 border border-green-500/40 whitespace-nowrap">
                        LIVE
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                  {/* Time & Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-950/50 rounded-lg p-3 border border-gray-800">
                      <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">
                        {isEnded ? "Endet am" : "Verbleibende Zeit"}
                      </div>
                      <div className="text-xl font-bold text-cyan-400">{countdown}</div>
                    </div>
                    <div className="bg-gray-950/50 rounded-lg p-3 border border-gray-800">
                      <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">
                        Teilnehmer
                      </div>
                      <div className="text-xl font-bold text-blue-400">{lb.length}</div>
                    </div>
                  </div>

                  {/* Prize */}
                  {comp.prize && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">
                        🎁 Preis
                      </div>
                      <div className="text-sm text-white font-semibold">{comp.prize}</div>
                    </div>
                  )}

                  {/* Join Button */}
                  {!isUserJoined && currentUser && (
                    <button
                      onClick={() => handleJoin(comp.id)}
                      disabled={joining.has(comp.id)}
                      className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 text-white font-bold rounded-lg transition text-sm"
                    >
                      {joining.has(comp.id) ? "Wird beigetreten..." : "➕ Beitreten"}
                    </button>
                  )}

                  {isUserJoined && userEntry && (
                    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 text-center">
                      <div className="text-xs text-cyan-400 font-bold uppercase tracking-widest mb-1">
                        Deine Punkte
                      </div>
                      <div className="text-2xl font-black text-cyan-400">{Math.round(userEntry.total_points || 0)}</div>
                    </div>
                  )}

                  {!currentUser && (
                    <div className="text-center text-gray-400 text-sm py-2">
                      Bitte melde dich an zum Beitreten
                    </div>
                  )}

                  {/* Leaderboard */}
                  {lb.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
                        📊 Top 5 Rangliste
                      </h4>
                      <div className="space-y-1.5">
                        {lb.slice(0, 5).map((entry, idx) => {
                          const isMe = currentUser && entry.user_id === currentUser.email;
                          const userName = entry.created_by || entry.user_id;
                          const initials = userName.split("@")[0].slice(0, 2).toUpperCase();
                          return (
                            <div
                              key={entry.user_id}
                              className={`flex items-center justify-between gap-3 p-2.5 rounded-lg ${
                                isMe
                                  ? "bg-cyan-500/20 border border-cyan-500/40"
                                  : "bg-gray-950/50 border border-gray-800"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <TrophyIcon rank={idx + 1} />
                                <Avatar name={userName} initials={initials} />
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-semibold text-gray-200 truncate">
                                    {userName.split("@")[0]}
                                  </div>
                                  {isMe && (
                                    <span className="inline-block text-[9px] bg-cyan-500/30 text-cyan-300 rounded px-1 py-0.5 font-bold">
                                      Du
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-bold text-cyan-400 text-sm">
                                  {Math.round(entry.total_points || 0)}
                                </div>
                                <div className="text-xs text-gray-600">Punkte</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Footer */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center text-xs text-gray-400">
          <p>💡 Sammle Punkte in Wettbewerben für kostenlosen Premium-Zugang!</p>
          <p className="mt-2 text-gray-600">1000 Punkte = 1 Woche | 4000 Punkte = 1 Monat</p>
        </div>
      </div>
    </div>
  );
}