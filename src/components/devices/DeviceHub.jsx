import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Bluetooth, 
  Camera, 
  Waves, 
  Thermometer,
  Scale,
  Watch,
  Radio,
  Wind,
  Activity,
  Settings,
  CheckCircle2,
  Heart,
  Play,
  Square
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

// HR Service Constants
const HR_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
const HR_MEASUREMENT = '00002a37-0000-1000-8000-00805f9b34fb';

// Echogram Canvas Renderer
class EchogramRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    this.width = canvas.width;
    this.height = canvas.height;
    this.columnIndex = 0;
    this.depthMaxMeters = 50;
    this.palette = this.generatePalette();
  }

  generatePalette() {
    const palette = new Uint8ClampedArray(256 * 4);
    for (let i = 0; i < 256; i++) {
      let r = 0, g = 0, b = 0;
      const t = i / 255;
      
      if (t < 0.2) {
        b = Math.round(255 * (t / 0.2));
      } else if (t < 0.4) {
        b = 255;
        g = Math.round(255 * ((t - 0.2) / 0.2));
      } else if (t < 0.6) {
        g = 255;
        b = Math.round(255 * (1 - (t - 0.4) / 0.2));
      } else if (t < 0.8) {
        g = 255;
        r = Math.round(255 * ((t - 0.6) / 0.2));
      } else {
        r = 255;
        g = Math.round(255 * (1 - (t - 0.8) / 0.2));
      }
      
      palette[i * 4] = r;
      palette[i * 4 + 1] = g;
      palette[i * 4 + 2] = b;
      palette[i * 4 + 3] = 255;
    }
    return palette;
  }

  pushPing({ intensities, depth_m, temp_c }) {
    const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
    const data = imageData.data;
    const column = new Uint8Array(this.height);

    if (Array.isArray(intensities) && intensities.length > 0) {
      for (let y = 0; y < this.height; y++) {
        const idx = Math.floor((y * intensities.length) / this.height);
        column[y] = intensities[idx] & 0xff;
      }
    } else {
      const depthPixel = depth_m 
        ? Math.min(this.height - 1, Math.max(0, Math.round((depth_m / this.depthMaxMeters) * this.height)))
        : Math.round(this.height * 0.6);
      
      for (let y = 0; y < this.height; y++) {
        const distance = Math.abs(y - depthPixel);
        column[y] = Math.max(0, 255 - distance * 12);
      }
    }

    for (let y = 0; y < this.height; y++) {
      const pixelIndex = (y * this.width + this.columnIndex) * 4;
      const colorValue = column[y];
      data[pixelIndex] = this.palette[colorValue * 4];
      data[pixelIndex + 1] = this.palette[colorValue * 4 + 1];
      data[pixelIndex + 2] = this.palette[colorValue * 4 + 2];
      data[pixelIndex + 3] = 255;
    }

    this.columnIndex = (this.columnIndex + 1) % this.width;
    this.ctx.putImageData(imageData, 0, 0);
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    this.ctx.fillRect(this.columnIndex, 0, 1, this.height);

    return { depth_m, temp_c };
  }
}

