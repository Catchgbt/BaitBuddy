import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TOOL_BY_ID } from '@shared/toolUnlocks';
import { useProgression } from './ProgressionContext';
import ToolLockPanel from './ToolLockPanel';

/**
 * Sperrt eine Seite, bis das zugehörige Tool freigeschaltet ist.
 *
 * Gating-Regel (identisch im Server, siehe backend/src/routes/progression.js):
 * Zugang bei erreichtem Level ODER gekauftem Tool ODER passendem Abo. Der
 * Client rendert nur vor — Endpunkte, die echte Daten liefern, prüfen selbst.
 */
export default function ToolGuard({ toolId, children }) {
  const { loading, isToolUnlocked } = useProgression();
  const tool = TOOL_BY_ID[toolId];

  // Unbekannte Tool-ID darf keine funktionierende Seite blockieren.
  if (!tool) return children;

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isToolUnlocked(toolId)) return children;

  return (
    <div className="min-h-screen bg-gray-950 p-4 sm:p-6">
      <div className="max-w-md mx-auto pt-6">
        <Card className="glass-morphism border-gray-800 rounded-2xl">
          <CardContent className="p-6">
            <ToolLockPanel toolId={toolId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
