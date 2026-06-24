import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { auth } from "@/api/auth";
import { api } from "@/api/frontendClient";
import { ChevronRight, Zap, Award } from "lucide-react";

function getCountdown(endDate) {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end - now;
  if (diff <= 0) return "Beendet";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

const PointsBreakdown = ({ totalPoints, participatingEvents }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
    className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-cyan-500/20 p-6 mb-8"
  >
    <div className="flex items-center gap-2 mb-6">
      <Zap className="w-5 h-5 text-cyan-400" />
      <h2 className="text-xl font-bold text-white">Punkte-System</h2>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[
        { label: "Fang-Einreichung", points: 100, color: "cyan" },
        { label: "Längenbonuson (pro cm)", points: 5, color: "blue" },
        { label: "Community-Likes", points: 1, color: "purple" },
        { label: "Platzierungsbonus (1.)", points: 500, color: "amber" },
      ].map((item, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1, duration: 0.4 }}
          className={`bg-${item.color}-500/10 border border-${item.color}-500/30 rounded-lg p-4`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-${item.color}-400 font-medium text-sm`}>{item.label}</span>
            <span className={`text-${item.color}-300 font-bold text-lg`}>+{item.points}</span>
          </div>
        </motion.div>
      ))}
    </div>

    <div className="mt-6 pt-6 border-t border-slate-700">
      <div className="bg-slate-950/50 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-green-400" />
          <span className="text-sm text-gray-300">Deine Gesamtpunkte</span>
        </div>
        <span className="text-2xl font-bold text-green-400 tabular-nums">
          {Math.round(totalPoints || 0)}
        </span>
      </div>
      {participatingEvents > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          Aus {participatingEvents} {participatingEvents === 1 ? "Veranstaltung" : "Veranstaltungen"}
        </p>
      )}
    </div>
  </motion.div>
);

const EventCard = ({ event, isUserJoined, userEntry, onJoin, leaderboard }) => {
  const isEnded = new Date() > new Date(event.end_date);
  const countdown = getCountdown(event.end_date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -4 }}
      className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-cyan-500/20 hover:border-cyan-500/40 transition overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-cyan-500/20 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">{event.name}</h3>
            {event.description && (
              <p className="text-sm text-gray-400">{event.description}</p>
            )}
          </div>
          <motion.span
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
              isEnded
                ? "bg-gray-700/30 text-gray-400 border border-gray-700/50"
                : "bg-green-500/20 text-green-400 border border-green-500/40"
            }`}
          >
            {isEnded ? "Beendet" : "Laufend"}
          </motion.span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-slate-950/50 rounded-lg p-3 border border-slate-700/50"
          >
            <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Zeit</div>
            <div className="text-lg font-bold text-cyan-400">{countdown}</div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-slate-950/50 rounded-lg p-3 border border-slate-700/50"
          >
            <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Teilnehmer</div>
            <div className="text-lg font-bold text-blue-400">{leaderboard.length}</div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-slate-950/50 rounded-lg p-3 border border-slate-700/50"
          >
            <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Basispunkte</div>
            <div className="text-lg font-bold text-purple-400">{event.base_points || 100}</div>
          </motion.div>
        </div>

        {/* User Score */}
        {isUserJoined && userEntry && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 rounded-lg p-4 text-center"
          >
            <div className="text-xs text-cyan-400 font-semibold uppercase mb-1">Deine Punkte</div>
            <div className="text-3xl font-bold text-cyan-300">
              {Math.round(userEntry.total_points || 0)}
            </div>
          </motion.div>
        )}

        {/* Join Button */}
        {!isUserJoined && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onJoin(event.id)}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
          >
            Beitreten
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        )}

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="pt-4 border-t border-slate-700/50">
            <h4 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Rangliste (Top 5)
            </h4>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((entry, idx) => {
                const isMe = entry.is_user;
                const rank = idx + 1;
                return (
                  <motion.div
                    key={entry.user_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`flex items-center gap-3 p-2.5 rounded-lg ${
                      isMe
                        ? "bg-cyan-500/15 border border-cyan-500/40"
                        : "bg-slate-950/30 border border-slate-700/30"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      rank === 1 ? "bg-amber-500/30 text-amber-300" :
                      rank === 2 ? "bg-gray-400/30 text-gray-200" :
                      rank === 3 ? "bg-orange-500/30 text-orange-300" :
                      "bg-slate-700/30 text-gray-400"
                    }`}>
                      {rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-100 truncate">
                        {isMe ? "Du" : entry.user_id.split("@")[0]}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-cyan-400">
                        {Math.round(entry.total_points || 0)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default function Events() {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(new Set());
  const [leaderboards, setLeaderboards] = useState({});
  const [pointsSummary, setPointsSummary] = useState({ total_points: 0, participating_events: 0 });

  const loadData = useCallback(async () => {
    try {
      const [comps, user, points] = await Promise.all([
        api.get('/api/events'),
        auth.me().catch(() => null),
        api.get('/api/events/user/current-points').catch(() => null)
      ]);

      setCompetitions(Array.isArray(comps) ? comps : []);
      setCurrentUser(user);
      if (points) setPointsSummary(points);

      if (Array.isArray(comps) && comps.length > 0 && user) {
        const leaderboardsMap = {};
        const joinedSet = new Set();
        await Promise.all(comps.map(async (comp) => {
          const lb = await api.get(`/api/events/${comp.id}/leaderboard`).catch(() => []);
          leaderboardsMap[comp.id] = Array.isArray(lb) ? lb.map((e) => ({
            ...e,
            is_user: e.user_id === user.email
          })) : [];
          const userJoined = (leaderboardsMap[comp.id] || []).some(entry => entry.user_id === user.email);
          if (userJoined) joinedSet.add(comp.id);
        }));
        setLeaderboards(leaderboardsMap);
        setJoined(joinedSet);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleJoin = async (compId) => {
    try {
      await api.post(`/api/events/${compId}/join`, {});
      setJoined(prev => new Set([...prev, compId]));
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 px-4 py-8 max-w-4xl mx-auto pb-32">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Veranstaltungen</h1>
        <p className="text-gray-400 text-lg">Nimm an Wettbewerben teil und sammle Punkte</p>
      </motion.div>

      {/* Points System */}
      <PointsBreakdown
        totalPoints={pointsSummary.total_points}
        participatingEvents={pointsSummary.participating_events}
      />

      {/* Events */}
      {competitions.length > 0 ? (
        <div className="space-y-6">
          {competitions.map((event, idx) => (
            <EventCard
              key={event.id}
              event={event}
              isUserJoined={joined.has(event.id)}
              userEntry={(leaderboards[event.id] || []).find(e => e.user_id === currentUser?.email)}
              onJoin={handleJoin}
              leaderboard={leaderboards[event.id] || []}
            />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-gray-400 text-lg">Keine aktiven Veranstaltungen</p>
          <p className="text-gray-500 text-sm mt-1">Komm später zurück für neue Wettbewerbe</p>
        </motion.div>
      )}
    </div>
  );
}
