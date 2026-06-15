import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, RefreshCw } from "lucide-react";
import { useLocation } from "@/components/location/LocationManager";
import WaterDataDisplay from "./WaterDataDisplay";
import WaterCharts from "./WaterCharts";
import { toast } from "sonner";

// Mock-Daten Generator für Satelliten-Parameter
const generateMockWaterData = (location) => {
  const baseTemp = 15 + Math.random() * 10; // 15-25°C
  const baseChlorophyll = 5 + Math.random() * 15; // 5-20 mg/m³
  
  return {
    timestamp: new Date().toISOString(),
    location: {
      lat: location?.lat || 52.52,
      lon: location?.lon || 13.405,
      name: location?.name || "Aktueller Standort"
    },
    parameters: {
      chlorophyll: {
        value: baseChlorophyll,
        unit: "mg/m³",
        quality: baseChlorophyll < 10 ? "gut" : baseChlorophyll < 20 ? "mittel" : "schlecht",
        description: "Algengehalt"
      },
      temperature: {
        value: baseTemp,
        unit: "°C",
        quality: baseTemp >= 12 && baseTemp <= 22 ? "optimal" : "suboptimal",
        description: "Wassertemperatur"
      },
      turbidity: {
        value: 10 + Math.random() * 40, // 10-50 NTU
        unit: "NTU",
        quality: "mittel",
        description: "Trübung"
      },
      cyanobacteria: {
        value: Math.random() * 5, // 0-5 Index
        unit: "Index",
        quality: "niedrig",
        description: "Blaualgen"
      },
      oxygen: {
        value: 6 + Math.random() * 6, // 6-12 mg/L
        unit: "mg/L",
        quality: "gut",
        description: "Sauerstoffgehalt"
      },
      ph: {
        value: 6.5 + Math.random() * 2, // 6.5-8.5
        unit: "pH",
        quality: "neutral",
        description: "pH-Wert"
      }
    },
    aiAnalysis: {
      fishingScore: Math.floor(60 + Math.random() * 40), // 60-100
      bestTimeToFish: "06:00 - 09:00 Uhr",
      recommendedBait: ["Würmer", "Mais", "Boilies"],
      hotspotProbability: Math.floor(40 + Math.random() * 60), // 40-100%
      weatherImpact: "Stabil, gute Bedingungen",
      moonPhaseImpact: "Zunehmender Mond - erhöhte Aktivität"
    },
    historicalTrend: generateHistoricalData(baseTemp, baseChlorophyll),
    forecast: generateForecast(baseTemp, baseChlorophyll)
  };
};

const generateHistoricalData = (baseTemp, baseChlorophyll) => {
  const data = [];
  const now = new Date();
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      temperature: baseTemp + (Math.random() - 0.5) * 4,
      chlorophyll: baseChlorophyll + (Math.random() - 0.5) * 8,
      turbidity: 20 + (Math.random() - 0.5) * 20,
      oxygen: 8 + (Math.random() - 0.5) * 3,
      fishingScore: 60 + Math.random() * 40
    });
  }
  
  return data;
};

const generateForecast = (baseTemp, baseChlorophyll) => {
  const forecast = [];
  const now = new Date();
  
  for (let i = 1; i <= 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    
    forecast.push({
      date: date.toISOString().split('T')[0],
      temperature: baseTemp + (Math.random() - 0.5) * 3,
      chlorophyll: baseChlorophyll + (Math.random() - 0.5) * 6,
      fishingScore: 60 + Math.random() * 40,
      algaeBloomRisk: Math.random() < 0.3 ? "hoch" : Math.random() < 0.6 ? "mittel" : "niedrig"
    });
  }
  
  return forecast;
};

