import React, { useState, useEffect, useCallback } from "react";
import { weather } from "@/api/frontendClient";
import { useLocation } from "@/components/location/LocationManager";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldCheck, MapPin, RefreshCw, Clock } from "lucide-react";

// Darstellungs-Stile je Warnstufe (DWD/CAP-Schweregrade)
const SEVERITY_STYLE = {
  extreme: {
    label: "Extreme Gefahr",
    border: "border-purple-500/60",
    bg: "bg-purple-950/40",
    text: "text-purple-300",
    icon: "text-purple-400",
  },
  severe: {
    label: "Unwetter",
    border: "border-red-500/60",
    bg: "bg-red-950/40",
    text: "text-red-300",
    icon: "text-red-400",
  },
  moderate: {
    label: "Markante Warnung",
    border: "border-amber-500/60",
    bg: "bg-amber-950/40",
    text: "text-amber-300",
    icon: "text-amber-400",
  },
  minor: {
    label: "Wetterhinweis",
    border: "border-yellow-500/50",
    bg: "bg-yellow-950/30",
    text: "text-yellow-300",
    icon: "text-yellow-400",
  },
};

const styleFor = (severity) => SEVERITY_STYLE[severity] || SEVERITY_STYLE.moderate;

const formatRange = (onset, expires) => {
  const fmt = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const from = fmt(onset);
  const to = fmt(expires);
  if (from && to) return `${from} – ${to} Uhr`;
  if (to) return `bis ${to} Uhr`;
  if (from) return `ab ${from} Uhr`;
  return null;
};

/**
 * Zeigt echte, amtliche Unwetterwarnungen des Deutschen Wetterdienstes (DWD)
 * für den aktuellen Standort des Nutzers an. Daten via Backend (/api/weather/alerts).
 */
export default function WeatherWarnings({ lat, lon }) {
  const { currentLocation, requestGpsLocation, loading: locationLoading } = useLocation();

  const resolvedLat = lat ?? currentLocation?.lat;
  const resolvedLon = lon ?? currentLocation?.lon;

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [source, setSource] = useState(null);

  const loadAlerts = useCallback(async () => {
    if (resolvedLat == null || resolvedLon == null) return;
    setLoading(true);
    setError(false);
    try {
      const res = await weather.alerts(resolvedLat, resolvedLon);
      setAlerts(Array.isArray(res?.alerts) ? res.alerts : []);
      setFetchedAt(res?.fetched_at || new Date().toISOString());
      setSource(res?.source || null);
    } catch (e) {
      console.error("Fehler beim Laden der Unwetterwarnungen:", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [resolvedLat, resolvedLon]);

  // Bei Standortänderung neu laden und alle 15 Minuten aktualisieren
  useEffect(() => {
    loadAlerts();
    if (resolvedLat == null || resolvedLon == null) return;
    const id = setInterval(loadAlerts, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [loadAlerts, resolvedLat, resolvedLon]);

  // Kein Standort verfügbar
  if (resolvedLat == null || resolvedLon == null) {
    return (
      <Card className="glass-morphism border-gray-800 rounded-2xl">
        <CardContent className="py-8 text-center space-y-4">
          <MapPin className="w-8 h-8 text-cyan-400 mx-auto" />
          <div>
            <div className="text-white font-semibold">Standort benötigt</div>
            <p className="text-gray-400 text-sm mt-1">
              Für amtliche Unwetterwarnungen wird dein Standort benötigt.
            </p>
          </div>
          <Button
            onClick={requestGpsLocation}
            disabled={locationLoading}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            <MapPin className="w-4 h-4 mr-2" />
            {locationLoading ? "Ermittle Standort..." : "Standort ermitteln"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Amtliche Unwetterwarnungen
        </h2>
        <button
          onClick={loadAlerts}
          disabled={loading}
          aria-label="Warnungen aktualisieren"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-gray-800/70 border border-gray-700 text-gray-300 hover:bg-gray-700/70 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </button>
      </div>

      {loading && alerts.length === 0 && (
        <Card className="glass-morphism border-gray-800 rounded-2xl">
          <CardContent className="py-6 flex items-center justify-center gap-3 text-gray-400 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            Warnungen werden geladen...
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="glass-morphism border-red-900/50 rounded-2xl">
          <CardContent className="py-6 text-center text-sm text-red-300">
            Warnungen konnten nicht geladen werden.
            <button onClick={loadAlerts} className="ml-2 underline hover:text-red-200">
              Erneut versuchen
            </button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && alerts.length === 0 && (
        <Card className="glass-morphism border-emerald-800/40 rounded-2xl">
          <CardContent className="py-8 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="text-white font-semibold">Keine Warnungen aktiv</div>
            <p className="text-gray-400 text-sm">
              Für deinen Standort liegen aktuell keine amtlichen Unwetterwarnungen vor.
            </p>
          </CardContent>
        </Card>
      )}

      {alerts.map((alert, idx) => {
        const s = styleFor(alert.severity);
        const range = formatRange(alert.onset, alert.expires);
        return (
          <Card
            key={alert.id ?? idx}
            className={`rounded-2xl border ${s.border} ${s.bg}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${s.icon}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] uppercase tracking-wider font-bold ${s.text}`}>
                      {s.label}
                    </span>
                  </div>
                  <div className="text-white font-semibold mt-0.5 break-words">
                    {alert.headline || alert.event}
                  </div>
                  {range && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      {range}
                    </div>
                  )}
                  {alert.description && (
                    <p className="text-sm text-gray-300 mt-2 whitespace-pre-line break-words">
                      {alert.description}
                    </p>
                  )}
                  {alert.instruction && (
                    <p className="text-sm text-gray-400 mt-2 whitespace-pre-line break-words">
                      <span className="font-semibold text-gray-300">Empfehlung: </span>
                      {alert.instruction}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {(source || fetchedAt) && (
        <div className="text-[10px] text-gray-500 text-right">
          {source}
          {fetchedAt && (
            <> · Stand {new Date(fetchedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr</>
          )}
        </div>
      )}
    </div>
  );
}
