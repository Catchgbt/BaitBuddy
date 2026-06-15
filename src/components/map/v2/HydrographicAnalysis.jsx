import React, { useState, useCallback, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Droplets, TrendingUp } from 'lucide-react';

function HydrographicAnalysis({ visible = false, bounds = null }) {
  const map = useMap();
  const [analysis, setAnalysis] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const layersRef = useRef([]);

  const analyzeWaterData = useCallback(async (bounds) => {
    if (!bounds || !map) return;

    layersRef.current.forEach((layer) => {
      try {
        if (map.hasLayer(layer)) map.removeLayer(layer);
      } catch (err) {
        console.warn('Error removing layer:', err);
      }
    });
    layersRef.current = [];

    try {
      const data = await Promise.all([
        fetchWaterQualityData(bounds),
        fetchWaterTemperatureData(bounds),
        fetchWaterFlowData(bounds),
        fetchDepthProfile(bounds),
      ]);

      const [quality, temperature, flow, depth] = data;

      const metrics = {
        avgTemperature: temperature?.avg || null,
        avgPH: quality?.avgPH || null,
        avgDissolvedOxygen: quality?.avgDO || null,
        flowRate: flow?.rate || null,
        maxDepth: depth?.max || null,
        avgDepth: depth?.avg || null,
        quality: assessQuality({ quality, temperature, depth }),
      };

      setMetrics(metrics);
      if (map) {
        renderHydrographicVisualization(map, { quality, temperature, flow, depth });
      }
    } catch (error) {
      console.warn('Hydrographic analysis failed:', error);
    }
  }, [map]);

  React.useEffect(() => {
    if (!visible || !bounds) return;
    analyzeWaterData(bounds);
  }, [visible, bounds, analyzeWaterData]);

  const renderHydrographicVisualization = (map, data) => {
    // Temperature gradient heatmap
    if (data.temperature?.grid) {
      renderTemperatureHeatmap(map, data.temperature.grid);
    }

    // Flow vector field
    if (data.flow?.vectors) {
      renderFlowVectors(map, data.flow.vectors);
    }

    // Depth contours
    if (data.depth?.contours) {
      renderDepthContours(map, data.depth.contours);
    }

    // Quality zones
    if (data.quality?.zones) {
      renderQualityZones(map, data.quality.zones);
    }
  };

  const renderTemperatureHeatmap = (map, grid) => {
    // Create heatmap layer using temperature data
    const heatmapLayer = L.heatLayer(
      grid.map((point) => [point.lat, point.lng, point.temperature / 30]), // Normalize to 0-1
      {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: {
          0.0: 'blue',
          0.25: 'cyan',
          0.5: 'lime',
          0.75: 'yellow',
          1.0: 'red',
        },
        opacity: 0.6,
      }
    );

    heatmapLayer.addTo(map);
    layersRef.current.push(heatmapLayer);
  };

  const renderFlowVectors = (map, vectors) => {
    // Arrow markers showing water flow direction
    vectors.forEach((vector) => {
      const angle = vector.direction * (180 / Math.PI);

      const arrowIcon = L.divIcon({
        html: `<div style="
          transform: rotate(${angle}deg);
          color: rgba(0, 150, 255, 0.8);
          font-size: 20px;
          text-shadow: 0 0 3px rgba(0,0,0,0.5);
        ">→</div>`,
        iconSize: [20, 20],
        className: 'flow-arrow',
      });

      const marker = L.marker([vector.lat, vector.lng], {
        icon: arrowIcon,
        title: `Flow: ${vector.speed.toFixed(2)} m/s`,
      });

      marker.addTo(map);
      layersRef.current.push(marker);
    });
  };

  const renderDepthContours = (map, contours) => {
    // Polyline contours for water depth
    contours.forEach((contour) => {
      const color = `hsl(${240 - contour.depth * 5}, 100%, ${50 + contour.depth}%)`;

      const line = L.polyline(contour.points, {
        color: color,
        weight: 2,
        opacity: 0.7,
        className: 'depth-contour',
        title: `Depth: ${contour.depth}m`,
      });

      line.addTo(map);
      layersRef.current.push(line);
    });
  };

  const renderQualityZones = (map, zones) => {
    // Polygon zones colored by water quality
    zones.forEach((zone) => {
      const qualityColor =
        zone.quality === 'excellent'
          ? '#00ff00'
          : zone.quality === 'good'
          ? '#ffff00'
          : zone.quality === 'fair'
          ? '#ff8800'
          : '#ff0000';

      const polygon = L.polygon(zone.points, {
        color: qualityColor,
        fillColor: qualityColor,
        fillOpacity: 0.3,
        weight: 2,
      });

      polygon.bindPopup(`Quality: ${zone.quality.toUpperCase()}`);
      polygon.addTo(map);
      layersRef.current.push(polygon);
    });
  };

  React.useEffect(() => {
    return () => {
      if (!map) return;
      layersRef.current.forEach((layer) => {
        try {
          if (map.hasLayer(layer)) {
            map.removeLayer(layer);
          }
        } catch (err) {
          console.warn('Error removing layer:', err);
        }
      });
      layersRef.current = [];
    };
  }, [map]);

  return (
    <div className="absolute top-4 right-4 z-30 bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700 p-3 text-xs max-w-xs">
      {visible && metrics ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold">
            <Droplets className="w-4 h-4" />
            <span>Hydrographische Daten</span>
          </div>

          {metrics.avgTemperature && (
            <div>
              <span className="text-gray-400">Temperatur:</span>
              <span className="text-white ml-2">{metrics.avgTemperature.toFixed(1)}°C</span>
            </div>
          )}

          {metrics.avgPH && (
            <div>
              <span className="text-gray-400">pH:</span>
              <span className="text-white ml-2">{metrics.avgPH.toFixed(1)}</span>
            </div>
          )}

          {metrics.avgDissolvedOxygen && (
            <div>
              <span className="text-gray-400">Sauerstoff:</span>
              <span className="text-white ml-2">{metrics.avgDissolvedOxygen.toFixed(1)} mg/L</span>
            </div>
          )}

          {metrics.avgDepth && (
            <div>
              <span className="text-gray-400">Durchschn. Tiefe:</span>
              <span className="text-white ml-2">{metrics.avgDepth.toFixed(1)}m</span>
            </div>
          )}

          {metrics.flowRate && (
            <div>
              <span className="text-gray-400">Strömung:</span>
              <span className="text-white ml-2">{metrics.flowRate.toFixed(2)} m/s</span>
            </div>
          )}

          <div className="border-t border-gray-700 pt-2 mt-2">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span className="text-gray-400">Qualität:</span>
              <span
                className={`font-semibold ${
                  metrics.quality === 'excellent'
                    ? 'text-green-400'
                    : metrics.quality === 'good'
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}
              >
                {metrics.quality.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Placeholder data functions (would connect to real APIs)
async function fetchWaterQualityData(bounds) {
  return {
    avgPH: 7.2,
    avgDO: 8.5,
    zones: [],
  };
}

async function fetchWaterTemperatureData(bounds) {
  return {
    avg: 18.5,
    grid: [],
  };
}

async function fetchWaterFlowData(bounds) {
  return {
    rate: 0.5,
    vectors: [],
  };
}

async function fetchDepthProfile(bounds) {
  return {
    avg: 12,
    max: 45,
    contours: [],
  };
}

function assessQuality(data) {
  // Simple quality assessment
  const { quality, temperature, depth } = data;

  if (quality?.avgPH >= 7 && quality?.avgDO >= 7 && temperature?.avg >= 10) {
    return 'excellent';
  } else if (quality?.avgPH >= 6.5 && quality?.avgDO >= 5) {
    return 'good';
  } else if (quality?.avgDO >= 3) {
    return 'fair';
  }
  return 'poor';
}

export default HydrographicAnalysis;