// BLE Device Definitions
const BLE_DEVICES = [
  // Smartwatches mit Heart Rate
  { 
    key: 'hr-generic',
    label: 'Generic Heart Rate Monitor',
    namePrefix: '',
    icon: Heart,
    category: 'wearables',
    optionalServices: [HR_SERVICE],
    notify: [{ service: HR_SERVICE, char: HR_MEASUREMENT }],
    parser: 'heartRate',
    color: 'red',
    acceptAll: true
  },
  { 
    key: 'wear-garmin-quatix',
    label: 'Garmin Quatix',
    namePrefix: 'quatix',
    icon: Watch,
    category: 'wearables',
    optionalServices: [HR_SERVICE],
    notify: [{ service: HR_SERVICE, char: HR_MEASUREMENT }],
    parser: 'heartRate',
    color: 'indigo'
  },
  { 
    key: 'wear-apple-watch',
    label: 'Apple Watch',
    namePrefix: 'Apple Watch',
    icon: Watch,
    category: 'wearables',
    optionalServices: [HR_SERVICE],
    notify: [{ service: HR_SERVICE, char: HR_MEASUREMENT }],
    parser: 'heartRate',
    color: 'indigo'
  },
  { 
    key: 'wear-polar',
    label: 'Polar HR Sensor',
    namePrefix: 'Polar',
    icon: Heart,
    category: 'wearables',
    optionalServices: [HR_SERVICE],
    notify: [{ service: HR_SERVICE, char: HR_MEASUREMENT }],
    parser: 'heartRate',
    color: 'red'
  },
  { 
    key: 'wear-fitbit',
    label: 'Fitbit',
    namePrefix: 'Fitbit',
    icon: Watch,
    category: 'wearables',
    optionalServices: [HR_SERVICE],
    notify: [{ service: HR_SERVICE, char: HR_MEASUREMENT }],
    parser: 'heartRate',
    color: 'indigo'
  },
  { 
    key: 'wear-samsung-galaxy',
    label: 'Samsung Galaxy Watch',
    namePrefix: 'Galaxy Watch',
    icon: Watch,
    category: 'wearables',
    optionalServices: [HR_SERVICE],
    notify: [{ service: HR_SERVICE, char: HR_MEASUREMENT }],
    parser: 'heartRate',
    color: 'indigo'
  },

  // Smarte Waagen
  { 
    key: 'scale-connectscale',
    label: 'ConnectScale',
    namePrefix: 'Scale',
    icon: Scale,
    category: 'scales',
    optionalServices: ['0000fff0-0000-1000-8000-00805f9b34fb'],
    notify: [{ service: '0000fff0-0000-1000-8000-00805f9b34fb', char: '0000fff1-0000-1000-8000-00805f9b34fb' }],
    parser: 'scale',
    color: 'emerald'
  },
  { 
    key: 'scale-rapala',
    label: 'Rapala BT Scale',
    namePrefix: 'Rapala',
    icon: Scale,
    category: 'scales',
    optionalServices: [],
    notify: [],
    parser: 'scale',
    color: 'emerald'
  },

  // Smart Reels
  { 
    key: 'reel-kastking-ireel',
    label: 'KastKing iReel',
    namePrefix: 'iReel',
    icon: Activity,
    category: 'reels',
    optionalServices: ['0000180a-0000-1000-8000-00805f9b34fb'],
    notify: [{ service: '0000180a-0000-1000-8000-00805f9b34fb', char: '00002a57-0000-1000-8000-00805f9b34fb' }],
    parser: 'reel',
    color: 'blue'
  },

  // Castable Sonars
  { 
    key: 'sonar-ibobber',
    label: 'ReelSonar iBobber',
    namePrefix: 'iBobber',
    icon: Waves,
    category: 'sonars',
    optionalServices: [],
    notify: [],
    parser: 'sonarSimple',
    color: 'cyan'
  },
  { 
    key: 'sonar-garmin-striker',
    label: 'Garmin STRIKER Cast',
    namePrefix: 'STRIKER',
    icon: Waves,
    category: 'sonars',
    optionalServices: [],
    notify: [],
    parser: 'sonarSimple',
    color: 'cyan'
  },

  // Sensoren
  { 
    key: 'env-ruuvitag',
    label: 'RuuviTag',
    namePrefix: 'Ruuvi',
    icon: Thermometer,
    category: 'sensors',
    optionalServices: [],
    notify: [],
    parser: 'ruuvi',
    color: 'orange'
  },
  { 
    key: 'env-kestrel-5500',
    label: 'Kestrel 5500 LiNK',
    namePrefix: 'Kestrel',
    icon: Wind,
    category: 'sensors',
    optionalServices: [],
    notify: [],
    parser: 'kestrel',
    color: 'orange'
  },

  // Buttons
  { 
    key: 'button-anglr-bullseye2',
    label: 'ANGLR Bullseye 2',
    namePrefix: 'ANGLR',
    icon: Radio,
    category: 'buttons',
    optionalServices: [],
    notify: [],
    parser: 'button',
    color: 'purple'
  }
];

