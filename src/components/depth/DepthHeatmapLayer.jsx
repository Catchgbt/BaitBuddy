import React, { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

function getColor(depth, maxDepth) {
  const ratio = Math.min(depth / Math.max(maxDepth, 1), 1);
  // Blau-Gradient: hellblau (flach) -> dunkelblau (tief)
  const r = Math.round(20 + (1 - ratio) * 100);
  const g = Math.round(80 + (1 - ratio) * 150);
  const b = Math.round(180 + ratio * 75);
  return `rgb(${r},${g},${b})`;
}

export default function DepthHeatmapLayer({ points, visible = true }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!visible || !points || points.length === 0) return;

    const maxDepth = Math.max(...points.map(p => p.depth_meters));
    const group = L.layerGroup();

    for (const p of points) {
      const color = getColor(p.depth_meters, maxDepth);
      const radius = Math.max(4, Math.min(12, (p.depth_meters / maxDepth) * 12));
      
      const circle = L.circleMarker([p.latitude, p.longitude], {
        radius,
        fillColor: color,
        color: 'rgba(255,255,255,0.3)',
        weight: 1,
        fillOpacity: 0.7
      });
      
      circle.bindTooltip(`${p.depth_meters}m`, { 
        direction: 'top', 
        className: 'depth-tooltip'
      });
      
      group.addLayer(circle);
    }

    group.addTo(map);
    layerRef.current = group;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [points, visible, map]);

  return null;
}