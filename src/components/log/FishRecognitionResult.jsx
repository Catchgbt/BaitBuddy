import React from 'react';
import { Sparkles, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { recognitionDetails } from '@/lib/fishRecognition';

// Zeigt das vollständige Ergebnis der KI-Fischerkennung als Review-Karte an:
// alle erkannten Merkmale (Art, wiss. Name, Länge, Gewicht, Umfang, Geschlecht,
// Alter, Köder, Zustand) plus Konfidenz. Der Nutzer übernimmt das Ergebnis
// bewusst ins Fangbuch-Formular oder verwirft es — nichts wird still gesetzt.
export default function FishRecognitionResult({ data, onApply, onDismiss }) {
  if (!data) return null;
  const rows = recognitionDetails(data);
  if (rows.length === 0) return null;

  const confidence = typeof data.confidence === 'number' ? Math.round(data.confidence * 100) : null;
  const confidenceColor =
    confidence == null ? 'text-gray-400'
      : confidence >= 75 ? 'text-emerald-400'
        : confidence >= 45 ? 'text-amber-400'
          : 'text-red-400';

  return (
    <div className="rounded-2xl border border-cyan-800/50 bg-gradient-to-br from-cyan-950/40 to-gray-900/40 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h3 className="text-cyan-300 font-semibold">KI-Erkennung</h3>
        </div>
        {confidence != null && (
          <span className={`text-sm font-medium ${confidenceColor}`}>{confidence}% sicher</span>
        )}
      </div>

      {confidence != null && (
        <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden" aria-hidden="true">
          <div
            className={`h-full rounded-full ${confidence >= 75 ? 'bg-emerald-500' : confidence >= 45 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${Math.max(confidence, 4)}%` }}
          />
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-xs text-gray-400">{row.label}</dt>
            <dd className={`text-sm text-white truncate ${row.italic ? 'italic' : ''}`} title={row.value}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => onApply?.(data)}
          className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white min-h-[44px]"
        >
          <Check className="w-4 h-4 mr-2" />
          Ins Fangbuch übernehmen
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onDismiss?.()}
          className="border-gray-700 text-gray-300 hover:bg-gray-700 min-h-[44px]"
          aria-label="KI-Erkennung verwerfen"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
