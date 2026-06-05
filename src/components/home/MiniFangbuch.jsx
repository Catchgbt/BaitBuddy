import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Fish, BookOpen, Ruler, Weight, Calendar } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function MiniFangbuch() {
  const [lastCatch, setLastCatch] = useState(null);
  const [totalCatches, setTotalCatches] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCatches = async () => {
      try {
        const catches = await base44.entities.Catch.list('-catch_time', 1);
        const allCatches = await base44.entities.Catch.list();
        
        if (catches.length > 0) {
          setLastCatch(catches[0]);
        }
        setTotalCatches(allCatches.length);
      } catch (error) {
        console.error("Fehler beim Laden der Fänge:", error);
      }
      setLoading(false);
    };

    loadCatches();
  }, []);

  if (loading) {
    return (
      <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
        <div className="text-gray-400 text-center text-sm">Fangbuch lädt...</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-cyan-400 font-medium text-sm drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">Fangbuch</h3>
        <BookOpen className="w-5 h-5 text-emerald-400" />
      </div>
      
      {lastCatch ? (
        <div className="space-y-3">
          {/* Bild und Hauptinfos */}
          <div className="flex items-center gap-3">
            {lastCatch.photo_url ? (
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 border-emerald-400/30">
                <img 
                  src={lastCatch.photo_url} 
                  alt={lastCatch.species || 'Fang'} 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-lg flex-shrink-0 bg-gray-700/50 flex items-center justify-center text-3xl">
                🐟
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold text-white truncate">
                {lastCatch.species || 'Unbekannter Fisch'}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(lastCatch.catch_time), 'dd. MMM yyyy', { locale: de })}
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-700/50">
            {/* Länge */}
            {lastCatch.length_cm && (
              <div className="flex items-center gap-2 bg-gray-700/30 rounded-lg p-2">
                <Ruler className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-400">Länge</div>
                  <div className="text-sm font-semibold text-white">{lastCatch.length_cm} cm</div>
                </div>
              </div>
            )}

            {/* Gewicht */}
            {lastCatch.weight_kg && (
              <div className="flex items-center gap-2 bg-gray-700/30 rounded-lg p-2">
                <Weight className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-400">Gewicht</div>
                  <div className="text-sm font-semibold text-white">{lastCatch.weight_kg} kg</div>
                </div>
              </div>
            )}

            {/* Wenn keine Details vorhanden, zeige Platzhalter */}
            {!lastCatch.length_cm && !lastCatch.weight_kg && (
              <div className="col-span-2 text-center text-xs text-gray-500 py-2">
                Keine Größenangaben erfasst
              </div>
            )}
          </div>

          {/* Gesamtzahl */}
          <div className="flex items-center justify-center gap-2 pt-2 border-t border-gray-700/50">
            <Fish className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-emerald-400 font-medium">
              {totalCatches} Fang{totalCatches !== 1 ? 'e' : ''} insgesamt
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <Fish className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <div className="text-sm text-gray-400">Noch keine Fänge</div>
          <div className="text-xs text-gray-500 mt-1">Starte dein Fangbuch!</div>
        </div>
      )}
    </div>
  );
}