// Parser Functions
function parseBLE(dataView, parserType) {
  const hexString = (u8) => [...u8].map(b => b.toString(16).padStart(2, '0')).join('');
  const hexDump = (dv) => {
    const u8 = new Uint8Array(dv.buffer);
    return { raw_hex: hexString(u8), len: u8.length };
  };

  if (parserType === 'heartRate') {
    try {
      if (dataView.byteLength < 2) return hexDump(dataView);
      
      const flags = dataView.getUint8(0);
      const is16Bit = (flags & 0x01) === 1;
      const hasEnergyExpended = (flags & 0x08) === 8;
      const hasRRInterval = (flags & 0x10) === 16;
      
      let bpm;
      let offset = 1;
      
      if (is16Bit) {
        bpm = dataView.getUint16(offset, true);
        offset += 2;
      } else {
        bpm = dataView.getUint8(offset);
        offset += 1;
      }
      
      const result = { bpm, flags };
      
      if (hasEnergyExpended) {
        result.energy_expended = dataView.getUint16(offset, true);
        offset += 2;
      }
      
      if (hasRRInterval && dataView.byteLength >= offset + 2) {
        const rrIntervals = [];
        while (offset + 2 <= dataView.byteLength) {
          rrIntervals.push(dataView.getUint16(offset, true));
          offset += 2;
        }
        result.rr_intervals = rrIntervals;
      }
      
      return result;
    } catch (e) {
      return { error: e.message, ...hexDump(dataView) };
    }
  }

  if (parserType === 'scale') {
    if (dataView.byteLength >= 2) {
      const grams = dataView.getUint16(0, true);
      return { weight_g: grams, weight_kg: grams / 1000 };
    }
    return hexDump(dataView);
  }
  
  if (parserType === 'reel') {
    if (dataView.byteLength >= 6) {
      return {
        rpm: dataView.getUint16(0, true),
        distance_m: dataView.getUint16(2, true) / 100,
        battery_v: dataView.getUint16(4, true) / 1000
      };
    }
    return hexDump(dataView);
  }
  
  if (parserType === 'sonarSimple') {
    if (dataView.byteLength >= 4) {
      return {
        depth_m: dataView.getUint16(0, true) / 100,
        temp_c: dataView.getUint16(2, true) / 10
      };
    }
    return hexDump(dataView);
  }
  
  if (parserType === 'button') {
    return { pressed: true, raw: hexString(new Uint8Array(dataView.buffer)) };
  }
  
  return hexDump(dataView);
}

function synthesizeIntensities(height, depth_m) {
  const intensities = new Array(height);
  const depthPixel = depth_m 
    ? Math.min(height - 1, Math.max(0, Math.round((depth_m / 50) * height)))
    : Math.round(height * 0.6);
  
  for (let y = 0; y < height; y++) {
    const distance = Math.abs(y - depthPixel);
    let value = 255 - distance * 10;
    if (value < 0) value = 0;
    if (value > 255) value = 255;
    intensities[y] = value;
  }
  return intensities;
}

