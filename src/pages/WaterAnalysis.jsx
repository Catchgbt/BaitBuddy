import React, { useState, useEffect } from "react";
import { auth } from "@/api/auth";
import PremiumGuard from "@/components/premium/PremiumGuard";
import WaterAnalysisPanel from "@/components/water/WaterAnalysisPanel";
import WaterRadarChart from "@/components/water/WaterRadarChart";
import ExportPanel from "@/components/water/ExportPanel";
import SpotComparison from "@/components/water/SpotComparison";
import WaterAnalysisTutorial from "@/components/water/WaterAnalysisTutorial";
import { Loader2, Waves } from "lucide-react";
import { useRef } from "react";
import { useFeatureTracking } from "@/hooks/useFeatureTracking";

export default function WaterAnalysisPage() {
  useFeatureTracking("water_analysis");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [waterData, setWaterData] = useState(null);
  const waterDataRef = useRef(null);

  useEffect(() => {
    loadUser();
    
    // Event Listener für neue Wasserdaten
    const handleWaterDataUpdate = (event) => {
      if (event.detail) {
        setWaterData(event.detail);
      }
    };

    window.addEventListener('water-data-updated', handleWaterDataUpdate);

    return () => {
      window.removeEventListener('water-data-updated', handleWaterDataUpdate);
    };
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error("User loading error:", error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <PremiumGuard 
      user={user} 
      requiredPlan="basic"
      feature="Gewässeranalyse"
    >
      <div className="min-h-screen bg-gray-950 p-4 pb-32">
        <div className="max-w-7xl mx-auto">
          {/* Header.
              Hiess frueher "Satelliten-Gewaesseranalyse" und nannte Sentinel-2,
              MODIS und Copernicus als Quellen — angezeigt wurden aber
              ausschliesslich per Math.random() erzeugte Werte. Titel und
              Quellenangabe benennen jetzt das, was tatsaechlich abgefragt
              wird. */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Waves className="w-10 h-10 text-cyan-400" />
              <h1 className="text-4xl font-bold text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]">
                Gewässeranalyse
              </h1>
            </div>
            <p className="text-gray-400 text-sm">
              Gemessene Wetter- und Wasserwerte für deinen Standort
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
              <div className="inline-block px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30">
                <span className="text-blue-400 text-xs font-semibold">
                  Open-Meteo Forecast &amp; Marine
                </span>
              </div>
            </div>
          </div>

          {/* Tutorial Section */}
          <div className="mb-8">
            <WaterAnalysisTutorial />
          </div>

          <div 
            ref={waterDataRef}
            role="region"
            aria-live="polite"
            aria-label="Wasserdaten-Analyseergebnisse"
            className="sr-only"
          />

          {/* Main Analysis Panel */}
          <div className="mb-8">
            <WaterAnalysisPanel onDataUpdate={(data) => {
              setWaterData(data);
              if (waterDataRef?.current) {
                waterDataRef.current.textContent = `Wasserdaten aktualisiert: Temperatur, Chlorophyll und Wellenhöhe analysiert.`;
              }
              window.dispatchEvent(new CustomEvent('water-data-updated', { detail: data }));
            }} />
          </div>

          {/* Advanced Features Grid */}
          {waterData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Radar Chart */}
              <div className="lg:col-span-2">
                <WaterRadarChart parameters={waterData.parameters} />
              </div>

              {/* Spot Comparison */}
              <div className="lg:col-span-2">
                <SpotComparison />
              </div>

              {/* Export Panel */}
              <div className="lg:col-span-2">
                <ExportPanel waterData={waterData} />
              </div>

            </div>
          )}

          {/* Info Footer */}
          <div className="mt-12 p-6 rounded-xl bg-gray-800/50 border border-gray-700">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Waves className="w-5 h-5 text-cyan-400" />
              Datenquellen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-cyan-400 font-semibold mb-1">Open-Meteo Forecast</p>
                <p className="text-gray-400">Luft- und Bodentemperatur, Luftdruck, Wind, Feuchte</p>
              </div>
              <div>
                <p className="text-emerald-400 font-semibold mb-1">Open-Meteo Marine</p>
                <p className="text-gray-400">Wasseroberflächen-Temperatur und Wellenhöhe an Küsten</p>
              </div>
              <div>
                <p className="text-blue-400 font-semibold mb-1">Bewertung</p>
                <p className="text-gray-400">Regelbasiert aus den Messwerten, Herleitung wird angezeigt</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </PremiumGuard>
  );
}