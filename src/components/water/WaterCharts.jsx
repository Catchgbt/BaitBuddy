import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function WaterCharts({ data, type }) {
  const isHistory = type === "history";
  const title = isHistory ? "30-Tage Verlauf" : "7-Tage Prognose";

  if (!data || data.length === 0) {
    return (
      <div 
        className="text-center py-8 text-gray-400"
        role="status"
        aria-live="polite"
      >
        Keine Daten verfuegbar
      </div>
    );
  }

  return (
    <div 
      className="space-y-6"
      role="region"
      aria-live="polite"
      aria-atomic="false"
      aria-label={`Gewaesser-Daten ${title}`}
    >
      
      {/* Fishing Score Chart */}
      <Card className="glass-morphism border-gray-800" role="region" aria-label="Fang-Score Diagramm">
        <CardHeader>
          <CardTitle className="text-cyan-400">Fang-Score {isHistory ? "Verlauf" : "Prognose"}</CardTitle>
          <p className="text-xs text-gray-400 mt-1">Zeitliche Entwicklung der Fang-Erfolgswahrscheinlichkeit im Bereich 0-100</p>
        </CardHeader>
        <CardContent aria-live="polite" aria-atomic="true">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                 <linearGradient id="fishingScoreGradient" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                   <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                 </linearGradient>
               </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: `1px solid hsl(var(--border))`,
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
                labelStyle={{ color: 'hsl(var(--chart-1))' }}
              />
              <Area 
                type="monotone" 
                dataKey="fishingScore" 
                stroke="#0284c7" 
                fillOpacity={1} 
                fill="url(#fishingScoreGradient)"
                name="Fang-Score"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Temperature & Chlorophyll */}
      <Card className="glass-morphism border-gray-800" role="region" aria-label="Temperatur und Chlorophyll Diagramm">
        <CardHeader>
          <CardTitle className="text-cyan-400">Temperatur & Chlorophyll</CardTitle>
          <p className="text-xs text-gray-400 mt-1">Temperatur in Grad Celsius (linke Achse) und Chlorophyll-a in mg/m³ (rechte Achse)</p>
        </CardHeader>
        <CardContent aria-live="polite" aria-atomic="true">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis 
                yAxisId="left"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                label={{ value: '°C', position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                label={{ value: 'mg/m³', position: 'insideRight', fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: `1px solid hsl(var(--border))`,
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
                labelStyle={{ color: 'hsl(var(--chart-1))' }}
              />
              <Legend wrapperStyle={{ color: 'hsl(var(--muted-foreground))' }} />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="temperature" 
                stroke="hsl(var(--chart-4))" 
                strokeWidth={2}
                name="Temperatur (°C)"
                dot={{ fill: 'hsl(var(--chart-4))' }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="chlorophyll" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                name="Chlorophyll (mg/m³)"
                dot={{ fill: 'hsl(var(--chart-2))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Turbidity & Oxygen (nur History) */}
      {isHistory && (
        <Card className="glass-morphism border-gray-800" role="region" aria-label="Truebung und Sauerstoff Diagramm">
          <CardHeader>
            <CardTitle className="text-cyan-400">Trübung & Sauerstoff</CardTitle>
            <p className="text-xs text-gray-400 mt-1">Wasserklarheit in NTU (linke Achse) und Sauerstoffgehalt in mg/L (rechte Achse)</p>
          </CardHeader>
          <CardContent aria-live="polite" aria-atomic="true">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  label={{ value: 'NTU', position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  label={{ value: 'mg/L', position: 'insideRight', fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: `1px solid hsl(var(--border))`,
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  labelStyle={{ color: 'hsl(var(--chart-1))' }}
                />
                <Legend wrapperStyle={{ color: 'hsl(var(--muted-foreground))' }} />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="turbidity" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  name="Trübung (NTU)"
                  dot={{ fill: 'hsl(var(--chart-3))' }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="oxygen" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  name="Sauerstoff (mg/L)"
                  dot={{ fill: 'hsl(var(--chart-1))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Algae Bloom Risk (nur Forecast) */}
      {!isHistory && (
        <Card className="glass-morphism border-gray-800" role="region" aria-label="Algenblüte-Risiko Prognose">
          <CardHeader>
            <CardTitle className="text-cyan-400">Algenblüte-Risiko Prognose</CardTitle>
            <p className="text-xs text-gray-400 mt-1">Geschaetztes Risiko für schädliche Algenblüten basierend auf Chlorophyll-Konzentration</p>
          </CardHeader>
          <CardContent aria-live="polite" aria-atomic="false">
            <div className="space-y-3">
              {data.map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50"
                  role="status"
                  aria-label={`${item.date}: Algenrisiko ${item.algaeBloomRisk}`}
                >
                  <span className="text-gray-300">{item.date}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-white text-sm">
                      Chlorophyll: {item.chlorophyll.toFixed(1)} mg/m³
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      item.algaeBloomRisk === 'hoch' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      item.algaeBloomRisk === 'mittel' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                      'bg-green-500/20 text-green-400 border border-green-500/30'
                    }`}>
                      Risiko: {item.algaeBloomRisk.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}