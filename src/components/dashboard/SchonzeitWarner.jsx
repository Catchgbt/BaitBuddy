import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SchonzeitWarner() {
  const [bundesland, setBundesland] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noLocation, setNoLocation] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const savedLocation = localStorage.getItem("fm_current_location");
    if (!savedLocation) {
      setNoLocation(true);
      setLoading(false);
      return;
    }

    let location = null;
    try {
      location = JSON.parse(savedLocation);
    } catch {
      setNoLocation(true);
      setLoading(false);
      return;
    }

    if (!location?.lat || !location?.lon) {
      setNoLocation(true);
      setLoading(false);
      return;
    }

    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${location.lat}&lon=${location.lon}&format=json`,
        { headers: { "Accept-Language": "de" } }
      );
      const geoData = await geoRes.json();
      const state = geoData?.address?.state || null;
      setBundesland(state);

      const allRules = await base44.entities.RuleEntry.list("-created_date", 500);
      setRules(allRules);
    } catch (e) {
      console.error("SchonzeitWarner Fehler:", e);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in14Days = new Date(today);
  in14Days.setDate(today.getDate() + 14);

  const isInSchonzeit = (rule) => {
    if (!rule.closed_from || !rule.closed_to) return false;
    const from = new Date(rule.closed_from);
    const to = new Date(rule.closed_to);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    if (from > to) {
      return today >= from || today <= to;
    }
    return today >= from && today <= to;
  };

  const startsSchonzeitSoon = (rule) => {
    if (!rule.closed_from || isInSchonzeit(rule)) return false;
    const from = new Date(rule.closed_from);
    from.setHours(0, 0, 0, 0);
    return from > today && from <= in14Days;
  };

  const relevantRules = rules.filter((rule) => {
    if (!bundesland) return rule.region?.toLowerCase().includes("deutschland");
    return (
      rule.region?.toLowerCase().includes(bundesland.toLowerCase()) ||
      rule.region?.toLowerCase().includes("deutschland")
    );
  });

  const active = relevantRules.filter(isInSchonzeit);
  const upcoming = relevantRules.filter(startsSchonzeitSoon);

  if (loading) {
    return (
      <div className="rounded-2xl bg-gray-900/50 border border-gray-800/50 p-5">
        <div className="text-xs text-gray-500">Schonzeiten werden geladen...</div>
      </div>
    );
  }

  if (noLocation) {
    return (
      <div className="rounded-2xl bg-gray-900/50 border border-gray-800/50 p-5">
        <div className="text-sm font-semibold text-amber-400/80 uppercase tracking-wider mb-2">Schonzeit-Waechter</div>
        <p className="text-sm text-gray-400">
          Kein Standort verfuegbar. Bitte Standort aktivieren um lokale Schonzeiten zu sehen.
        </p>
      </div>
    );
  }

  if (active.length === 0 && upcoming.length === 0) {
    return (
      <div className="rounded-2xl bg-gray-900/50 border border-gray-800/50 p-5">
        <div className="text-xs font-semibold text-green-400/70 uppercase tracking-wider mb-2">
          Schonzeit-Waechter {bundesland ? `- ${bundesland}` : ""}
        </div>
        <p className="text-sm text-green-300">
          Aktuell keine aktiven Schonzeiten fuer deine Region.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gray-900/50 border border-gray-800/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider">
          Schonzeit-Waechter {bundesland ? `- ${bundesland}` : ""}
        </div>
        <Link
          to={createPageUrl("AngelscheinPruefungSchonzeiten")}
          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Alle Regeln
        </Link>
      </div>

      {active.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-red-400 font-medium uppercase tracking-wide">Jetzt Schonzeit</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {active.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between bg-red-900/20 border border-red-500/20 rounded-xl px-4 py-2"
              >
                <span className="text-sm font-semibold text-red-300">{rule.fish}</span>
                <span className="text-xs text-gray-400">
                  bis {new Date(rule.closed_to).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-amber-400 font-medium uppercase tracking-wide">Bald Schonzeit (14 Tage)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {upcoming.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between bg-amber-900/20 border border-amber-500/20 rounded-xl px-4 py-2"
              >
                <span className="text-sm font-semibold text-amber-300">{rule.fish}</span>
                <span className="text-xs text-gray-400">
                  ab {new Date(rule.closed_from).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}