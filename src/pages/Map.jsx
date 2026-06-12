import React from "react";
import MapController from "@/components/map/v2/MapController";

export default function MapPage() {
  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="mb-3 px-3 py-2 rounded-lg border border-amber-700/40 bg-amber-900/20 text-amber-100 text-xs sm:text-sm">
        Hinweis: Das Laden der Marker kann je nach Verbindung und Anzahl der Spots etwas länger dauern. Bitte habe einen Moment Geduld.
      </div>
      <MapController />
    </div>
  );
}
