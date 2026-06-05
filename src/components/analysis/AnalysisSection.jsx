import React, { useEffect, useMemo, useState } from "react";
import { Catch, Spot } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // Added Button import

function moonPhase(date) {
  const d = new Date(date);
  const lp = 2551443; // lunar period in seconds
  const new_moon = new Date(Date.UTC(1970,0,7,20,35,0)); // Reference new moon date
  const phase = ((d.getTime() - new_moon.getTime())/1000) % lp;
  const idx = Math.floor((phase/(lp/8)));
  return ["Neumond","Zunehmend","Erstes Viertel","Zunehmend","Vollmond","Abnehmend","Letztes Viertel","Abnehmend"][idx];
}

export default function AnalysisSection() {
  const [catches, setCatches] = useState([]);
  const [spots, setSpots] = useState([]);

  const cacheKey = () => {
    const m = new Date().toISOString().slice(0,7); // Cache key based on current month/year
    return `fm_analysis_${m}`;
  };

  useEffect(()=> { (async () => {
    const key = cacheKey();
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const { c, s } = JSON.parse(cached);
        setCatches(c);
        setSpots(s);
        return; // Use cached data and exit
      } catch (error) {
        console.error("Error parsing cached analysis data, refetching:", error);
        localStorage.removeItem(key); // Clear corrupted cache
      }
    }
    // If no cache or error parsing cache, fetch data
    setCatches(await Catch.list());
    setSpots(await Spot.list());
  })(); }, []);

  useEffect(()=> {
    // Only cache if data has been loaded and is not empty
    if (catches.length > 0 || spots.length > 0) {
      const key = cacheKey();
      localStorage.setItem(key, JSON.stringify({ c: catches, s: spots }));
    }
  }, [catches, spots]);

  const todayPhase = moonPhase(new Date());

  const byHour = useMemo(() => {
    const arr = Array(24).fill(0);
    catches.forEach(c => { const h = new Date(c.catch_time).getHours(); arr[h] += 1; });
    return arr;
  }, [catches]);

  const topWindows = useMemo(() => {
    const windows = [];
    for (let i=0;i<24;i++) {
      const sum = byHour[i] + byHour[(i+1)%24] + byHour[(i+2)%24];
      windows.push({ start: i, sum });
    }
    return windows.sort((a,b)=>b.sum-a.sum).slice(0,3);
  }, [byHour]);

  const bySpot = useMemo(() => {
    const map = new Map();
    catches.forEach(c => {
      const key = c.spot_id || "ohne";
      map.set(key, (map.get(key)||0)+1);
    });
    const list = Array.from(map.entries()).map(([id,count]) => ({ id, count, name: spots.find(s=>s.id===id)?.name || "ohne Spot" }));
    return list.sort((a,b)=>b.count-a.count).slice(0,5);
  }, [catches, spots]);

  const baitStats = useMemo(() => {
    const map = new Map();
    catches.forEach(c => { if (c.bait_used) map.set(c.bait_used, (map.get(c.bait_used)||0)+1); });
    return Array.from(map.entries()).map(([bait, count]) => ({ bait, count })).sort((a,b)=>b.count-a.count).slice(0,5);
  }, [catches]);

  const clearCache = () => {
    Object.keys(localStorage).forEach(k => { if (k.startsWith("fm_analysis_")) localStorage.removeItem(k); });
    alert("Analyse-Cache gelöscht. Bitte Seite neu laden, um aktuelle Daten abzurufen.");
    window.location.reload(); // Reload page to force re-fetch
  };

  return (
    <Card className="glass-morphism border-gray-800 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">Analyse</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-gray-300 text-sm mb-2">Mondphase: {todayPhase}</div>
        <div className="mb-3">
          <Button variant="outline" onClick={clearCache} className="text-gray-300 border-gray-600 hover:bg-gray-700/50">
            Cache neu berechnen
          </Button>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-gray-800/40" role="region" aria-live="polite" aria-label="Top Zeitfenster mit den meisten Faengen">
            <div className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] mb-2">Top-Zeitfenster</div>
            {topWindows.map(w => (
              <div key={w.start} className="flex justify-between text-white">
                <span aria-label={`${String(w.start).padStart(2,"0")}:00 bis ${String((w.start+2)%24).padStart(2,"0")}:59 Uhr`}>{String(w.start).padStart(2,"0")}:00–{String((w.start+2)%24).padStart(2,"0")}:59</span>
                <Badge variant="outline" className="text-gray-300 border-gray-600" aria-label={`${w.sum} Faenge`}>{w.sum}</Badge>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-xl bg-gray-800/40" role="region" aria-live="polite" aria-label="Top Angelplaetze nach Anzahl Faenge">
            <div className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] mb-2">Top-Spots</div>
            {bySpot.map(s => (
              <div key={s.id} className="flex justify-between text-white">
                <span aria-label={`${s.name}`}>{s.name}</span><Badge variant="outline" className="text-gray-300 border-gray-600" aria-label={`${s.count} Faenge`}>{s.count}</Badge>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-xl bg-gray-800/40" role="region" aria-live="polite" aria-label="Top Koeder mit den meisten erfolgreichen Faengen">
            <div className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] mb-2">Köder-Treffer</div>
            {baitStats.map(b => (
              <div key={b.bait} className="flex justify-between text-white">
                <span aria-label={`${b.bait}`}>{b.bait}</span><Badge variant="outline" className="text-gray-300 border-gray-600" aria-label={`${b.count} erfolgreiche Faenge`}>{b.count}</Badge>
              </div>
            ))}
          </div>
        </div>
        <div className="text-gray-500 text-xs mt-3">KI-Zusammenfassung optional in einem nächsten Schritt.</div>
      </CardContent>
    </Card>
  );
}