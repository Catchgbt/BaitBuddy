import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Bluetooth, 
  Wifi, 
  MapPin, 
  Thermometer, 
  Fish,
  Target,
  Zap,
  CheckCircle2,
  AlertCircle,
  Info
} from "lucide-react";
import { motion } from "framer-motion";

const DEVICE_CATEGORIES = {
  sonar: {
    title: "Smarte Fischfinder & Echolote",
    icon: <Fish className="w-6 h-6" />,
    description: "Bluetooth/Wi-Fi Echolote für Tiefe, Temperatur und Fischsichtung",
    devices: [
      {
        name: "Deeper Smart Sonar PRO+",
        type: "Castable Echolot",
        connection: "Wi-Fi",
        features: ["90m Reichweite", "Wassertemperatur", "GPS Mapping", "Fischsichtung"],
        specs: {
          frequency: "290kHz / 90kHz",
          depth: "0.5-80m",
          temperature: "-10°C bis +40°C",
          battery: "5.5h Laufzeit",
          waterproof: "IPX7"
        },
        integration: {
          realtime: "Live-Tiefenprofile in der App anzeigen",
          logging: "Automatische Tiefe/Temperatur bei Fangeinträgen", 
          ai: "KI-Analyse für optimale Ködertiefe",
          spots: "Auto-Annotation von Spot-Details"
        },
        price: "€249"
      },
      {
        name: "Garmin Striker Vivid 4cv",
        type: "Fest montiertes Echolot",
        connection: "Bluetooth",
        features: ["CHIRP Sonar", "ClearVü", "GPS", "Quickdraw Contours"],
        specs: {
          display: "4.3\" Farbdisplay",
          frequency: "CHIRP 77/200kHz + GT20-TM",
          depth: "0.6-488m (Süßwasser)",
          power: "12V DC",
          waterproof: "IPX7"
        },
        integration: {
          realtime: "Sonar-Daten live auf Smartphone",
          logging: "GPS-Koordinaten und Tiefenkarten sync",
          ai: "Bodenbeschaffenheit für Köderempfehlung",
          spots: "Automatisches Mapping von Unterwasser-Strukturen"
        },
        price: "€179"
      }
    ]
  },
  navigation: {
    title: "GPS-Tracker & Navigation",
    icon: <MapPin className="w-6 h-6" />,
    description: "Präzise Positionierung und Routenaufzeichnung",
    devices: [
      {
        name: "Garmin GPSMAP 64sx",
        type: "Handheld GPS",
        connection: "Bluetooth",
        features: ["Multi-GNSS", "3-Achsen Kompass", "Wireless Datenübertragung"],
        specs: {
          accuracy: "< 3m mit WAAS",
          battery: "15h AA Batterien",
          memory: "8GB + MicroSD",
          waterproof: "IPX7",
          weight: "230g"
        },
        integration: {
          realtime: "Live GPS-Koordinaten für Spots",
          logging: "Automatische Wegpunkt-Setzung bei Fang",
          ai: "Routen-Analyse für beste Angelplätze",
          spots: "Präzise Spot-Koordinaten (±1m Genauigkeit)"
        },
        price: "€349"
      },
      {
        name: "Humminbird GPS Heading Sensor",
        type: "Boot-Navigationssystem", 
        connection: "NMEA 2000 + Bluetooth",
        features: ["10Hz GPS", "Kompass-Kurs", "Geschwindigkeit", "COG/SOG"],
        specs: {
          update_rate: "10Hz",
          heading: "1° Genauigkeit",
          connection: "NMEA 2000 Backbone",
          power: "12V DC (0.1A)",
          waterproof: "IPX7"
        },
        integration: {
          realtime: "Boot-Position und -geschwindigkeit live",
          logging: "Fahrtrouten und Drift-Analyse",
          ai: "Strömungs- und Windkorrektur-Empfehlungen",
          spots: "Trolling-Muster und Hot-Spots Recording"
        },
        price: "€299"
      }
    ]
  },
  sensors: {
    title: "Wasserqualität-Sensoren",
    icon: <Thermometer className="w-6 h-6" />,
    description: "pH, Temperatur, Sauerstoff und weitere Wasserparameter",
    devices: [
      {
        name: "YSI ProDSS Multiparameter",
        type: "Profi-Wassersonde",
        connection: "Bluetooth + USB",
        features: ["pH", "Temperatur", "Leitfähigkeit", "Sauerstoff", "Trübung"],
        specs: {
          sensors: "4 gleichzeitige Parameter",
          depth: "200m Kabel verfügbar",
          accuracy: "pH ±0.1, Temp ±0.15°C",
          memory: "100.000 Datenpunkte",
          battery: "16h Dauerbetrieb"
        },
        integration: {
          realtime: "Live-Wasserqualität Dashboard",
          logging: "Umweltdaten bei jedem Fangeintrag",
          ai: "Parameter-basierte Fisch-Vorhersagen",
          spots: "Wasserqualitäts-Profile der Angelplätze"
        },
        price: "€1.899"
      },
      {
        name: "Hanna HI-98129 Pocket pH/EC/TDS",
        type: "Handheld-Messgerät",
        connection: "Bluetooth (HI-92000 Interface)",
        features: ["pH", "EC", "TDS", "Temperatur", "Wasserfest"],
        specs: {
          ph_range: "0.00 bis 14.00 pH",
          ec_range: "0 bis 3999 µS/cm",
          accuracy: "±0.05 pH, ±2% EC",
          calibration: "Automatisch 1/2/3 Punkt",
          battery: "700h Betrieb"
        },
        integration: {
          realtime: "Schnelle Wasseranalyse vor Ort",
          logging: "pH/Leitfähigkeit in Fangbuch",
          ai: "Optimale Köder je Wasserqualität",
          spots: "Wasserchemie-Profiling pro Angelplatz"
        },
        price: "€89"
      }
    ]
  },
  smart_gear: {
    title: "Smart Angelausrüstung",
    icon: <Target className="w-6 h-6" />,
    description: "Intelligente Rollen, Waagen und Bite-Sensoren",
    devices: [
      {
        name: "Anglr Bullseye Bite Detection",
        type: "Smart Bissanzeiger",
        connection: "Bluetooth 5.0",
        features: ["Motion Detection", "Weather Resistant", "Multi-Rod", "Mobile Alerts"],
        specs: {
          battery: "6 Monate (CR2032)",
          range: "100m Bluetooth",
          sensitivity: "3-stufig einstellbar",
          weight: "28g",
          waterproof: "IP67"
        },
        integration: {
          realtime: "Push-Benachrichtigung bei Biss",
          logging: "Automatischer Fang-Timer",
          ai: "Biss-Muster-Analyse für Hot-Times",
          spots: "Aktivitäts-Heatmap pro Angelplatz"
        },
        price: "€149"
      },
      {
        name: "Rapala Touch Screen Scale 50lb",
        type: "Bluetooth-Angelwaage",
        connection: "Bluetooth",
        features: ["50lb/25kg Kapazität", "Touchscreen", "Foto-Tagging", "Wetterdaten"],
        specs: {
          capacity: "25kg / 0.01kg Genauigkeit",
          display: "2.8\" LCD Touchscreen",
          memory: "8GB für Fotos",
          battery: "Li-Ion wiederaufladbar",
          waterproof: "IPX4"
        },
        integration: {
          realtime: "Gewicht direkt in Fangbuch übertragen",
          logging: "Fotos automatisch mit GPS/Zeit getaggt",
          ai: "Gewichts-Trends und -vorhersagen",
          spots: "Durchschnittsgewicht pro Angelplatz"
        },
        price: "€199"
      },
      {
        name: "Penn Spinfisher VI Smart Reel",
        type: "Intelligente Angelrolle",
        connection: "Bluetooth + App",
        features: ["Cast Distance", "Retrieve Speed", "Line Counter", "Drag Tension"],
        specs: {
          gear_ratio: "6.2:1",
          capacity: "280yds/12lb",
          drag: "25lb HT-100 Drag",
          sensors: "Hall-Sensor + Accelerometer",
          battery: "USB-C wiederaufladbar"
        },
        integration: {
          realtime: "Wurfdistanz-Messung für Arcade-Game",
          logging: "Drill-Dauer und -intensität",
          ai: "Optimaler Rollenwiderstand je Fischart",
          spots: "Wurfweiten-Analyse pro Platz"
        },
        price: "€329"
      }
    ]
  }
};

