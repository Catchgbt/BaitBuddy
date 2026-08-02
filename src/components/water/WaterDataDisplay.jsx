import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fish, Info } from "lucide-react";

// Zeigt ausschliesslich gemessene Werte aus dem Open-Meteo-Modell. Der frueher
// hier prominente "KI Fang-Prognose Score" kam aus Math.random(), ebenso
// Hotspot-Wahrscheinlichkeit, Koeder-Empfehlung und Mondphasen-Einfluss. An
// ihrer Stelle steht jetzt eine regelbasierte Einschaetzung, deren
// Zustandekommen direkt darunter aufgeschluesselt wird.

const QUALITY_TEXT = {
  optimal: "text-emerald-400",
  gut: "text-green-400",
  mittel: "text-yellow-400",
  schlecht: "text-red-400",
  unbekannt: "text-gray-400",
};

const QUALITY_BG = {
  optimal: "bg-emerald-500/20 border-emerald-500/30",
  gut: "bg-green-500/20 border-green-500/30",
  mittel: "bg-yellow-500/20 border-yellow-500/30",
  schlecht: "bg-red-500/20 border-red-500/30",
  unbekannt: "bg-gray-500/20 border-gray-500/30",
};

const RATING_TEXT = {
  optimal: "Sehr gute Bedingungen",
  gut: "Gute Bedingungen",
  mittel: "Durchwachsene Bedingungen",
  schlecht: "Schwierige Bedingungen",
  unbekannt: "Nicht bewertbar",
};

function ratingForScore(score) {
  if (score >= 80) return "optimal";
  if (score >= 55) return "gut";
  if (score >= 30) return "mittel";
  return "schlecht";
}

function formatValue(value, unit) {
  const decimals = unit === "hPa" || unit === "%" ? 0 : unit === "m" ? 2 : 1;
  return `${value.toFixed(decimals)} ${unit}`;
}

export default function WaterDataDisplay({ data }) {
  const { parameters, assessment, timestamp, source } = data;
  const entries = Object.entries(parameters);

  return (
    <div className="space-y-6">
      {/* Regelbasierte Einschaetzung */}
      <Card className="glass-morphism border-cyan-600/50 bg-gradient-to-br from-cyan-600/10 to-emerald-600/10">
        <CardContent className="pt-6">
          <div className="text-center">
            <Fish className="w-12 h-12 mx-auto text-cyan-400 mb-3" />
            <h3 className="text-xl font-bold text-white mb-1">Bedingungen am Gewässer</h3>
            <p className="text-xs text-gray-400 mb-4">
              Regelbasiert aus {assessment.parameterCount} gemessenen Werten
            </p>
            {assessment.score !== null ? (
              <>
                <div className="text-5xl font-bold text-cyan-400 mb-2">
                  {assessment.score}<span className="text-2xl">/100</span>
                </div>
                <p className={`font-semibold ${QUALITY_TEXT[assessment.rating]}`}>
                  {RATING_TEXT[assessment.rating]}
                </p>
              </>
            ) : (
              <p className="text-gray-400">Zu wenige Messwerte für eine Bewertung</p>
            )}
          </div>

          {assessment.reasons.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-sm text-gray-300 font-semibold">So kommt die Bewertung zustande</p>
              {assessment.reasons.map((reason) => (
                <div
                  key={reason.key}
                  className="flex items-center justify-between gap-3 bg-gray-800/50 rounded-lg px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="text-white truncate">{reason.label}</p>
                    <p className="text-xs text-gray-400">
                      {formatValue(reason.value, reason.unit)} · günstig {reason.optimal}
                    </p>
                  </div>
                  <span className={`font-semibold shrink-0 ${QUALITY_TEXT[ratingForScore(reason.score)]}`}>
                    {reason.score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messwerte */}
      <Card className="glass-morphism border-gray-800">
        <CardHeader>
          <CardTitle className="text-cyan-400">Messwerte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {entries.map(([key, param]) => (
              <div
                key={key}
                className={`rounded-lg border p-3 ${QUALITY_BG[param.quality] || QUALITY_BG.unbekannt}`}
              >
                <p className="text-xs text-gray-300">{param.label}</p>
                <p className="text-2xl font-bold text-white">
                  {formatValue(param.value, param.unit)}
                </p>
                <p className="text-xs text-gray-400">{param.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-start gap-2 text-xs text-gray-500">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Quelle: {source} · Stand {new Date(timestamp).toLocaleString("de-DE")}.
              Angezeigt wird nur, was das Modell für diesen Standort tatsächlich liefert —
              im Binnenland gibt es keine Wasseroberflächen-Temperatur und keine Wellenhöhe.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
