import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, Tooltip } from "recharts";

// Frueher ein festes "6-Parameter Qualitaetsprofil" aus Chlorophyll, Truebung,
// Sauerstoff, pH und Cyanobakterien — allesamt Werte, fuer die es keine
// Datenquelle gab. Das Diagramm zeichnet jetzt genau die Parameter, die im
// Analyse-Ergebnis wirklich vorhanden sind; die 0-100-Bewertung kommt aus den
// in src/lib/waterAnalysis.js dokumentierten Optimalfenstern.

export default function WaterRadarChart({ parameters }) {
  const radarData = Object.entries(parameters || {})
    .filter(([, param]) => typeof param?.score === "number")
    .map(([key, param]) => ({
      key,
      parameter: param.label,
      value: Math.round(param.score),
      fullMark: 100,
    }));

  // Ein Radar mit weniger als drei Achsen ist keine Flaeche mehr, sondern eine
  // Linie — dann lieber gar nichts zeichnen.
  if (radarData.length < 3) return null;

  return (
    <Card className="glass-morphism border-gray-800" role="region" aria-label="Bewertungsprofil der gemessenen Parameter">
      <CardHeader>
        <CardTitle className="text-cyan-400">Bewertungsprofil</CardTitle>
        <p className="text-gray-400 text-sm">
          {radarData.length} gemessene Parameter, je auf 0–100 bewertet
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={360}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="parameter"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            />
            <Radar
              name="Bewertung"
              dataKey="value"
              stroke="hsl(var(--chart-2))"
              fill="hsl(var(--chart-2))"
              fillOpacity={0.6}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: `1px solid hsl(var(--border))`,
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
              formatter={(value) => `${Math.round(value)}/100`}
            />
            <Legend wrapperStyle={{ color: 'hsl(var(--muted-foreground))' }} />
          </RadarChart>
        </ResponsiveContainer>

        <div className="mt-4 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 px-4 py-2 rounded-lg bg-gray-800/50" role="definition" aria-label="Bewertungsskala">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-400" aria-hidden="true"></div>
              <span className="text-sm text-gray-300">80-100 Optimal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-400" aria-hidden="true"></div>
              <span className="text-sm text-gray-300">55-80 Gut</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-400" aria-hidden="true"></div>
              <span className="text-sm text-gray-300">unter 55 Suboptimal</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
