import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Lock } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProgression } from './ProgressionContext';
import LevelProgressBar from './LevelProgressBar';
import ToolIcon from './toolIcons';

/**
 * Angel-Level im Profil: Rang, XP-Fortschritt, woher die XP kommen, gekaufte
 * Tools und die nächsten Freischaltungen. Das Profil selbst bleibt immer
 * erreichbar — hier wird nichts gesperrt.
 */
export default function ProfileProgressionCard() {
  const { loading, levelInfo, totalXp, tools, purchasedToolIds, nextUnlocks, incompleteSources } =
    useProgression();

  const unlockedCount = tools.filter((t) => t.unlocked).length;

  return (
    <Card className="glass-morphism border-gray-800 rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">
          Angel-Level &amp; Tools
        </CardTitle>
        <Link
          to={createPageUrl('Tools')}
          className="text-xs text-cyan-300 flex items-center gap-1 focus:ring-2 focus:ring-cyan-400 rounded"
        >
          Alle Tools
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && !levelInfo ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <LevelProgressBar levelInfo={levelInfo} />

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-3">
                <p className="text-xs text-gray-500">Gesamt-XP</p>
                <p className="text-lg font-semibold text-white tabular-nums">
                  {totalXp.toLocaleString('de-DE')}
                </p>
              </div>
              <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-3">
                <p className="text-xs text-gray-500">Freigeschaltet</p>
                <p className="text-lg font-semibold text-white tabular-nums">
                  {unlockedCount} / {tools.length}
                </p>
              </div>
            </div>

            {incompleteSources.length > 0 && (
              <p className="text-xs text-amber-400">
                Einige Aktivitätsdaten sind gerade nicht abrufbar — der XP-Stand kann dadurch zu
                niedrig sein.
              </p>
            )}

            {purchasedToolIds.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Gekaufte Tools
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {purchasedToolIds.map((id) => {
                    const tool = tools.find((t) => t.id === id);
                    return (
                      <Badge key={id} variant="outline" className="border-emerald-600/50 text-emerald-300">
                        {tool?.name || id}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {nextUnlocks.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Als Nächstes
                </p>
                <div className="space-y-1.5">
                  {nextUnlocks.map((tool) => (
                    <div
                      key={tool.id}
                      className="flex items-center gap-2 rounded-lg bg-gray-900/50 border border-gray-800 p-2"
                    >
                      <ToolIcon name={tool.icon} className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm text-gray-300 truncate flex-1">{tool.name}</span>
                      <span className="flex items-center gap-1 text-xs text-amber-400 flex-shrink-0">
                        <Lock className="w-3 h-3" aria-hidden="true" />
                        Level {tool.required_level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
