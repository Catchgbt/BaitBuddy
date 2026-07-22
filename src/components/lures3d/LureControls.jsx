import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, RotateCcw } from 'lucide-react';

// Auswahl- und Wiedergabe-Steuerung der 3D-Köderanimation.
export default function LureControls({
  lures,
  selectedLureId,
  onSelectLure,
  selectedStyleId,
  onSelectStyle,
  speed,
  onSpeedChange,
  paused,
  onTogglePause,
  onResetCamera,
}) {
  const selectedLure = lures.find((l) => l.id === selectedLureId);

  return (
    <div className="space-y-3">
      <div
        className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]"
        role="tablist"
        aria-label="Köder auswählen"
      >
        {lures.map((lure) => (
          <button type="button"
            key={lure.id}
            role="tab"
            aria-selected={lure.id === selectedLureId}
            onClick={() => onSelectLure(lure.id)}
            className={`min-h-[44px] shrink-0 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              lure.id === selectedLureId
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                : 'border-gray-700 bg-gray-800/60 text-gray-300 hover:border-gray-500'
            }`}
          >
            {lure.name}
          </button>
        ))}
      </div>

      {selectedLure && selectedLure.styles.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Führungsstil auswählen">
          {selectedLure.styles.map((style) => (
            <button type="button"
              key={style.id}
              role="tab"
              aria-selected={style.id === selectedStyleId}
              onClick={() => onSelectStyle(style.id)}
              className={`min-h-[44px] rounded-lg border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                style.id === selectedStyleId
                  ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                  : 'border-gray-700 bg-gray-800/60 text-gray-300 hover:border-gray-500'
              }`}
            >
              {style.name}
            </button>
          ))}
        </div>
      )}

      <Card className="border-gray-800 bg-gray-900/70">
        <CardContent className="flex items-center gap-4 p-3">
          <Button
            variant="outline"
            size="icon"
            className="min-h-[44px] min-w-[44px] border-gray-700 bg-gray-800 text-cyan-300 hover:bg-gray-700"
            onClick={onTogglePause}
            aria-label={paused ? 'Animation fortsetzen' : 'Animation pausieren'}
          >
            {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </Button>
          <div className="flex-1">
            <div className="mb-1 flex justify-between text-xs text-gray-400">
              <span id="lure-speed-label">Einholtempo</span>
              <span>{speed.toFixed(1)}x</span>
            </div>
            <Slider
              value={[speed]}
              min={0.5}
              max={2}
              step={0.1}
              onValueChange={([v]) => onSpeedChange(v)}
              aria-labelledby="lure-speed-label"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="min-h-[44px] min-w-[44px] border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
            onClick={onResetCamera}
            aria-label="Kamera zurücksetzen"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
