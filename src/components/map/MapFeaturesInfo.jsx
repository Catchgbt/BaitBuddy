import React, { useState, useEffect } from 'react';
import { X, Layers, MapPin, Zap, Eye, HelpCircle } from 'lucide-react';

/**
 * MapFeaturesInfo - Erklärt alle Kartenfunktionen und erweiterte Features
 */
function MapFeaturesInfo() {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  // Dismiss notification basierend auf localStorage
  useEffect(() => {
    const isDismissed = localStorage.getItem('mapFeaturesInfoDismissed');
    if (isDismissed) {
      setIsVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('mapFeaturesInfoDismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const features = [
    {
      icon: '📍',
      title: 'Marker & Spots',
      description: 'Klicke auf die Karte, um deine Angelplätze hinzuzufügen. Marker zeigen deine Spots und öffentliche Orte.'
    },
    {
      icon: '🗺️',
      title: 'Basis-Layer',
      description: 'OpenStreetMap Basiskarte mit automatischen Offline-Tiles. Tiles werden im Hintergrund gecacht für Offline-Nutzung.'
    },
    {
      icon: '🏔️',
      title: 'Relief-Shading',
      description: 'Zeigt das Geländerelief für bessere räumliche Wahrnehmung. Aktivierbar im Layer-Menü (oben links).'
    },
    {
      icon: '🗻',
      title: '3D-Gelände',
      description: 'Canvas-basierte Höhenvisualisierung mit Konturlinien für immersive Kartenerkundung.'
    },
    {
      icon: '💧',
      title: 'Hydrographische Daten',
      description: 'Zeigt Wasser-Temperatur (Heatmap), Strömungen (Pfeile), Tiefenprofil und Wasserqualität.'
    },
    {
      icon: '🛰️',
      title: 'Satelliten-Bilder',
      description: 'Multi-spektrale Satellitendaten von USGS und Sentinel-2 für präzise Lokalisierung.'
    }
  ];

  const advancedFeatures = [
    {
      icon: '⚡',
      label: 'Cache-Optimierung',
      description: 'Intelligente Tile-Komprimierung und LRU-Eviction für optimale Offline-Performance'
    },
    {
      icon: '📊',
      label: 'Cache-Statistiken',
      description: 'Echtzeit-Anzeige von Hit-Rate, Größe und Komprimierungsquote unten links'
    },
    {
      icon: '🌐',
      label: 'Offline-Modus',
      description: 'Funktioniert vollständig offline mit gecachten Tiles. Auto-Prefetch beim Scrolling.'
    },
    {
      icon: '🎨',
      label: 'Layer-Control',
      description: 'Einfaches Toggle-Panel oben links zum Ein-/Ausschalten aller Visualisierungen'
    }
  ];

  return (
    <div className="mb-4">
      {!isExpanded ? (
        // Kompakte Info-Box
        <div className="bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border border-cyan-700/60 rounded-lg p-4 flex items-start justify-between">
          <div className="flex gap-3 flex-1">
            <div className="text-2xl mt-0.5"></div>
            <div className="flex-1">
              <div className="font-semibold text-cyan-300 flex items-center gap-2">
                <span>Kartenfunktionen</span>
                <span className="text-xs bg-cyan-600/40 px-2 py-0.5 rounded">6 Features</span>
              </div>
              <p className="text-sm text-gray-300 mt-1">
                Offline-Caching, Relief-Shading, 3D-Terrain, Hydrographische Daten, Satelliten-Bilder und mehr
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsExpanded(true)}
              className="text-cyan-400 hover:text-cyan-300 p-1"
              title="Details anzeigen"
            >
              <Eye className="w-5 h-5" />
            </button>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-300 p-1"
              title="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        // Erweiterte Detailansicht
        <div className="bg-gray-900/95 border border-cyan-700 rounded-lg p-6 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="text-3xl"></div>
              <div>
                <h2 className="text-xl font-bold text-cyan-300">Karten-Features</h2>
                <p className="text-xs text-gray-400">Alle Funktionen & Bedienelemente</p>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-300 p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Haupt-Features */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Kartenlayer & Visualisierungen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="bg-gray-800 border border-gray-700 rounded p-3 hover:border-cyan-600 transition"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xl mt-0.5">{feature.icon}</span>
                    <div>
                      <div className="font-medium text-gray-200">{feature.title}</div>
                      <div className="text-xs text-gray-400 mt-1">{feature.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Features */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Erweiterte Funktionen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {advancedFeatures.map((feature, idx) => (
                <div
                  key={idx}
                  className="bg-gray-800/50 border border-gray-700 rounded p-3 flex gap-3"
                >
                  <div className="text-lg">{feature.icon}</div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-200 text-sm">{feature.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{feature.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controls & Bedienung */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Bedienung & Steuerung
            </h3>
            <div className="space-y-2 text-sm bg-gray-800/50 rounded p-4">
              <div className="flex gap-2">
                <span className="text-cyan-400 font-semibold min-w-[120px]">Klick auf Karte:</span>
                <span className="text-gray-300">Neuen Angelplatz hinzufügen</span>
              </div>
              <div className="flex gap-2">
                <span className="text-cyan-400 font-semibold min-w-[120px]">Klick auf Marker:</span>
                <span className="text-gray-300">Details & Fahrzeit anzeigen</span>
              </div>
              <div className="flex gap-2">
                <span className="text-cyan-400 font-semibold min-w-[120px]">Oben links :</span>
                <span className="text-gray-300">Layer-Steuerung (Relief, 3D, Wasser, Satellit)</span>
              </div>
              <div className="flex gap-2">
                <span className="text-cyan-400 font-semibold min-w-[120px]">Unten links :</span>
                <span className="text-gray-300">Cache-Statistiken & Offline-Status</span>
              </div>
              <div className="flex gap-2">
                <span className="text-cyan-400 font-semibold min-w-[120px]">Scrollen/Drag:</span>
                <span className="text-gray-300">Karte bewegen, Tiles automatisch gecacht</span>
              </div>
            </div>
          </div>

          {/* Performance Tipps */}
          <div className="bg-yellow-900/20 border border-yellow-700/40 rounded p-4 text-sm">
            <div className="flex gap-2 mb-2">
              <HelpCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-yellow-600">Tipps für beste Performance:</div>
                <ul className="text-gray-300 text-xs mt-1 space-y-1 ml-6 list-disc">
                  <li>Nicht mehr als 2-3 Layer gleichzeitig aktivieren</li>
                  <li>Offline-Caching für häufige Angelgebiete nutzen</li>
                  <li>Cache gelegentlich löschen wenn über 500MB</li>
                  <li>Satelliten-Layer nur bei hohem Zoom nutzen (ab ~10)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Dismiss Button */}
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setIsExpanded(false)}
              className="flex-1 bg-cyan-900/40 hover:bg-cyan-900/60 text-cyan-400 px-4 py-2 rounded font-medium transition"
            >
              Schließen
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded font-medium transition"
            >
              Nicht mehr anzeigen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapFeaturesInfo;
