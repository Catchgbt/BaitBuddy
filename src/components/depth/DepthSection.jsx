
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button"; // Added import for Button

export default function DepthSection() {
  const [tmsUrl, setTmsUrl] = useState("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
  const [opacity, setOpacity] = useState(0.7);
  const [coord, setCoord] = useState(null);

  function TapInfo() {
    useMapEvents({
      click(e) { setCoord({ lat: e.latlng.lat, lon: e.latlng.lng, z: e.target._zoom }); }
    });
    return null;
  }

  const clearTileCache = async () => {
    if (!("caches" in window)) return alert("Cache API nicht verfügbar.");
    const names = await caches.keys();
    for (const n of names) {
      if (n.includes("fishmaster-depth")) await caches.delete(n);
    }
    alert("Depth-Cache geleert.");
  };

  return (
    <Card className="glass-morphism border-gray-800 rounded-2xl">
      <CardHeader><CardTitle className="text-white">Tiefenkarte / Layer</CardTitle></CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <div className="sm:col-span-2">
            <Label className="text-gray-300 text-sm">TMS/XYZ-URL</Label>
            <Input value={tmsUrl} onChange={(e)=>setTmsUrl(e.target.value)} className="bg-gray-800/50 border-gray-700 text-white" placeholder="https://server/{z}/{x}/{y}.png" />
          </div>
          <div>
            <Label className="text-gray-300 text-sm">Transparenz: {Math.round(opacity*100)}%</Label>
            <input type="range" min="0" max="1" step="0.05" value={opacity} onChange={(e)=>setOpacity(parseFloat(e.target.value))} className="w-full" />
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="outline" onClick={clearTileCache} className="text-gray-300 border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 hover:text-white">Cache leeren</Button>
        </div>
        <div className="h-64 rounded-xl overflow-hidden">
          <MapContainer center={[52.52, 13.405]} zoom={12} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <TileLayer url={tmsUrl} opacity={opacity} />
            <TapInfo />
          </MapContainer>
        </div>
        {coord && <div className="text-gray-400 text-sm mt-2">Koordinate: {coord.lat.toFixed(5)}, {coord.lon.toFixed(5)}</div>}
        <div className="text-gray-500 text-xs mt-2">Offline-Kachel-Cache per Service Worker (kleiner Bereich) kann separat aktiviert werden.</div>
      </CardContent>
    </Card>
  );
}
