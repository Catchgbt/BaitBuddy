import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';

/**
 * NewFeaturesNotification - Zeigt neue Map-Features mit Schließen-Option
 * Speichert Schließen-Status in LocalStorage
 */

function NewFeaturesNotification() {
  const [isVisible, setIsVisible] = useState(true);
  const [showAnimation, setShowAnimation] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem('map-features-dismissed-v1');
    if (dismissed) {
      setIsVisible(false);
    } else {
      setShowAnimation(true);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('map-features-dismissed-v1', 'true');
  };

  if (!isVisible) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 border-cyan-500/50 bg-gradient-to-r from-cyan-900/40 via-blue-900/40 to-cyan-900/40 p-4 backdrop-blur-sm transition-all ${
        showAnimation ? 'animate-in fade-in slide-in-from-top-2' : ''
      }`}
    >
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent animate-pulse" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex-shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5 text-cyan-400 animate-bounce" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-cyan-300 mb-2">
              Neue Karten-Features
            </h3>
            <ul className="text-xs text-gray-300 space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                <strong>Deutsche Flüsse:</strong> Rhein, Donau, Main, Mosel, Elbe & 5 weitere
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                <strong>Tiefenkarten:</strong> Echte Bathymetrie für Ems, Neckar, Wümme, NOK & Weser
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                <strong>26 Forellenseen:</strong> Österreich, Schweiz, Slowenien
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                <strong>Bathymetrie:</strong> Alle 16 Bundesländer vorbereitet
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                <strong>Performance:</strong> Map 4-5s Einfrieren behoben!
              </li>
            </ul>
            <p className="text-xs text-gray-400 mt-2">
              Nutze die neuen Filter rechts oben auf der Karte (Flüsse, Tiefenkarten, etc.)
            </p>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          aria-label="Schließen"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
    </div>
  );
}

export default NewFeaturesNotification;
