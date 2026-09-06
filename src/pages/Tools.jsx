import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { CheckCircle2, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SwipeToRefresh from "@/components/utils/SwipeToRefresh";
import { LEVELS, TOOL_UNLOCK_PRICE_CENTS } from "@shared/toolUnlocks";
import { useProgression } from "@/components/progression/ProgressionContext";
import LevelProgressBar from "@/components/progression/LevelProgressBar";
import ToolLockModal from "@/components/progression/ToolLockModal";
import ToolIcon from "@/components/progression/toolIcons";
import { formatPrice, redeemToolCheckout } from "@/components/progression/toolPurchase";
import { useFeatureTracking } from "@/hooks/useFeatureTracking";

// Übersicht aller Angel-Tools: was ist frei, was kommt als Nächstes, was
// kostet die optionale Sofortfreischaltung. Gesperrte Tools verschwinden
// bewusst nicht — sie sind das sichtbare Ziel des Fortschritts.
export default function Tools() {
  useFeatureTracking("tool_unlocks");
  const { loading, levelInfo, level, tools, reload, markToolUnlocked, incompleteSources } = useProgression();
  const [searchParams, setSearchParams] = useSearchParams();
  const [lockedToolId, setLockedToolId] = useState(null);
  // Verhindert doppeltes Einlösen, wenn React den Effekt zweimal ausführt
  // (StrictMode) oder der Nutzer die Success-URL erneut öffnet.
  const redeemedSession = useRef(null);

  // Rücksprung vom Stripe-Checkout: /Tools?unlock=success&tool_id=…&session_id=cs_…
  useEffect(() => {
    const unlock = searchParams.get("unlock");
    const toolId = searchParams.get("tool_id");
    const sessionId = searchParams.get("session_id");

    if (unlock === "cancelled") {
      setSearchParams({}, { replace: true });
      return;
    }
    if (unlock !== "success" || !toolId || !sessionId) return;
    if (redeemedSession.current === sessionId) return;
    redeemedSession.current = sessionId;

    (async () => {
      const result = await redeemToolCheckout({ toolId, sessionId });
      setSearchParams({}, { replace: true });
      if (result.success) {
        markToolUnlocked(toolId);
        toast.success("Tool freigeschaltet", {
          description: "Du kannst es ab sofort verwenden.",
        });
        reload({ refresh: true });
      } else {
        toast.error("Freischaltung fehlgeschlagen", { description: result.error });
      }
    })();
  }, [searchParams, setSearchParams, markToolUnlocked, reload]);

  // Tools nach Level gruppieren; Basis-Tools (Level 1) stehen zuerst.
  const groups = useMemo(() => {
    return LEVELS.map((levelEntry) => ({
      ...levelEntry,
      items: tools.filter((t) => t.required_level === levelEntry.level),
    })).filter((group) => group.items.length > 0);
  }, [tools]);

  const unlockedCount = tools.filter((t) => t.unlocked).length;

  return (
    <SwipeToRefresh onRefresh={() => reload({ refresh: true })}>
      <div className="min-h-screen bg-gray-950 p-4 sm:p-6 pb-safe">
        <div className="max-w-3xl mx-auto space-y-5">
          <header className="space-y-1">
            <h1 className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
              Meine Tools
            </h1>
            <p className="text-sm text-gray-400">
              Jedes Level schaltet neue Werkzeuge kostenlos frei. Wer nicht warten will, kann ein
              einzelnes Tool für {formatPrice(TOOL_UNLOCK_PRICE_CENTS)} sofort freischalten.
            </p>
          </header>

          <Card className="glass-morphism border-gray-800 rounded-2xl">
            <CardContent className="p-4 space-y-3">
              <LevelProgressBar levelInfo={levelInfo} />
              <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-800">
                <span>Freigeschaltet</span>
                <span className="tabular-nums text-gray-200">
                  {unlockedCount} / {tools.length} Tools
                </span>
              </div>
              {incompleteSources.length > 0 && (
                <p className="text-xs text-amber-400">
                  Einige Aktivitätsdaten konnten gerade nicht gelesen werden — dein XP-Stand kann
                  dadurch zu niedrig angezeigt sein.
                </p>
              )}
            </CardContent>
          </Card>

          {loading && tools.length === 0 && (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {groups.map((group) => (
            <section key={group.level} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <ToolIcon name={group.icon} className="w-4 h-4 text-cyan-300" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400">
                  Level {group.level} — {group.rank}
                </h2>
                {group.level <= level && (
                  <Badge variant="outline" className="border-emerald-600/50 text-emerald-400 text-[10px]">
                    Erreicht
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                {group.items.map((tool) =>
                  tool.unlocked ? (
                    <Link
                      key={tool.id}
                      to={createPageUrl(tool.page)}
                      className="block rounded-xl bg-gray-900/70 border border-gray-800 p-3 active:bg-gray-800/70 transition-colors focus:ring-2 focus:ring-cyan-400"
                    >
                      <ToolRow tool={tool} />
                    </Link>
                  ) : (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => setLockedToolId(tool.id)}
                      className="w-full text-left rounded-xl bg-gray-900/40 border border-gray-800/70 p-3 opacity-70 active:opacity-100 transition-opacity focus:ring-2 focus:ring-cyan-400"
                    >
                      <ToolRow tool={tool} />
                    </button>
                  )
                )}
              </div>
            </section>
          ))}
        </div>
      </div>

      <ToolLockModal
        toolId={lockedToolId}
        open={!!lockedToolId}
        onOpenChange={(open) => !open && setLockedToolId(null)}
      />
    </SwipeToRefresh>
  );
}

function ToolRow({ tool }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${
          tool.unlocked
            ? "bg-cyan-500/15 border-cyan-500/30"
            : "bg-gray-800 border-gray-700"
        }`}
      >
        <ToolIcon
          name={tool.icon}
          className={`w-5 h-5 ${tool.unlocked ? "text-cyan-300" : "text-gray-500"}`}
        />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`font-semibold truncate ${tool.unlocked ? "text-white" : "text-gray-300"}`}>
            {tool.name}
          </p>
          {tool.is_endgame && (
            <Badge variant="outline" className="border-amber-600/50 text-amber-400 text-[10px]">
              Meisterangler
            </Badge>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">{tool.description}</p>
      </div>

      {tool.unlocked ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" aria-label="Freigeschaltet" />
      ) : (
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          <span className="flex items-center gap-1 text-xs text-amber-400">
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            Level {tool.required_level}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <Sparkles className="w-3 h-3" aria-hidden="true" />
            {formatPrice(tool.price_cents)}
          </span>
        </div>
      )}
    </div>
  );
}
