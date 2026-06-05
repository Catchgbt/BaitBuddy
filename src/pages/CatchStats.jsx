import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import PlanGuard from "@/components/premium/PlanGuard";

const COLORS = [
  "#22d3ee", "#10b981", "#f59e0b", "#a78bfa", "#f87171",
  "#34d399", "#fb923c", "#60a5fa", "#e879f9", "#4ade80"
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white shadow-xl">
      <p className="font-semibold text-cyan-400">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

function CatchStatsContent() {
  const { data: catches = [], isLoading } = useQuery({
    queryKey: ["catches"],
    queryFn: () => base44.entities.Catch.list("-catch_time"),
  });

  const stats = useMemo(() => {
    if (!catches.length) return null;

    // Faenge pro Fischart
    const bySpecies = {};
    catches.forEach((c) => {
      const s = c.species || "Unbekannt";
      if (!bySpecies[s]) bySpecies[s] = { count: 0, totalWeight: 0, maxWeight: 0, catches: [] };
      bySpecies[s].count++;
      if (c.weight_kg) {
        bySpecies[s].totalWeight += c.weight_kg;
        if (c.weight_kg > bySpecies[s].maxWeight) bySpecies[s].maxWeight = c.weight_kg;
      }
      bySpecies[s].catches.push(c);
    });

    const speciesCountData = Object.entries(bySpecies)
      .map(([name, d]) => ({ name, count: d.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const speciesWeightData = Object.entries(bySpecies)
      .filter(([, d]) => d.totalWeight > 0)
      .map(([name, d]) => ({
        name,
        gesamtgewicht: parseFloat(d.totalWeight.toFixed(2)),
        maxGewicht: parseFloat(d.maxWeight.toFixed(2)),
      }))
      .sort((a, b) => b.gesamtgewicht - a.gesamtgewicht)
      .slice(0, 10);

    // Faenge pro Monat
    const byMonth = {};
    catches.forEach((c) => {
      if (!c.catch_time) return;
      const d = new Date(c.catch_time);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth[key] = (byMonth[key] || 0) + 1;
    });
    const monthlyData = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, count]) => ({ month, count }));

    // Koeder-Auswertung
    const byBait = {};
    catches.forEach((c) => {
      if (!c.bait_used) return;
      byBait[c.bait_used] = (byBait[c.bait_used] || 0) + 1;
    });
    const baitData = Object.entries(byBait)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Kennzahlen
    const withWeight = catches.filter((c) => c.weight_kg);
    const totalWeight = withWeight.reduce((s, c) => s + c.weight_kg, 0);
    const maxCatch = catches.reduce((best, c) => (!best || (c.weight_kg || 0) > (best.weight_kg || 0) ? c : best), null);

    return { speciesCountData, speciesWeightData, monthlyData, baitData, totalWeight, maxCatch, withWeight };
  }, [catches]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!catches.length) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center text-gray-400 mt-20">
        <p className="text-xl font-semibold text-white mb-2">Noch keine Faenge erfasst</p>
        <p>Trage deinen ersten Fang im Fangbuch ein, um hier Statistiken zu sehen.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 pb-safe-fixed">
      <h1 className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">
        Fang-Statistiken
      </h1>

      {/* Kennzahlen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Faenge gesamt", value: catches.length },
          { label: "Arten", value: stats?.speciesCountData.length },
          {
            label: "Gesamtgewicht",
            value: stats?.totalWeight ? `${stats.totalWeight.toFixed(1)} kg` : "—",
          },
          {
            label: "Groesster Fang",
            value: stats?.maxCatch?.weight_kg
              ? `${stats.maxCatch.weight_kg} kg (${stats.maxCatch.species})`
              : stats?.maxCatch?.species || "—",
          },
        ].map((item) => (
          <Card key={item.label} className="glass-morphism border-gray-800 rounded-xl">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">{item.label}</p>
              <p className="text-lg font-bold text-white leading-tight">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Faenge nach Art */}
      <Card className="glass-morphism border-gray-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white text-base">Faenge nach Fischart</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats?.speciesCountData} margin={{ top: 4, right: 8, left: -10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Anzahl" radius={[4, 4, 0, 0]}>
                {stats?.speciesCountData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gewicht nach Art */}
      {stats?.speciesWeightData.length > 0 && (
        <Card className="glass-morphism border-gray-800 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white text-base">Gewicht nach Fischart (kg)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.speciesWeightData} margin={{ top: 4, right: 8, left: -10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="gesamtgewicht" name="Gesamtgewicht (kg)" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                <Bar dataKey="maxGewicht" name="Max. Einzelfang (kg)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Monatliche Aktivitaet */}
      {stats?.monthlyData.length > 1 && (
        <Card className="glass-morphism border-gray-800 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white text-base">Monatliche Aktivitaet</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.monthlyData} margin={{ top: 4, right: 8, left: -10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Faenge" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Koeder-Verteilung */}
      {stats?.baitData.length > 0 && (
        <Card className="glass-morphism border-gray-800 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white text-base">Koeder-Verteilung</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats.baitData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: "#6b7280" }}
                >
                  {stats.baitData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CatchStats() {
  return (
    <div className="min-h-screen bg-gray-950 p-4 sm:p-6">
      <PlanGuard requiredPlan="pro" featureName="Detaillierte Fang-Statistiken">
        <CatchStatsContent />
      </PlanGuard>
    </div>
  );
}