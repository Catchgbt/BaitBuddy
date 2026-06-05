import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PremiumGuard from "@/components/premium/PremiumGuard";
import MapController from "@/components/map/v2/MapController";
import WeatherRadarMap from "@/components/weather/WeatherRadarMap";
import BathymetricCrowdsourcing from "@/pages/BathymetricCrowdsourcing";

export default function MapPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setUser(await base44.auth.me());
      } catch (e) {
        console.log("User not logged in:", e);
      }
    };
    loadUser();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="mb-3 px-3 py-2 rounded-lg border border-amber-700/40 bg-amber-900/20 text-amber-100 text-xs sm:text-sm">
        Hinweis: Das Laden der Marker kann je nach Verbindung und Anzahl der Spots etwas länger dauern. Bitte habe einen Moment Geduld.
      </div>
      <MapController />

      <div className="mt-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-900/40 backdrop-blur-sm p-4 sm:p-6 border border-gray-800/50">
        <h3 className="text-sm font-semibold text-cyan-400/70 uppercase tracking-wider mb-4">Wetterradar</h3>
        <div className="h-96">
          <WeatherRadarMap />
        </div>
      </div>

      <div className="mt-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-900/40 backdrop-blur-sm border border-gray-800/50">
        <BathymetricCrowdsourcing />
      </div>
    </div>
  );
}