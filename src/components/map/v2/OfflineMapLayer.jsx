import React, { useEffect, useState } from "react";
import { TileLayer, useMap } from "react-leaflet";
import { getCachedTile } from "@/components/utils/offlineMapDownload";
import L from "leaflet";

export default function OfflineMapLayer({ isOnline }) {
  const map = useMap();
  const [tileLayer, setTileLayer] = useState(null);

  useEffect(() => {
    if (!map || !L) return;

    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    
    // Entferne alte Layer
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    // Erstelle neue Layer
    const newLayer = L.tileLayer(tileUrl, {
      attribution: 'OpenStreetMap',
      maxZoom: 19,
      crossOrigin: true
    });

    newLayer.addTo(map);
    setTileLayer(newLayer);

    return () => {
      if (newLayer && map.hasLayer(newLayer)) {
        map.removeLayer(newLayer);
      }
    };
  }, [map, isOnline]);

  // Render nichts - Layer wird direkt zur Karte hinzugefuegt
  return null;
}