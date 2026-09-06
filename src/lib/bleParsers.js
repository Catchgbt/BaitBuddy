// BLE-Notification-Parser fuer den Device Hub.
// Reine Funktionen ohne React-, GATT- oder Canvas-Abhaengigkeit — dadurch
// ohne Web-Bluetooth-Stack unit-testbar (siehe bleParsers.test.js).
// Aus src/components/devices/DeviceHub.jsx extrahiert.

// Standardisierte Heart-Rate-GATT-UUIDs (Bluetooth SIG).
export const HR_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
export const HR_MEASUREMENT = '00002a37-0000-1000-8000-00805f9b34fb';

export function parseBLE(dataView, parserType) {
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
