import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, RefreshCw } from "lucide-react";
import { useLocation } from "@/components/location/LocationManager";
import { api, entities } from "@/api/frontendClient";
import { buildWaterAnalysis } from "@/lib/waterAnalysis";
import WaterDataDisplay from "./WaterDataDisplay";
import WaterCharts from "./WaterCharts";
import { toast } from "sonner";

// Diese Komponente erzeugte ihre Werte vorher komplett per Math.random() und
// gab sie als Satellitenmessung aus. Jetzt kommt jeder angezeigte Wert aus
// POST /api/water-data/fetch (Open-Meteo Forecast + Marine) — die Aufbereitung
// steckt in src/lib/waterAnalysis.js und ist dort einzeln getestet.

export default function WaterAnalysisPanel({ onDataUpdate }) {
  const { currentLocation, requestGpsLocation } = useLocation();
  const [waterData, setWaterData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [selectedTab, setSelectedTab] = useState("current"); // current | history

  const analyzeWater = useCallback(async (location) => {
    const target = location || currentLocation;
    if (!target || typeof target.lat !== "number" || typeof target.lon !== "number") {
      toast.error("Kein Standort verfügbar", {
        description: "Standort freigeben oder auf der Karte einen Spot wählen.",
      });
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const scene = await api.post("/api/water-data/fetch", {
        latitude: target.lat,
        longitude: target.lon,
        quality: "high",
      });

      const analysis = buildWaterAnalysis(scene, target);
      if (Object.keys(analysis.parameters).length === 0) {
        throw new Error("Für diesen Standort liegen keine Messwerte vor");
      }

      setWaterData(analysis);
      onDataUpdate?.(analysis);

      // Verlauf mitschreiben — MiniWaterAnalysis auf der Startseite,
      // WaterAnalysisMapLayer und SpotComparison lesen genau diese Tabelle
      // und blieben bisher dauerhaft leer, weil sie nie befüllt wurde.
      entities.WaterAnalysisHistory.create({
        latitude: analysis.location.lat,
        longitude: analysis.location.lon,
        spot_name: analysis.location.name,
        analysis_data: analysis,
      }).catch(() => { /* Verlauf ist Beiwerk, nicht das Ergebnis */ });

      toast.success("Gewässeranalyse aktualisiert", {
        description: analysis.assessment.score !== null
          ? `Bedingungen: ${analysis.assessment.score}/100`
          : "Messwerte geladen",
        duration: 3000,
      });
    } catch (error) {
      const msg = error?.message || "Analyse fehlgeschlagen";
      setErrorMsg(msg);
      toast.error("Analyse fehlgeschlagen", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [currentLocation, onDataUpdate]);

  useEffect(() => {
    if (currentLocation) analyzeWater(currentLocation);
    // Bewusst nur an currentLocation gebunden: analyzeWater wird bei jedem
    // Standortwechsel neu gebaut, als Dependency wuerde es die Analyse
    // doppelt ausloesen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Control Panel */}
      <Card className="glass-morphism border-gray-800">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-sm sm:text-base text-cyan-400">Analyse-Steuerung</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                onClick={requestGpsLocation}
                variant="outline"
                size="sm"
                className="border-cyan-600/50 hover:bg-cyan-600/20 text-xs sm:text-sm flex-1 sm:flex-none"
              >
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Standort
              </Button>
              <Button
                onClick={() => analyzeWater()}
                disabled={loading}
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-700 text-xs sm:text-sm flex-1 sm:flex-none"
              >
                {loading ? (
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                )}
                Analyse
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className="flex items-start gap-2 text-xs sm:text-sm text-gray-400"
            role="status"
            aria-live="polite"
            aria-label="Aktueller Standort Koordinaten"
          >
            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <span className="break-words">
              {currentLocation?.name || "Kein Standort ausgewählt"}
              {currentLocation && ` (${currentLocation.lat.toFixed(4)}°, ${currentLocation.lon.toFixed(4)}°)`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card className="glass-morphism border-gray-800">
          <CardContent className="py-8 sm:py-12">
            <div
              className="flex flex-col items-center gap-3 sm:gap-4"
              role="status"
              aria-live="assertive"
              aria-label="Analyse wird durchgefuehrt"
            >
              <Loader2 className="w-8 h-8 sm:w-12 sm:h-12 animate-spin text-cyan-400" />
              <div className="text-center">
                <p className="text-sm sm:text-base text-white font-semibold mb-1">Messwerte werden geladen...</p>
                <p className="text-gray-400 text-xs sm:text-sm">Open-Meteo Wetter- und Marine-Modell</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {waterData && !loading && (
        <div role="region" aria-live="polite" aria-atomic="true" aria-label="Gewaesseranalyseergebnisse">
          <div className="flex flex-wrap gap-1 sm:gap-2">
            <Button
              onClick={() => setSelectedTab("current")}
              variant={selectedTab === "current" ? "default" : "outline"}
              className={`text-xs sm:text-sm ${selectedTab === "current" ? "bg-cyan-600" : "border-gray-700"}`}
            >
              Aktuell
            </Button>
            <Button
              onClick={() => setSelectedTab("history")}
              variant={selectedTab === "history" ? "default" : "outline"}
              className={`text-xs sm:text-sm ${selectedTab === "history" ? "bg-cyan-600" : "border-gray-700"}`}
            >
              Verlauf 24 h
            </Button>
          </div>

          <div className="mt-4">
            {selectedTab === "current" && <WaterDataDisplay data={waterData} />}
            {selectedTab === "history" && <WaterCharts series={waterData.series} />}
          </div>
        </div>
      )}

      {/* No Data State */}
      {!waterData && !loading && (
        <Card className="glass-morphism border-gray-800">
          <CardContent className="py-8 sm:py-12">
            <div className="text-center text-gray-400 space-y-3">
              <p className="text-sm sm:text-base">
                {errorMsg || "Noch keine Analyse für diesen Standort"}
              </p>
              <Button
                onClick={() => analyzeWater()}
                className="bg-cyan-600 hover:bg-cyan-700 text-xs sm:text-sm w-full sm:w-auto"
              >
                Analyse starten
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
