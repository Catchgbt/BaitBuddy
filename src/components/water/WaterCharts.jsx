import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Zeigt die tatsaechlich gemessene Zeitreihe der letzten 24 Stunden.
// Frueher standen hier ein "30-Tage Verlauf" und eine "7-Tage Prognose", deren
// Werte samt Fang-Score und Algenbluete-Risiko per Math.random() erzeugt
// wurden. Das Open-Meteo-Modell liefert stuendliche Werte fuer die
// zurueckliegenden 24 Stunden — mehr wird hier deshalb auch nicht behauptet.

const SERIES = [
  { key: "water_temp", name: "Wassertemperatur", color: "hsl(var(--chart-1))", unit: "°C" },
  { key: "ground_temp", name: "Bodentemperatur", color: "hsl(var(--chart-2))", unit: "°C" },
  { key: "air_temp", name: "Lufttemperatur", color: "hsl(var(--chart-3))", unit: "°C" },
];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--foreground))",
};

export default function WaterCharts({ series }) {
  const data = Array.isArray(series) ? series : [];

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400" role="status" aria-live="polite">
        Keine Messreihe verfügbar
      </div>
    );
  }

  // Nur Reihen zeichnen, für die es an mindestens einem Zeitpunkt Werte gibt.
  const available = SERIES.filter((s) => data.some((point) => typeof point[s.key] === "number"));
  const hasWaves = data.some((point) => typeof point.wave_height === "number");

  return (
    <div className="space-y-6" role="region" aria-label="Gemessener Verlauf der letzten 24 Stunden">
      <Card className="glass-morphism border-gray-800">
        <CardHeader>
          <CardTitle className="text-cyan-400">Temperaturverlauf (24 h)</CardTitle>
          <p className="text-xs text-gray-400 mt-1">
            Stündliche Messwerte des Open-Meteo-Modells
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                unit=" °C"
                width={60}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => [`${Number(value).toFixed(1)} °C`, name]}
              />
              <Legend wrapperStyle={{ color: "hsl(var(--muted-foreground))" }} />
              {available.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {hasWaves && (
        <Card className="glass-morphism border-gray-800">
          <CardHeader>
            <CardTitle className="text-cyan-400">Wellenhöhe (24 h)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  unit=" m"
                  width={60}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [`${Number(value).toFixed(2)} m`, "Wellenhöhe"]}
                />
                <Line
                  type="monotone"
                  dataKey="wave_height"
                  name="Wellenhöhe"
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
