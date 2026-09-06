// Katalog der unterstuetzten Bluetooth-Geraete des Device Hubs.
// Aus src/components/devices/DeviceHub.jsx extrahiert: reine Datendefinition
// (GATT-Services, Notify-Charakteristiken, Parser-Typ, Darstellung) ohne
// Verbindungs- oder React-State-Logik.

import { Activity, Heart, Radio, Scale, Thermometer, Watch, Waves, Wind } from 'lucide-react';
import { HR_SERVICE, HR_MEASUREMENT } from '@/lib/bleParsers';

export const BLE_DEVICES = [
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
