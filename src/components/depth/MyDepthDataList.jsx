import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";

export default function MyDepthDataList() {
  const [stats, setStats] = useState({ total: 0, waterBodies: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      const points = await base44.entities.DepthDataPoint.filter({ created_by: user.email });
      
      const byWater = {};
      for (const p of points) {
        const name = p.water_body_name || "Unbekannt";
        if (!byWater[name]) byWater[name] = { count: 0, maxDepth: 0 };
        byWater[name].count++;
        byWater[name].maxDepth = Math.max(byWater[name].maxDepth, p.depth_meters);
      }

      setStats({
        total: points.length,
        waterBodies: Object.entries(byWater).map(([name, data]) => ({ name, ...data }))
      });
    } catch (err) {
      console.error("Fehler beim Laden:", err);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="glass-morphism border-gray-800">
        <CardContent className="p-4 text-center text-gray-400 text-sm">Lade deine Daten...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-morphism border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-base">Meine Tiefendaten</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm text-gray-300">{stats.total} Messpunkte insgesamt</div>
        
        {stats.waterBodies.length === 0 && (
          <div className="text-xs text-gray-500">Noch keine Daten hochgeladen. Lade Echolot-Daten hoch, um zur Community beizutragen.</div>
        )}

        {stats.waterBodies.map(wb => (
          <div key={wb.name} className="flex items-center justify-between bg-gray-800/40 rounded-lg px-3 py-2">
            <div>
              <div className="text-sm text-white">{wb.name}</div>
              <div className="text-xs text-gray-400">{wb.count} Punkte</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-cyan-400">{wb.maxDepth}m</div>
              <div className="text-xs text-gray-500">max. Tiefe</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}