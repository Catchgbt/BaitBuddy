import React, { useState } from 'react';
import { ChevronRight, Layers, Eye, EyeOff, Sparkles, Antenna, Mountain, Droplets, Satellite, Zap, Rocket, MapPin, Map, Fish, Palette, Waves, Bot, Moon, Target, Bell, BarChart3 } from 'lucide-react';

/**
 * MapNavigationHub - Zentrale Steuerstelle für alle Kartenfunktionen
 * Vereinfacht Zugang zu komplexen Features durch Kategorien & Modi
 */
function MapNavigationHub({
  onFeatureSelect,
  onModeChange,
  currentMode = 'guided' // 'guided' | 'simple' | 'advanced'
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState('new-features'); // Zeige neue Features zuerst
  const [hideHints, setHideHints] = useState(false);

  const categories = {
    'new-features': {
      title: 'NEU: 6 Advanced Features',
      icon: Sparkles,
      description: 'Alle neuen Funktionen in dieser Version',
      features: [
        {
          id: 'offline-cache',
          name: 'Phase 1: Offline Tile-Caching',
          description: 'Automatisches Caching von Kartenkacheln für vollständig offline funktionierende Touren',
          difficulty: 'easy',
          icon: Antenna,
          tooltip: 'Aktiviert automatisch - speichert Tiles während du die Karte nutzt',
        },
        {
          id: 'relief-shading',
          name: 'Phase 2: Relief-Shading',
          description: 'Mapzen Terrain Normal Maps für 3D-ähnliche Geländevisualisierung',
          difficulty: 'easy',
          icon: Mountain,
          tooltip: 'Gibt der Karte ein plastisches Aussehen - Klick auf Hub zum Aktivieren',
        },
        {
          id: '3d-terrain',
          name: 'Phase 3: 3D-Terrain',
          description: 'Canvas-basierte Höhenvisualisierung mit Konturlinien',
          difficulty: 'medium',
          icon: Mountain,
          tooltip: 'Immersive 3D-Ansicht - nutze mit Relief-Shading zusammen',
        },
        {
          id: 'hydrographic',
          name: 'Phase 4: Hydrographische Analyse',
          description: 'Wasser-Temperatur (Heatmap), Strömungen, Tiefe & Qualitätsbewertung',
          difficulty: 'medium',
          icon: Droplets,
          tooltip: 'Zeigt optimale Fangzonen basierend auf Wasserparametern',
        },
        {
          id: 'satellite',
          name: 'Phase 5: Satelliten-Bilder',
          description: 'USGS & Sentinel-2 Multi-spektrale Satellitendaten in Echtzeit',
          difficulty: 'medium',
          icon: Satellite,
          tooltip: 'Beste ab Zoom 10+ - zeigt präzise Luftaufnahmen',
        },
        {
          id: 'cache-opt',
          name: 'Phase 6: Cache-Optimierung',
          description: 'LRU-Eviction, automatische Komprimierung & Hit-Rate-Tracking',
          difficulty: 'hard',
          icon: Zap,
          tooltip: 'Intelligent - passt Cache-Größe automatisch an',
        },
      ],
    },
    'quick-start': {
      title: 'Schnelleinstieg',
      icon: Rocket,
      description: 'Die wichtigsten Funktionen',
      features: [
        {
          id: 'add-spot',
          name: 'Spot hinzufügen',
          description: 'Klicke auf die Karte um einen neuen Angelplatz zu markieren',
          difficulty: 'easy',
          icon: MapPin,
        },
        {
          id: 'view-spots',
          name: 'Meine Spots anzeigen',
          description: 'Sehe alle deine Angelplätze auf der Karte',
          difficulty: 'easy',
          icon: Map,
        },
        {
          id: 'live-trip',
          name: 'Live-Tour starten',
          description: 'Starte GPS-Tracking und Fang-Logging während du angelst',
          difficulty: 'easy',
          icon: Fish,
        },
      ],
    },
    'visualization': {
      title: 'Visualisierungen',
      icon: Palette,
      description: 'Verschiedene Kartenansichten & Layer',
      features: [
        {
          id: 'relief-shading',
          name: 'Relief-Shading',
          description: 'Zeigt Geländeformen durch Schattierung - für bessere räumliche Wahrnehmung',
          difficulty: 'easy',
          icon: Mountain,
          tooltip: 'Schalte aus wenn die Karte zu dunkel wird',
        },
        {
          id: '3d-terrain',
          name: '3D-Gelände',
          description: 'Canvas-basierte 3D-Höhenvisualisierung mit Konturlinien',
          difficulty: 'medium',
          icon: Mountain,
          tooltip: 'Kann Performance beeinflussen - nutze mit Relief-Shading zusammen',
        },
        {
          id: 'satellite',
          name: 'Satelliten-Bilder',
          description: 'Präzise Luftaufnahmen von USGS und Sentinel-2',
          difficulty: 'medium',
          icon: Satellite,
          tooltip: 'Beste bei Zoom-Level 10+',
        },
      ],
    },
    'water-analysis': {
      title: 'Gewässeranalyse',
      icon: Droplets,
      description: 'Wissenschaftliche Wasser- & Gezeitendaten',
      features: [
        {
          id: 'tides',
          name: 'Gezeiten (Echtzeit)',
          description: 'Aktuelle Gezeitenhöhe + 7-Tage-Vorhersage von NOAA',
          difficulty: 'easy',
          icon: Waves,
          tooltip: 'Optimal: ±1h vor/nach Hoch- oder Niedrigwasser',
        },
        {
          id: 'hydrographic',
          name: 'Hydrographische Daten',
          description: 'Wasser-Temperatur (Heatmap), Strömungen, Tiefe & Qualität',
          difficulty: 'medium',
          icon: Droplets,
          tooltip: 'Zeigt wo das Wasser am warmsten/kältesten ist',
        },
      ],
    },
    'smart-features': {
      title: 'Intelligente Features',
      icon: Bot,
      description: 'KI-gestützte Vorhersagen & Echtzeitwarnungen',
      features: [
        {
          id: 'solunar',
          name: 'Solunar-Kalender',
          description: 'Mondphase + optimale Fresszeiten basierend auf Astronomie',
          difficulty: 'medium',
          icon: Moon,
          tooltip: 'Beste Fänge: 1h vor/nach Major-Events (Mond-Transit)',
        },
        {
          id: 'ai-forecast',
          name: 'KI-Fang-Vorhersage',
          description: 'Machine Learning Vorhersagen basierend auf Gezeiten + Solunar + deinen Fängen',
          difficulty: 'hard',
          icon: Target,
          tooltip: 'Lerne deine Arten kennen: Je mehr Daten, desto besser die Vorhersage',
        },
        {
          id: 'notifications',
          name: 'Smart Notifications',
          description: 'Push-Benachrichtigungen bei optimalen Angelbedingungen',
          difficulty: 'easy',
          icon: Bell,
          tooltip: 'Aktiviere: Einstellungen → Benachrichtigungen',
        },
      ],
    },
    'performance': {
      title: 'Performance & Offline',
      icon: Zap,
      description: 'Cache-Optimierung & Offline-Funktionalität',
      features: [
        {
          id: 'offline-cache',
          name: 'Offline-Tile-Caching',
          description: 'Automatisches Caching von Kartenkacheln für Offline-Nutzung',
          difficulty: 'easy',
          icon: Antenna,
          tooltip: 'Aktiviert automatisch - keine Aktion nötig',
        },
        {
          id: 'cache-stats',
          name: 'Cache-Statistiken',
          description: 'Hit-Rate, Größe & Komprimierung deines Caches',
          difficulty: 'medium',
          icon: BarChart3,
          tooltip: 'Unten links im Live-Trip-Modus',
        },
      ],
    },
  };

  const modes = [
    {
      id: 'guided',
      name: 'Geführt',
      description: 'Features werden Schritt für Schritt erklärt',
      features: ['Tooltips & Tipps', 'Guided Tours', 'Kontexthilfe'],
    },
    {
      id: 'simple',
      name: 'Einfach',
      description: 'Nur häufigste Funktionen sichtbar',
      features: ['Vereinfachte UI', 'Schnellzugriffe', 'Minimal Features'],
    },
    {
      id: 'advanced',
      name: 'Erweitert',
      description: 'Alle Features sofort zugänglich',
      features: ['Alle Layer', 'Erweiterte Optionen', 'Keine Einschränkungen'],
    },
  ];

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-900/30 border-green-700 text-green-400';
      case 'medium':
        return 'bg-yellow-900/30 border-yellow-700 text-yellow-400';
      case 'hard':
        return 'bg-red-900/30 border-red-700 text-red-400';
      default:
        return 'bg-gray-800 border-gray-700 text-gray-400';
    }
  };

  const getDifficultyLabel = (difficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'Einfach';
      case 'medium':
        return 'Mittel';
      case 'hard':
        return 'Fortgeschritten';
      default:
        return 'Standard';
    }
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-24 right-4 z-40">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white p-4 rounded-full shadow-lg flex items-center justify-center w-14 h-14 transition-all hover:scale-110"
          title="Map Navigation Hub öffnen"
          aria-label="Map Navigation Hub öffnen"
        >
          <Layers className="w-6 h-6" />
        </button>
      </div>
    );
  }

  const currentCategory = categories[activeCategory];
  const currentModeData = modes.find(m => m.id === currentMode);

  return (
    <div className="fixed left-2 right-2 sm:left-auto sm:right-4 bottom-24 z-[60] bg-gray-900/95 border border-cyan-700 rounded-2xl shadow-2xl sm:max-w-md max-h-[70vh] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900/98 border-b border-cyan-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="text-2xl"></div>
            <h1 className="text-lg font-bold text-cyan-300">Map Navigation Hub</h1>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-400 hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Mode Selector */}
        <div className="text-xs text-gray-400 mb-2">Aktueller Modus:</div>
        <div className="flex gap-2 flex-wrap">
          {modes.map(mode => (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                currentMode === mode.id
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {mode.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 space-y-4">
        {/* Mode Info */}
        {currentModeData && (
          <div className="bg-blue-900/20 border border-blue-700/50 rounded p-3">
            <div className="font-semibold text-blue-300 mb-1">{currentModeData.name}</div>
            <div className="text-xs text-blue-200">{currentModeData.description}</div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {currentModeData.features.map((f, i) => (
                <span key={i} className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Category Navigation */}
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(categories).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`p-3 rounded-lg border-2 transition text-left ${
                activeCategory === key
                  ? 'bg-cyan-900/40 border-cyan-600'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="text-cyan-300">{cat.icon ? <cat.icon className="w-5 h-5" /> : null}</div>
              <div className="font-semibold text-sm text-cyan-300 mt-1">{cat.title}</div>
              <div className="text-xs text-gray-400">{cat.description}</div>
            </button>
          ))}
        </div>

        {/* Feature List */}
        {currentCategory && (
          <div className="space-y-2">
            <h3 className="font-semibold text-cyan-400 flex items-center gap-2">
              {currentCategory.icon ? <currentCategory.icon className="w-4 h-4" /> : null} {currentCategory.title}
            </h3>

            {currentCategory.features.map(feature => (
              <div
                key={feature.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-3 hover:border-cyan-600 transition cursor-pointer group"
                onClick={() => onFeatureSelect(feature.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-300">{feature.icon ? <feature.icon className="w-5 h-5" /> : null}</span>
                      <span className="font-semibold text-gray-200">{feature.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded border ${getDifficultyColor(feature.difficulty)}`}>
                        {getDifficultyLabel(feature.difficulty)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{feature.description}</p>
                    {feature.tooltip && (
                      <p className="text-xs text-yellow-600 mt-1 italic">{feature.tooltip}</p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 transition" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-gray-900/98 border-t border-cyan-700 p-3 flex items-center justify-between">
        <button
          onClick={() => setHideHints(!hideHints)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300"
        >
          {hideHints ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {hideHints ? 'Tipps anzeigen' : 'Tipps verbergen'}
        </button>
        <div className="text-xs text-gray-500">
          Klick auf Features um sie zu aktivieren
        </div>
      </div>
    </div>
  );
}

export default MapNavigationHub;
