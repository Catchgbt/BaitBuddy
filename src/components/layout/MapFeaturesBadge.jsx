import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';

/**
 * MapFeaturesBadge - Header-Benachrichtigung für neue Map-Features
 * Wird oben rechts angezeigt, kann geschlossen werden
 */

function MapFeaturesBadge() {
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('map-features-badge-dismissed');
    if (!dismissed) {
      // Kurz nach dem Laden anzeigen
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('map-features-badge-dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600/80 to-blue-600/80 hover:from-cyan-500 hover:to-blue-500 border border-cyan-400/50 text-white text-xs font-semibold transition-all shadow-lg hover:shadow-cyan-500/50 group animate-pulse"
        aria-label="Neue Map-Features"
      >
        <Sparkles className="w-4 h-4 group-hover:animate-spin" />
        <span className="hidden sm:inline">Neu!</span>

        {/* Schließen Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="ml-1 p-0.5 hover:bg-white/20 rounded transition-colors"
          aria-label="Benachrichtigung schließen"
        >
          <X className="w-3 h-3" />
        </button>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-full right-0 mt-2 w-56 p-3 rounded-lg bg-gray-900/95 border border-cyan-500/30 text-xs text-gray-300 z-50 shadow-xl">
          <div className="font-semibold text-cyan-300 mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            5 neue Features
          </div>
          <ul className="space-y-1 text-xs">
            <li><strong>Deutsche Flüsse</strong> - 10 Hauptflüsse</li>
            <li><strong>Tiefenkarten</strong> - 7 echte Bathymetrien</li>
            <li><strong>Forellenseen</strong> - 26 europäische Seen</li>
            <li><strong>Bathymetrie</strong> - Alle Bundesländer</li>
            <li><strong>Performance</strong> - 4-5s Fix!</li>
          </ul>
          <p className="text-gray-400 mt-2">
            Filter rechts oben auf der Karte aktivieren
          </p>
        </div>
      )}
    </div>
  );
}

export default MapFeaturesBadge;
