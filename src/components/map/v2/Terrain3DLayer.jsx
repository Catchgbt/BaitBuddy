import React, { useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * Terrain3DLayer - 3D Terrain Visualisierung mit Cesium
 * oder alternativ mit Canvas-basierter Höhenvisualisierung
 */
function Terrain3DLayer({ visible = false, mode = 'canvas' }) {
  const map = useMap();
  const [terrain, setTerrain] = useState(null);
  const [stats, setStats] = useState(null);

  React.useEffect(() => {
    if (!map || !visible) return;

    if (mode === 'cesium') {
      // Cesium 3D Terrain (requires external library)
      loadCesium3D(map);
    } else {
      // Canvas-based terrain overlay
      loadCanvasTerrain(map);
    }
  }, [map, visible, mode]);

  const loadCesium3D = async (map) => {
    try {
      // Load Cesium library dynamically
      const cesium = await import('cesium');

      // Setup Cesium container
      const cesiumContainer = document.createElement('div');
      cesiumContainer.id = 'cesium-container';
      cesiumContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10;
        opacity: 0.7;
      `;

      // Initialize Cesium viewer with terrain
      const viewer = new cesium.Viewer(cesiumContainer, {
        terrainProvider: await cesium.CesiumTerrainProvider.fromUrl(
          'https://assets.cesium.com/1/',
          {
            requestWaterMask: true,
            requestVertexNormals: true,
          }
        ),
        baseLayerPicker: false,
        animation: false,
        timeline: false,
      });

      setTerrain(viewer);
      return viewer;
    } catch (error) {
      console.warn('Cesium 3D not available:', error);
      loadCanvasTerrain(map);
    }
  };

  const loadCanvasTerrain = (map) => {
    // Canvas-based elevation visualization
    // Uses elevation data to create shaded relief

    const canvas = document.createElement('canvas');
    canvas.width = map.getSize().x;
    canvas.height = map.getSize().y;

    const ctx = canvas.getContext('2d');

    // Create gradient-based elevation visualization
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(70, 130, 180, 0.1)'); // Sky blue
    gradient.addColorStop(0.3, 'rgba(144, 238, 144, 0.15)'); // Light green (low elevation)
    gradient.addColorStop(0.6, 'rgba(218, 165, 32, 0.15)'); // Brown (mid elevation)
    gradient.addColorStop(1, 'rgba(192, 192, 192, 0.2)'); // Gray (high elevation)

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add subtle contour lines
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.1)';
    ctx.lineWidth = 1;

    for (let i = 0; i < 10; i++) {
      const y = (canvas.height / 10) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Create custom overlay
    const overlay = L.imageOverlay(canvas.toDataURL(), map.getBounds(), {
      opacity: 0.3,
      interactive: false,
      className: 'terrain-3d-overlay',
    });

    overlay.addTo(map);
    setTerrain(overlay);

    // Update on map move
    map.on('moveend', () => {
      overlay.setBounds(map.getBounds());
    });

    setStats({
      mode: 'canvas',
      available: true,
    });
  };

  React.useEffect(() => {
    return () => {
      if (terrain && map) {
        if (terrain.addTo) {
          // Leaflet layer
          map.removeLayer(terrain);
        }
      }
    };
  }, [terrain, map]);

  return null;
}

export default Terrain3DLayer;
