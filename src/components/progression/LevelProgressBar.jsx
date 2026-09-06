import React from 'react';
import ToolIcon from './toolIcons';

/**
 * XP-Fortschrittsbalken mit Rang. `levelInfo` ist das `level`-Objekt aus
 * GET /api/progression/me. Ab Level 10 zeigt der Balken den Fortschritt zur
 * nächsten Prestige-Stufe — die XP-Sammlung endet nie.
 */
export default function LevelProgressBar({ levelInfo, compact = false }) {
  if (!levelInfo) return null;

  const {
    current, rank, rank_icon: rankIcon, prestige, is_max_level: isMaxLevel,
    xp_in_level: xpInLevel, xp_to_next: xpToNext, next_level_xp: nextLevelXp,
    level_floor_xp: levelFloorXp, progress,
  } = levelInfo;

  const percent = Math.round(Math.min(1, Math.max(0, progress || 0)) * 100);
  const spanXp = Math.max(1, nextLevelXp - levelFloorXp);
  const title = isMaxLevel && prestige > 0
    ? `${rank} — Prestige ${prestige}`
    : `Level ${current} — ${rank}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
            <ToolIcon name={rankIcon} className="w-4 h-4 text-cyan-300" />
          </span>
          <span className="font-semibold text-white truncate">{title}</span>
        </div>
        {!compact && (
          <span className="text-xs text-gray-400 whitespace-nowrap tabular-nums">
            {xpInLevel.toLocaleString('de-DE')} / {spanXp.toLocaleString('de-DE')} XP
          </span>
        )}
      </div>

      <div
        className="h-2.5 rounded-full bg-gray-800 overflow-hidden"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${title}, ${percent} Prozent bis zum nächsten Ziel`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="text-xs text-gray-400">
        {isMaxLevel
          ? `Noch ${xpToNext.toLocaleString('de-DE')} XP bis Prestige ${prestige + 1}`
          : `Noch ${xpToNext.toLocaleString('de-DE')} XP bis Level ${current + 1}`}
      </p>
    </div>
  );
}
