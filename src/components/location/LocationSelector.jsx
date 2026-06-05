import React, { useEffect, useState } from 'react';
import { useLocation } from './LocationManager';
import { Spot } from '@/entities/Spot';
import { Button } from '@/components/ui/button';
import { MobileSelect } from '@/components/ui/mobile-select';
import { MapPin, Navigation, Loader2, AlertCircle } from 'lucide-react';

export default function LocationSelector({ compact = false }) {
  const { 
    currentLocation, 
    gpsLocation, 
    loading, 
    error, 
    requestGpsLocation, 
    setSpotAsLocation,
    setCurrentLocation 
  } = useLocation();
  
  const [spots, setSpots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState("");

  useEffect(() => {
    const loadSpots = async () => {
      try {
        const spotsList = await Spot.list();
        setSpots(spotsList);
      } catch (err) {
        console.error("Fehler beim Laden der Spots:", err);
      }
    };
    loadSpots();
  }, []);

  const handleSpotChange = async (spotId) => {
    setSelectedSpot(spotId);
    if (spotId === "gps" && gpsLocation) {
      setCurrentLocation(gpsLocation);
    } else if (spotId && spotId !== "gps") {
      const spot = spots.find(s => s.id === spotId);
      if (spot) {
        await setSpotAsLocation(spot);
      }
    }
  };

  const getLocationDisplay = () => {
    if (!currentLocation) return "Kein Standort";
    
    const distance = gpsLocation && currentLocation.source !== "gps" ? 
      calculateDistance(gpsLocation.lat, gpsLocation.lon, currentLocation.lat, currentLocation.lon) : null;
    
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-sm' : ''}`}>
        <MapPin className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-emerald-400`} />
        <span className="text-white truncate">
          {currentLocation.name}
          {distance && distance < 50 && (
            <span className="text-gray-400 text-xs ml-1">({Math.round(distance)}km)</span>
          )}
        </span>
      </div>
    );
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {getLocationDisplay()}
        <Button
          size="sm"
          variant="outline"
          onClick={requestGpsLocation}
          disabled={loading}
          className="px-2"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Navigation className="w-3 h-3" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Aktueller Standort</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={requestGpsLocation}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Navigation className="w-4 h-4 mr-2" />
          )}
          GPS
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-amber-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="p-3 rounded-xl bg-gray-800/40 border border-gray-700">
        {getLocationDisplay()}
      </div>

      <MobileSelect
        value={selectedSpot}
        onValueChange={handleSpotChange}
        label="Standort waehlen"
        placeholder="Standort waehlen..."
        options={[
          ...(gpsLocation ? [{ value: "gps", label: "GPS-Standort verwenden" }] : []),
          ...spots.map(spot => ({ value: spot.id, label: `${spot.name} (${spot.water_type})` }))
        ]}
        className="bg-gray-800/50 border-gray-700 text-white"
      />
    </div>
  );
}

// Hilfsfunktion zur Distanzberechnung
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Erdradius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}