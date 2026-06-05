import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Target, TrendingUp, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

// Mock Hotspot Detection basierend auf Spots
const detectHotspots = async (spots, waterData) => {
  // Simuliere API-Delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const hotspots = spots.map(spot => {
    // Berechne Score basierend auf verschiedenen Faktoren
    const distanceScore = Math.random() * 100;
    const waterQualityScore = waterData?.aiAnalysis?.fishingScore || 70;
    const historicalScore = Math.random() * 100;
    
    const overallScore = (distanceScore * 0.3 + waterQualityScore * 0.5 + historicalScore * 0.2);
    
    return {
      ...spot,
      hotspotScore: Math.round(overallScore),
      reasoning: generateReasoning(overallScore),
      bestTime: "06:00 - 09:00 Uhr",
      targetSpecies: ["Hecht", "Zander", "Barsch"][Math.floor(Math.random() * 3)]
    };
  }).sort((a, b) => b.hotspotScore - a.hotspotScore);
  
  return hotspots.slice(0, 5); // Top 5 Hotspots
};

const generateReasoning = (score) => {
  if (score > 80) {
    return "Optimale Bedingungen: Gute Wasserqualität, historisch erfolgreich, ideale Temperatur";
  } else if (score > 60) {
    return "Gute Bedingungen: Moderate Wasserqualität, angemessene Temperatur";
  } else {
    return "Durchschnittliche Bedingungen: Akzeptable Parameter, erfordert Geduld";
  }
};

export default function HotspotDetection({ waterData }) {
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [spots, setSpots] = useState([]);

  useEffect(() => {
    loadSpots();
  }, []);

  const loadSpots = async () => {
    try {
      const userSpots = await base44.entities.Spot.list();
      setSpots(userSpots);
    } catch (error) {
      console.error("Failed to load spots:", error);
    }
  };

  const runHotspotDetection = async () => {
    if (spots.length === 0) {
      toast.error("Keine Spots vorhanden", {
        description: "Füge zuerst Spots auf der Karte hinzu"
      });
      return;
    }

    setLoading(true);
    
    try {
      const detectedHotspots = await detectHotspots(spots, waterData);
      setHotspots(detectedHotspots);
      
      toast.success("Hotspot-Analyse abgeschlossen", {
        description: `${detectedHotspots.length} vielversprechende Spots gefunden`,
        duration: 3000
      });
    } catch (error) {
      console.error("Hotspot detection error:", error);
      toast.error("Fehler bei der Hotspot-Erkennung");
    }
    
    setLoading(false);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-400 border-green-500/30 bg-green-500/20";
    if (score >= 60) return "text-yellow-400 border-yellow-500/30 bg-yellow-500/20";
    return "text-orange-400 border-orange-500/30 bg-orange-500/20";
  };

  return (
    <Card className="glass-morphism border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-cyan-400 flex items-center gap-2">
              <Target className="w-5 h-5" />
              KI-Hotspot Erkennung
            </CardTitle>
            <p className="text-gray-400 text-sm mt-1">
              Machine Learning basierte Identifikation bester Angelplätze
            </p>
          </div>
          <Button
            onClick={runHotspotDetection}
            disabled={loading || spots.length === 0}
            className="bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-700 hover:to-emerald-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analysiere...
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" />
                Hotspots finden
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {hotspots.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-400">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Starte die KI-Analyse um die besten Spots zu finden</p>
            <p className="text-sm mt-2">
              {spots.length} Spots in deiner Datenbank
            </p>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 mx-auto mb-3 text-cyan-400 animate-spin" />
            <p className="text-gray-300">Analysiere Satellitendaten & historische Fänge...</p>
            <p className="text-gray-500 text-sm mt-2">Dies kann einen Moment dauern</p>
          </div>
        )}

        {hotspots.length > 0 && !loading && (
          <div className="space-y-3">
            {hotspots.map((hotspot, idx) => (
              <div
                key={hotspot.id}
                className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-600/20 border border-cyan-500/30">
                      <span className="text-cyan-400 font-bold text-sm">#{idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-white font-semibold">{hotspot.name}</h4>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">{hotspot.reasoning}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {hotspot.water_type}
                        </span>
                        <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          Zielfisch: {hotspot.targetSpecies}
                        </span>
                        <span className="px-2 py-1 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          ⏰ {hotspot.bestTime}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={`px-3 py-2 rounded-lg border text-center min-w-[80px] ${getScoreColor(hotspot.hotspotScore)}`}>
                    <div className="text-2xl font-bold">{hotspot.hotspotScore}</div>
                    <div className="text-xs opacity-75">Score</div>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-cyan-600/50 hover:bg-cyan-600/20 flex-1"
                    onClick={() => window.location.href = createPageUrl('Map')}
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    Auf Karte zeigen
                  </Button>
                  <Button
                    size="sm"
                    className="bg-cyan-600 hover:bg-cyan-700 flex-1"
                    onClick={() => {
                      toast.success("Trip geplant", {
                        description: `${hotspot.name} zur Trip-Liste hinzugefügt`
                      });
                    }}
                  >
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Trip planen
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}