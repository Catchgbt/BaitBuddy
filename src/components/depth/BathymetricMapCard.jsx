import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { generateBathymetricMap } from "@/functions/generateBathymetricMap";
import { toast } from "sonner";

const statusColors = {
  pending: "bg-gray-700 text-gray-300",
  processing: "bg-amber-900/50 text-amber-300",
  ready: "bg-cyan-900/50 text-cyan-300",
  error: "bg-red-900/50 text-red-300"
};

const statusLabels = {
  pending: "Ausstehend",
  processing: "Wird berechnet...",
  ready: "Bereit",
  error: "Fehler"
};

export default function BathymetricMapCard({ map, onRegenerate, isAdmin }) {
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await generateBathymetricMap({ water_body_name: map.water_body_name, map_id: map.id });
      toast.success("Karte wird neu berechnet");
      if (onRegenerate) onRegenerate();
    } catch (err) {
      toast.error("Fehler: " + err.message);
    }
    setRegenerating(false);
  };

  return (
    <Card className="glass-morphism border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-white text-base">{map.water_body_name}</CardTitle>
          <Badge className={statusColors[map.status]}>{statusLabels[map.status]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="text-cyan-400 font-bold text-lg">{map.max_depth ?? "-"}m</div>
            <div className="text-gray-400 text-xs">Maximaltiefe</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="text-cyan-400 font-bold text-lg">{map.avg_depth ?? "-"}m</div>
            <div className="text-gray-400 text-xs">Durchschnitt</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="text-cyan-400 font-bold text-lg">{map.data_points_count ?? 0}</div>
            <div className="text-gray-400 text-xs">Messpunkte</div>
          </div>
        </div>

        <div className="text-xs text-gray-400">
          {map.contributors_count ?? 0} Angler haben Daten beigesteuert
          {map.generated_at && (
            <span className="ml-2">- Zuletzt aktualisiert: {new Date(map.generated_at).toLocaleDateString('de-DE')}</span>
          )}
        </div>

        {map.hotspots && map.hotspots.length > 0 && (
          <div>
            <div className="text-xs text-gray-400 mb-1">KI-Hotspots:</div>
            <div className="flex flex-wrap gap-1">
              {map.hotspots.map((h, i) => (
                <span key={i} className="text-xs bg-amber-900/30 text-amber-300 px-2 py-0.5 rounded">
                  {h.label} {h.depth}m
                </span>
              ))}
            </div>
          </div>
        )}

        {map.ai_analysis && (
          <div className="bg-gray-800/40 rounded-lg p-3">
            <div className="text-xs text-cyan-400 mb-1">KI-Analyse</div>
            <p className="text-xs text-gray-300 leading-relaxed">{map.ai_analysis}</p>
          </div>
        )}

        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating || map.status === 'processing'}
            className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            {regenerating ? "Berechnung laeuft..." : "Karte neu berechnen"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}