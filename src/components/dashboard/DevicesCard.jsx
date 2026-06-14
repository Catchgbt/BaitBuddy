import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Radio, Smartphone, Watch, Zap, Plus, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function DevicesCard() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDevices();

    // Listen for device updates
    const handleDeviceUpdate = () => {
      loadDevices();
    };

    window.addEventListener('devices-updated', handleDeviceUpdate);
    return () => {
      window.removeEventListener('devices-updated', handleDeviceUpdate);
    };
  }, []);

  const loadDevices = async () => {
    try {
      // Simuliere Device-Daten (in Zukunft aus API laden)
      const mockDevices = [
        {
          id: 'device-1',
          name: 'GPS Watch',
          type: 'smartwatch',
          battery: 85,
          status: 'connected',
          lastSync: new Date(Date.now() - 5 * 60 * 1000), // 5 Minuten ago
        },
        {
          id: 'device-2',
          name: 'Fisch-Finder',
          type: 'sonar',
          battery: 45,
          status: 'connected',
          lastSync: new Date(Date.now() - 2 * 60 * 1000), // 2 Minuten ago
        },
      ];

      setDevices(mockDevices);
    } catch (error) {
      console.warn('Fehler beim Laden der Geräte:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'smartwatch':
        return Watch;
      case 'sonar':
        return Radio;
      case 'smartphone':
        return Smartphone;
      default:
        return Radio;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return 'text-emerald-400';
      case 'disconnected':
        return 'text-red-400';
      case 'inactive':
        return 'text-gray-400';
      default:
        return 'text-yellow-400';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'connected':
        return 'Verbunden';
      case 'disconnected':
        return 'Getrennt';
      case 'inactive':
        return 'Inaktiv';
      default:
        return 'Unbekannt';
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'gerade eben';
    if (diffMins < 60) return `vor ${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    return `vor ${diffHours}h`;
  };

  return (
    <Card className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 hover:border-indigo-500/40 transition-all">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg text-indigo-400">
            <Radio className="w-5 h-5" /> Meine Geräte
          </CardTitle>
          <Link to={createPageUrl('Devices')}>
            <Button variant="ghost" size="sm" className="text-indigo-400 hover:bg-indigo-500/10">
              <Plus className="w-4 h-4 mr-1" /> Neu
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6 text-gray-400">Lade Geräte...</div>
        ) : devices.length === 0 ? (
          <div className="space-y-3 py-6">
            <div className="flex items-center gap-3 p-4 bg-indigo-900/20 rounded-lg border border-indigo-500/20">
              <AlertCircle className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-300 font-medium">Noch keine Geräte verbunden</p>
                <p className="text-xs text-gray-500">Verbinde Smartwatch, GPS oder Fisch-Finder</p>
              </div>
            </div>
            <Link to={createPageUrl('Devices')} className="block">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                <Radio className="w-4 h-4 mr-2" /> Erstes Gerät verbinden
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device, idx) => {
              const DeviceIcon = getDeviceIcon(device.type);
              const statusColor = getStatusColor(device.status);

              return (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-4 bg-gray-800/40 rounded-lg border border-indigo-500/20 hover:border-indigo-500/40 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-500/20 rounded-lg">
                        <DeviceIcon className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{device.name}</p>
                        <p className={`text-xs font-medium ${statusColor}`}>
                          {getStatusText(device.status)}
                        </p>
                      </div>
                    </div>
                    {device.battery && (
                      <div className="text-right">
                        <motion.div
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="flex items-center gap-1 text-xs font-bold text-emerald-400"
                        >
                          <Zap className="w-3 h-3" />
                          {device.battery}%
                        </motion.div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    Zuletzt sync: {formatTime(device.lastSync)}
                  </p>
                </motion.div>
              );
            })}

            {devices.length > 0 && (
              <Link to={createPageUrl('Devices')} className="block mt-4">
                <Button variant="outline" className="w-full border-indigo-500/30 hover:border-indigo-500/60">
                  Alle Geräte verwalten
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
