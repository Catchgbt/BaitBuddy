
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bluetooth, Thermometer, Waves, Zap, Power, RadioTower, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SUPPORTED_DEVICES = [
  { category: "Echolote", items: ["Deeper", "Striker Cast", "iBobber", "FishHunter"], description: "Daten aufs Handy." },
  { category: "Bissanzeiger", items: ["Rippton BiteKeeper"], description: "App/Push." },
  { category: "Futterboote", items: ["Rippton CatchX"], description: "App, Wegpunkte." },
  { category: "Kameras", items: ["GoFish", "Water Wolf"], description: "Live/Clips." },
  { category: "Karten", items: ["Navionics"], description: "Tiefenlinien, offline." },
  { category: "Waagen", items: ["ConnectScale", "BUBBA"], description: "Log." },
  { category: "Action-Cam", items: ["GoPro"], description: "App." },
  { category: "Sensoren", items: ["RuuviTag", "PROBE"], description: "Temp/Tiefe/Tempo." },
];

export default function DevicesSection() {
  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [metrics, setMetrics] = useState(null);
  const simRef = useRef(null);
  const [error, setError] = useState("");
  // const [user, setUser] = useState(null); // PremiumGuard removed, user state no longer needed

  // Define startSim BEFORE using it in useEffect to avoid hoisting error
  const startSim = useCallback(() => {
    clearInterval(simRef.current);
    setConnected(true);
    setDeviceName("Simulator");
    localStorage.setItem("fm_sim_active","1");
    simRef.current = setInterval(() => {
      setMetrics({
        depth: Number((2 + Math.random() * 18).toFixed(1)),
        waterTemp: Number((6 + Math.random() * 18).toFixed(1)),
        ts: new Date().toISOString()
      });
    }, 1000);
  }, []); // state setters are stable, no deps needed

  useEffect(() => {
    // KI-Buddy über Funktionsaufruf informieren
    window.dispatchEvent(new CustomEvent('kiBuddyFunctionCall', {
      detail: {
        functionName: 'devices',
        context: { timestamp: Date.now() }
      }
    }));

    // Restore simulator
    const sim = localStorage.getItem("fm_sim_active")==="1";
    if (sim && !connected) startSim();

    // Fetch user for premium check - Removed as PremiumGuard is temporarily disabled
    /*
    (async () => {
      try {
        const u = await User.me();
        setUser(u);
      } catch (error) {
        // Not logged in, user will remain null, PremiumGuard handles this.
      }
    })();
    */
    
    return () => clearInterval(simRef.current);
  }, [connected, startSim]); // include dependencies

  const stopSim = () => { 
    clearInterval(simRef.current); 
    setConnected(false); 
    setDeviceName(""); 
    setMetrics(null); 
    localStorage.removeItem("fm_sim_active"); 
  };

  const connectBT = async () => {
    setError("");
    if (!navigator.bluetooth) { startSim(); return; }
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(()=>ctrl.abort(), 15000);
      const dev = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [] });
      clearTimeout(timeout);
      setDeviceName(dev.name || "Bluetooth-Gerät");
      setConnected(true);
    } catch (e) {
      setError(e?.message || "Bluetooth-Verbindung fehlgeschlagen.");
      // Fallback: simulator
      startSim();
    }
  };

  return (
    <div className="space-y-6">
      {/* PremiumGuard component removed */}
      <Card className="glass-morphism border-gray-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">Geräte verbinden</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="text-amber-400 text-sm mb-2">{error}</div>}
          <div className="flex gap-3 mb-4">
            {!connected ? (
              <>
                <Button onClick={connectBT} className="bg-emerald-600 hover:bg-emerald-700"><Bluetooth className="w-4 h-4 mr-2" />Verbinden</Button>
                <Button variant="outline" onClick={startSim}><Zap className="w-4 h-4 mr-2" />Simulator</Button>
              </>
            ) : (
              <Button variant="destructive" onClick={stopSim}><Power className="w-4 h-4 mr-2" />Trennen</Button>
            )}
          </div>
          {connected && (
            <div className="p-4 rounded-xl bg-gray-800/40">
              <div className="text-gray-300 mb-2">Status: {deviceName} verbunden</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-gray-800/60 text-white flex items-center gap-2"><Waves className="w-4 h-4" />Tiefe: <span className="font-semibold">{metrics?.depth ?? "-" } m</span></div>
                <div className="p-3 rounded-xl bg-gray-800/60 text-white flex items-center gap-2"><Thermometer className="w-4 h-4" />Wassertemp: <span className="font-semibold">{metrics?.waterTemp ?? "-" } °C</span></div>
              </div>
              <div className="text-xs text-gray-400 mt-2">Zeit: {metrics?.ts ? new Date(metrics.ts).toLocaleTimeString('de-DE') : "-"}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-morphism border-gray-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)] flex items-center gap-2">
            <RadioTower className="w-5 h-5 text-emerald-400" />
            Kompatible Gerätetypen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {SUPPORTED_DEVICES.map((group) => (
            <div key={group.category}>
              <h3 className="text-lg font-semibold text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] mb-2">{group.category}</h3>
              <div className="flex flex-wrap items-center gap-2">
                {group.items.map(item => (
                  <Badge key={item} variant="secondary" className="bg-gray-700 text-gray-200 border-gray-600 text-sm">
                    {item}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-gray-400 mt-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{group.description}</span>
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