export default function DeviceIntegration() {
  const [connectedDevices, setConnectedDevices] = useState(new Set());
  const [activeTab, setActiveTab] = useState("sonar");

  const toggleDevice = (deviceName) => {
    setConnectedDevices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deviceName)) {
        newSet.delete(deviceName);
      } else {
        newSet.add(deviceName);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-3">Smart Geräte-Integration</h1>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">
            Verbinde professionelle Angel-Hardware mit CatchGbt für automatisierte Datenerfassung, 
            präzise Analysen und intelligente Fang-Vorhersagen.
          </p>
        </motion.div>

        {/* Connected Devices Overview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="glass-morphism border-gray-800 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-white">Aktive Verbindungen</h2>
                <Badge variant="outline" className="text-emerald-400 border-emerald-500">
                  {connectedDevices.size} Geräte verbunden
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-xl bg-gray-800/50">
                  <Fish className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                  <div className="text-white font-medium">Echolote</div>
                  <div className="text-gray-400 text-sm">2 kompatibel</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-gray-800/50">
                  <MapPin className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <div className="text-white font-medium">GPS</div>
                  <div className="text-gray-400 text-sm">2 kompatibel</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-gray-800/50">
                  <Thermometer className="w-8 h-8 mx-auto mb-2 text-orange-400" />
                  <div className="text-white font-medium">Sensoren</div>
                  <div className="text-gray-400 text-sm">2 kompatibel</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-gray-800/50">
                  <Target className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                  <div className="text-white font-medium">Smart Gear</div>
                  <div className="text-gray-400 text-sm">3 kompatibel</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Device Categories */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-8 bg-gray-800/50">
            {Object.entries(DEVICE_CATEGORIES).map(([key, category]) => (
              <TabsTrigger 
                key={key} 
                value={key} 
                className="flex items-center gap-2 data-[state=active]:bg-emerald-600"
              >
                {category.icon}
                <span className="hidden sm:inline">{category.title.split(' ')[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(DEVICE_CATEGORIES).map(([key, category]) => (
            <TabsContent key={key} value={key}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="glass-morphism border-gray-800 rounded-2xl mb-6">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/20">
                        {category.icon}
                      </div>
                      <div>
                        <CardTitle className="text-white text-2xl">{category.title}</CardTitle>
                        <p className="text-gray-400 mt-1">{category.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <div className="space-y-6">
                  {category.devices.map((device, index) => (
                    <motion.div
                      key={device.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="glass-morphism border-gray-800 rounded-2xl">
                        <CardContent className="p-6">
                          <div className="flex flex-col lg:flex-row gap-6">
                            
                            {/* Device Info */}
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <h3 className="text-xl font-bold text-white mb-2">{device.name}</h3>
                                  <div className="flex items-center gap-4 text-sm text-gray-400">
                                    <Badge variant="outline">{device.type}</Badge>
                                    <div className="flex items-center gap-1">
                                      {device.connection.includes('Bluetooth') ? 
                                        <Bluetooth className="w-4 h-4" /> : 
                                        <Wifi className="w-4 h-4" />
                                      }
                                      {device.connection}
                                    </div>
                                    <div className="font-semibold text-emerald-400">{device.price}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Switch
                                    checked={connectedDevices.has(device.name)}
                                    onCheckedChange={() => toggleDevice(device.name)}
                                  />
                                  {connectedDevices.has(device.name) ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                                  ) : (
                                    <AlertCircle className="w-5 h-5 text-gray-500" />
                                  )}
                                </div>
                              </div>

                              {/* Features */}
                              <div className="mb-4">
                                <h4 className="text-white font-medium mb-2">Features</h4>
                                <div className="flex flex-wrap gap-2">
                                  {device.features.map((feature, idx) => (
                                    <Badge key={idx} variant="secondary" className="bg-gray-700/50">
                                      {feature}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              {/* Technical Specs */}
                              <div className="mb-4">
                                <h4 className="text-white font-medium mb-2">Technische Daten</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                  {Object.entries(device.specs).map(([key, value]) => (
                                    <div key={key} className="flex justify-between">
                                      <span className="text-gray-400 capitalize">{key.replace('_', ' ')}:</span>
                                      <span className="text-white">{value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Integration Details */}
                            <div className="lg:w-80">
                              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-emerald-400" />
                                CatchGbt Integration
                              </h4>
                              <div className="space-y-3">
                                {Object.entries(device.integration).map(([type, description]) => (
                                  <div key={type} className="p-3 rounded-lg bg-gray-800/50">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                      <span className="text-emerald-400 text-sm font-medium capitalize">
                                        {type.replace('_', ' ')}
                                      </span>
                                    </div>
                                    <p className="text-gray-300 text-xs">{description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Integration Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12"
        >
          <Card className="glass-morphism border-gray-800 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white text-2xl flex items-center gap-3">
                <Info className="w-6 h-6 text-blue-400" />
                Vorteile der Geräte-Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-emerald-400 font-semibold">Automatisierte Datenerfassung</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• Tiefe, Temperatur und GPS automatisch bei jedem Fang</li>
                    <li>• Keine manuellen Eingaben mehr nötig</li>
                    <li>• Präzise Umweltdaten für bessere Analysen</li>
                    <li>• Lückenlose Dokumentation aller Angelsessions</li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <h3 className="text-blue-400 font-semibold">KI-Enhanced Vorhersagen</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• Bessere Fang-Prognosen durch mehr Datenpunkte</li>
                    <li>• Personalisierte Köder- und Tiefenempfehlungen</li>
                    <li>• Optimale Zeiten basierend auf Geräte-Historie</li>
                    <li>• Spots-Ranking mit Hardware-unterstützten Scores</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}