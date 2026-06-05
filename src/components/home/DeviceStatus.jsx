
import React, { useEffect, useState } from "react";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Bluetooth, Wifi, Usb, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DeviceStatus() {
  const [user, setUser] = useState(null);
  const [deviceCount, setDeviceCount] = useState(0);
  const [connectedDevices, setConnectedDevices] = useState([]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const u = await User.me();
        setUser(u);
        
        // Simuliere Geräte-Status aus User-Einstellungen
        const devices = u.settings?.connected_devices || [];
        setConnectedDevices(devices);
        setDeviceCount(devices.length);
      } catch (error) {
        console.error("Fehler beim Laden der Benutzerdaten:", error);
      }
    };
    
    loadUserData();
  }, []);

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'bluetooth': return <Bluetooth className="w-4 h-4" />;
      case 'wifi': return <Wifi className="w-4 h-4" />;
      case 'usb': return <Usb className="w-4 h-4" />;
      default: return <Bluetooth className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-cyan-400 font-medium text-sm drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">Geräte</h3>
        <Link to={createPageUrl('Devices')}>
          <Button size="sm" variant="outline" className="text-xs">
            <Plus className="w-3 h-3 mr-1" />
            Verwalten
          </Button>
        </Link>
      </div>
      
      {deviceCount > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>{deviceCount} Gerät{deviceCount > 1 ? 'e' : ''} verbunden</span>
          </div>
          
          <div className="space-y-1">
            {connectedDevices.slice(0, 2).map((device, index) => (
              <div key={index} className="flex items-center gap-2 text-xs text-gray-300">
                {getDeviceIcon(device.type)}
                <span>{device.name}</span>
                <div className="ml-auto w-2 h-2 bg-green-400 rounded-full"></div>
              </div>
            ))}
            {deviceCount > 2 && (
              <div className="text-xs text-gray-400 text-center">
                +{deviceCount - 2} weitere
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-2">
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-2">
            <AlertCircle className="w-4 h-4" />
            <span>Keine Geräte</span>
          </div>
          <div className="text-xs text-gray-500">
            Verbinde Echolot, Waage oder andere Angel-Geräte
          </div>
        </div>
      )}
    </div>
  );
}