export default function WaterAnalysisPanel({ onDataUpdate }) {
  const { currentLocation, requestGpsLocation } = useLocation();
  const [waterData, setWaterData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState("current"); // current, history, forecast

  useEffect(() => {
    if (currentLocation) {
      analyzeWater();
    }
  }, [currentLocation]);

  const analyzeWater = async () => {
    setLoading(true);
    
    try {
      // Simuliere API-Delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const data = generateMockWaterData(currentLocation);
      setWaterData(data);
      
      // Notify parent component
      if (onDataUpdate) {
        onDataUpdate(data);
      }
      
      toast.success("Gewässeranalyse abgeschlossen", {
        description: `Analyse-Score: ${data.aiAnalysis.fishingScore}/100`,
        duration: 3000
      });
    } catch (error) {
      console.error("Water analysis error:", error);
      toast.error("Fehler bei der Analyse");
    }
    
    setLoading(false);
  };

  const handleRefresh = () => {
    analyzeWater();
  };

  const handleLocationUpdate = async () => {
    await requestGpsLocation();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Control Panel */}
      <Card className="glass-morphism border-gray-800">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-sm sm:text-base text-cyan-400">Analyse-Steuerung</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                onClick={handleLocationUpdate}
                variant="outline"
                size="sm"
                className="border-cyan-600/50 hover:bg-cyan-600/20 text-xs sm:text-sm flex-1 sm:flex-none"
              >
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Standort
              </Button>
              <Button
                onClick={handleRefresh}
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
          <div className="flex items-start gap-2 text-xs sm:text-sm text-gray-400" role="status" aria-live="polite" aria-label="Aktueller Standort Koordinaten">
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
            <div className="flex flex-col items-center gap-3 sm:gap-4" role="status" aria-live="assertive" aria-label="Analyse wird durchgefuehrt">
              <Loader2 className="w-8 h-8 sm:w-12 sm:h-12 animate-spin text-cyan-400" />
              <div className="text-center">
                <p className="text-sm sm:text-base text-white font-semibold mb-1">Satellitendaten werden analysiert...</p>
                <p className="text-gray-400 text-xs sm:text-sm">Sentinel-2, MODIS & Copernicus Marine</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {waterData && !loading && (
        <div role="region" aria-live="polite" aria-atomic="true" aria-label="Gewaesseranalyseergebnisse">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1 sm:gap-2">
            <Button
              onClick={() => setSelectedTab("current")}
              variant={selectedTab === "current" ? "default" : "outline"}
              className={`text-xs sm:text-sm ${selectedTab === "current" ? "bg-cyan-600" : "border-gray-700"}`}
            >
              Aktuelle
            </Button>
            <Button
              onClick={() => setSelectedTab("history")}
              variant={selectedTab === "history" ? "default" : "outline"}
              className={`text-xs sm:text-sm ${selectedTab === "history" ? "bg-cyan-600" : "border-gray-700"}`}
            >
              30-Tage
            </Button>
            <Button
              onClick={() => setSelectedTab("forecast")}
              variant={selectedTab === "forecast" ? "default" : "outline"}
              className={`text-xs sm:text-sm ${selectedTab === "forecast" ? "bg-cyan-600" : "border-gray-700"}`}
            >
              7-Tage
            </Button>
          </div>

          {/* Content */}
          <div className="mt-4">
            {selectedTab === "current" && <WaterDataDisplay data={waterData} />}
            {selectedTab === "history" && <WaterCharts data={waterData.historicalTrend} type="history" />}
            {selectedTab === "forecast" && <WaterCharts data={waterData.forecast} type="forecast" />}
          </div>
        </div>
      )}

      {/* No Data State */}
      {!waterData && !loading && (
        <Card className="glass-morphism border-gray-800">
          <CardContent className="py-8 sm:py-12">
            <div className="text-center text-gray-400 space-y-3">
              <p className="text-sm sm:text-base">Keine Analyse verfügbar</p>
              <Button 
                onClick={analyzeWater} 
                className="bg-cyan-600 hover:bg-cyan-700 text-xs sm:text-sm w-full sm:w-auto"
              >
                Erste Analyse starten
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}