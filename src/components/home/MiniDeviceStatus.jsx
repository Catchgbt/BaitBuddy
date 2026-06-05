import React, { useEffect, useState } from "react";
import { User } from "@/entities/User";
import { Bluetooth, CheckCircle2, AlertCircle } from "lucide-react";

export default function MiniDeviceStatus() {
  const [deviceCount, setDeviceCount] = useState(0);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const u = await User.me();
        const devices = u.settings?.connected_devices || [];
        setDeviceCount(devices.length);
      } catch (error) {
        console.error("Fehler beim Laden der Benutzerdaten:", error);
      }
    };
    
    loadUserData();
  }, []);

  return (
    <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-cyan-400 font-medium text-sm drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">Geräte</h3>
        <Bluetooth className="w-5 h-5 text-blue-400" />
      </div>
      
      {deviceCount > 0 ? (
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
          <div>
            <div className="text-2xl font-bold text-white">{deviceCount}</div>
            <div className="text-xs text-gray-400">Gerät{deviceCount > 1 ? 'e' : ''} verbunden</div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <AlertCircle className="w-8 h-8 text-gray-400" />
          <div>
            <div className="text-2xl font-bold text-gray-400">0</div>
            <div className="text-xs text-gray-400">Keine Geräte</div>
          </div>
        </div>
      )}
    </div>
  );
}