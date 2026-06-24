import React, { useState, useEffect } from 'react';
import { Moon, Zap, AlertCircle } from 'lucide-react';
import SolunarService from '../../services/SolunarService';

function SolunarWidget({ latitude, longitude, isActive }) {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isActive || !latitude || !longitude) return;

    const fetchForecast = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const data = SolunarService.getDayForecast(latitude, longitude, today);
        setForecast(data);
        setError(null);
      } catch (err) {
        console.error('Fehler beim Laden der Solunar-Daten:', err);
        setError('Solunar-Daten nicht verfügbar');
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();

    // Aktualisiere jede Minute
    const interval = setInterval(fetchForecast, 60 * 1000);
    return () => clearInterval(interval);
  }, [latitude, longitude, isActive]);

  if (!isActive) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
        <Moon className="w-4 h-4 text-gray-500 mx-auto mb-1" />
        <div className="text-xs text-gray-400">Solunar-Daten werden geladen...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
        <Moon className="w-4 h-4 text-yellow-500 mx-auto mb-1 animate-pulse" />
        <div className="text-xs text-gray-400">Mondphase wird berechnet...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-red-300">{error}</div>
        </div>
      </div>
    );
  }

  if (!forecast) return null;

  const { moonPhase, major, minor, nextMajor, nextMinor, overallQuality } = forecast;

  const getQualityColor = (quality) => {
    if (quality >= 80) return 'text-green-400 bg-green-900/20';
    if (quality >= 60) return 'text-yellow-400 bg-yellow-900/20';
    if (quality >= 40) return 'text-orange-400 bg-orange-900/20';
    return 'text-red-400 bg-red-900/20';
  };

  const getQualityLabel = (quality) => {
    if (quality >= 80) return 'Exzellent';
    if (quality >= 60) return 'Gut';
    if (quality >= 40) return 'Moderat';
    return 'Schwach';
  };

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/20 border border-purple-600/50 rounded-lg p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="text-3xl">{moonPhase.emoji}</div>
        <div>
          <div className="text-xs font-semibold text-purple-300">Mondphase</div>
          <div className="text-xs text-gray-400">{moonPhase.name}</div>
        </div>
      </div>

      {/* Overall Quality Score */}
      <div className={`border rounded p-2 ${getQualityColor(overallQuality)}`}>
        <div className="text-xs font-bold text-center">
          {getQualityLabel(overallQuality)} - {overallQuality}%
        </div>
      </div>

      {/* Major & Minor Periods */}
      <div className="space-y-2 border-t border-purple-700/30 pt-2">
        {/* Major Period */}
        <div className="bg-gray-800/50 rounded p-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-400" />
              <span className="text-xs font-semibold text-yellow-300">{major.label}</span>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${major.quality >= 70 ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-300'}`}>
              {major.quality}%
            </span>
          </div>
          <div className="text-xs text-gray-400 mb-1">{major.description}</div>
          <div className="text-sm font-bold text-cyan-300">
            {major.time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </div>

          {/* Time until Major */}
          {nextMajor && (
            <div className="text-xs text-yellow-400 mt-1">
              in {nextMajor.hours}h {String(nextMajor.minutes).padStart(2, '0')}m
            </div>
          )}
        </div>

        {/* Minor Period */}
        <div className="bg-gray-800/50 rounded p-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-blue-400" />
              <span className="text-xs font-semibold text-blue-300">{minor.label}</span>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${minor.quality >= 60 ? 'bg-blue-900/50 text-blue-300' : 'bg-gray-700 text-gray-300'}`}>
              {minor.quality}%
            </span>
          </div>
          <div className="text-xs text-gray-400 mb-1">{minor.description}</div>
          <div className="text-sm font-bold text-cyan-300">
            {minor.time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </div>

          {/* Time until Minor */}
          {nextMinor && (
            <div className="text-xs text-blue-400 mt-1">
              in {nextMinor.hours}h {String(nextMinor.minutes).padStart(2, '0')}m
            </div>
          )}
        </div>
      </div>

      {/* Tip */}
      <div className="border-t border-purple-700/30 pt-2">
        <div className="text-xs text-purple-300 italic">
          {overallQuality >= 70 ? 'Heute sehr gute Fangchancen!' : 'Warte auf bessere Mondphase für optimale Chancen'}
        </div>
      </div>
    </div>
  );
}

export default SolunarWidget;
