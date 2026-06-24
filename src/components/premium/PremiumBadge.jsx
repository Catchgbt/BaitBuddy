import React from "react";

function isActive(premiumUntil) {
  if (!premiumUntil) return false;
  const t = new Date(premiumUntil).getTime();
  return Number.isFinite(t) && t > Date.now();
}

export default function PremiumBadge({ premiumUntil }) {
  const leftMs = premiumUntil ? Math.max(0, new Date(premiumUntil).getTime() - Date.now()) : 0;
  const hrs = Math.ceil(leftMs / 3_600_000);
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${isActive(premiumUntil) ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-gray-700 text-gray-300 border border-gray-600"}`}>
      {isActive(premiumUntil) ? `Premium ${hrs}h` : "Standard"}
    </span>
  );
}