import React, { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, TrendingUp } from 'lucide-react';
import FishPredictionService from '../../services/FishPredictionService';

function PredictionWidget({ latitude, longitude, isActive }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isActive || !latitude || !longitude) return;

    const fetchPrediction = async () => {
      try {
        setLoading(true);
        const data = await FishPredictionService.predictFishActivity(latitude, longitude, new Date());
        setPrediction(data);
        setError(null);
      } catch (err) {
        console.error('Fehler beim Laden der Vorhersage:', err);
        setError('Vorhersage nicht verfügbar');
      } finally {
        setLoading(false);
      }
    };

    fetchPrediction();

    // Aktualisiere jede Minute
    const interval = setInterval(fetchPrediction, 60 * 1000);
    return () => clearInterval(interval);
  }, [latitude, longitude, isActive]);

  if (!isActive) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
        <Sparkles className="w-4 h-4 text-gray-500 mx-auto mb-1" />
        <div className="text-xs text-gray-400">KI wird trainiert...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
        <Sparkles className="w-4 h-4 text-blue-500 mx-auto mb-1 animate-pulse" />
        <div className="text-xs text-gray-400">Vorhersage wird berechnet...</div>
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

  if (!prediction || !prediction.predictions) return null;

  const predictions = Object.entries(prediction.predictions);
  const topPredictions = predictions.slice(0, 3);

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-900/30 border-green-700 text-green-400';
    if (score >= 60) return 'bg-blue-900/30 border-blue-700 text-blue-400';
    if (score >= 40) return 'bg-yellow-900/30 border-yellow-700 text-yellow-400';
    return 'bg-red-900/30 border-red-700 text-red-400';
  };

  const getScoreBar = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/20 border border-blue-600/50 rounded-lg p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
        <div>
          <div className="text-xs font-semibold text-blue-300">KI-Fang-Vorhersage</div>
          <div className="text-xs text-gray-400">Machine Learning analysiert Bedingungen</div>
        </div>
      </div>

      {/* Top Predictions */}
      <div className="space-y-2">
        {topPredictions.map(([species, data], idx) => (
          <div key={species} className={`border rounded-lg p-2 ${getScoreColor(data.score)}`}>
            {/* Ranking + Species */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">#{idx + 1}</span>
                <span className="font-semibold">{species}</span>
              </div>
              <span className="text-sm font-bold">{data.score}%</span>
            </div>

            {/* Recommendation */}
            <div className="text-xs text-gray-200 mb-1">{data.recommendation}</div>

            {/* Score Bar */}
            <div className="bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${getScoreBar(data.score)}`}
                style={{ width: `${data.score}%` }}
              />
            </div>

            {/* Factors (collapsed) */}
            {data.factors && (
              <div className="text-xs text-gray-400 mt-1 opacity-70">
                🌊 Gezeiten: {data.factors.tideBoost > 0 ? '+' : ''}{data.factors.tideBoost} |
                🌙 Solunar: {data.factors.solunarBoost > 0 ? '+' : ''}{Math.round(data.factors.solunarBoost)} |
                ⏰ Zeit: {data.factors.timeBoost > 0 ? '+' : ''}{data.factors.timeBoost}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* AI Info */}
      <div className="border-t border-blue-700/30 pt-2">
        <div className="text-xs text-blue-300 italic space-y-1">
          <div>💡 Die KI trainiert sich selbst mit deinen Fängen!</div>
          <div className="text-gray-400">Je mehr Fänge du loggst, desto besser die Vorhersagen.</div>
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-xs text-gray-500 text-center">
        Aktualisiert: {new Date(prediction.timestamp).toLocaleTimeString('de-DE')}
      </div>
    </div>
  );
}

export default PredictionWidget;
