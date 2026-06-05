import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { generateBathymetricMap } from "@/functions/generateBathymetricMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DepthUploadPanel from "@/components/depth/DepthUploadPanel";
import BathymetricMapCard from "@/components/depth/BathymetricMapCard";
import MyDepthDataList from "@/components/depth/MyDepthDataList";
import { toast } from "sonner";

export default function BathymetricCrowdsourcing() {
  const [maps, setMaps] = useState([]);
  const [loadingMaps, setLoadingMaps] = useState(true);
  const [user, setUser] = useState(null);
  const [newWaterBody, setNewWaterBody] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadUser();
    loadMaps();
  }, []);

  const loadUser = async () => {
    const u = await base44.auth.me();
    setUser(u);
  };

  const loadMaps = async () => {
    setLoadingMaps(true);
    try {
      const data = await base44.entities.BathymetricMap.list('-generated_at', 50);
      setMaps(data);
    } catch (err) {
      console.error("Fehler:", err);
    }
    setLoadingMaps(false);
  };

  const handleGenerateNew = async () => {
    if (!newWaterBody.trim()) return toast.error("Gewaessernamen eingeben");
    setGenerating(true);
    try {
      await generateBathymetricMap({ water_body_name: newWaterBody.trim() });
      toast.success("Karte wird berechnet, dies dauert einen Moment");
      setNewWaterBody("");
      setTimeout(loadMaps, 3000);
    } catch (err) {
      toast.error("Fehler: " + err.message);
    }
    setGenerating(false);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-950 p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Bathymetrisches Crowdsourcing</h1>
        <p className="text-gray-400 text-sm mt-1">
          Teile deine Echolot-Daten und profitiere von praezisen Community-Tiefenkarten
        </p>
      </div>

      <Tabs defaultValue="maps" className="w-full">
        <TabsList className="w-full bg-gray-800/50 mb-4">
          <TabsTrigger value="maps" className="flex-1">Community-Karten</TabsTrigger>
          <TabsTrigger value="upload" className="flex-1">Daten hochladen</TabsTrigger>
          <TabsTrigger value="mine" className="flex-1">Meine Daten</TabsTrigger>
        </TabsList>

        <TabsContent value="maps" className="space-y-4">
          {isAdmin && (
            <div className="flex gap-2">
              <Input
                value={newWaterBody}
                onChange={e => setNewWaterBody(e.target.value)}
                placeholder="Gewaessername fuer neue Karte..."
                className="bg-gray-800/50 border-gray-700 text-white"
                onKeyDown={e => e.key === 'Enter' && handleGenerateNew()}
              />
              <Button
                onClick={handleGenerateNew}
                disabled={generating}
                className="bg-cyan-600 hover:bg-cyan-700 whitespace-nowrap"
              >
                {generating ? "Berechnet..." : "Karte erstellen"}
              </Button>
            </div>
          )}

          {loadingMaps ? (
            <div className="text-center text-gray-400 py-10">Karten werden geladen...</div>
          ) : maps.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              <div className="text-base text-gray-400 mb-2">Noch keine Community-Karten vorhanden</div>
              <p className="text-sm">Lade Echolot-Daten hoch und erstelle die erste Tiefenkarte fuer dein Gewaesser.</p>
            </div>
          ) : (
            maps.map(map => (
              <BathymetricMapCard
                key={map.id}
                map={map}
                onRegenerate={loadMaps}
                isAdmin={isAdmin}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="upload">
          <DepthUploadPanel onUploadSuccess={loadMaps} />
          <div className="mt-4 bg-gray-800/30 rounded-xl p-4 text-xs text-gray-400 space-y-2">
            <div className="font-medium text-gray-300">CSV-Format Beispiel:</div>
            <pre className="text-gray-500 font-mono">
{`latitude,longitude,depth
52.4567,13.2890,8.5
52.4568,13.2891,9.2
52.4569,13.2892,10.1`}
            </pre>
            <div className="font-medium text-gray-300 mt-2">GPX-Format:</div>
            <p>GPX-Dateien mit Tiefendaten aus kompatiblen Echoloten werden automatisch erkannt.</p>
          </div>
        </TabsContent>

        <TabsContent value="mine">
          <MyDepthDataList />
        </TabsContent>
      </Tabs>
    </div>
  );
}