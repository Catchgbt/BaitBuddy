import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { TOOL_BY_ID, TOOL_UNLOCK_PRICE_CENTS } from '@shared/toolUnlocks';
import { useProgression } from './ProgressionContext';
import { formatPrice, isToolPurchaseAvailable, startToolUnlockPurchase } from './toolPurchase';
import LevelProgressBar from './LevelProgressBar';
import ToolIcon from './toolIcons';

/**
 * Erklärt ein gesperrtes Tool und bietet beide Wege an: kostenlos weiter
 * angeln bis zum Level, oder optional sofort freischalten.
 *
 * Der Ton ist bewusst kein Bezahl-Zwang: das Level ist der reguläre Weg, der
 * Kauf nur eine Abkürzung.
 */
export default function ToolLockPanel({ toolId, onUnlocked, className = '' }) {
  const { level, levelInfo, reload, markToolUnlocked } = useProgression();
  const [buying, setBuying] = useState(false);
  const tool = TOOL_BY_ID[toolId];

  if (!tool) return null;

  const handleBuy = async () => {
    setBuying(true);
    const result = await startToolUnlockPurchase(tool.id);

    // Stripe leitet die Seite weiter — in dem Fall bleibt der Button im
    // Ladezustand, bis der Browser navigiert.
    if (result.redirected) return;

    setBuying(false);

    if (result.success) {
      markToolUnlocked(tool.id);
      toast.success(`${tool.name} freigeschaltet`, {
        description: 'Du kannst das Tool ab sofort verwenden.',
      });
      reload({ refresh: true });
      onUnlocked?.(tool.id);
      return;
    }
    if (result.cancelled) return;
    toast.error('Freischaltung nicht abgeschlossen', { description: result.error });
  };

  // Web: Stripe. Android-App: Google Play (Pflicht laut Play-Richtlinie).
  // Fehlt in der gepackten App die Billing-Bridge, wird kein Kauf angeboten —
  // besser kein Button als einer, der ins Leere läuft oder die Richtlinie bricht.
  const purchaseAvailable = isToolPurchaseAvailable();

  return (
    <div className={`space-y-5 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="w-12 h-12 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0">
          <ToolIcon name={tool.icon} className="w-6 h-6 text-cyan-300" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-white truncate">{tool.name}</h3>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">{tool.description}</p>
        </div>
      </div>

      <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-4 space-y-3">
        <p className="text-sm text-gray-300">
          Noch nicht freigeschaltet — du kannst {tool.name} ab{' '}
          <span className="font-semibold text-cyan-300">Level {tool.requiredLevel}</span> kostenlos nutzen.
        </p>
        <LevelProgressBar levelInfo={levelInfo} />
        {level < tool.requiredLevel && (
          <p className="text-xs text-gray-500">
            Noch {tool.requiredLevel - level} {tool.requiredLevel - level === 1 ? 'Level' : 'Level'} bis zur
            kostenlosen Freischaltung.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Link to={createPageUrl('Logbook')} className="w-full">
          <Button variant="outline" className="w-full border-gray-700 text-gray-200">
            Weiter angeln &amp; XP sammeln
          </Button>
        </Link>

        {purchaseAvailable && (
          <Button
            onClick={handleBuy}
            disabled={buying}
            className="w-full bg-gradient-to-r from-cyan-600 to-emerald-600 text-white"
          >
            {buying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                Kauf wird gestartet
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" aria-hidden="true" />
                Für {formatPrice(TOOL_UNLOCK_PRICE_CENTS)} sofort freischalten
              </>
            )}
          </Button>
        )}

        <p className="text-xs text-gray-500 text-center">
          Einmalig, kein Abo. Einmal freigeschaltet bleibt {tool.name} dauerhaft verfügbar.
        </p>
      </div>
    </div>
  );
}
