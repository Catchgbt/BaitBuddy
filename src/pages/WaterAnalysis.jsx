import React, { useState, useEffect } from "react";
import { auth } from "@/api/auth";
import PremiumGuard from "@/components/premium/PremiumGuard";
import WaterAnalysisPanel from "@/components/water/WaterAnalysisPanel";
import WaterRadarChart from "@/components/water/WaterRadarChart";
import HotspotDetection from "@/components/water/HotspotDetection";
import ExportPanel from "@/components/water/ExportPanel";
import SpotComparison from "@/components/water/SpotComparison";
import WaterAnalysisTutorial from "@/components/water/WaterAnalysisTutorial";
import { Loader2, Satellite, Info, TrendingUp, Lightbulb, Zap, AlertCircle } from "lucide-react";
import { useRef } from "react";
import { useFeatureTracking } from "@/hooks/useFeatureTracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      feature="Satelliten-Gewässeranalyse"
    >
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-950 to-gray-900 p-4 pb-32">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Satellite className="w-12 h-12 text-cyan-400 animate-pulse" />
              <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Satelliten-Gewässeranalyse
              </h1>
            </div>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Verstehe dein Gewässer mit modernen Satellitendaten. Echte Informationen für bessere Fänge.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <div className="inline-block px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30">
                <span className="text-amber-400 text-xs font-semibold">BETA - Demo-Modus</span>
              </div>
              <div className="inline-block px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30">
                <span className="text-blue-400 text-xs font-semibold">Sentinel-2 · MODIS · Copernicus</span>
              </div>
            </div>
          </div>

          {/* Anfänger-Info Sektion */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-cyan-900/20 to-cyan-900/10 border-cyan-500/20 hover:border-cyan-500/40 transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-cyan-400">
                  <Info className="w-5 h-5" /> Was ist das?
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-300 space-y-2">
                <p>Diese Seite nutzt echte Satellitendaten von Weltraum-Sensoren, um die Wasserqualität zu analysieren.</p>
                <p className="text-xs text-gray-400">Deine Daten werden live von europäischen Satelliten erfasst.</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-900/20 to-emerald-900/10 border-emerald-500/20 hover:border-emerald-500/40 transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-emerald-400">
                  <Zap className="w-5 h-5" /> Wie funktioniert es?
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-300 space-y-2">
                <p>1. Du gibst deinen Standort ein</p>
                <p>2. Wir holen Daten von Satelliten</p>
                <p>3. KI-Analyse zeigt, was die Fische wollen</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-900/20 to-amber-900/10 border-amber-500/20 hover:border-amber-500/40 transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-amber-400">
                  <Lightbulb className="w-5 h-5" /> Wofür nutze ich das?
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-300 space-y-2">
                <p>Finde die beste Zeit und den besten Spot zum Angeln anhand echter Daten.</p>
                <p className="text-xs text-gray-400">Bessere Entscheidungen = mehr Fänge!</p>
              </CardContent>
            </Card>
          </div>

          {/* Tutorial Section */}
          <div className="mb-4">
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

              {/* Hotspot Detection */}
              <div className="lg:col-span-2">
                <HotspotDetection waterData={waterData} />
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

          {/* Daten-Erklärung für Anfänger */}
          <Card className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 border-cyan-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyan-400">
                <TrendingUp className="w-5 h-5" /> So funktionieren die Daten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Parameter Erklärungen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-cyan-900/20 rounded-lg border border-cyan-500/20">
                  <h4 className="text-cyan-400 font-bold mb-2">Wassertemperatur</h4>
                  <p className="text-gray-300 text-sm mb-2">Wie warm das Wasser ist</p>
                  <p className="text-xs text-gray-400">Fische sind aktiver bei 15-22°C. Zu kalt oder zu warm = weniger Beißerei</p>
                </div>

                <div className="p-4 bg-emerald-900/20 rounded-lg border border-emerald-500/20">
                  <h4 className="text-emerald-400 font-bold mb-2">Chlorophyll (Algen)</h4>
                  <p className="text-gray-300 text-sm mb-2">Wie viel Algen im Wasser sind</p>
                  <p className="text-xs text-gray-400">Zu viel Algen = schlechte Sicht, Fische verstecken sich. Ideal: gering bis mittel</p>
                </div>

                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
                  <h4 className="text-blue-400 font-bold mb-2">Trübung</h4>
                  <p className="text-gray-300 text-sm mb-2">Wie klar das Wasser ist</p>
                  <p className="text-xs text-gray-400">Klares Wasser = bessere Sicht für die Fische. Leicht trübes Wasser = gute Jagdbedingungen</p>
                </div>

                <div className="p-4 bg-amber-900/20 rounded-lg border border-amber-500/20">
                  <h4 className="text-amber-400 font-bold mb-2">Sauerstoffgehalt</h4>
                  <p className="text-gray-300 text-sm mb-2">Wie viel Sauerstoff im Wasser ist</p>
                  <p className="text-xs text-gray-400">Fische brauchen Sauerstoff. Unter 5 mg/L: Fische sind träge. 6-12 mg/L: perfekt!</p>
                </div>

                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
                  <h4 className="text-purple-400 font-bold mb-2">Luftdruck</h4>
                  <p className="text-gray-300 text-sm mb-2">Der Druck in der Atmosphäre</p>
                  <p className="text-xs text-gray-400">Fallender Druck = Fische sind aktiver. Stabiler oder steigender Druck = ruhiger</p>
                </div>

                <div className="p-4 bg-pink-900/20 rounded-lg border border-pink-500/20">
                  <h4 className="text-pink-400 font-bold mb-2">pH-Wert</h4>
                  <p className="text-gray-300 text-sm mb-2">Säure oder Basen im Wasser</p>
                  <p className="text-xs text-gray-400">Ideal ist neutral (pH 7). Zu sauer oder zu basisch = Fische sind gestresst</p>
                </div>
              </div>

              {/* Tipps für Anfänger */}
              <div className="p-4 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-lg border border-cyan-500/30">
                <h4 className="text-cyan-400 font-bold mb-3 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" /> Tipps für Anfänger
                </h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex gap-2"><span className="text-cyan-400">✓</span> Schau dir die Parameter an - nicht einzeln, sondern zusammen!</li>
                  <li className="flex gap-2"><span className="text-cyan-400">✓</span> Der KI-Score zeigt dir die Gesamtsituation: 80+ = sehr gut, 60+ = gut</li>
                  <li className="flex gap-2"><span className="text-cyan-400">✓</span> Vergleiche mehrere Spots mit der "Spot Comparison" Funktion</li>
                  <li className="flex gap-2"><span className="text-cyan-400">✓</span> Schau in den "Hotspot Detection" für die beste Stelle</li>
                  <li className="flex gap-2"><span className="text-cyan-400">✓</span> Nutze die 7-Tage Vorhersage um zu planen, wann es am besten ist</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Satelliten-Datenquellen Info */}
          <Card className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 border-gray-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyan-400">
                <Satellite className="w-5 h-5" /> Woher kommen die Daten?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">Wir nutzen echte europäische Satelliten, die 24/7 über Deutschland fliegen:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-cyan-900/10 rounded-lg border border-cyan-500/20">
                  <p className="text-cyan-400 font-bold mb-2">Sentinel-2/3</p>
                  <p className="text-gray-400 text-sm">Farb-Kameras der ESA, die Algen und Temperatur erkennen. Sehr präzise!</p>
                </div>
                <div className="p-4 bg-blue-900/10 rounded-lg border border-blue-500/20">
                  <p className="text-blue-400 font-bold mb-2">MODIS Aqua/Terra</p>
                  <p className="text-gray-400 text-sm">NASA-Satelliten, die täglich über dein Gewässer fliegen. Wärme-Sensoren</p>
                </div>
                <div className="p-4 bg-emerald-900/10 rounded-lg border border-emerald-500/20">
                  <p className="text-emerald-400 font-bold mb-2">Copernicus Marine</p>
                  <p className="text-gray-400 text-sm">Europäisches Meeres-Überwachungsprogramm. Für größere Gewässer</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </PremiumGuard>
  );
}