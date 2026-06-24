import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Droplets, ThermometerSun, Wind, Fish, Target } from "lucide-react";

const getQualityColor = (quality) => {
  const colors = {
    gut: "text-green-400",
    optimal: "text-emerald-400",
    mittel: "text-yellow-400",
    suboptimal: "text-orange-400",
    schlecht: "text-red-400",
    niedrig: "text-green-400",
    hoch: "text-red-400",
    neutral: "text-blue-400"
  };
  return colors[quality] || "text-gray-400";
};

const getQualityBg = (quality) => {
  const colors = {
    gut: "bg-green-500/20 border-green-500/30",
    optimal: "bg-emerald-500/20 border-emerald-500/30",
    mittel: "bg-yellow-500/20 border-yellow-500/30",
    suboptimal: "bg-orange-500/20 border-orange-500/30",
    schlecht: "bg-red-500/20 border-red-500/30",
    niedrig: "bg-green-500/20 border-green-500/30",
    hoch: "bg-red-500/20 border-red-500/30",
    neutral: "bg-blue-500/20 border-blue-500/30"
  };
  return colors[quality] || "bg-gray-500/20 border-gray-500/30";
};

export default function WaterDataDisplay({ data }) {
  const { parameters, aiAnalysis, timestamp } = data;

  return (
    <div className="space-y-6">
      {/* AI Fishing Score - Prominent */}
      <Card className="glass-morphism border-cyan-600/50 bg-gradient-to-br from-cyan-600/10 to-emerald-600/10">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mb-4">
              <Fish className="w-16 h-16 mx-auto text-cyan-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Fang-Prognose Score</h3>
            <div className="text-6xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 text-transparent bg-clip-text mb-4">
              {aiAnalysis.fishingScore}<span className="text-3xl">/100</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mt-6">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-400 text-sm mb-1">Beste Zeit</p>
                <p className="text-white font-semibold">{aiAnalysis.bestTimeToFish}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-400 text-sm mb-1">Hotspot-Wahrscheinlichkeit</p>
                <p className="text-white font-semibold">{aiAnalysis.hotspotProbability}%</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-400 text-sm mb-1">Empfohlener Köder</p>
                <p className="text-white font-semibold">{aiAnalysis.recommendedBait.join(", ")}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-400 text-sm mb-1">Mondphase</p>
                <p className="text-white font-semibold">{aiAnalysis.moonPhaseImpact}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Water Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Chlorophyll */}
        <Card className="glass-morphism border-gray-800">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-gray-300">{parameters.chlorophyll.description}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">
              {parameters.chlorophyll.value.toFixed(1)}
              <span className="text-sm text-gray-400 ml-2">{parameters.chlorophyll.unit}</span>
            </div>
            <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border ${getQualityBg(parameters.chlorophyll.quality)}`}>
              <span className={getQualityColor(parameters.chlorophyll.quality)}>
                {parameters.chlorophyll.quality.toUpperCase()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Temperature */}
        <Card className="glass-morphism border-gray-800">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ThermometerSun className="w-4 h-4 text-orange-400" />
              <span className="text-gray-300">{parameters.temperature.description}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">
              {parameters.temperature.value.toFixed(1)}
              <span className="text-sm text-gray-400 ml-2">{parameters.temperature.unit}</span>
            </div>
            <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border ${getQualityBg(parameters.temperature.quality)}`}>
              <span className={getQualityColor(parameters.temperature.quality)}>
                {parameters.temperature.quality.toUpperCase()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Turbidity */}
        <Card className="glass-morphism border-gray-800">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Wind className="w-4 h-4 text-blue-400" />
              <span className="text-gray-300">{parameters.turbidity.description}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">
              {parameters.turbidity.value.toFixed(0)}
              <span className="text-sm text-gray-400 ml-2">{parameters.turbidity.unit}</span>
            </div>
            <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border ${getQualityBg(parameters.turbidity.quality)}`}>
              <span className={getQualityColor(parameters.turbidity.quality)}>
                {parameters.turbidity.quality.toUpperCase()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Oxygen */}
        <Card className="glass-morphism border-gray-800">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Droplets className="w-4 h-4 text-cyan-400" />
              <span className="text-gray-300">{parameters.oxygen.description}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">
              {parameters.oxygen.value.toFixed(1)}
              <span className="text-sm text-gray-400 ml-2">{parameters.oxygen.unit}</span>
            </div>
            <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border ${getQualityBg(parameters.oxygen.quality)}`}>
              <span className={getQualityColor(parameters.oxygen.quality)}>
                {parameters.oxygen.quality.toUpperCase()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* pH */}
        <Card className="glass-morphism border-gray-800">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              <span className="text-gray-300">{parameters.ph.description}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">
              {parameters.ph.value.toFixed(1)}
              <span className="text-sm text-gray-400 ml-2">{parameters.ph.unit}</span>
            </div>
            <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border ${getQualityBg(parameters.ph.quality)}`}>
              <span className={getQualityColor(parameters.ph.quality)}>
                {parameters.ph.quality.toUpperCase()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Cyanobacteria */}
        <Card className="glass-morphism border-gray-800">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-red-400" />
              <span className="text-gray-300">{parameters.cyanobacteria.description}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">
              {parameters.cyanobacteria.value.toFixed(1)}
              <span className="text-sm text-gray-400 ml-2">{parameters.cyanobacteria.unit}</span>
            </div>
            <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border ${getQualityBg(parameters.cyanobacteria.quality)}`}>
              <span className={getQualityColor(parameters.cyanobacteria.quality)}>
                {parameters.cyanobacteria.quality.toUpperCase()}
              </span>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Timestamp */}
      <div className="text-center text-xs text-gray-500">
        Letztes Update: {new Date(timestamp).toLocaleString('de-DE')}
      </div>
    </div>
  );
}