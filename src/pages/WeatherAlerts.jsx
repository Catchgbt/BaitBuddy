import React from "react";
import WeatherAlertsSettings from "@/components/settings/WeatherAlertsSettings";

export default function WeatherAlerts() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-white mb-6">Wetter-Warnungen</h1>
      <WeatherAlertsSettings />
    </div>
  );
}