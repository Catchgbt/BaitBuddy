import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, Tooltip } from "recharts";

export default function WaterRadarChart({ parameters }) {
  // Konvertiere Parameter zu Radar-Chart Format (0-100 Scale)
  const radarData = [
    {
      parameter: "Temperatur",
      value: normalizeParameter(parameters.temperature.value, 8, 25, 15, 22),
      fullMark: 100
    },
    {
      parameter: "Chlorophyll",
      value: normalizeParameter(parameters.chlorophyll.value, 0, 30, 3, 10),
      fullMark: 100
    },
    {
      parameter: "Klarheit",
      value: normalizeParameter(parameters.turbidity.value, 50, 0, 30, 10, true), // inverse
      fullMark: 100
    },
    {
      parameter: "Sauerstoff",
      value: normalizeParameter(parameters.oxygen.value, 4, 12, 7, 10),
      fullMark: 100
    },
    {
      parameter: "pH-Wert",
      value: normalizeParameter(parameters.ph.value, 5, 9, 6.5, 8),
      fullMark: 100
    },
    {
      parameter: "Algen-Risiko",
      value: normalizeParameter(parameters.cyanobacteria.value, 10, 0, 5, 2, true), // inverse
      fullMark: 100
    }
  ];

  return (
    <Card className="glass-morphism border-gray-800" role="region" aria-label="6-Parameter Qualitätsprofil Radar-Diagramm">
      <CardHeader>
        <CardTitle className="text-cyan-400">6-Parameter Qualitätsprofil</CardTitle>
        <p className="text-gray-400 text-sm">Multivariate Gewässeranalyse - Alle Parameter auf 0-100 normalisiert</p>
        <div className="text-xs text-gray-500 mt-2 space-y-1" aria-label="Qualitaetsprofil Legende">
          <div>Temperatur, Chlorophyll, Klarheit, Sauerstoff, pH-Wert und Cyanobakterien-Risiko</div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
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
              name="Qualität" 
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
              formatter={(value) => `${Math.round(value)}%`}
            />
            <Legend wrapperStyle={{ color: 'hsl(var(--muted-foreground))' }} />
          </RadarChart>
        </ResponsiveContainer>
        
        <div className="mt-4 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 px-4 py-2 rounded-lg bg-gray-800/50" role="definition" aria-label="Qualitaets-Bewertungsskala">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-400" aria-hidden="true"></div>
              <span className="text-sm text-gray-300">80-100% Optimal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-400" aria-hidden="true"></div>
              <span className="text-sm text-gray-300">50-80% Gut</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-400" aria-hidden="true"></div>
              <span className="text-sm text-gray-300">unter 50% Suboptimal</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Normalisiere Werte zu 0-100 Skala
function normalizeParameter(value, min, max, optimalMin, optimalMax, inverse = false) {
  // Normalisiere Parameterwerte auf 0-100 Skala
  // Optimal range (optimalMin-optimalMax) gets 100%
  // Below/above gets reduced proportionally
  
  if (value >= optimalMin && value <= optimalMax) {
    return 100;
  }
  
  let score;
  if (value < optimalMin) {
    score = ((value - min) / (optimalMin - min)) * 100;
  } else {
    score = 100 - (((value - optimalMax) / (max - optimalMax)) * 100);
  }
  
  score = Math.max(0, Math.min(100, score));
  
  return inverse ? 100 - score : score;
}