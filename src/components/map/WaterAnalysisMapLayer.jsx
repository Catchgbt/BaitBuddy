import React, { useEffect, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { base44 } from "@/api/base44Client";
import { Droplets, TrendingUp } from "lucide-react";

// Custom Icon für Wasser-Analyse Spots
const waterAnalysisIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function WaterAnalysisMapLayer({ onAnalysisClick }) {
  const [analyses, setAnalyses] = useState([]);

  useEffect(() => {
    loadRecentAnalyses();
  }, []);

  const loadRecentAnalyses = async () => {
    try {
      // Lade die letzten 20 Analysen
      const history = await base44.entities.WaterAnalysisHistory.list('-analyzed_at', 20);
      setAnalyses(history);
    } catch (error) {
      console.error("Failed to load water analyses:", error);
    }
  };

  const getQualityColor = (score) => {
    if (score >= 80) return "#10b981"; // green
    if (score >= 60) return "#f59e0b"; // orange
    return "#ef4444"; // red
  };

  return (
    <>
      {analyses.map((analysis) => (
        <Marker
          key={analysis.id}
          position={[analysis.latitude, analysis.longitude]}
          icon={waterAnalysisIcon}
          eventHandlers={{
            click: () => onAnalysisClick && onAnalysisClick(analysis)
          }}
        >
          <Popup>
            <div className="text-sm min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="w-4 h-4 text-violet-400" />
                <strong>Gewässeranalyse</strong>
              </div>
              
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Qualität:</span>
                  <span 
                    className="font-semibold"
                    style={{ color: getQualityColor(analysis.quality_score) }}
                  >
                    {analysis.quality_score}/100
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Temperatur:</span>
                  <span className="font-semibold">{analysis.temperature.toFixed(1)}°C</span>
                </div>
                
                {analysis.chlorophyll_a && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Chlorophyll:</span>
                    <span className="font-semibold">{analysis.chlorophyll_a.toFixed(1)} mg/m³</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Wetter:</span>
                  <span className="font-semibold">{analysis.weather_condition}</span>
                </div>
                
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="text-gray-500">
                    {new Date(analysis.analyzed_at).toLocaleString('de-DE')}
                  </div>
                </div>
                
                {analysis.fishing_forecast && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-blue-700">
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    {analysis.fishing_forecast.split('|')[0].trim()}
                  </div>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}