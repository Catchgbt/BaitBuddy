import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";

/**
 * Wiederverwendbare Komponente zur Überprüfung von Regeln für einen Fang
 * Kann in QuickCatchDialog, CatchDetailModal etc. verwendet werden
 */
export default function RuleChecker({ species, lengthCm, catchDate, rules }) {
  if (!species || !rules || rules.length === 0) {
    return null;
  }

  const warnings = [];
  const infos = [];
  const speciesLower = String(species || "").toLowerCase();
  const today = catchDate ? new Date(catchDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

  // Finde passende Regeln
  const matchingRules = rules.filter(r => 
    r.fish && String(r.fish || "").toLowerCase() === speciesLower
  );

  matchingRules.forEach(rule => {
    // Prüfe Mindestmaß
    if (rule.min_size_cm && lengthCm && Number(lengthCm) < rule.min_size_cm) {
      warnings.push({
        type: 'size',
        message: `⚠️ Mindestmaß ${rule.min_size_cm} cm unterschritten (${lengthCm} cm)`,
        region: rule.region
      });
    }

    // Prüfe Schonzeit
    if (rule.closed_from && rule.closed_to) {
      if (today >= rule.closed_from && today <= rule.closed_to) {
        warnings.push({
          type: 'closed_season',
          message: `🚫 Schonzeit: ${rule.closed_from} bis ${rule.closed_to}`,
          region: rule.region
        });
      }
    }

    // Informationen zu Haken-Limits
    if (rule.hook_limit) {
      infos.push({
        type: 'hook_limit',
        message: `ℹ️ ${rule.hook_limit}`,
        region: rule.region
      });
    }

    // Allgemeine Hinweise
    if (rule.notes) {
      infos.push({
        type: 'notes',
        message: `💡 ${rule.notes}`,
        region: rule.region
      });
    }
  });

  if (warnings.length === 0 && infos.length === 0) {
    return (
      <Alert className="bg-emerald-900/20 border-emerald-800/50">
        <Info className="h-4 w-4 text-emerald-400" />
        <AlertDescription className="text-emerald-300">
          ✅ Keine Regelverstöße für {species}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {warnings.length > 0 && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-800/50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-1">
            {warnings.map((w, idx) => (
              <div key={idx}>
                <strong>{w.message}</strong>
                {w.region && <span className="text-sm ml-2">({w.region})</span>}
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {infos.length > 0 && (
        <Alert className="bg-blue-900/20 border-blue-800/50">
          <Info className="h-4 w-4 text-blue-400" />
          <AlertDescription className="space-y-1 text-blue-200">
            {infos.map((info, idx) => (
              <div key={idx}>
                {info.message}
                {info.region && <span className="text-sm ml-2">({info.region})</span>}
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}