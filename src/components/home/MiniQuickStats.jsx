import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Fish, MapPin, Calendar, TrendingUp } from "lucide-react";

export default function MiniQuickStats() {
  const [stats, setStats] = useState({
    totalCatches: 0,
    totalSpots: 0,
    thisWeek: 0,
    points: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [catches, spots, user] = await Promise.all([
          base44.entities.Catch.list(),
          base44.entities.Spot.list(),
          base44.auth.me()
        ]);

        // Fänge dieser Woche zählen
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const thisWeekCatches = catches.filter(c => 
          new Date(c.catch_time) > oneWeekAgo
        ).length;

        setStats({
          totalCatches: catches.length,
          totalSpots: spots.length,
          thisWeek: thisWeekCatches,
          points: user?.total_points || 0
        });
      } catch (error) {
        console.error("Fehler beim Laden der Statistiken:", error);
      }
      setLoading(false);
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-3 bg-gray-800/30 rounded-xl border border-gray-700/50 animate-pulse">
            <div className="h-6 bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    { label: "Fänge", value: stats.totalCatches, icon: Fish, color: "text-emerald-400" },
    { label: "Spots", value: stats.totalSpots, icon: MapPin, color: "text-blue-400" },
    { label: "Diese Woche", value: stats.thisWeek, icon: Calendar, color: "text-purple-400" },
    { label: "Punkte", value: stats.points, icon: TrendingUp, color: "text-amber-400" }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statCards.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div key={idx} className="p-3 bg-gray-800/30 rounded-xl border border-gray-700/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">{stat.label}</span>
              <Icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
          </div>
        );
      })}
    </div>
  );
}