export default function DeviceHub() {
  const canvasRef = useRef(null);
  const echogramRef = useRef(null);
  const videoRef = useRef(null);
  const bleInspectorRef = useRef({ device: null, server: null, characteristic: null });
  const sessionTimerRef = useRef(null);

  const [logs, setLogs] = useState([]);
  const [telemetry, setTelemetry] = useState({ depth_m: null, temp_c: null });
  const [heartRate, setHeartRate] = useState(null);
  const [connectedDevices, setConnectedDevices] = useState(new Set());
  const [cameraActive, setCameraActive] = useState(false);
  
  // HR Session State
  const [hrSessionActive, setHrSessionActive] = useState(false);
  const [hrSessionId, setHrSessionId] = useState(null);
  const [hrSessionStart, setHrSessionStart] = useState(null);
  const [hrSessionElapsed, setHrSessionElapsed] = useState('00:00');
  const [hrSamples, setHrSamples] = useState([]);
  
  // BLE Inspector State
  const [bleInspectorOpen, setBleInspectorOpen] = useState(false);
  const [bleServices, setBleServices] = useState([]);
  const [bleServiceInput, setBleServiceInput] = useState('');
  const [bleCharInput, setBleCharInput] = useState('');
  const [bleNotifyActive, setBleNotifyActive] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    if (canvasRef.current && !echogramRef.current) {
      echogramRef.current = new EchogramRenderer(canvasRef.current);
    }
  }, []);

  // HR Session Timer
  useEffect(() => {
    if (hrSessionActive && hrSessionStart) {
      sessionTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - hrSessionStart;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        setHrSessionElapsed(`${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }, 1000);
    } else {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    }
    
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, [hrSessionActive, hrSessionStart]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ timestamp, message, type }, ...prev].slice(0, 50));
  };

  // HR Session Management
  const startHrSession = async () => {
    if (!heartRate) {
      toast.error('Kein HR-Geraet verbunden');
      return;
    }
    
    const sessionId = `hr_session_${Date.now()}`;
    const now = Date.now();
    
    setHrSessionId(sessionId);
    setHrSessionStart(now);
    setHrSessionActive(true);
    setHrSamples([]);
    
    addLog(`HR Session gestartet: ${sessionId}`, 'success');
    toast.success('HR Session gestartet');
  };

  const stopHrSession = async () => {
    if (!hrSessionActive) return;
    
    const duration = Math.floor((Date.now() - hrSessionStart) / 1000);
    
    try {
      const user = await base44.auth.me();
      
      const avgBpm = hrSamples.length > 0 
        ? Math.round(hrSamples.reduce((sum, s) => sum + s.bpm, 0) / hrSamples.length)
        : null;
      
      const maxBpm = hrSamples.length > 0 
        ? Math.max(...hrSamples.map(s => s.bpm))
        : null;
      
      const minBpm = hrSamples.length > 0 
        ? Math.min(...hrSamples.map(s => s.bpm))
        : null;
      
      addLog(
        `Session beendet: ${hrSessionId}, Dauer: ${duration}s, Samples: ${hrSamples.length}, Avg: ${avgBpm} bpm`, 
        'success'
      );
      
      toast.success(`Session beendet - ${duration}s, Avg: ${avgBpm} bpm`);
    } catch (error) {
      addLog(`Session-Fehler: ${error.message}`, 'error');
    }
    
    setHrSessionActive(false);
    setHrSessionId(null);
    setHrSessionStart(null);
    setHrSessionElapsed('00:00');
  };

  const recordHrSample = (bpm) => {
    if (hrSessionActive) {
      const sample = {
        ts: Date.now(),
        bpm,
        session_id: hrSessionId
      };
      setHrSamples(prev => [...prev, sample]);
    }
  };

  // BLE Device Connection
  const connectBLEDevice = async (device) => {
    if (!navigator.bluetooth) {
      toast.error('Web Bluetooth wird nicht unterstuetzt');
      addLog('Web Bluetooth not supported', 'error');
      return;
    }

    try {
      const requestOptions = device.acceptAll 
        ? { acceptAllDevices: true, optionalServices: device.optionalServices || [] }
        : { filters: [{ namePrefix: device.namePrefix }], optionalServices: device.optionalServices || [] };

      const bleDevice = await navigator.bluetooth.requestDevice(requestOptions);

      bleDevice.addEventListener('gattserverdisconnected', () => {
        addLog(`${device.label} disconnected`, 'warn');
        setConnectedDevices(prev => {
          const newSet = new Set(prev);
          newSet.delete(device.key);
          return newSet;
        });
        
        if (device.parser === 'heartRate') {
          setHeartRate(null);
          if (hrSessionActive) {
            stopHrSession();
          }
        }
      });

      const server = await bleDevice.gatt.connect();

      if (device.notify && device.notify.length > 0) {
        for (const notifyConfig of device.notify) {
          const service = await server.getPrimaryService(notifyConfig.service);
          const characteristic = await service.getCharacteristic(notifyConfig.char);
          
          await characteristic.startNotifications();
          
          characteristic.addEventListener('characteristicvaluechanged', (event) => {
            const dataView = event.target.value;
            const parsed = parseBLE(dataView, device.parser);
            
            addLog(`${device.label}: ${JSON.stringify(parsed)}`, 'success');

            if (device.parser === 'heartRate' && parsed.bpm) {
              setHeartRate(parsed.bpm);
              recordHrSample(parsed.bpm);
            }

            if (device.parser === 'sonarSimple') {
              const depth_m = parsed.depth_m ?? null;
              const temp_c = parsed.temp_c ?? null;
              const intensities = synthesizeIntensities(echogramRef.current.height, depth_m);
              
              const telemetryData = echogramRef.current.pushPing({ 
                intensities, 
                depth_m, 
                temp_c 
              });
              setTelemetry(telemetryData);
            }
          });
        }

        setConnectedDevices(prev => new Set(prev).add(device.key));
        toast.success(`${device.label} verbunden`);
        addLog(`${device.label} connected (BLE)`, 'success');
      } else {
        toast.warning(`${device.label}: Keine UUIDs konfiguriert. Nutze BLE-Inspector.`);
        addLog(`${device.label}: keine UUIDs gesetzt - nutze BLE-Inspector`, 'warn');
      }
    } catch (error) {
      toast.error(`Verbindung fehlgeschlagen: ${error.message}`);
      addLog(`BLE connection error: ${error.message}`, 'error');
    }
  };

  // BLE Inspector
  const openBLEInspector = async () => {
    if (!navigator.bluetooth) {
      toast.error('Web Bluetooth wird nicht unterstuetzt');
      return;
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: []
      });

      bleInspectorRef.current.device = device;

      device.addEventListener('gattserverdisconnected', () => {
        addLog('BLE Inspector: disconnected', 'warn');
      });

      const server = await device.gatt.connect();
      bleInspectorRef.current.server = server;

      const services = await server.getPrimaryServices();
      const serviceList = [];

      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        const charList = characteristics.map(char => ({
          uuid: char.uuid,
          properties: Object.keys(char.properties).filter(k => char.properties[k])
        }));

        serviceList.push({
          uuid: service.uuid,
          characteristics: charList
        });
      }

      setBleServices(serviceList);
      setBleInspectorOpen(true);
      toast.success('Services/Characteristics gescannt');
      addLog('BLE Inspector: Services/Chars gelistet', 'success');
    } catch (error) {
      toast.error(`Inspector-Fehler: ${error.message}`);
      addLog(`BLE Inspector error: ${error.message}`, 'error');
    }
  };

  const startBLENotifications = async () => {
    const serviceId = bleServiceInput.trim();
    const charId = bleCharInput.trim();

    if (!bleInspectorRef.current.server) {
      toast.error('Kein GATT Server verbunden');
      return;
    }

    try {
      const service = await bleInspectorRef.current.server.getPrimaryService(serviceId);
      const characteristic = await service.getCharacteristic(charId);

      await characteristic.startNotifications();

      characteristic.addEventListener('characteristicvaluechanged', (event) => {
        const dataView = event.target.value;
        const u8 = new Uint8Array(dataView.buffer);
        const hexStr = [...u8].map(b => b.toString(16).padStart(2, '0')).join('');
        
        addLog(`BLE Notify: ${hexStr} (${u8.length} bytes)`, 'info');

        // Try to parse as HR
        if (serviceId.includes('180d') || charId.includes('2a37')) {
          const parsed = parseBLE(dataView, 'heartRate');
          if (parsed.bpm) {
            setHeartRate(parsed.bpm);
            recordHrSample(parsed.bpm);
            addLog(`HR: ${parsed.bpm} bpm`, 'success');
          }
        }

        // Try to parse as sonar
        if (u8.length >= 4) {
          const depth_m = dataView.getUint16(0, true) / 100;
          const temp_c = dataView.getUint16(2, true) / 10;
          const intensities = u8.length > 4 
            ? [...u8.slice(4)].map(x => x & 0xff)
            : synthesizeIntensities(echogramRef.current.height, depth_m);

          const telemetryData = echogramRef.current.pushPing({ 
            intensities, 
            depth_m, 
            temp_c 
          });
          setTelemetry(telemetryData);
        }
      });

      bleInspectorRef.current.characteristic = characteristic;
      setBleNotifyActive(true);
      toast.success('Notifications gestartet');
      addLog('BLE Inspector: Notifications gestartet', 'success');
    } catch (error) {
      toast.error(`Notification-Fehler: ${error.message}`);
      addLog(`BLE notify error: ${error.message}`, 'error');
    }
  };

  const stopBLENotifications = async () => {
    try {
      if (bleInspectorRef.current.characteristic) {
        await bleInspectorRef.current.characteristic.stopNotifications();
      }
      setBleNotifyActive(false);
      toast.info('Notifications gestoppt');
      addLog('BLE Inspector: Notifications gestoppt', 'warn');
    } catch (error) {
      addLog(`Stop notify error: ${error.message}`, 'error');
    }
  };

  // Camera
  const connectCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        toast.success('Kamera verbunden');
        addLog('Camera connected', 'success');
      }
    } catch (error) {
      toast.error(`Kamera-Fehler: ${error.message}`);
      addLog(`Camera error: ${error.message}`, 'error');
    }
  };

  const disconnectCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
      toast.info('Kamera getrennt');
      addLog('Camera disconnected', 'warn');
    }
  };

  const categories = [
    { id: 'all', label: 'Alle Geraete', icon: Bluetooth },
    { id: 'wearables', label: 'Wearables & HR', icon: Heart },
    { id: 'scales', label: 'Waagen', icon: Scale },
    { id: 'reels', label: 'Rollen & Ruten', icon: Activity },
    { id: 'sonars', label: 'Echolote', icon: Waves },
    { id: 'sensors', label: 'Sensoren', icon: Thermometer },
    { id: 'buttons', label: 'Buttons', icon: Radio }
  ];

  const filteredDevices = selectedCategory === 'all' 
    ? BLE_DEVICES 
    : BLE_DEVICES.filter(d => d.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => {
          const Icon = cat.icon;
          return (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className={selectedCategory === cat.id ? 'bg-cyan-600' : ''}
            >
              <Icon className="w-4 h-4 mr-2" />
              {cat.label}
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Controls */}
        <div className="space-y-6">
          {/* Heart Rate Monitor */}
          {heartRate !== null && (
            <Card className="glass-morphism border-red-600/50 bg-red-900/10">
              <CardHeader>
                <CardTitle className="text-red-400 text-base flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Heart Rate Monitor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-6xl font-bold text-red-400 mb-2">
                    {heartRate || '--'}
                  </div>
                  <div className="text-sm text-gray-400">bpm</div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="text-gray-500">Session</div>
                    <div className="text-white font-semibold">
                      {hrSessionActive ? 'AKTIV' : '--'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Dauer</div>
                    <div className="text-white font-semibold">{hrSessionElapsed}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Samples</div>
                    <div className="text-white font-semibold">{hrSamples.length}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={startHrSession}
                    disabled={hrSessionActive}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Session
                  </Button>
                  <Button
                    onClick={stopHrSession}
                    disabled={!hrSessionActive}
                    variant="outline"
                    className="flex-1"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* BLE Devices */}
          <Card className="glass-morphism border-gray-800">
            <CardHeader>
              <CardTitle className="text-cyan-400 text-base flex items-center gap-2">
                <Bluetooth className="w-5 h-5" />
                Bluetooth-Geraete ({filteredDevices.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                {filteredDevices.map(device => {
                  const Icon = device.icon;
                  const isConnected = connectedDevices.has(device.key);
                  const hasConfig = device.notify && device.notify.length > 0;

                  return (
                    <div
                      key={device.key}
                      className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 text-${device.color}-400`} />
                        <div>
                          <div className="text-sm font-medium text-white">{device.label}</div>
                          <div className="text-xs text-gray-500">
                            {device.acceptAll ? 'Alle HR-Geraete' : hasConfig ? 'Konfiguriert' : 'Benoetigt Inspector'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isConnected ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Verbunden
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => connectBLEDevice(device)}
                            className="bg-cyan-600 hover:bg-cyan-700"
                          >
                            Verbinden
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* BLE Inspector */}
          <Card className="glass-morphism border-gray-800">
            <CardHeader>
              <CardTitle className="text-cyan-400 text-base flex items-center gap-2">
                <Settings className="w-5 h-5" />
                BLE-Inspector
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={openBLEInspector}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                Geraet scannen
              </Button>

              {bleInspectorOpen && (
                <>
                  <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                    {bleServices.map((service, idx) => (
                      <div key={idx} className="text-xs">
                        <div className="text-cyan-400 font-mono">Service: {service.uuid}</div>
                        {service.characteristics.map((char, cidx) => (
                          <div key={cidx} className="text-gray-400 ml-4 font-mono">
                            Char: {char.uuid} [{char.properties.join(', ')}]
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Input
                      placeholder="Service UUID (z.B. 0000180d-...)"
                      value={bleServiceInput}
                      onChange={(e) => setBleServiceInput(e.target.value)}
                      className="bg-gray-900 border-gray-700"
                    />
                    <Input
                      placeholder="Characteristic UUID (z.B. 00002a37-...)"
                      value={bleCharInput}
                      onChange={(e) => setBleCharInput(e.target.value)}
                      className="bg-gray-900 border-gray-700"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={startBLENotifications}
                        disabled={bleNotifyActive}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        Start Notifications
                      </Button>
                      <Button
                        onClick={stopBLENotifications}
                        disabled={!bleNotifyActive}
                        variant="outline"
                        className="flex-1"
                      >
                        Stop
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Camera */}
          <Card className="glass-morphism border-gray-800">
            <CardHeader>
              <CardTitle className="text-cyan-400 text-base flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Kamera
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg border border-gray-800 bg-black"
                style={{ maxHeight: '240px' }}
              />
              <div className="flex gap-2">
                <Button
                  onClick={connectCamera}
                  disabled={cameraActive}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Verbinden
                </Button>
                <Button
                  onClick={disconnectCamera}
                  disabled={!cameraActive}
                  variant="outline"
                  className="flex-1"
                >
                  Trennen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Echogram & Logs */}
        <div className="space-y-6">
          {/* Echogram */}
          <Card className="glass-morphism border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-cyan-400 text-base flex items-center gap-2">
                  <Waves className="w-5 h-5" />
                  Echogram
                </CardTitle>
                <div className="text-xs text-gray-400">
                  {telemetry.depth_m !== null && `Tiefe: ${telemetry.depth_m.toFixed(2)}m`}
                  {telemetry.temp_c !== null && ` | Temp: ${telemetry.temp_c.toFixed(1)} C`}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <canvas
                ref={canvasRef}
                width={640}
                height={240}
                className="w-full rounded-lg border border-gray-800"
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="text-xs text-gray-500 mt-2">
                Erwartet Intensitaeten [0..255] pro Ping. Ohne Intensitaeten wird eine synthetische Spalte generiert.
              </div>
            </CardContent>
          </Card>

          {/* Logs */}
          <Card className="glass-morphism border-gray-800">
            <CardHeader>
              <CardTitle className="text-cyan-400 text-base">Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-96 overflow-y-auto font-mono text-xs">
                {logs.length === 0 ? (
                  <div className="text-gray-500 text-center py-4">Keine Logs</div>
                ) : (
                  logs.map((log, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded ${
                        log.type === 'error' ? 'bg-red-900/20 text-red-400' :
                        log.type === 'warn' ? 'bg-yellow-900/20 text-yellow-400' :
                        log.type === 'success' ? 'bg-emerald-900/20 text-emerald-400' :
                        'bg-gray-900/50 text-gray-300'
                      }`}
                    >
                      <span className="text-gray-500">{log.timestamp}</span> {log.message}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}