import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { MAX_LEVEL } from '@shared/toolUnlocks';
import { useProgression } from './ProgressionContext';
import ToolIcon from './toolIcons';

/**
 * Level-Up-Feier: zeigt den neuen Rang und ALLE Tools, die mit diesem Sprung
 * dazugekommen sind (auch mehrere auf einmal). Erscheint genau einmal je
 * Level — die Quittierung läuft serverseitig über den zuletzt gesehenen Stand.
 *
 * Level 10 bekommt einen eigenen Abschluss-Text (Meisterangler).
 */
export default function LevelUpOverlay() {
  const { pendingLevelUp, acknowledgeLevelUp } = useProgression();
  const [visible, setVisible] = useState(false);
  const [stage, setStage] = useState('level');

  useEffect(() => {
    if (pendingLevelUp) {
      setStage('level');
      setVisible(true);
    }
  }, [pendingLevelUp]);

  // Erst der Rang, dann die neuen Tools — sonst konkurrieren beide Botschaften.
  useEffect(() => {
    if (!visible || stage !== 'level') return undefined;
    const id = setTimeout(() => setStage('tools'), 2200);
    return () => clearTimeout(id);
  }, [visible, stage]);

  if (!pendingLevelUp) return null;

  const { to_level: toLevel, rank, new_tools: newTools = [] } = pendingLevelUp;
  const isMaster = toLevel >= MAX_LEVEL;

  const close = () => {
    setVisible(false);
    acknowledgeLevelUp(toLevel);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="levelup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] bg-gray-950/95 backdrop-blur-sm flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Level ${toLevel} erreicht`}
        >
          <div className="w-full max-w-sm text-center">
            <AnimatePresence mode="wait">
              {stage === 'level' ? (
                <motion.div
                  key="stage-level"
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                  className="space-y-4"
                >
                  <motion.div
                    initial={{ rotate: -12, scale: 0.7 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                    className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500/25 to-emerald-500/25 border border-cyan-400/40 flex items-center justify-center"
                  >
                    <Trophy className="w-12 h-12 text-amber-300" aria-hidden="true" />
                  </motion.div>
                  <p className="text-sm font-semibold tracking-[0.3em] text-cyan-400 uppercase">
                    {isMaster ? 'Meisterangler' : 'Level up'}
                  </p>
                  <h2 className="text-3xl font-bold text-white">
                    {isMaster ? 'Höchster Rang erreicht' : `Level ${toLevel}`}
                  </h2>
                  <p className="text-lg text-emerald-300 font-semibold">{rank}</p>
                  {isMaster && (
                    <p className="text-sm text-gray-400">
                      Du hast den höchsten regulären BaitBuddy-Rang erreicht. Ab jetzt zählen deine XP
                      als Prestige weiter.
                    </p>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="stage-tools"
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <h2 className="text-xl font-bold text-white">
                    {newTools.length === 1
                      ? 'Neues Tool freigeschaltet'
                      : `${newTools.length} neue Tools freigeschaltet`}
                  </h2>
                  <p className="text-sm text-gray-400">
                    Als {rank} stehen dir ab sofort neue Werkzeuge zur Verfügung.
                  </p>

                  <div className="space-y-2 text-left">
                    {newTools.map((tool, index) => (
                      <motion.div
                        key={tool.id}
                        initial={{ x: -16, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.12 * index }}
                        className="flex items-center gap-3 rounded-xl bg-gray-900 border border-gray-800 p-3"
                      >
                        <span className="w-10 h-10 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                          <ToolIcon name={tool.icon} className="w-5 h-5 text-cyan-300" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">{tool.name}</p>
                          <p className="text-xs text-emerald-400">Jetzt verfügbar</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <Link to={createPageUrl('Tools')} onClick={close} className="w-full">
                      <Button className="w-full bg-gradient-to-r from-cyan-600 to-emerald-600 text-white">
                        Tools entdecken
                      </Button>
                    </Link>
                    <Button variant="ghost" onClick={close} className="w-full text-gray-400">
                      Später
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {stage === 'level' && (
              <Button variant="ghost" onClick={() => setStage('tools')} className="mt-6 text-gray-400">
                Weiter
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
