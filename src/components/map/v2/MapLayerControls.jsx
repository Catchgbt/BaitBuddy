import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Eye, EyeOff, Layers, Mountain, Box, Waves, Satellite } from 'lucide-react';

/**
 * MapLayerControls - Steuerung für erweiterte Kartenlayer
 * - Hillshading
 * - 3D Terrain
 * - Hydrographische Analyse
 * - Satelliten-Überlagerung
 */
function MapLayerControls({
  onHillshadeToggle,
  on3DTerrainToggle,
  onHydrographicToggle,
  onSatelliteToggle,
  hillshadeEnabled = false,
  terrain3DEnabled = false,
  hydrographicEnabled = false,
  satelliteEnabled = false
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const controlRef = useRef(null);
  useEffect(() => {
    if (!controlRef.current) return;
    L.DomEvent.disableClickPropagation(controlRef.current);
    L.DomEvent.disableScrollPropagation(controlRef.current);
  }, []);

  const layers = [
    {
      id: 'hillshade',
      label: 'Relief-Shading',
      description: 'Geländerelief-Visualisierung',
      icon: Mountain,
      enabled: hillshadeEnabled,
      onToggle: onHillshadeToggle
    },
    {
      id: '3d-terrain',
      label: '3D Terrain',
      description: 'Dreidimensionale Höhenvisualisierung',
      icon: Box,
      enabled: terrain3DEnabled,
      onToggle: on3DTerrainToggle
    },
    {
      id: 'hydrographic',
      label: 'Hydrographische Daten',
      description: 'Wasser-Temperatur, Strömung, Tiefe',
      icon: Waves,
      enabled: hydrographicEnabled,
      onToggle: onHydrographicToggle
    },
    {
      id: 'satellite',
      label: 'Satelliten-Bilder',
      description: 'Multi-spektrale Satellitendaten',
      icon: Satellite,
      enabled: satelliteEnabled,
      onToggle: onSatelliteToggle
    }
  ];

  const enabledCount = layers.filter(l => l.enabled).length;

  return (
    <div ref={controlRef} className="absolute top-3 right-3 z-[1000]">
      {/* Collapsed button */}
      {!isExpanded && (
        <button type="button"
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-xl min-w-[48px] min-h-[48px] justify-center p-2.5 text-cyan-400 hover:bg-gray-900 transition hover:border-cyan-600"
          title="Erweiterte Kartenlayer"
          aria-label="Kartenebenen"
          aria-expanded={isExpanded}
        >
          <Layers className="w-5 h-5" />
          {enabledCount > 0 && (
            <span className="text-xs font-semibold bg-cyan-600/40 px-1.5 py-0.5 rounded">
              {enabledCount}
            </span>
          )}
        </button>
      )}

      {/* Expanded panel */}
      {isExpanded && (
        <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-700 p-4 w-64 max-h-[55vh] overflow-y-auto shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold">
              <Layers className="w-5 h-5" />
              <span>Kartenlayer</span>
            </div>
            <button type="button"
              aria-label="Kartenebenen schließen"
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-200 text-xl"
            >
              ×
            </button>
          </div>

          {/* Layer toggles */}
          <div className="space-y-2">
            {layers.map(layer => (
              <button type="button"
                key={layer.id}
                aria-pressed={layer.enabled}
                onClick={() => {
                  layer.onToggle(!layer.enabled);
                }}
                className={`w-full flex items-start gap-3 p-3 rounded-lg transition border ${
                  layer.enabled
                    ? 'bg-gray-800 border-cyan-600 text-cyan-400'
                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800 hover:border-gray-600'
                }`}
              >
                {/* Icon */}
                <layer.icon className="w-5 h-5 mt-0.5 shrink-0" aria-hidden="true" />

                {/* Content */}
                <div className="text-left flex-1">
                  <div className="font-medium text-sm">{layer.label}</div>
                  <div className="text-xs opacity-70">{layer.description}</div>
                </div>

                {/* Visibility icon */}
                <div className="mt-0.5">
                  {layer.enabled ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4 opacity-50" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Info */}
          <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700 text-xs text-gray-400">
            <p className="font-semibold text-gray-300 mb-1">Tipps:</p>
            <ul className="space-y-1 text-gray-500">
              <li>• Relief-Shading für bessere Geländewahrnehmung</li>
              <li>• 3D Terrain für immersive Erkundung</li>
              <li>• Hydrographische Daten für Wasserqualität</li>
              <li>• Satelliten für präzise Lokalisierung</li>
            </ul>
          </div>

          {/* Performance note */}
          {enabledCount >= 3 && (
            <div className="mt-3 p-2 bg-yellow-900/30 rounded border border-yellow-700/50 text-xs text-yellow-600">
              Viele aktive Layer können die Performance beeinflussen
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MapLayerControls;
