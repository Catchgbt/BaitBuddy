import React, { useState } from 'react';
import { TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * HillshadeLayer - Relief-Shading für 3D-ähnliche Darstellung
 * Nutzt Normal Maps von Mapzen/Stamen für Hillshading Effekt
 */
function HillshadeLayer({ visible = true, opacity = 0.4, blendMode = 'multiply' }) {
  const map = useMap();
  const [layer, setLayer] = useState(null);

  React.useEffect(() => {
    if (!map) return;

    // Mapzen Terrain Normal Tiles für Hillshading
    const hillshadeUrl =
      'https://s3.amazonaws.com/elevation-tiles-prod/normal/{z}/{x}/{y}.png';

    const normalLayer = L.tileLayer(hillshadeUrl, {
      attribution:
        '© Mapzen | © OpenStreetMap contributors | Elevation data by USGS',
      maxZoom: 16,
      opacity: opacity,
      className: 'hillshade-layer',
      crossOrigin: 'anonymous',
    });

    // Apply blend mode via CSS if supported
    if (normalLayer._image) {
      normalLayer._image.style.mixBlendMode = blendMode;
    }

    if (visible) {
      normalLayer.addTo(map);
    }

    setLayer(normalLayer);

    return () => {
      if (normalLayer) {
        map.removeLayer(normalLayer);
      }
    };
  }, [map, visible, opacity, blendMode]);

  // Handle visibility toggle
  React.useEffect(() => {
    if (!layer || !map) return;

    if (visible) {
      if (!map.hasLayer(layer)) {
        map.addLayer(layer);
      }
    } else {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    }
  }, [visible, layer, map]);

  // Handle opacity changes
  React.useEffect(() => {
    if (!layer) return;
    layer.setOpacity(opacity);
  }, [opacity, layer]);

  return null; // Component doesn't render anything
}

export default HillshadeLayer;
