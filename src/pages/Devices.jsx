import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { 
  Radio, 
  Camera, 
  Scale, 
  Waves, 
  Gamepad2, 
  Thermometer,
  Battery,
  Wifi,
  WifiOff,
  Plus,
  Settings,
  ChevronRight,
  Zap,
  AlertCircle,
  Heart
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BiteDetectorSection from "@/components/ai/BiteDetectorSection";
import DeviceHub from "@/components/devices/DeviceHub";
import PremiumGuard from "@/components/premium/PremiumGuard";
import { useFeatureTracking } from "@/hooks/useFeatureTracking";

export default function DevicesPage() {
  useFeatureTracking("geraete");
  const [user, setUser] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const planId = currentUser?.premium_plan_id || 'free';
        const isPremium = ['pro', 'ultimate'].includes(planId);
        
        let isTrialActive = false;
        if (currentUser?.trial_end_date) {
          const now = new Date();
          const trialEnd = new Date(currentUser.trial_end_date);
          isTrialActive = now < trialEnd;
        }
        
        setHasAccess(isPremium || isTrialActive);
      } catch (e) {
        console.error("Fehler beim Laden der Benutzerdaten:", e);
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const devices = [
    {
      id: 'device_hub',
      name: 'Device Hub',
      icon: Wifi,
      status: 'connected',
      battery: 100,
      signal: 5,
      type: 'hub',
      features: ['BLE Inspector', 'Web Serial', 'Kamera', 'Echogram-Renderer'],
      color: 'cyan',
      hasDetail: true
    },
    {
      id: 'smartwatch',
      name: 'Smartwatch / HR-Monitor',
      icon: Heart,
      status: 'connected',
      battery: 95,
      signal: 5,
      type: 'wearable',
      features: ['Heart Rate Monitoring', 'Session Tracking', 'Live BPM', 'Statistiken'],
      color: 'red',
      hasDetail: true
    },
    {
      id: 'bite_detector',
      name: 'Bissanzeiger',
      icon: Radio,
      status: 'connected',
      battery: 85,
      signal: 4,
      type: 'bite_alarm',
      features: ['Push-Benachrichtigungen', 'LED-Steuerung', 'Vibration', 'Ton-Anpassung'],
      color: 'emerald',
      hasDetail: true
    },
    {
      id: 'ai_camera',
      name: 'KI-Kamera',
      icon: Camera,
      status: 'connected',
      battery: 92,
      signal: 5,
      type: 'camera',
      features: ['Live-Analyse', 'Fischerkennung', 'Foto-Speicherung'],
      color: 'blue',
      link: 'AI'
    },
    {
      id: 'sonar',
      name: 'Echolot',
      icon: Waves,
      status: 'offline',
      battery: 0,
      signal: 0,
      type: 'sonar',
      features: ['Tiefenmessung', 'Fischerkennung', 'Bodenkonturen', 'GPS-Mapping'],
      color: 'cyan',
      comingSoon: true
    },
    {
      id: 'bait_boat',
      name: 'Futterboot',
      icon: Gamepad2,
      status: 'offline',
      battery: 0,
      signal: 0,
      type: 'bait_boat',
      features: ['GPS-Navigation', 'Wegpunkte', 'Return-to-Home', 'Autopilot'],
      color: 'purple',
      comingSoon: true
    },
    {
      id: 'scale',
      name: 'Digital-Waage',
      icon: Scale,
      status: 'offline',
      battery: 0,
      signal: 0,
      type: 'scale',
      features: ['Gewichtsmessung', 'Foto-Integration', 'Fang-Logs', 'Statistiken'],
      color: 'amber',
      comingSoon: true
    },
    {
      id: 'sensor',
      name: 'Wasser-Sensor',
      icon: Thermometer,
      status: 'offline',
      battery: 0,
      signal: 0,
      type: 'sensor',
      features: ['Temperatur', 'pH-Wert', 'Trübung', 'Sauerstoff'],
      color: 'teal',
      comingSoon: true
    }
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'connected': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'offline': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'connected': return 'Verbunden';
      case 'offline': return 'Offline';
      default: return 'Unbekannt';
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      emerald: 'border-emerald-600/50 bg-emerald-900/10',
      blue: 'border-blue-600/50 bg-blue-900/10',
      cyan: 'border-cyan-600/50 bg-cyan-900/10',
      purple: 'border-purple-600/50 bg-purple-900/10',
      amber: 'border-amber-600/50 bg-amber-900/10',
      teal: 'border-teal-600/50 bg-teal-900/10',
      red: 'border-red-600/50 bg-red-900/10'
    };
    return colors[color] || 'border-gray-600/50 bg-gray-900/10';
  };

  const handleDeviceClick = (device) => {
    if (device.comingSoon) return;
    if (device.link) {
      window.location.href = createPageUrl(device.link);
      return;
    }
    if (device.hasDetail) {
      setSelectedDevice(device);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-cyan-400">Laden...</div>
      </div>
    );
  }

  // Detail-Ansicht für Device Hub und Smartwatch
  if (selectedDevice?.id === 'device_hub' || selectedDevice?.id === 'smartwatch') {
    return (
      <div className="min-h-screen bg-gray-950 p-6 pb-32">
        <div className="max-w-6xl mx-auto">
          <Button
            onClick={() => setSelectedDevice(null)}
            variant="ghost"
            className="mb-4 text-cyan-400 hover:text-cyan-300"
          >
            Zurück zu Geräten
          </Button>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-cyan-400 mb-2">
              {selectedDevice.id === 'smartwatch' ? 'Smartwatch & Heart Rate Monitor' : 'Device Hub'}
            </h2>
            <p className="text-gray-400 text-sm">
              {selectedDevice.id === 'smartwatch' 
                ? 'Verbinde Smartwatches und HR-Monitore via Bluetooth Low Energy'
                : 'Verbinde BLE-Geräte, Echolote, Kameras und weitere Hardware direkt mit CatchGBT'}
            </p>
          </div>
          <DeviceHub />
        </div>
      </div>
    );
  }

  // Detail-Ansicht für Bissanzeiger
  if (selectedDevice?.id === 'bite_detector') {
    return (
      <div className="min-h-screen bg-gray-950 p-6 pb-32">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={() => setSelectedDevice(null)}
            variant="ghost"
            className="mb-4 text-cyan-400 hover:text-cyan-300"
          >
            Zurück zu Geräten
          </Button>
          <BiteDetectorSection />
        </div>
      </div>
    );
  }

  const mainContent = (
    <div className="min-h-screen bg-gray-950 p-6 pb-32">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
              Geräte
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Verbinde und steuere deine Angelgeräte
            </p>
          </div>
          <Button className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="w-4 h-4 mr-2" />
            Gerät hinzufügen
          </Button>
        </div>

        {/* Status-Übersicht */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass-morphism border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-400 text-xs">Verbundene Geräte</div>
                  <div className="text-2xl font-bold text-white">
                    {devices.filter(d => d.status === 'connected').length}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Wifi className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-morphism border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-400 text-xs">Offline Geräte</div>
                  <div className="text-2xl font-bold text-white">
                    {devices.filter(d => d.status === 'offline').length}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-gray-500/20 flex items-center justify-center">
                  <WifiOff className="w-6 h-6 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-morphism border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-400 text-xs">Gesamt</div>
                  <div className="text-2xl font-bold text-white">{devices.length}</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Geräte-Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => {
            const Icon = device.icon;
            return (
              <Card
                key={device.id}
                className={`glass-morphism ${getColorClasses(device.color)} cursor-pointer hover:scale-[1.02] transition-all ${device.comingSoon ? 'opacity-60' : ''}`}
                onClick={() => handleDeviceClick(device)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-${device.color}-500/20 flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 text-${device.color}-400`} />
                      </div>
                      <div>
                        <CardTitle className="text-white text-base">{device.name}</CardTitle>
                        <Badge className={`${getStatusColor(device.status)} text-xs mt-1`}>
                          {getStatusText(device.status)}
                        </Badge>
                      </div>
                    </div>
                    {!device.comingSoon && <ChevronRight className="w-5 h-5 text-gray-400" />}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Batterie & Signal */}
                  {device.status === 'connected' && (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Battery className={`w-4 h-4 ${device.battery > 20 ? 'text-emerald-400' : 'text-red-400'}`} />
                        <span className="text-gray-300">{device.battery}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Wifi className="w-4 h-4 text-cyan-400" />
                        <span className="text-gray-300">{device.signal}/5</span>
                      </div>
                    </div>
                  )}

                  {/* Features */}
                  <div className="space-y-1">
                    {device.features.slice(0, 3).map((feature, idx) => (
                      <div key={idx} className="text-xs text-gray-400 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                        {feature}
                      </div>
                    ))}
                  </div>

                  {/* Coming Soon Badge */}
                  {device.comingSoon && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                      <Zap className="w-3 h-3 mr-1" />
                      Demnächst verfügbar
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info-Box */}
        <Card className="glass-morphism border-blue-600/50 bg-blue-900/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-blue-300 mb-1">Geräte-Simulation</div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Die meisten Geräte befinden sich noch in der Entwicklung. Der <span className="text-emerald-400 font-semibold">Bissanzeiger</span>, die <span className="text-blue-400 font-semibold">KI-Kamera</span> und die <span className="text-red-400 font-semibold">Smartwatch</span> sind bereits voll funktionsfähig. 
                  Weitere Geräte wie Echolote, Futterboote und Sensoren folgen in zukünftigen Updates.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tutorial Link */}
        <Card className="glass-morphism border-gray-800">
          <CardContent className="p-4">
            <Link 
              to={createPageUrl('DeviceIntegration')}
              className="flex items-center justify-between hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <div className="font-semibold text-white">Geräte-Integration Tutorial</div>
                  <div className="text-sm text-gray-400">Lerne, wie du Geräte verbindest</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (hasAccess) {
    return mainContent;
  }

  return (
    <PremiumGuard 
      user={user} 
      requiredPlan="pro"
      feature="Die Geräteintegration ist ein Pro-Feature"
    >
      {mainContent}
    </PremiumGuard>
  );
}