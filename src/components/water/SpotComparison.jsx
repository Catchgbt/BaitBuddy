import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function SpotComparison() {
  const [spots, setSpots] = useState([]);
  const [spot1, setSpot1] = useState(null);
  const [spot2, setSpot2] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSpots();
  }, []);

  const loadSpots = async () => {
    try {
      const allSpots = await base44.entities.Spot.list();
      setSpots(allSpots);
    } catch (error) {
      console.error("Failed to load spots:", error);
    }
  };

  const loadAnalyses = async () => {
    if (!spot1 || !spot2) return;

    setLoading(true);
    try {
      const [analysis1, analysis2] = await Promise.all([
        base44.entities.WaterAnalysisHistory.filter({ spot_id: spot1 }, '-analyzed_at', 1),
        base44.entities.WaterAnalysisHistory.filter({ spot_id: spot2 }, '-analyzed_at', 1)
      ]);

      setAnalyses([
        analysis1[0] || null,
        analysis2[0] || null
      ]);
    } catch (error) {
      console.error("Failed to load analyses:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (spot1 && spot2) {
      loadAnalyses();
    }
  }, [spot1, spot2]);

  const getComparisonData = () => {
    if (!analyses[0] || !analyses[1]) return [];

    return [
      {
        parameter: "Temperatur",
        spot1: analyses[0].temperature || 0,
        spot2: analyses[1].temperature || 0,
        unit: "°C"
      },
      {
        parameter: "Chlorophyll",
        spot1: analyses[0].chlorophyll_a || 0,
        spot2: analyses[1].chlorophyll_a || 0,
        unit: "mg/m³"
      },
      {
        parameter: "Trübung",
        spot1: analyses[0].turbidity_ntu || 0,
        spot2: analyses[1].turbidity_ntu || 0,
        unit: "NTU"
      },
      {
        parameter: "Qualität",
        spot1: analyses[0].quality_score || 0,
        spot2: analyses[1].quality_score || 0,
        unit: "%"
      },
      {
        parameter: "Sichtweite",
        spot1: analyses[0].visibility || 0,
        spot2: analyses[1].visibility || 0,
        unit: "m"
      }
    ];
  };

  const getWinner = (param) => {
    const data = getComparisonData().find(d => d.parameter === param);
    if (!data) return null;

    // Für Trübung ist niedriger besser
    if (param === "Trübung") {
      if (data.spot1 < data.spot2) return "spot1";
      if (data.spot2 < data.spot1) return "spot2";
    } else {
      if (data.spot1 > data.spot2) return "spot1";
      if (data.spot2 > data.spot1) return "spot2";
    }
    return "tie";
  };

  const spot1Data = spots.find(s => s.id === spot1);
  const spot2Data = spots.find(s => s.id === spot2);

  return (
    <Card className="glass-morphism border-gray-800">
      <CardHeader>
        <CardTitle className="text-cyan-400">Spot-Vergleich</CardTitle>
        <p className="text-gray-400 text-sm">Vergleiche Wasserqualität zwischen zwei Spots</p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Spot-Auswahl */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <Select value={spot1} onValueChange={setSpot1}>
            <SelectTrigger className="bg-gray-800 border-gray-700">
              <SelectValue placeholder="Spot 1 wählen" />
            </SelectTrigger>
            <SelectContent>
              {spots.map(spot => (
                <SelectItem key={spot.id} value={spot.id} disabled={spot.id === spot2}>
                  {spot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex justify-center">
            <ArrowRight className="w-6 h-6 text-cyan-400" />
          </div>

          <Select value={spot2} onValueChange={setSpot2}>
            <SelectTrigger className="bg-gray-800 border-gray-700">
              <SelectValue placeholder="Spot 2 wählen" />
            </SelectTrigger>
            <SelectContent>
              {spots.map(spot => (
                <SelectItem key={spot.id} value={spot.id} disabled={spot.id === spot1}>
                  {spot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="text-cyan-400 animate-spin text-2xl mb-2">⟳</div>
            <p className="text-gray-400 text-sm">Lade Analysen...</p>
          </div>
        )}

        {/* Vergleichs-Chart */}
        {!loading && analyses[0] && analyses[1] && (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getComparisonData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="parameter" 
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  formatter={(value, name, props) => [
                    `${value.toFixed(1)} ${props.payload.unit}`,
                    name === 'spot1' ? spot1Data?.name : spot2Data?.name
                  ]}
                />
                <Legend 
                  wrapperStyle={{ color: '#9ca3af' }}
                  formatter={(value) => value === 'spot1' ? spot1Data?.name : spot2Data?.name}
                />
                <Bar dataKey="spot1" fill="#22d3ee" />
                <Bar dataKey="spot2" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>

            {/* Direkter Vergleich */}
            <div className="space-y-3">
              <h4 className="text-white font-semibold text-sm mb-3">Direkter Vergleich:</h4>
              {getComparisonData().map((item, idx) => {
                const winner = getWinner(item.parameter);
                return (
                  <div key={idx} className="grid grid-cols-3 gap-4 items-center text-sm">
                    <div className={`text-right ${winner === 'spot1' ? 'text-cyan-400 font-semibold' : 'text-gray-400'}`}>
                      {item.spot1.toFixed(1)} {item.unit}
                      {winner === 'spot1' && <TrendingUp className="inline ml-1 w-4 h-4" />}
                    </div>
                    <div className="text-center text-gray-500 text-xs">
                      {item.parameter}
                    </div>
                    <div className={`text-left ${winner === 'spot2' ? 'text-emerald-400 font-semibold' : 'text-gray-400'}`}>
                      {item.spot2.toFixed(1)} {item.unit}
                      {winner === 'spot2' && <TrendingUp className="inline mr-1 w-4 h-4" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empfehlung */}
            <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              <h4 className="text-cyan-400 font-semibold text-sm mb-2">KI-Empfehlung:</h4>
              <p className="text-gray-300 text-sm">
                {analyses[0].quality_score > analyses[1].quality_score 
                  ? `${spot1Data?.name} bietet aktuell bessere Bedingungen mit einem Qualitäts-Score von ${analyses[0].quality_score}%.`
                  : `${spot2Data?.name} bietet aktuell bessere Bedingungen mit einem Qualitäts-Score von ${analyses[1].quality_score}%.`
                }
              </p>
            </div>
          </>
        )}

        {!loading && (!spot1 || !spot2) && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Wähle zwei Spots zum Vergleichen
          </div>
        )}

        {!loading && spot1 && spot2 && (!analyses[0] || !analyses[1]) && (
          <div className="text-center py-8">
            <p className="text-amber-400 text-sm mb-2">Keine Analysen verfügbar</p>
            <p className="text-gray-500 text-xs">Führe zuerst eine Wasseranalyse für beide Spots durch</p>
          </div>
        )}

      </CardContent>
    </Card>
  );
}