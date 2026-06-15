import React from "react";
import WeatherAlertsSettings from "@/components/settings/WeatherAlertsSettings";

import PremiumGuard from "@/components/premium/PremiumGuard";

export default function WeatherAlerts() {
  return (
    <PremiumGuard requiredPlan="basic" feature="Wetter-Alarme">
      <WeatherAlertsInner />
    </PremiumGuard>
  );
}

function WeatherAlertsInner() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-white mb-6">Wetter-Warnungen</h1>
      <WeatherAlertsSettings />
    </div>
  );
}