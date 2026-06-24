import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell
} from "recharts";
import { TrendingUp, AlertCircle, CheckCircle2, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MobileSelect } from "@/components/ui/mobile-select";

export default function PrognosePanel({
  prognosis,
  waterTemp,
  onWaterTempChange,
  season,
  onSeasonChange,
  waterType,
  onWaterTypeChange,
  loading = false
}) {
  if (!prognosis || loading) {
    return (
      <Card className="glass-morphism border-gray-800">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            KI-Prognose
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-400 text-sm">
            Füge Zutaten hinzu, um die Prognose zu sehen...
          </div>
        </CardContent>
      </Card>
    );
  }

  const successRate = prognosis.successRate;
  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-cyan-400";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreBg = (score) => {
    if (score >= 80) return "from-green-900/30 to-green-900/10";
    if (score >= 60) return "from-cyan-900/30 to-cyan-900/10";
    if (score >= 40) return "from-yellow-900/30 to-yellow-900/10";
    return "from-red-900/30 to-red-900/10";
  };

  // Daten für Radar-Chart
  const radarData = prognosis.factors.map(f => ({
    name: f.name,
    value: f.score,
    emoji: f.emoji
  }));

  // Daten für Score-Breakdown
  const scoreData = [
    { name: "Basis", value: prognosis.baseScore, fill: "#06B6D4" },
    { name: "Jahreszeit", value: prognosis.seasonModifier * 100, fill: "#F59E0B" },
    { name: "Temperatur", value: prognosis.temperatureModifier * 100, fill: "#3B82F6" },
    { name: "Gewässer", value: prognosis.waterTypeModifier * 100, fill: "#10B981" },
    { name: "Diversität", value: prognosis.diversityBonus * 100, fill: "#A78BFA" }
  ];

  return (
    <div className="space-y-6">
      {/* Großer Success-Rate Display */}
      <Card className={`glass-morphism border-gray-800 bg-gradient-to-br ${getScoreBg(successRate)}`}>
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              KI-Erfolgsprognose
            </div>
            {successRate >= 80 && <CheckCircle2 className="w-5 h-5 text-green-400" />}
            {successRate < 60 && <AlertCircle className="w-5 h-5 text-yellow-400" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Anzeige */}
          <div className="text-center">
            <div className={`text-6xl font-bold ${getScoreColor(successRate)} drop-shadow-lg`}>
              {successRate}%
            </div>
            <div className="text-gray-400 text-sm mt-2">Erfolgswahrscheinlichkeit</div>
            <div className="text-gray-500 text-xs mt-4">
              Score: {prognosis.finalScore} / 100
            </div>
          </div>

          {/* Empfehlung */}
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="text-cyan-400 font-semibold text-sm mb-2">
              {prognosis.recommendation}
            </div>
            <div className="text-gray-300 text-xs leading-relaxed">
              {prognosis.explanation}
            </div>
          </div>

          {/* Eingabefelder für Parameter */}
          <div className="space-y-3 border-t border-gray-700 pt-4">
            <div>
              <label className="text-xs text-gray-400 block mb-2">
                Wassertemperatur (°C)
              </label>
              <Input
                type="number"
                min="0"
                max="30"
                value={waterTemp}
                onChange={(e) => onWaterTempChange(parseInt(e.target.value) || 15)}
                className="bg-gray-800/50 border-gray-700 h-9 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-2">
                Jahreszeit
              </label>
              <MobileSelect
                value={season}
                onValueChange={onSeasonChange}
                options={[
                  { value: "summer", label: "Sommer" },
                  { value: "winter", label: "Winter" },
                  { value: "allround", label: "Ganzjahres" }
                ]}
                placeholder="Jahreszeit wählen"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-2">
                Gewässer-Typ
              </label>
              <MobileSelect
                value={waterType}
                onValueChange={onWaterTypeChange}
                options={[
                  { value: "lake", label: "See" },
                  { value: "river", label: "Fluss" },
                  { value: "canal", label: "Kanal" },
                  { value: "pond", label: "Weiher" }
                ]}
                placeholder="Gewässer-Typ wählen"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Radar-Chart für Faktoren */}
      <Card className="glass-morphism border-gray-800">
        <CardHeader>
          <CardTitle className="text-cyan-400 text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Einflussfaktoren
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis
                dataKey="name"
                tick={{ fill: "#9CA3AF", fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: "#9CA3AF", fontSize: 10 }}
              />
              <Radar
                name="Einfluss (%)"
                dataKey="value"
                stroke="#06B6D4"
                fill="#06B6D4"
                fillOpacity={0.6}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#f3f4f6"
                }}
                formatter={(value) => `${Math.round(value)}%`}
              />
              <Legend wrapperStyle={{ color: "#9CA3AF", fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>

          {/* Faktor-Details */}
          <div className="mt-6 space-y-2">
            {prognosis.factors.map((factor, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-gray-800/30 rounded"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{factor.emoji}</span>
                  <div>
                    <div className="text-xs text-gray-300 font-medium">
                      {factor.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {factor.description}
                    </div>
                  </div>
                </div>
                <div className={`font-mono font-semibold ${getScoreColor(factor.score)}`}>
                  {factor.score}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Score-Breakdown Bar Chart */}
      <Card className="glass-morphism border-gray-800">
        <CardHeader>
          <CardTitle className="text-cyan-400 text-sm">
            Modifier-Übersicht
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9CA3AF" }} domain={[0, 120]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#f3f4f6"
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {scoreData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="text-xs text-gray-400 text-center mt-2">
            Wie stark beeinflussen die einzelnen Faktoren den finalen Score?
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
